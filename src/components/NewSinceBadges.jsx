import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Bookmark } from 'lucide-react'
import { supabase } from '../lib/supabase'

// "지난 방문 이후 새 N건" 배지 두 개 — 트렌드와 워치리스트.
// 기준 시각은 이 기기의 localStorage 에만 둔다(서버 왕복 없음).
const TREND_KEY = 'chr_trend_lastSeen'
const WATCH_KEY = 'chr_watch_lastSeen'

const readAt = (key) => {
  try { return Number(localStorage.getItem(key) || 0) } catch { return 0 }
}
const writeNow = (key) => {
  try { localStorage.setItem(key, String(Date.now())) } catch { /* noop */ }
}

export default function NewSinceBadges({ enabled, items }) {
  const nav = useNavigate()
  // 마운트 시점의 '지난 방문'을 한 번만 읽어 붙잡아 둔다 — 아래에서 바로 지금으로 갱신하기 때문
  const [since] = useState(() => ({ trend: readAt(TREND_KEY), watch: readAt(WATCH_KEY) }))

  const [watchNew, setWatchNew] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let dead = false
    const at = since.watch
    if (!at) { writeNow(WATCH_KEY); return }   // 첫 방문은 비교 대상이 없다
    ;(async () => {
      try {
        const { count } = await supabase
          .from('watch_feed')
          .select('shortcode', { count: 'exact', head: true })
          .gt('fetched_at', new Date(at).toISOString())
        if (!dead) setWatchNew(count || 0)
      } catch { /* noop */ }
    })()
    return () => { dead = true }
  }, [enabled, since])

  // 트렌드는 이미 받아온 목록에서 센다
  const trendSince = since.trend
  const trendNew = !enabled || !trendSince
    ? 0
    : (items || []).filter((it) => it?.taken_at && new Date(it.taken_at).getTime() > trendSince).length

  // 본 것으로 표시 — 다음 방문 때는 지금 이후만 '새 것'이다
  useEffect(() => {
    if (!enabled) return
    writeNow(TREND_KEY)
  }, [enabled])

  if (!enabled || (!trendNew && !watchNew)) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {trendNew > 0 && (
        <span className="flex items-center gap-1.5 rounded-full border border-[#0064FF]/30 bg-[#0064FF]/10 px-3 py-1.5 text-xs font-bold text-[#7FB2FF]">
          <Flame size={12} />지난 방문 이후 새 {trendNew.toLocaleString('ko-KR')}건
        </span>
      )}
      {watchNew > 0 && (
        <button onClick={() => { writeNow(WATCH_KEY); nav('/watchlist') }}
          className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20">
          <Bookmark size={12} />관심 계정 새 소재 {watchNew.toLocaleString('ko-KR')}건
        </button>
      )}
    </div>
  )
}
