// 퀘스트 표시용 이름표. 키·보상은 서버(get_quests_rpc)가 준다 — 여기선 문구만.
export const QUEST_ORDER = ['visit_d1', 'visit_d3', 'visit_d7', 'first_analysis', 'watch_3', 'save_1']

export const QUEST_META = {
  visit_d1: { title: '오늘 방문', desc: '크로닛에 하루 들르기' },
  visit_d3: { title: '3일 방문', desc: '서로 다른 날 3일 들르기' },
  visit_d7: { title: '7일 방문', desc: '서로 다른 날 7일 들르기' },
  first_analysis: { title: '첫 분석', desc: '소재를 하나 분석해보기' },
  watch_3: { title: '관심 계정 3개', desc: '워치리스트에 계정 3개 담기' },
  save_1: { title: '기획 저장', desc: '분석한 기획을 저장하기' },
}

export const questLabel = (key) => QUEST_META[key] || { title: key, desc: '' }

// 서버가 준 목록을 보기 좋은 순서로
export const sortQuests = (list) =>
  [...(list || [])].sort((a, b) => QUEST_ORDER.indexOf(a.key) - QUEST_ORDER.indexOf(b.key))

// 지금 받을 수 있는 개수
export const claimableCount = (list) =>
  (list || []).filter((q) => q.eligible && !q.claimed).length

// ── 주간 미션 (매주 월요일 리셋) ──
// 키·보상·목표는 서버(get_weekly_missions_rpc)가 준다 — 여기선 문구만.
export const WEEKLY_META = {
  w_analyze_3: { title: '이번 주 3회 분석', desc: '소재를 3개 분석해보기' },
  w_save_1: { title: '이번 주 1개 담기', desc: '마음에 드는 소재 담기' },
  w_proof_1: { title: '성과인증 1건', desc: '크로닛으로 만든 영상 인증하기' },
}

export const weeklyLabel = (key) => WEEKLY_META[key] || { title: key, desc: '' }

// 지금 받을 수 있는 주간 미션 수 (자동 지급분은 버튼이 없으니 제외)
export const weeklyClaimable = (list) =>
  (list || []).filter((m) => m.done && !m.claimed && !m.auto).length
