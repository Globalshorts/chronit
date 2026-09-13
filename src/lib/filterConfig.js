// 피드 필터 공용 설정 — 트렌드 / 패스트벤치 / 워치리스트가 같은 값을 쓴다.
//
// 게시일 상한이 7일인 이유: 수집 쪽 보관 기간이 7일(watch-scan RECENCY_DAYS = 7)이라
// 7일보다 뒤를 고를 수 있게 해도 항상 빈 구간이 된다. 보관 기간이 바뀌면 여기만 고치면 된다.
export const DAY_MAX = 7
export const DAY_MARKS = [[1, '1일'], [3, '3일'], [5, '5일'], [DAY_MAX, '7일']]

// 패스트벤치 고유 게이트: 최근 2일. 사용자 슬라이더는 이 위에서 더 좁히는 방향으로만 적용된다.
export const FB_DAY_MAX = 2
export const FB_DAY_MARKS = [[1, '1일'], [FB_DAY_MAX, '2일']]

// 실제 필터 창(ms) — taken_at >= now - min(선택값, 상한)일
export const dayWindowMs = (days, cap = DAY_MAX) =>
  Math.min(Math.max(1, Number(days) || DAY_MAX), cap) * 86400000

export const COMMENT_MAX = 2000
export const COMMENT_MARKS = [[0, '전체'], [500, '500'], [1000, '1천'], [COMMENT_MAX, '2천+']]

export const FOLLOWER_MAX = 100000
export const FOLLOWER_MARKS = [[0, '0'], [10000, '1만'], [50000, '5만'], [FOLLOWER_MAX, '10만+']]

export const VIEW_MAX = 1000000
export const VIEW_MARKS = [[0, '전체'], [100000, '10만'], [500000, '50만'], [VIEW_MAX, '100만+']]

// 1만 이상은 '만' 단위로
export const manFmt = (n) => (n >= 10000 ? `${Math.round((n / 10000) * 10) / 10}만` : Number(n).toLocaleString('ko-KR'))
