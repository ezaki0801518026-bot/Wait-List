import { bindLangSwitch } from './lang.js'

const TITLES = {
  en: ['Privacy notice — WA-Chain Edu early access list', '← Back to the early access list'],
  ja: ['プライバシーに関するお知らせ — WA-Chain Edu 先行案内リスト', '← 先行案内リストに戻る'],
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
