// 메타 픽셀 전환 이벤트 헬퍼.
// index.html의 픽셀은 load 후 1.2초 지연 로드되므로, 그 전에 발생한 이벤트는
// 큐에 담아뒀다가 fbq가 준비되면 순서대로 전송한다. (광고차단/미로딩 시엔 조용히 버림)
const queue = []
let timer = null
const WAIT_MS = 15000
const startedAt = Date.now()

const flush = () => {
  if (typeof window === 'undefined') return
  if (window.fbq) {
    while (queue.length) {
      const [event, params] = queue.shift()
      try { window.fbq('track', event, params) } catch { /* noop */ }
    }
  }
  if (!queue.length || Date.now() - startedAt > WAIT_MS) {
    if (timer) { clearInterval(timer); timer = null }
    queue.length = 0
  }
}

export function fbTrack(event, params) {
  try {
    if (typeof window === 'undefined' || !event) return
    if (window.fbq) { window.fbq('track', event, params); return }
    queue.push([event, params])
    if (!timer) timer = setInterval(flush, 300)
  } catch { /* noop */ }
}
