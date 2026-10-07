import { logEvent } from './events'
import { supabase } from './supabase'

// 신규 계정일 때만 GA4 sign_up(전환) 1회 발생.
// - user.created_at 이 최근(30분 이내)이면 신규 가입으로 판단(재로그인 제외)
// - localStorage 가드로 새로고침/중복 발생 방지
// - 진입 페이지 무관(홈/ /start / /generate 전부 커버) — App 전역 리스너에서 호출
export function trackSignupIfNew(session) {
  try {
    const u = session && session.user
    if (!u || !u.id || !u.created_at) return
    const ageMs = Date.now() - new Date(u.created_at).getTime()
    if (!(ageMs >= 0) || ageMs > 30 * 60 * 1000) return
    const k = 'chronit_su_' + u.id
    if (localStorage.getItem(k)) return
    localStorage.setItem(k, '1')
    const method = (u.app_metadata && u.app_metadata.provider) || 'unknown'
    let acq = {}
    try { acq = JSON.parse(localStorage.getItem('chronit_acq') || '{}') || {} } catch { acq = {} }
    logEvent('signup_complete', { method, src: acq.source || '', medium: acq.medium || '', campaign: acq.campaign || '', content: acq.content || '', ref: (acq.ref || '').slice(0, 80) })
    // 유입 박제: /register 를 안 거치는 가입(AuthModal 등)도 여기서 기록 — 인증 콜백 밖에서 실행(데드락 방지)
    setTimeout(() => stampAcquisition(), 0)
    if (window.gtag) window.gtag('event', 'sign_up', { method, event_category: 'conversion' })
    if (window.fbq) window.fbq('track', 'CompleteRegistration', { registration_method: method })
  } catch { /* noop */ }
}

// 첫 방문 유입(chronit_acq)을 프로필에 1회 저장 — 경로 무관
export function stampAcquisition() {
  try {
    if (localStorage.getItem('chronit_acq_stamped')) return
    const raw = localStorage.getItem('chronit_acq')
    if (!raw) return
    const a = JSON.parse(raw)
    supabase.rpc('set_acquisition_rpc', {
      p_landing: a.landing || '', p_ref: a.ref || '', p_source: a.source || '', p_medium: a.medium || '',
      p_campaign: a.campaign || '', p_content: a.content || '', p_landing_at: a.t ? new Date(a.t).toISOString() : null,
    }).then(({ error }) => { if (!error) { try { localStorage.setItem('chronit_acq_stamped', '1') } catch { /* noop */ } } }, () => {})
  } catch { /* noop */ }
}
