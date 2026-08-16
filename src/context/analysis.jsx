import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ChannelModal from '../components/ChannelModal'

const SB = import.meta.env.VITE_SUPABASE_URL || 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const AnalysisCtx = createContext(null)
export const useAnalysis = () => useContext(AnalysisCtx) || {}

// 채널 분석을 앱 레벨에서 관리 → 페이지 이동해도(Finds→트렌드 등) 계속 진행
// 진행률: 백엔드가 스트림으로 보내는 실제 단계(pct/stage)를 목표로 삼아 바를 채운다.
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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SB}/functions/v1/analyze-channel`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input }),
      })
      if (!r.ok || !r.body) {
        let e = ''; try { const d = await r.json(); e = d.error } catch { /* noop */ }
        setErr(e || '분석에 실패했어요.'); await refund(); return
      }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ''; let final = null
      for (;;) {
        const { value, done } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        let idx
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1)
          if (!line) continue
          let ev; try { ev = JSON.parse(line) } catch { continue }
          if (ev.t === 'p') { if (typeof ev.pct === 'number') targetRef.current = ev.pct; if (ev.stage) setStage(ev.stage) }
          else if (ev.t === 'done') { final = ev }
        }
      }
      if (final && final.ok) { targetRef.current = 100; setStage('완료'); setResult(final) }
      else { setErr((final && final.error) || '분석에 실패했어요.'); await refund() }
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
