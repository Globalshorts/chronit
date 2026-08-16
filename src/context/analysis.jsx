import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ChannelModal from '../components/ChannelModal'

const SB = import.meta.env.VITE_SUPABASE_URL || 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const AnalysisCtx = createContext(null)
export const useAnalysis = () => useContext(AnalysisCtx) || {}

// 채널 분석을 앱 레벨에서 관리 → 페이지 이동해도(Finds→트렌드 등) 계속 진행
// 진행률: 백엔드가 DB에 기록하는 실제 단계(pct/stage)를 폴링해 목표로 삼아 바를 채운다.
export function AnalysisProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const targetRef = useRef(8)

  // 실제 백엔드 단계(targetRef)를 향해 부드럽게 차오른다
  useEffect(() => {
    if (!loading) return
    const iv = setInterval(() => setProgress((x) => {
      const tgt = targetRef.current
      if (x >= tgt) return x
      return Math.min(tgt, x + Math.max(0.5, (tgt - x) * 0.18))
    }), 120)
    return () => { clearInterval(iv); setProgress(100); setTimeout(() => { setProgress(0); setStage('') }, 500) }
  }, [loading])

  const startChannel = useCallback(async (input, onRefund) => {
    setOpen(true); setLoading(true); setErr(''); setResult(null); setStage('시작하는 중'); targetRef.current = 8; setProgress(4)
    const refund = async () => { try { await supabase.rpc('refund_finds_credit_rpc'); onRefund && onRefund() } catch { /* noop */ } }
    const post = async (payload) => {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SB}/functions/v1/analyze-channel`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      return r.json()
    }
    try {
      const started = await post({ input })
      if (!started?.ok || !started.job_id) { setErr(started?.error || '분석에 실패했어요.'); await refund(); setLoading(false); return }
      const jobId = started.job_id
      const t0 = Date.now()
      for (;;) {
        await new Promise((res) => setTimeout(res, 1000))
        if (Date.now() - t0 > 180000) { setErr('분석이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'); await refund(); break }
        let d = null
        try { d = await post({ job_id: jobId }) } catch { continue }
        if (!d?.ok) { setErr(d?.error || '분석에 실패했어요.'); await refund(); break }
        if (typeof d.pct === 'number') targetRef.current = d.pct
        if (d.stage) setStage(d.stage)
        if (d.status === 'done') { targetRef.current = 100; setStage('완료'); setResult(d); break }
        if (d.status === 'error') { setErr(d.error || '분석에 실패했어요.'); await refund(); break }
      }
    } catch {
      setErr('분석 중 오류가 발생했어요.'); await refund()
    } finally { setLoading(false) }
  }, [])

  return (
    <AnalysisCtx.Provider value={{ startChannel, channelLoading: loading, channelResult: result, reopenChannel: () => { if (result) setOpen(true) } }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px]">
        {loading && <div className="h-full bg-gradient-to-r from-[#2A7BFF] via-[#0064FF] to-[#7C6BFF] transition-[width] duration-300 ease-out" style={{ width: progress + '%' }} />}
      </div>
      {children}
      <ChannelModal open={open} loading={loading} progress={progress} stage={stage} result={result} err={err} onClose={() => setOpen(false)} />
    </AnalysisCtx.Provider>
  )
}
