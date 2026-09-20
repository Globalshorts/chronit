// 퀘스트·주간 미션 보조 유틸.
//
// 문구(title/desc)는 서버가 내려준다 — get_quests_rpc / get_weekly_missions_rpc.
// 예전엔 키→문구 맵을 프론트에 두었는데, 서버가 키를 바꾸면(예: 방문 미션이 주간으로 이동)
// 맵에 없는 키가 그대로 화면에 찍혔다. 그래서 문구는 서버 것만 쓴다.
export const labelOf = (item) => ({
  title: item?.title || item?.key || '',
  desc: item?.desc || '',
})

// 지금 받을 수 있는 일회성 퀘스트 수
export const claimableCount = (list) =>
  (list || []).filter((q) => q.eligible && !q.claimed).length

// 지금 받을 수 있는 주간 미션 수 (자동 지급분은 버튼이 없으니 제외)
export const weeklyClaimable = (list) =>
  (list || []).filter((m) => m.done && !m.claimed && !m.auto).length
