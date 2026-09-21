// 트렌드 첫 방문 코치마크 — "뭘 누르면 되는지"를 한 번만 짚어준다.
//
// 없음 = 아직 안 봤다(첫 방문) → 띄운다.
// 'done' = 봤거나 닫았다 → 다시 안 띄운다.
// 'pending' = 온보딩이 방금 끝나 트렌드로 내려보냈다 → 띄운다.
const KEY = 'chr_coach_trend'

export const armCoach = () => { try { localStorage.setItem(KEY, 'pending') } catch { /* noop */ } }
export const coachPending = () => { try { return localStorage.getItem(KEY) !== 'done' } catch { return false } }
export const dismissCoach = () => { try { localStorage.setItem(KEY, 'done') } catch { /* noop */ } }
