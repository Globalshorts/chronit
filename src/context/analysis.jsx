import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ChannelModal from '../components/ChannelModal'

const SB = import.meta.env.VITE_SUPABASE_URL || 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const AnalysisCtx = createContext(null)
export const useAnalysis = () => useContext(AnalysisCtx) || {}

// 채널 분석을 앱 레벨에서 관리 → 페이지 이동해도(Finds→트렌드 등) 계속 진행
export function AnalysisProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!loading) return
    setProgress(6)
    const iv = setInterval(() => setProgress((x) => (x >= 92 ? 92 : x + Math.max(0.4, (92 - x) * 0.05))), 250)
    return () => { clearInterval(iv); setProgress(100); setTimeout(() => setProgress(0), 500) }
  }, [loading])

  const startChannel = useCallback(async (input, onRefund) => {
    setOpen(true); setLoading(true); setErr(''); setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(`${SB}/functions/v1/analyze-channel`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input }),
      })
      const d = await r.json()
      if (d.ok) setResult(d)
      else { setErr(d.error || '분석에 실패했어요.'); try { await supabase.rpc('refund_finds_credit_rpc'); onRefund && onRefund() } catch { /* noop */ } }
    } catch {
      setErr('분석 중 오류가 발생했어요.'); try { await supabase.rpc('refund_finds_credit_rpc'); onRefund && onRefund() } catch { /* noop */ }
    } finally { setLoading(false) }
  }, [])

  return (
    <AnalysisCtx.Provider value={{ startChannel, channelLoading: loading, channelResult: result, reopenChannel: () => { if (result) setOpen(true) } }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px]">
        {loading && <div className="h-full bg-gradient-to-r from-[#2A7BFF] via-[#0064FF] to-[#7C6BFF] transition-[width] duration-300 ease-out" style={{ width: progress + '%' }} />}
      </div>
      {children}
      <ChannelModal open={open} loading={loading} progress={progress} result={result} err={err} onClose={() => setOpen(false)} />
    </AnalysisCtx.Provider>
  )
}
