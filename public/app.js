import {
  AFFILIATIONS,
  COUNTRY_CODES,
  EMAIL_PATTERN,
  LIMITS,
  countryName,
  daysUntilRelease,
} from './shared.js'
import { bindLangSwitch } from './lang.js'

const T = {
  en: {
    pageTitle: 'WA-Chain Edu — Waitlist',
    title: 'Join the WA-Chain Edu waitlist',
    lead: 'This is the waitlist for WA-Chain Educational Contents.',
    release: 'Planned release: 1 November 2026',
    countdown: (n) => (n > 1 ? `${n} days to go` : n === 1 ? '1 day to go' : n === 0 ? 'Releasing today' : 'Now released'),
    nameLabel: 'Full name',
    countryLabel: 'Country or region',
    affiliationLabel: 'Affiliation',
    affiliationHint: 'The kind of place where you work or study',
    emailLabel: 'Email address',
    emailHint: 'We’ll send your confirmation here.',
    select: 'Select…',
    purpose:
      'We use your details only to provide WA-Chain Edu to you in the way that suits you best. We never sell them or share them with anyone else.',
    consentBefore: 'I agree to the ',
    consentLink: 'privacy notice',
    consentAfter: ', including storage of my details with Google (USA).',
    newsletter: 'Also send me occasional WA-Chain updates (optional)',
    submit: 'Join the waitlist',
    submitting: 'Sending…',
    privacy: 'Privacy notice',
    err: {
      name: 'Enter your name.',
      country: 'Select your country or region.',
      affiliation: 'Select your affiliation.',
      email: 'Enter a valid email address, like name@example.org.',
      consent: 'Please agree to the privacy notice to join.',
      verification: 'We couldn’t confirm that you’re not a bot. Please try again.',
      busy: 'We’re receiving a lot of sign-ups right now. Please try again in a few minutes.',
      unavailable: 'Something went wrong on our side. Please try again in a few minutes.',
      network: 'We couldn’t reach the server. Check your connection and try again.',
    },
    doneTitle: 'Registration complete',
    existingTitle: 'You’re already registered',
    position: (n) => `You are user #${n} on the waitlist.`,
    days: (n) =>
      n > 1 ? `${n} days until release.` : n === 1 ? '1 day until release.' : n === 0 ? 'WA-Chain Edu releases today.' : 'WA-Chain Edu is now released.',
    mailSent: (e) => `We’ve sent a confirmation email to ${e}. If it hasn’t arrived within an hour, please check your spam folder.`,
    mailExisting: 'This email address is already on the waitlist, so we haven’t sent another email.',
    mockup: 'Preview the prototype mockup',
  },
  ja: {
    pageTitle: 'WA-Chain Edu — ウェイトリスト',
    title: 'WA-Chain Edu ウェイトリスト',
    lead: 'このページは WA-Chain Educational Contents へのウェイトリストです。',
    release: 'リリース予定日：2026年11月1日',
    countdown: (n) => (n > 0 ? `あと ${n} 日` : n === 0 ? '本日リリース' : 'リリース済み'),
    nameLabel: 'お名前',
    countryLabel: '国・地域',
    affiliationLabel: '所属機関',
    affiliationHint: 'お勤め先・在籍先の種類',
    emailLabel: 'メールアドレス',
    emailHint: '登録完了のメールをこのアドレスにお送りします。',
    select: '選択してください',
    purpose:
      'ご登録いただいた情報は、WA-Chain Edu をあなたに最適な形で提供するためにのみ利用します。販売や第三者への提供は行いません。',
    consentBefore: '',
    consentLink: 'プライバシーに関するお知らせ',
    consentAfter: 'に同意します（登録情報が Google（米国）に保存されることを含みます）。',
    newsletter: 'WA-Chain の活動報告も受け取る（任意）',
    submit: 'ウェイトリストに登録する',
    submitting: '送信しています…',
    privacy: 'プライバシーに関するお知らせ',
    err: {
      name: 'お名前を入力してください。',
      country: '国・地域を選択してください。',
      affiliation: '所属機関を選択してください。',
      email: 'メールアドレスを正しく入力してください（例：name@example.org）。',
      consent: '登録には、プライバシーに関するお知らせへの同意が必要です。',
      verification: 'ボットではないことを確認できませんでした。もう一度お試しください。',
      busy: 'ただいま登録が集中しています。数分後にもう一度お試しください。',
      unavailable: 'こちら側で問題が起きました。数分後にもう一度お試しください。',
      network: 'サーバーに接続できませんでした。通信環境をご確認のうえ、もう一度お試しください。',
    },
    doneTitle: '登録完了',
    existingTitle: 'すでにご登録いただいています',
    position: (n) => `あなたは ${n} 人目のユーザーです。`,
    days: (n) => (n > 0 ? `リリースまであと ${n} 日です。` : n === 0 ? '本日リリースです。' : 'WA-Chain Edu はリリースされました。'),
    mailSent: (e) => `${e} に確認メールをお送りしました。1時間以内に届かない場合は、迷惑メールフォルダをご確認ください。`,
    mailExisting: 'このメールアドレスはすでに登録されているため、メールは再送していません。',
    mockup: 'プロトタイプのモックアップを見る',
  },
}

