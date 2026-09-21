import { supabase } from './supabase'

// 트렌드/패스트벤치 목록 보관소.
//
// 두 겹으로 둔다.
//  1) 메모리: 세션 동안 유지 → 탭을 옮겼다 돌아와도 다시 안 받는다(로딩 0).
//  2) 디스크(localStorage): '골격'만 — 썸네일·제목·순서·소유자.
//     댓글/조회/좋아요/velocity 같은 변동 수치는 절대 저장하지 않는다.
//     저장해두고 그리면 옛 숫자가 잠깐 보였다가 바뀌어(30 → 33) 틀린 값을 보여주게 된다.
const SKELETON_KEY = 'chr_trend_skeleton'
const SKELETON_MAX = 60

// 숫자가 빠진 채로 그려질 행에는 표시를 남겨, 카드가 0 대신 자리(스켈레톤)를 그리게 한다
const SKELETON_FIELDS = ['shortcode', 'url', 'thumbnail_url', 'owner', 'post_type', 'category', 'taken_at', 'caption']

const mem = { list: null, fb: null }
const detailCache = new Map()

export const memList = () => mem.list
export const memFb = () => mem.fb

const saveSkeleton = (rows) => {
  try {
    const slim = (rows || []).slice(0, SKELETON_MAX).map((r) => {
      const o = {}
      for (const k of SKELETON_FIELDS) if (r[k] != null) o[k] = r[k]
      return o
    })
    localStorage.setItem(SKELETON_KEY, JSON.stringify({ rows: slim, at: Date.now() }))
  } catch { /* noop */ }
}

// 진입 즉시 그릴 골격. 수치 필드는 아예 없고 _skeleton 이 붙는다.
export const readSkeleton = () => {
  try {
    const c = JSON.parse(localStorage.getItem(SKELETON_KEY) || 'null')
    if (!c || !Array.isArray(c.rows) || !c.rows.length) return null
    return c.rows.map((r) => ({ ...r, _skeleton: true }))
  } catch { return null }
}

export async function loadTrendList({ limit = 200, days = 8, includeCarousel = true } = {}) {
  const { data, error } = await supabase.rpc('trend_list_rpc', {
    p_limit: limit, p_days: days, p_include_carousel: includeCarousel,
  })
  if (error) throw error
  const rows = Array.isArray(data) ? data : []
  mem.list = rows
  saveSkeleton(rows)
  return rows
}

export async function loadFastbench({ limit = 60, minComments = 200, days = 21, includeCarousel = true, maxFollowers = null } = {}) {
  const { data, error } = await supabase.rpc('fastbench_feed_rpc', {
    p_limit: limit, p_min_comments: minComments, p_days: days,
    p_include_carousel: includeCarousel, p_max_followers: maxFollowers,
  })
  if (error) throw error
  const rows = Array.isArray(data) ? data : []
  mem.fb = rows
  return rows
}

// 재생·이미지·전체 캡션은 카드를 누를 때만. 목록에 싣지 않아 payload 를 가볍게 유지한다.
export async function loadDetail(shortcode) {
  if (!shortcode) return null
  if (detailCache.has(shortcode)) return detailCache.get(shortcode)
  try {
    const { data } = await supabase.rpc('trend_detail_rpc', { p_shortcode: shortcode })
    const d = data && data.shortcode ? data : null
    if (d) detailCache.set(shortcode, d)
    return d
  } catch { return null }
}

// 앱이 뜨면 뒤에서 미리 받아둔다 — 트렌드에 처음 들어갈 때 이미 떠 있게.
let prefetched = false
export function prefetchFeeds() {
  if (prefetched) return
  prefetched = true
  loadTrendList().catch(() => { prefetched = false })
  loadFastbench().catch(() => {})
}
