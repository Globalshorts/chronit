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
    if (window.gtag) window.gtag('event', 'sign_up', { method, event_category: 'conversion' })
  } catch { /* noop */ }
}
