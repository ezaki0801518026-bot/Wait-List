/**
 * WA-Chain Edu waitlist — Google Apps Script (bound to the waitlist spreadsheet).
 *
 * Receives registrations from the Cloudflare function only (checked by the
 * shared secret), appends one row per email address, and sends the
 * confirmation email from this Google account's Gmail.
 *
 * Script properties (Project Settings → Script properties):
 *   SHARED_SECRET  long random string; same value as GAS_SECRET on Cloudflare
 *   SITE_URL       public URL of the waitlist page, e.g. https://….pages.dev
 *   MOCKUP_URL     optional; overrides DEFAULT_MOCKUP_URL below
 *
 * After pasting: run setup() once, then Deploy → New deployment → Web app,
 * Execute as: Me, Who has access: Anyone. See SETUP.md.
 */

var SHEET_NAME = 'Waitlist'
var HEADERS = [
  'No.', 'Registered (UTC)', 'Name', 'Email', 'Country code', 'Country',
  'Affiliation', 'Language', 'Newsletter', 'Consent version', 'Mail status',
]
var COL = { no: 1, at: 2, name: 3, email: 4, lang: 8, newsletter: 9, mail: 11 }

// Keep in sync with RELEASE_DATE in public/shared.js.
var RELEASE_DATE_LABEL = { en: '1 November 2026', ja: '2026年11月1日' }

// Safety valve: at most this many new rows per rolling hour. Protects the
// Gmail quota (100/day on a free account) and the sheet from a flood.
var MAX_NEW_PER_HOUR = 60

// Prototype mockup shown on the completion screen and in the email.
// The script property MOCKUP_URL, if set, takes precedence.
var DEFAULT_MOCKUP_URL = 'https://trial-version.pages.dev/'

function doPost(e) {
  var req
  try {
    req = JSON.parse(e.postData.contents)
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' })
  }

  var props = PropertiesService.getScriptProperties()
  if (!safeEqual_(req.secret, props.getProperty('SHARED_SECRET'))) {
    return json_({ ok: false, error: 'forbidden' })
  }
  if (!isValid_(req)) return json_({ ok: false, error: 'bad_request' })

  var lock = LockService.getScriptLock()
  try {
    lock.waitLock(20000)
  } catch (err) {
    return json_({ ok: false, error: 'busy' })
  }

  var position, created, rowIndex
  try {
    var sheet = getSheet_()
    var last = sheet.getLastRow()
    var key = normalizeEmail_(req.email)

    if (last > 1) {
      var rows = sheet.getRange(2, 1, last - 1, COL.email).getValues()
      for (var i = 0; i < rows.length; i++) {
        if (normalizeEmail_(String(rows[i][COL.email - 1])) === key) {
          return json_({
            ok: true,
            status: 'existing',
            position: rows[i][COL.no - 1],
            mockupUrl: mockupUrl_(props),
          })
        }
      }
      var hourAgo = Date.now() - 3600 * 1000
      var recent = rows.filter(function (r) {
        return new Date(r[COL.at - 1]).getTime() > hourAgo
      }).length
      if (recent >= MAX_NEW_PER_HOUR) return json_({ ok: false, error: 'busy' })
    }

    // The counter lives in a property so deleting a row (e.g. on request)
    // never renumbers anyone else.
    position = Number(props.getProperty('LAST_NO') || 0) + 1
    sheet.appendRow([
      position,
      new Date().toISOString(),
      text_(req.name),
      text_(req.email),
      text_(req.countryCode),
      text_(req.country),
      text_(req.affiliation),
      req.lang === 'ja' ? 'ja' : 'en',
      req.newsletter === true ? 'Y' : 'N',
      text_(req.consentVersion),
      'pending',
    ])
    SpreadsheetApp.flush()
    rowIndex = sheet.getLastRow()
    props.setProperty('LAST_NO', String(position))
    created = true
  } finally {
    lock.releaseLock()
  }

  if (created) {
    var status = sendConfirmation_({
      name: String(req.name),
      email: String(req.email),
      lang: req.lang === 'ja' ? 'ja' : 'en',
      newsletter: req.newsletter === true,
      position: position,
    })
    getSheet_().getRange(rowIndex, COL.mail).setValue(status)
  }

  return json_({
    ok: true,
    status: 'created',
    position: position,
    mockupUrl: mockupUrl_(props),
  })
}

// Anyone opening the web-app URL in a browser sees nothing useful.
function doGet() {
  return json_({ ok: false, error: 'method_not_allowed' })
}

/** Run once from the editor: creates the sheet and the hourly retry trigger. */
function setup() {
  getSheet_()
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'sendPendingMails'
  })
  if (!exists) ScriptApp.newTrigger('sendPendingMails').timeBased().everyHours(1).create()
  // Ask for Gmail permission now, not on the first registration.
  MailApp.getRemainingDailyQuota()
}

