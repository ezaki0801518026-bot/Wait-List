// Values shared by the page (app.js) and the server (functions/api/waitlist.js).
// The server re-validates every field against these lists, so the page can
// never store anything outside them.

// Planned release, as a calendar date in Japan time (JST, UTC+9).
// Keep in sync with RELEASE_DATE_LABEL in apps-script/Code.gs.
export const RELEASE_DATE = '2026-11-01'

// Version of the privacy notice the consent checkbox refers to. Bump it
// (and privacy.html) whenever the notice changes; it is stored per row.
export const CONSENT_VERSION = 'waitlist-notice-2026-10-10'

export const LIMITS = { name: 100, email: 254 }

export const AFFILIATIONS = [
  { code: 'museum', en: 'Museum / Gallery', ja: '美術館・博物館・ギャラリー' },
  { code: 'library', en: 'Library / Archive', ja: '図書館・文書館' },
  { code: 'university', en: 'University / Research institute', ja: '大学・研究機関' },
  { code: 'studio', en: 'Private conservation studio', ja: '民間の修復工房' },
  { code: 'independent', en: 'Independent / Freelance conservator', ja: '独立・フリーランスの修復士' },
  { code: 'student', en: 'Student / Trainee', ja: '学生・研修生' },
  { code: 'supplier', en: 'Paper supplier / Maker', ja: '紙の販売・製造' },
  { code: 'other', en: 'Other', ja: 'その他' },
]

// Where a registration came from, read from the link (?src=…&from=…) and
// stored as hidden columns. Only these values are kept; anything else
// becomes "other", so nothing typed into a URL can reach the sheet.
//   src  — the channel the link was shared through (none → "direct")
//   from — the button on the trial site that was used (none → "link")
export const SOURCES = ['dm', 'interview', 'interview-demo', 'linkedin', 'email']
export const ENTRIES = [
  'hero', 'about', 'chat', 'washimap', 'lexicon', 'tour',
  'pricing', 'lessons', 'glossary', 'community', 'cohort',
]

export function tag(value, allowed, none) {
  if (typeof value !== 'string' || !value) return none
  const v = value.trim().toLowerCase()
  return allowed.includes(v) || v === none || v === 'other' ? v : 'other'
}

// Optional "what interests you" question (any number of answers).
export const INTERESTS = [
  { code: 'support', en: 'Supporting WA-Chain', ja: 'WA-Chain を応援したい' },
  { code: 'videos', en: 'Video lessons', ja: '動画教材' },
  { code: 'samples', en: 'Washi samples', ja: '和紙サンプル' },
  { code: 'lexicon', en: 'Washi dictionary', ja: '和紙の単語辞書' },
  { code: 'map', en: 'Washi origins map', ja: '和紙の産地マップ' },
  { code: 'other', en: 'Something else', ja: 'その他' },
]

// ISO 3166-1 alpha-2. Display names come from Intl.DisplayNames in the
// viewer's language, so no translated list is kept here.
export const COUNTRY_CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ ' +
  'BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR ' +
  'CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ' +
  'ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ ' +
  'LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ ' +
  'MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF ' +
  'PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI ' +
  'SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR ' +
  'TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ')

// Deliberately simple: one @, no spaces, a dot in the domain. Anything
// stricter rejects real addresses; delivery is the real test.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function countryName(code, lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

// Whole days from today (Japan time) to the release date. 0 on release day,
// negative afterwards.
export function daysUntilRelease(now = new Date()) {
  const jstToday = new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10)
  const ms = Date.parse(RELEASE_DATE) - Date.parse(jstToday)
  return Math.round(ms / 86400000)
}
