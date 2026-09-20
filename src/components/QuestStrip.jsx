import { useState, useEffect, useCallback } from 'react'
import { Trophy, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { claimableCount } from '../lib/quests'
import QuestPanel from './QuestPanel'

// 트렌드 상단의 얇은 미션 스트립. 진입할 때 출석(checkin)을 한 번 찍는다.
const CHECKIN_KEY = 'chr_checkin_at'

export default function QuestStrip({ enabled }) {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_quests_rpc')
      if (data?.ok) setReady(claimableCount(data.quests))
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (!enabled) return
    let dead = false
    const run = async () => {
      // 출석은 하루 한 번이면 충분하다(서버도 날짜 단위로 중복을 막는다)
      try {
        const today = new Date().toDateString()
        if (localStorage.getItem(CHECKIN_KEY) !== today) {
          await supabase.rpc('checkin_rpc')
          try { localStorage.setItem(CHECKIN_KEY, today) } catch { /* noop */ }
        }
      } catch { /* noop */ }
      if (!dead) refresh()
    }
    run()
    return () => { dead = true }
  }, [enabled, refresh])

  if (!enabled) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3.5 py-2.5 text-left transition hover:bg-amber-400/[0.12] active:scale-[0.99]">
        <Trophy size={15} className="shrink-0 text-amber-400" />
        <span className="min-w-0 flex-1 text-sm font-bold text-white">
          미션
          {ready > 0
            ? <span className="ml-1.5 font-medium text-amber-300">{ready}개 받을 수 있어요</span>
            : <span className="ml-1.5 font-medium text-white/45">이용권을 모아보세요</span>}
        </span>
        {ready > 0 && (
          <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-900">{ready}</span>
        )}
        <ChevronRight size={15} className="shrink-0 text-white/30" />
      </button>

      <QuestPanel open={open} onClose={() => { setOpen(false); refresh() }} onClaimed={refresh} />
    </>
  )
}
