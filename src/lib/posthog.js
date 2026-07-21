import posthog from 'posthog-js'

// VITE_POSTHOG_KEY 가 설정된 경우에만 초기화 — 미설정 시 모든 호출 no-op(안전).
const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
let ready = false

export function initPosthog() {
  if (ready || !KEY) return
  try {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: 'identified_only',
    })
    ready = true
  } catch { /* noop */ }
}
export function phIdentify(uid) { try { if (ready && uid) posthog.identify(uid) } catch {} }
export function phReset() { try { if (ready) posthog.reset() } catch {} }