const $ = (id) => document.getElementById(id)
const form = $('form')
const submitBtn = $('submit')
const FIELDS = ['name', 'country', 'affiliation', 'email', 'consent']

let lang = 'en'
let result = null // last successful response, re-rendered on language change
let turnstileId = null
let siteKey = null

// ── Rendering ───────────────────────────────────────────────

// Keeps the product name on one line ("WA-" / "Chain" otherwise splits).
function setText(el, text) {
  el.replaceChildren(
    ...text.split(/(WA-Chain(?: Edu)?)/).map((part) => {
      if (!/^WA-Chain/.test(part)) return part
      const span = document.createElement('span')
      span.className = 'nowrap'
      span.textContent = part
      return span
    }),
  )
}

function fillSelect(select, options) {
  const keep = select.value
  select.replaceChildren(
    new Option(T[lang].select, ''),
    ...options.map(([value, label]) => new Option(label, value)),
  )
  select.options[0].disabled = true
  select.value = keep
  if (!keep) select.selectedIndex = 0
}

function render() {
  const t = T[lang]
  document.title = t.pageTitle
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t[el.dataset.i18n]
    if (typeof v === 'string') setText(el, v)
  })
  $('countdown').textContent = t.countdown(daysUntilRelease())
  $('privacy-link').href = `/privacy?lang=${lang}`
  $('footer-privacy').href = `/privacy?lang=${lang}`

  const collator = new Intl.Collator(lang)
  fillSelect(
    $('country'),
    COUNTRY_CODES.map((c) => [c, countryName(c, lang)]).sort((a, b) => collator.compare(a[1], b[1])),
  )
  fillSelect($('affiliation'), AFFILIATIONS.map((a) => [a.code, a[lang]]))

  // Re-translate any visible errors.
  FIELDS.forEach((f) => {
    const el = $(`${f}-error`)
    if (!el.hidden) el.textContent = t.err[f]
  })
  const formError = $('form-error')
  if (!formError.hidden && formError.dataset.code) formError.textContent = t.err[formError.dataset.code]

  if (result) renderDone()
  if (turnstileId !== null) mountTurnstile() // widget language follows the page
}

function renderDone() {
  const t = T[lang]
  const existing = result.status === 'existing'
  $('done-title').textContent = existing ? t.existingTitle : t.doneTitle
  $('done-position').textContent = result.position ? t.position(result.position) : ''
  $('done-days').textContent = t.days(daysUntilRelease())
  $('done-mail').textContent = existing ? t.mailExisting : t.mailSent(result.email)
  const mockup = $('done-mockup')
  mockup.hidden = !result.mockupUrl
  if (result.mockupUrl) mockup.href = result.mockupUrl
}

// ── Validation ──────────────────────────────────────────────

function readForm() {
  return {
    name: $('name').value.trim(),
    country: $('country').value,
    affiliation: $('affiliation').value,
    email: $('email').value.trim(),
    consent: $('consent').checked,
    newsletter: $('newsletter').checked,
    website: $('website').value,
  }
}

