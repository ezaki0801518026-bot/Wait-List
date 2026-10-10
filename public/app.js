import {
  AFFILIATIONS,
  COUNTRY_CODES,
  EMAIL_PATTERN,
  ENTRIES,
  INTERESTS,
  LIMITS,
  SOURCES,
  countryName,
  daysUntilRelease,
  tag,
} from './shared.js'
import { bindLangSwitch } from './lang.js'

const T = {
  en: {
    pageTitle: 'WA-Chain Edu — Early access list',
    title: 'Join the WA-Chain Edu early access list',
    lead: 'This is the waitlist for WA-Chain Educational Contents.',
    release: 'Planned release: 1 November 2026',
    countdown: (n) => (n > 1 ? `${n} days to go` : n === 1 ? '1 day to go' : n === 0 ? 'Releasing today' : 'Now released'),
    promiseFree: 'No payment now. Joining is free and doesn’t commit you to anything.',
    promiseNotify: 'We’ll email you as soon as it opens.',
    nameLabel: 'Full name',
    countryLabel: 'Country or region',
    affiliationLabel: 'Affiliation',
    affiliationHint: 'The kind of place where you work or study',
    emailLabel: 'Email address',
    emailHint: 'We’ll send your confirmation here.',
    select: 'Select…',
    interestsLabel: 'What are you most interested in? (optional)',
    interestsHint: 'Choose any that apply.',
    purpose:
      'We use your details only to provide WA-Chain Edu to you in the way that suits you best. We never sell them or share them with anyone else.',
    consentBefore: 'I agree to the ',
    consentLink: 'privacy notice',
    consentAfter: ', including storage of my details with Google (USA).',
    newsletter: 'Also send me occasional WA-Chain updates (optional)',
    submit: 'Join the early access list',
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
    position: (n) => `You are user #${n} on the early access list.`,
    days: (n) =>
      n > 1 ? `${n} days until release.` : n === 1 ? '1 day until release.' : n === 0 ? 'WA-Chain Edu releases today.' : 'WA-Chain Edu is now released.',
    mailSent: (e) => `We’ve sent a confirmation email to ${e}. If it hasn’t arrived within an hour, please check your spam folder.`,
    mailExisting: 'This email address is already on the list, so we haven’t sent another email.',
    donePromise: 'There’s nothing to pay now. We’ll email you as soon as WA-Chain Edu opens.',
    mockup: 'Preview the prototype mockup',
  },
  ja: {
    pageTitle: 'WA-Chain Edu — 先行案内リスト',
    title: 'WA-Chain Edu 先行案内リスト',
    lead: 'このページは WA-Chain Educational Contents へのウェイトリストです。',
    release: 'リリース予定日：2026年11月1日',
    countdown: (n) => (n > 0 ? `あと ${n} 日` : n === 0 ? '本日リリース' : 'リリース済み'),
    promiseFree: '今は料金はかかりません。登録しても、購入の義務は生じません。',
    promiseNotify: '公開したら、メールでお知らせします。',
    nameLabel: 'お名前',
    countryLabel: '国・地域',
    affiliationLabel: '所属機関',
    affiliationHint: 'お勤め先・在籍先の種類',
    emailLabel: 'メールアドレス',
    emailHint: '登録完了のメールをこのアドレスにお送りします。',
    select: '選択してください',
    interestsLabel: 'いちばん関心のあることは？（任意）',
    interestsHint: 'あてはまるものをいくつでも選んでください。',
    purpose:
      'ご登録いただいた情報は、WA-Chain Edu をあなたに最適な形で提供するためにのみ利用します。販売や第三者への提供は行いません。',
    consentBefore: '',
    consentLink: 'プライバシーに関するお知らせ',
    consentAfter: 'に同意します（登録情報が Google（米国）に保存されることを含みます）。',
    newsletter: 'WA-Chain の活動報告も受け取る（任意）',
    submit: '先行案内リストに登録する',
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
    donePromise: '今は料金はかかりません。WA-Chain Edu が公開されたら、メールでお知らせします。',
    mockup: 'プロトタイプのモックアップを見る',
  },
}

const $ = (id) => document.getElementById(id)
const form = $('form')
const submitBtn = $('submit')
const FIELDS = ['name', 'country', 'affiliation', 'email', 'consent']

let lang = 'en'
const arrival = readOrigin() // where this visitor came from
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

function renderInterests() {
  const box = $('interests')
  const checked = new Set(readInterests())
  box.replaceChildren(
    ...INTERESTS.map(({ code, ...labels }) => {
      const id = `interest-${code}`
      const row = document.createElement('div')
      row.className = 'check'
      const input = Object.assign(document.createElement('input'), {
        type: 'checkbox', id, name: 'interests', value: code, checked: checked.has(code),
      })
      const label = Object.assign(document.createElement('label'), { htmlFor: id, textContent: labels[lang] })
      row.append(input, label)
      return row
    }),
  )
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
  renderInterests()

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
  $('done-promise').textContent = t.donePromise
  // People who came from a button on the trial site have seen the
  // prototype already; offer it only to those sent the link directly.
  const mockup = $('done-mockup')
  const show = Boolean(result.mockupUrl) && arrival.from === 'link'
  mockup.hidden = !show
  if (show) mockup.href = result.mockupUrl
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
    interests: readInterests(),
    website: $('website').value,
  }
}

function readInterests() {
  return [...document.querySelectorAll('input[name="interests"]:checked')].map((i) => i.value)
}

// ?src=…&from=… on the link: kept for this tab only, then removed from the
// address bar so it is not copied along when someone shares the page.
function readOrigin() {
  const params = new URLSearchParams(location.search)
  let saved = {}
  try {
    saved = JSON.parse(sessionStorage.getItem('wa-waitlist-origin') || '{}')
  } catch {}
  const found = {
    src: tag(params.has('src') ? params.get('src') : saved.src, SOURCES, 'direct'),
    from: tag(params.has('from') ? params.get('from') : saved.from, ENTRIES, 'link'),
  }
  try {
    sessionStorage.setItem('wa-waitlist-origin', JSON.stringify(found))
  } catch {}
  if (params.has('src') || params.has('from')) {
    params.delete('src')
    params.delete('from')
    const q = params.toString()
    history.replaceState(null, '', location.pathname + (q ? `?${q}` : '') + location.hash)
  }
  return found
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
        body: JSON.stringify({ ...data, lang, src: arrival.src, from: arrival.from, turnstileToken: token }),
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
