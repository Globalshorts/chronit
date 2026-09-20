import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, Loader2, Download } from 'lucide-react'
import { phCapture } from '../lib/posthog'
import { pushSupported, pushPermission, subscribePush, hasSubscription } from '../lib/push'

// 알림 켜기 버튼.
// 권한 요청은 반드시 사용자가 누른 순간에 해야 프롬프트가 뜬다 — 그래서 자동 호출하지 않고 버튼을 둔다.
const isIOS = () => { try { return /iPhone|iPad|iPod/i.test(navigator.userAgent) } catch { return false } }
const isStandalone = () => {
  try { return !!(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone) } catch { return false }
}

export default function PushToggle() {
  const [state, setState] = useState('checking')   // checking|on|off|denied|ios-install|unsupported
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let dead = false
    const run = async () => {
      // iOS 는 사파리 탭에서 웹푸시가 안 되고, 홈 화면에 추가해 앱처럼 실행해야 한다(16.4+)
      if (isIOS() && !isStandalone()) { if (!dead) setState('ios-install'); return }
      if (!pushSupported()) { if (!dead) setState('unsupported'); return }
      const perm = pushPermission()
      if (perm === 'denied') { if (!dead) setState('denied'); return }
      const has = perm === 'granted' ? await hasSubscription() : false
      if (dead) return
      setState(has ? 'on' : 'off')
    }
    run()
    return () => { dead = true }
  }, [])

  const enable = async () => {
    setBusy(true); setErr('')
    const r = await subscribePush()
    setBusy(false)
    try { phCapture('push_subscribed', { ok: r.ok, reason: r.reason, from: 'toggle' }) } catch { /* noop */ }
    if (r.ok) setState('on')
    else if (r.reason === 'denied') setState('denied')
    else setErr('알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.')
  }

  if (state === 'checking' || state === 'unsupported') return null

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${state === 'on' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#0064FF]/10 text-[#0064FF]'}`}>
          {state === 'denied' ? <BellOff size={17} /> : <Bell size={17} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">새 소재 알림</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            {state === 'on' && '관심 계정에 새 소재가 올라오면 알려드려요.'}
            {state === 'off' && '관심 계정에 새 소재가 올라오면 알림으로 보내드려요. 언제든 끌 수 있어요.'}
            {state === 'denied' && '브라우저에서 이 사이트의 알림이 차단돼 있어요. 주소창 옆 자물쇠 → 알림 허용으로 바꿔주세요.'}
            {state === 'ios-install' && '아이폰은 홈 화면에 추가한 뒤 앱으로 열어야 알림을 받을 수 있어요. (iOS 16.4 이상)'}
          </p>
          {err && <p className="mt-1 text-xs font-bold text-red-500">{err}</p>}
        </div>

        {state === 'on' && (
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600"><Check size={13} />켜짐</span>
        )}
        {state === 'off' && (
          <button onClick={enable} disabled={busy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0064FF] px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-95 disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}알림 받기
          </button>
        )}
        {state === 'ios-install' && (
          <button onClick={() => { try { phCapture('install_prompt_clicked', { from: 'push_toggle' }) } catch { /* noop */ } window.dispatchEvent(new Event('chronit:open-install')) }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0064FF] px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-95">
            <Download size={13} />홈 화면에 추가
          </button>
        )}
      </div>
    </div>
  )
}
