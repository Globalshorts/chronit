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

// ── 콘텐츠 유형 (릴스 / 캐러셀) ──
// post_type 이 없는 행(구 캐시·마이그레이션 이전 행)은 릴스로 본다 — 기존 행은 모두 'reel' 이다.
export const POST_TYPES = [['all', '전체'], ['reel', '릴스'], ['carousel', '캐러셀']]
export const isCarousel = (it) => it?.post_type === 'carousel'
export const matchPostType = (it, type) =>
  type === 'all' || (type === 'carousel' ? isCarousel(it) : !isCarousel(it))

// 캐러셀은 thumbnail_url 이 비어 있을 수 있어 첫 장을 커버로 쓴다
export const imagesOf = (it) => (Array.isArray(it?.images) ? it.images.filter(Boolean) : [])
export const coverOf = (it) => it?.thumbnail_url || imagesOf(it)[0] || ''

// 캐러셀은 영상이 없으니 재생 모달 대신 인스타 게시물(/p/)을 새 탭으로 연다
export const openPost = (url) => { if (url) window.open(url, '_blank', 'noopener,noreferrer') }

// 캐러셀은 조회수가 0이라 조회수 정렬에서는 좋아요 수로 대신 비교한다
export const viewRankOf = (it) =>
  isCarousel(it) ? Number(it.like_count) || 0 : Number(it.view_count) || 0

// 트렌드·워치리스트 행 → 분석/재생 모달이 받는 clip 모양
export const feedClip = (it) => ({
  title: it.caption, source: 'instagram', thumbnail_url: coverOf(it), author: it.owner,
  views: it.view_count, likes: it.like_count, comments: it.comment_count,
  page_url: it.url, video_url: it.video_url, video_id: it.shortcode,
  taken_at: it.taken_at, velocity: it.velocity,
})
