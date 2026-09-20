import { useState, useEffect } from 'react'
import { Bell, Download, X, Loader2 } from 'lucide-react'
import { phCapture } from '../lib/posthog'
import { pushSupported, pushPermission, subscribePush, hasSubscription } from '../lib/push'

// 분석 결과를 막 본 직후(= 가치를 느낀 순간)에만 알림/설치를 권한다.
// 거절하면 한동안 다시 묻지 않는다.
const SNOOZE_KEY = 'chr_push_snooze'
const SNOOZE_MS = 14 * 86400000

const snoozed = () => {
  try { const t = Number(localStorage.getItem(SNOOZE_KEY) || 0); return t && Date.now() - t < SNOOZE_MS } catch { return false }
}
const snooze = () => { try { localStorage.setItem(SNOOZE_KEY, String(Date.now())) } catch { /* noop */ } }

const isStandalone = () => {
  try { return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone } catch { return false }
}

export default function PushPrompt() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  useEffect(() => {
    const onDone = async () => {
      if (!pushSupported() || snoozed()) return
      const perm = pushPermission()
      if (perm === 'denied') return
      // 이미 허용해 둔 사람은 조용히 구독만 되살린다(또 물어보지 않는다)
      if (perm === 'granted') {
        if (!(await hasSubscription())) subscribePush()
        return
      }
      setOpen(true)
      try { phCapture('push_prompt_shown') } catch { /* noop */ }
    }
    window.addEventListener('chronit:analysis-done', onDone)
    return () => window.removeEventListener('chronit:analysis-done', onDone)
  }, [])

  if (!open) return null

  const close = () => { snooze(); setOpen(false) }

  const allow = async () => {
    setBusy(true)
    const r = await subscribePush()
    setBusy(false)
    try { phCapture('push_subscribed', { ok: r.ok, reason: r.reason }) } catch { /* noop */ }
    if (r.ok) { setDone('알림을 켰어요'); setTimeout(() => setOpen(false), 1400) }
    else { setDone(r.reason === 'denied' ? '브라우저에서 알림이 차단돼 있어요' : '알림을 켜지 못했어요'); snooze() }
  }

  const install = () => {
    try { phCapture('install_prompt_clicked', { from: 'push_prompt' }) } catch { /* noop */ }
    window.dispatchEvent(new Event('chronit:open-install'))
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[92] flex justify-center px-4 pb-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 p-4 shadow-2xl" style={{ background: '#14161c' }}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0064FF]/15 text-[#7FB2FF]">
            <Bell size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">터지는 소재가 뜨면 바로 알려드릴까요?</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">
              관심 계정에 새 소재가 올라오면 알림으로 보내드려요. 언제든 끌 수 있어요.
            </p>
          </div>
          <button onClick={close} aria-label="닫기" className="shrink-0 p-1 text-white/35 hover:text-white/70"><X size={16} /></button>
        </div>

        {done ? (
          <p className="mt-3 text-xs font-bold text-emerald-400">{done}</p>
        ) : (
          <div className="mt-3 flex gap-2">
            <button onClick={allow} disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}알림 받기
            </button>
            {!isStandalone() && (
              <button onClick={install}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2.5 text-sm font-bold text-white/70 transition hover:border-[#0064FF] hover:text-white">
                <Download size={14} />앱으로 설치
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
