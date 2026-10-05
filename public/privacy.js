import { bindLangSwitch } from './lang.js'

const TITLES = {
  en: ['Privacy notice — WA-Chain Edu waitlist', '← Back to the waitlist'],
  ja: ['プライバシーに関するお知らせ — WA-Chain Edu ウェイトリスト', '← ウェイトリストに戻る'],
}

bindLangSwitch((lang) => {
  document.querySelectorAll('[data-lang-section]').forEach((el) => {
    el.hidden = el.dataset.langSection !== lang
  })
  document.title = TITLES[lang][0]
  const back = document.getElementById('back-link')
  back.textContent = TITLES[lang][1]
  back.href = `/?lang=${lang}`
  document.getElementById('home-link').href = `/?lang=${lang}`
})
