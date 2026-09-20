// 카카오 채널 추가 (JS SDK) — 실패하면 채널 친구추가 페이지로 폴백.
const JS_KEY = '353a4888db09fd32ef2f787755cd758a'
const CHANNEL_ID = '_DcNnX'
const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'

export const CHANNEL_URL = `https://pf.kakao.com/${CHANNEL_ID}/friend`

let loader = null

// addChannel 은 팝업을 띄우므로 클릭 핸들러 안에서 '동기로' 불러야 한다.
// (await 뒤에 부르면 사용자 제스처가 끊겨 팝업 차단에 걸린다) → 화면 진입 시 미리 로드해둔다.
export function preloadKakao() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Kakao) { init(); return Promise.resolve(true) }
  if (loader) return loader
  loader = new Promise((resolve) => {
    try {
      const s = document.createElement('script')
      s.src = SDK_SRC
      s.async = true
      s.onload = () => { resolve(init()) }
      s.onerror = () => resolve(false)
      document.head.appendChild(s)
    } catch { resolve(false) }
  })
  return loader
}

function init() {
  try {
    if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(JS_KEY)
    return !!(window.Kakao && window.Kakao.isInitialized())
  } catch { return false }
}

// 반환값은 '어떤 경로로 열었는지'일 뿐, 사용자가 실제로 추가를 끝냈는지는 알 수 없다.
// (카카오 SDK 가 추가 완료 콜백을 주지 않는다)
export function addKakaoChannel() {
  try {
    if (window.Kakao?.Channel?.addChannel && init()) {
      window.Kakao.Channel.addChannel({ channelPublicId: CHANNEL_ID })
      return 'sdk'
    }
  } catch { /* noop */ }
  try {
    window.open(CHANNEL_URL, '_blank', 'noopener,noreferrer')
    return 'fallback'
  } catch { return 'failed' }
}
