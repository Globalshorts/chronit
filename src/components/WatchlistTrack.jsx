import { useState, useEffect } from 'react'
import { Bookmark, RefreshCw, Gift, Check, Lock, Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'

// 워치리스트 성장 트랙 — 등록 → 갱신을 번갈아 태우는 순차 트랙.
// 지금 할 단계 하나만 크게 보여주고 나머지는 로드맵으로 흐리게 둔다(다음에 뭘 할지만 보이게).
export default function WatchlistTrack({ onGo, onClaimed }) {
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let dead = false
    const run = async () => {
      let list = []
      try {
        const { data } = await supabase.rpc('get_watchlist_track_rpc')
        if (data?.ok && Array.isArray(data.steps)) list = data.steps
      } catch { /* noop */ }
      if (dead) return
      setSteps(list)
      setLoading(false)
    }
    run()
    return () => { dead = true }
  }, [])

  const reload = async () => {
    try {
      const { data } = await supabase.rpc('get_watchlist_track_rpc')
      setSteps(data?.ok && Array.isArray(data.steps) ? data.steps : [])
    } catch { /* noop */ }
  }

  if (loading || !steps.length) return null

  const active = steps.find((s) => s.active) || null
  const doneCount = steps.filter((s) => s.claimed).length

  const claim = async (key) => {
    if (busy) return
    setBusy(key); setMsg(null)
    try {
      const { data, error } = await supabase.rpc('claim_track_step_rpc', { p_key: key })
      if (error || !data?.ok) setMsg({ ok: false, text: data?.error || '받을 수 없어요' })
      else {
        setMsg({ ok: true, text: `이용권 ${data.reward}개 지급` })
        try { phCapture('track_step_claimed', { key, reward: data.reward }) } catch { /* noop */ }
        onClaimed?.(data.reward)
      }
    } catch { setMsg({ ok: false, text: '받을 수 없어요' }) }
    setBusy('')
    reload()
  }

  // 갱신 단계는 '갱신을 실행하러 가는 것'이 핵심이라 버튼이 워치리스트로 보낸다
  const go = (step) => {
    try { phCapture('track_step_cta', { key: step.key, type: step.type }) } catch { /* noop */ }
    onGo?.()
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Bookmark size={14} className="text-emerald-400" />
        <h4 className="text-sm font-bold text-white">워치리스트 성장</h4>
        <span className="ml-auto text-[11px] text-white/35">{doneCount}/{steps.length} 단계</span>
      </div>

      {msg && (
        <p className={`mb-2.5 rounded-lg px-3 py-2 text-xs font-bold ${msg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{msg.text}</p>
      )}

      {active ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-3.5">
          <div className="flex items-center gap-2">
            {active.type === 'refresh'
              ? <RefreshCw size={14} className="shrink-0 text-emerald-400" />
              : <Bookmark size={14} className="shrink-0 text-emerald-400" />}
            <p className="min-w-0 flex-1 text-sm font-bold text-white">{active.title || active.key}</p>
            <span className="shrink-0 text-[11px] font-bold text-white/50">+{active.reward}</span>
          </div>
          {active.desc && <p className="mt-1 text-[11px] leading-relaxed text-white/45">{active.desc}</p>}

          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-[width] duration-500 ${active.done ? 'bg-emerald-400' : 'bg-[#0064FF]'}`}
                style={{ width: (active.target > 0 ? Math.min(100, Math.round((active.progress / active.target) * 100)) : 0) + '%' }} />
            </div>
            <span className="shrink-0 text-[11px] font-bold text-white/45">{active.progress}/{active.target}</span>
          </div>

          {active.done ? (
            <button onClick={() => claim(active.key)} disabled={!!busy}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50">
              {busy === active.key ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}수령하기
            </button>
          ) : (
            <button onClick={() => go(active)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white transition hover:brightness-95">
              {active.type === 'refresh' ? <><RefreshCw size={14} />지금 갱신하러 가기</> : <><Bookmark size={14} />계정 추가하러 가기</>}
            </button>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-center text-xs font-bold text-emerald-400">
          모든 단계를 완료했어요 🎉
        </p>
      )}

      {/* 로드맵 — 지금 단계 말고는 흐리게 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {steps.map((s) => (
          <span key={s.key}
            title={s.title || s.key}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              s.claimed ? 'bg-emerald-500/15 text-emerald-400'
                : s.active ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/30'}`}>
            {s.claimed ? <Check size={10} /> : s.locked ? <Lock size={10} /> : <ChevronRight size={10} />}
            {s.type === 'refresh' ? '갱신' : s.target}
          </span>
        ))}
      </div>
    </div>
  )
}
