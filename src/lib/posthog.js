// posthog-js를 동적 import 하여 초기 번들에서 제외 (첫 페인트 후 지연 로드)
let posthog = null
let ready = false
let pendingUid = null

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

export async function initPosthog() {
  if (ready) return
  if (!KEY) {
    try { console.warn('[posthog] VITE_POSTHOG_KEY 미설정 — 세션 녹화/이벤트 수집 꺼짐') } catch {}
    return
  }
  try {
    const mod = await import('posthog-js')
    posthog = mod.default || mod
    const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: !isMobile,                 // 모바일은 자동캡처도 최소화
      person_profiles: 'identified_only',
      disable_session_recording: isMobile,    // 모바일: rrweb 녹화 OFF (메인스레드 보호)
      session_recording: {
        maskAllInputs: true,
        maskInputFn: (text, el) => { try { if (el && el.getAttribute && el.getAttribute('data-ph-search') === '1') return text } catch { /* noop */ } return '*'.repeat((text || '').length) },
        maskTextSelector: '[data-ph-mask]',
        recordCrossOriginIframes: false,
      },
    })
    try { if (!isMobile) posthog.startSessionRecording() } catch {}
    ready = true
    if (pendingUid) { try { posthog.identify(pendingUid) } catch {} ; pendingUid = null }
  } catch { /* noop */ }
}
export function phIdentify(uid) { try { if (!uid) return; if (ready && posthog) posthog.identify(uid); else pendingUid = uid } catch {} }
export function phReset() { try { pendingUid = null; if (ready && posthog) posthog.reset() } catch {} }
export function phCapture(event, props, opts) { try { if (ready && posthog && event) posthog.capture(event, props || {}, opts) } catch {} }
export function phFeatureFlag(key) { try { return (ready && posthog && posthog.getFeatureFlag) ? posthog.getFeatureFlag(key) : undefined } catch { return undefined } }
// 플래그가 로드되면 cb 호출. ready 전이면 잠깐 폴링해서 붙는다. unsubscribe 반환.
export function onPhFlags(cb) {
  let unsub = () => {}
  let poll = null, stop = null
  const attach = () => { try { if (posthog && posthog.onFeatureFlags) { const u = posthog.onFeatureFlags(() => cb()); if (typeof u === 'function') unsub = u } } catch { /* noop */ } }
  if (ready) attach()
  else {
    poll = setInterval(() => { if (ready) { clearInterval(poll); clearTimeout(stop); attach(); cb() } }, 300)
    stop = setTimeout(() => { try { clearInterval(poll) } catch { /* noop */ } }, 8000)
  }
  return () => { try { if (poll) clearInterval(poll); if (stop) clearTimeout(stop); unsub() } catch { /* noop */ } }
}
