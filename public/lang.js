// Language choice shared by the waitlist and the privacy notice.
// English by default; ?lang=ja or the switch selects Japanese. Only the
// language preference is kept in the browser — never any personal data.

const KEY = 'wa-waitlist-lang'

export function initialLang() {
  const param = new URLSearchParams(location.search).get('lang')
  if (param === 'en' || param === 'ja') return param
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'ja') return saved
  } catch {}
  return 'en'
}

export function bindLangSwitch(onChange) {
  const buttons = document.querySelectorAll('.lang-switch [data-lang]')
  const apply = (lang) => {
    document.documentElement.lang = lang
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)))
    onChange(lang)
  }
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      try {
        localStorage.setItem(KEY, b.dataset.lang)
      } catch {}
      apply(b.dataset.lang)
    }),
  )
  apply(initialLang())
}
