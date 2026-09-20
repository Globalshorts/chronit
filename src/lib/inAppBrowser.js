// 인스타그램·페이스북 인앱브라우저(웹뷰) 감지와 탈출.
// 웹뷰에서는 소셜 로그인·앱 설치·결제가 막히거나 세션이 유지되지 않아 이탈이 크다.

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '')

// FBAN/FBAV = 페이스북 앱 계열 웹뷰, Instagram = 인스타 웹뷰
export const isInAppBrowser = (s = ua()) => /Instagram|FBAN|FBAV/i.test(s)
export const isAndroid = (s = ua()) => /Android/i.test(s)
export const isIOS = (s = ua()) => /iPhone|iPad|iPod/i.test(s)

export const osOf = (s = ua()) => (isAndroid(s) ? 'android' : isIOS(s) ? 'ios' : 'other')

// 안드로이드 탈출용 intent 주소.
// package 를 지정하지 않으면 '기기 기본 브라우저'로 열린다 — 크롬을 강제하지 않는다.
// 주의: intent 문법이 '#Intent;...' 로 끝나므로 원본 URL 의 해시는 넣을 수 없다(구분자가 겹침).
export const androidIntentUrl = (href = window.location.href) => {
  try {
    const u = new URL(href)
    const scheme = u.protocol.replace(':', '') || 'https'
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${scheme};end`
  } catch {
    return `intent://chronit.kr/#Intent;scheme=https;end`
  }
}

export const copyCurrentUrl = async (href = window.location.href) => {
  try {
    await navigator.clipboard.writeText(href)
    return true
  } catch {
    // 웹뷰에서 clipboard API 가 막히는 경우가 있어 구식 방법으로 한 번 더
    try {
      const ta = document.createElement('textarea')
      ta.value = href
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch { return false }
  }
}
