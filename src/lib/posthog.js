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
export function phCapture(event, props) { try { if (ready && posthog && event) posthog.capture(event, props || {}) } catch {} }