function invalidFields(d) {
  const bad = []
  if (!d.name || d.name.length > LIMITS.name) bad.push('name')
  if (!COUNTRY_CODES.includes(d.country)) bad.push('country')
  if (!AFFILIATIONS.some((a) => a.code === d.affiliation)) bad.push('affiliation')
  if (!EMAIL_PATTERN.test(d.email) || d.email.length > LIMITS.email) bad.push('email')
  if (!d.consent) bad.push('consent')
  return bad
}

function showFieldErrors(bad) {
  FIELDS.forEach((f) => {
    const on = bad.includes(f)
    const el = $(`${f}-error`)
    el.hidden = !on
    el.textContent = on ? T[lang].err[f] : ''
    $(f).setAttribute('aria-invalid', String(on))
  })
  if (bad.length) $(bad[0]).focus()
}

function showFormError(code) {
  const el = $('form-error')
  el.hidden = !code
  el.dataset.code = code || ''
  el.textContent = code ? T[lang].err[code] : ''
}

// ── Turnstile (bot check) ───────────────────────────────────

function mountTurnstile() {
  if (!window.turnstile || !siteKey) return
  if (turnstileId !== null) window.turnstile.remove(turnstileId)
  turnstileId = window.turnstile.render('#turnstile', {
    sitekey: siteKey,
    action: 'waitlist',
    language: lang,
    appearance: 'interaction-only',
  })
}

async function loadTurnstile() {
  try {
    const cfg = await fetch('/api/config').then((r) => r.json())
    siteKey = cfg.turnstileSiteKey
  } catch {}
  if (!siteKey) return
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.async = true
  s.onload = mountTurnstile
  document.head.append(s)
}

// The check normally finishes in the background before anyone presses the
// button; if not, wait for it briefly.
async function turnstileToken() {
  for (let i = 0; i < 40; i++) {
    const token = window.turnstile && turnstileId !== null && window.turnstile.getResponse(turnstileId)
    if (token) return token
    await new Promise((r) => setTimeout(r, 250))
  }
  return null
}

// ── Submit ──────────────────────────────────────────────────

function setBusy(busy) {
  submitBtn.disabled = busy
  submitBtn.querySelector('span').textContent = busy ? T[lang].submitting : T[lang].submit
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  showFormError(null)
  const data = readForm()
  const bad = invalidFields(data)
  showFieldErrors(bad)
  if (bad.length) return

  setBusy(true)
  try {
    const token = await turnstileToken()
    if (!token) return showFormError(siteKey ? 'verification' : 'unavailable')

    let res, body
    try {
      res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, lang, turnstileToken: token }),
      })
      body = await res.json()
    } catch {
      return showFormError('network')
    }

    if (!body.ok) {
      if (body.error === 'invalid' && Array.isArray(body.fields)) return showFieldErrors(body.fields)
      return showFormError(['verification', 'busy'].includes(body.error) ? body.error : 'unavailable')
    }

    result = { ...body, email: data.email }
    form.reset()
    form.hidden = true
    renderDone()
    $('done').hidden = false
    $('done').focus()
  } finally {
    setBusy(false)
    // Tokens are single-use; get a fresh one for any retry.
    if (window.turnstile && turnstileId !== null && !result) window.turnstile.reset(turnstileId)
  }
})

// Clear a field's error as soon as it is corrected. Text fields listen to
// `input`, not `change`: `change` fires on blur, i.e. while the button is
// being pressed, and the layout shift would make that click miss.
FIELDS.forEach((f) =>
  $(f).addEventListener($(f).tagName === 'INPUT' && $(f).type !== 'checkbox' ? 'input' : 'change', () => {
    if ($(f).getAttribute('aria-invalid') === 'true' && !invalidFields(readForm()).includes(f)) {
      $(f).setAttribute('aria-invalid', 'false')
      $(`${f}-error`).hidden = true
    }
  }),
)

bindLangSwitch((next) => {
  lang = next
  render()
})
loadTurnstile()