/** Hourly: send confirmations that were held back (daily quota reached). */
function sendPendingMails() {
  var sheet = getSheet_()
  var last = sheet.getLastRow()
  if (last < 2) return
  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues()
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i]
    if (r[COL.mail - 1] !== 'pending') continue
    if (MailApp.getRemainingDailyQuota() < 1) return
    var status = sendConfirmation_({
      name: String(r[COL.name - 1]),
      email: String(r[COL.email - 1]),
      lang: r[COL.lang - 1] === 'ja' ? 'ja' : 'en',
      newsletter: r[COL.newsletter - 1] === 'Y',
      position: r[COL.no - 1],
    })
    sheet.getRange(i + 2, COL.mail).setValue(status)
  }
}

// ── Email ────────────────────────────────────────────────────────────────

function sendConfirmation_(p) {
  if (MailApp.getRemainingDailyQuota() < 1) return 'pending'
  var props = PropertiesService.getScriptProperties()
  var site = (props.getProperty('SITE_URL') || '').replace(/\/+$/, '')
  var mail = composeMail_(p, {
    privacyUrl: site ? site + '/privacy?lang=' + p.lang : '',
    mockupUrl: mockupUrl_(props),
  })
  try {
    MailApp.sendEmail({
      to: p.email,
      subject: mail.subject,
      body: mail.text,
      htmlBody: mail.html,
      name: 'WA-Chain',
    })
    return 'sent'
  } catch (err) {
    return 'failed'
  }
}

function composeMail_(p, links) {
  var ja = p.lang === 'ja'
  var lines = ja
    ? [
        p.name + ' 様',
        '',
        'WA-Chain Edu のウェイトリストへのご登録が完了しました。',
        '',
        'あなたは ' + p.position + ' 人目のユーザーです。',
        'リリース予定日：' + RELEASE_DATE_LABEL.ja,
        links.mockupUrl ? '\nプロトタイプのモックアップはこちらからご覧いただけます：\n' + links.mockupUrl : null,
        '',
        '【個人情報の取り扱い】',
        'ご登録いただいた情報は、WA-Chain Edu をあなたに最適な形で提供するためにのみ利用します。販売や第三者への提供は行いません。',
        p.newsletter ? 'ご希望により、WA-Chain の活動報告もお送りします。' : null,
        '登録内容の確認・訂正・削除や、配信の停止をご希望の場合は、このメールにご返信ください。',
        'お心当たりのない場合も、ご返信いただければ登録を削除します。',
        links.privacyUrl ? 'プライバシーに関するお知らせ：' + links.privacyUrl : null,
        '',
        'WA-Chain',
      ]
    : [
        'Dear ' + p.name + ',',
        '',
        'Thank you for joining the WA-Chain Edu waitlist. Your registration is complete.',
        '',
        'You are user #' + p.position + ' on the waitlist.',
        'Planned release: ' + RELEASE_DATE_LABEL.en,
        links.mockupUrl ? '\nYou can preview the prototype mockup here:\n' + links.mockupUrl : null,
        '',
        'How we use your details',
        'We use your details only to provide WA-Chain Edu to you in the way that suits you best. We never sell them or share them with anyone else.',
        p.newsletter ? 'As you requested, we will also send you WA-Chain updates.' : null,
        'To check, correct or delete your details, or to stop emails, simply reply to this email.',
        'If you did not sign up, reply and we will delete your details.',
        links.privacyUrl ? 'Privacy notice: ' + links.privacyUrl : null,
        '',
        'WA-Chain',
      ]
  var text = lines.filter(function (l) { return l !== null }).join('\n')
  var html =
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#161c1e;max-width:560px">' +
    text
      .split('\n')
      .map(function (l) {
        return escapeHtml_(l).replace(/(https:\/\/\S+)/g, '<a href="$1" style="color:#2f6478">$1</a>')
      })
      .join('<br>') +
    '</div>'
  return {
    subject: ja
      ? 'WA-Chain Edu ウェイトリストへの登録が完了しました'
      : 'You’re on the WA-Chain Edu waitlist',
    text: text,
    html: html,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow(HEADERS)
    sheet.setFrozenRows(1)
  }
  return sheet
}

function isValid_(r) {
  var s = function (v, max) { return typeof v === 'string' && v.length > 0 && v.length <= max }
  return (
    s(r.name, 100) && s(r.email, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) &&
    s(r.countryCode, 2) && s(r.country, 100) && s(r.affiliation, 100) &&
    s(r.consentVersion, 100)
  )
}

function mockupUrl_(props) {
  return props.getProperty('MOCKUP_URL') || DEFAULT_MOCKUP_URL
}

function normalizeEmail_(e) {
  return String(e).trim().toLowerCase()
}

// Stops spreadsheet formula injection: a value starting with = + - @ (or a
// tab / CR) is stored as plain text, never evaluated.
function text_(v) {
  var s = String(v)
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Constant-time comparison so the secret cannot be guessed by timing.
function safeEqual_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !b || a.length !== b.length) return false
  var diff = 0
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
