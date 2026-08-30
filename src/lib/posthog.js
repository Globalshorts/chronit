import posthog from 'posthog-js'

// VITE_POSTHOG_KEY 가 설정된 경우에만 초기화 — 미설정 시 모든 호출 no-op(안전).
const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
let ready = false

export function initPosthog() {
  if (ready) return
  if (!KEY) {
    // 키 미설정 = 세션 녹화/이벤트 전혀 수집 안 됨. 배포 환경에서 콘솔로 바로 확인 가능하게.
    try { console.warn('[posthog] VITE_POSTHOG_KEY 미설정 — 세션 녹화/이벤트 수집 꺼짐') } catch {}
    return
  }
  try {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,                 // 클릭/입력 자동 캡처(어디서 막히는지 파악)
      person_profiles: 'identified_only',
      // ── 세션 녹화 명시적 ON (이탈 지점 육안 확인용) ──
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,             // 개인정보(입력값) 마스킹 — 프라이버시 보호
        // 검색창(비민감)만 마스킹 해제 → 녹화에서 실제 검색어 확인용
        maskInputFn: (text, el) => { try { if (el && el.getAttribute && el.getAttribute('data-ph-search') === '1') return text } catch { /* noop */ } return '*'.repeat((text || '').length) },
        maskTextSelector: '[data-ph-mask]',
        recordCrossOriginIframes: false,
      },
    })
    // 프로젝트 설정이 꺼져 있어도 코드에서 강제 시작
    try { posthog.startSessionRecording() } catch {}
    ready = true
  } catch { /* noop */ }
}
export function phIdentify(uid) { try { if (ready && uid) posthog.identify(uid) } catch {} }
export function phReset() { try { if (ready) posthog.reset() } catch {} }
// 제품 이벤트 캡처용(가입/첫영상/생성완료 등 퍼널 이벤트를 붙일 때 사용)
export function phCapture(event, props) { try { if (ready && event) posthog.capture(event, props || {}) } catch {} }
