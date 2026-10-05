// POST /api/waitlist — validate, check Turnstile, relay to Google Apps Script.
//
// Personal data passes through here in memory only. Nothing is logged,
// cached or stored on Cloudflare. The Apps Script URL and the shared secret
// live in Cloudflare secrets (GAS_URL, GAS_SECRET) and never reach the
// browser, so the spreadsheet can only be written through this endpoint.
//
// Required environment (Cloudflare Pages → Settings → Variables and Secrets):
//   GAS_URL            Apps Script web-app URL (…/exec)      secret
//   GAS_SECRET         same value as SHARED_SECRET in Apps Script   secret
//   TURNSTILE_SECRET   Turnstile secret key                  secret
//   TURNSTILE_SITE_KEY Turnstile site key (public; served by /api/config)

import {
  AFFILIATIONS,
  CONSENT_VERSION,
  COUNTRY_CODES,
  EMAIL_PATTERN,
  LIMITS,
  countryName,
} from '../../public/shared.js'

const MAX_BODY_BYTES = 4096
// Control characters plus the Unicode line/paragraph separators (U+2028/9).
const CONTROL_CHARS = new RegExp('[\\x00-\\x1f\\x7f' + String.fromCharCode(0x2028, 0x2029) + ']')

const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })

function validate(input) {
  const errors = []
  const str = (v) => (typeof v === 'string' ? v.trim() : '')

  const name = str(input.name).normalize('NFC')
  if (!name || name.length > LIMITS.name || CONTROL_CHARS.test(name)) errors.push('name')

  const country = str(input.country).toUpperCase()
  if (!COUNTRY_CODES.includes(country)) errors.push('country')

  const affiliation = AFFILIATIONS.find((a) => a.code === input.affiliation)
  if (!affiliation) errors.push('affiliation')

  const email = str(input.email)
  if (!EMAIL_PATTERN.test(email) || email.length > LIMITS.email || CONTROL_CHARS.test(email))
    errors.push('email')

  if (input.consent !== true) errors.push('consent')

  const lang = input.lang === 'ja' ? 'ja' : 'en'
  const newsletter = input.newsletter === true

  return { errors, data: { name, country, affiliation, email, lang, newsletter } }
}

async function verifyTurnstile(token, secret, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8000),
    })
    const out = await res.json()
    // Real keys echo the widget's action. Cloudflare's published test keys
    // (local development only) send no action and flag themselves instead.
    const testKey = out.metadata && out.metadata.result_with_testing_key === true
    return out.success === true && (out.action === 'waitlist' || testKey)
  } catch {
    return false
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.GAS_URL || !env.GAS_SECRET || !env.TURNSTILE_SECRET) {
    console.error('waitlist: missing configuration')
    return reply(503, { ok: false, error: 'unavailable' })
  }

  // Only this site's own page may submit (blocks cross-site form posts).
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) return reply(403, { ok: false, error: 'forbidden' })
  if (!(request.headers.get('content-type') || '').startsWith('application/json'))
    return reply(415, { ok: false, error: 'bad_request' })

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return reply(413, { ok: false, error: 'bad_request' })
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    return reply(400, { ok: false, error: 'bad_request' })
  }
  if (!input || typeof input !== 'object') return reply(400, { ok: false, error: 'bad_request' })

  // Honeypot: a field people never see. Bots that fill it get a quiet 400.
  if (input.website) return reply(400, { ok: false, error: 'bad_request' })

  const { errors, data } = validate(input)
  if (errors.length) return reply(400, { ok: false, error: 'invalid', fields: errors })

  const human = await verifyTurnstile(
    input.turnstileToken,
    env.TURNSTILE_SECRET,
    request.headers.get('cf-connecting-ip'),
  )
  if (!human) return reply(403, { ok: false, error: 'verification' })

  let result
  try {
    const res = await fetch(env.GAS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: env.GAS_SECRET,
        name: data.name,
        email: data.email,
        countryCode: data.country,
        country: countryName(data.country, 'en'),
        affiliation: data.affiliation.en,
        lang: data.lang,
        newsletter: data.newsletter,
        consentVersion: CONSENT_VERSION,
      }),
      redirect: 'follow', // Apps Script answers via a 302 to googleusercontent.com
      signal: AbortSignal.timeout(25000),
    })
    result = await res.json()
  } catch {
    console.error('waitlist: storage unreachable') // no request data in logs
    return reply(502, { ok: false, error: 'unavailable' })
  }

  if (!result || result.ok !== true) {
    const known = ['busy', 'unavailable']
    console.error('waitlist: storage refused', result && result.error)
    return reply(result && result.error === 'busy' ? 503 : 502, {
      ok: false,
      error: known.includes(result && result.error) ? result.error : 'unavailable',
    })
  }

  return reply(200, {
    ok: true,
    status: result.status === 'existing' ? 'existing' : 'created',
    position: Number(result.position) || null,
    mockupUrl: /^https:\/\//.test(result.mockupUrl || '') ? result.mockupUrl : null,
  })
}

export const onRequest = () => reply(405, { ok: false, error: 'method_not_allowed' })
