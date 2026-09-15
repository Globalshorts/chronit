import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ReferralCTA from '../components/ReferralCTA'
import { phCapture } from '../lib/posthog'
import { fbTrack } from '../lib/fbq'
import { PLAN_SPEC } from '../lib/planLabels'

// 결제 금액 구하기.
// 단건(confirm)은 URL 의 amount 가 그대로 청구액이고,
// 정기결제(billing)는 toss-confirm 응답에 금액이 없어서 plans 에서 가져온다(연간은 ×9 — 서버와 같은 규칙).
async function resolveValue({ mode, plan, period, urlAmount }) {
  if (mode !== 'billing') return Number(urlAmount) || 0
  let price = PLAN_SPEC[plan]?.price || 0
  try {
    const { data } = await supabase.from('plans').select('monthly_price').eq('id', plan).maybeSingle()
    if (Number(data?.monthly_price) > 0) price = Number(data.monthly_price)
  } catch { /* noop */ }
  return period === 'annual' ? price * 9 : price
}

export default function PaymentResult({ fail = false }) {
  const [params] = useSearchParams()
  const [state, setState] = useState(fail ? 'fail' : 'loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (fail) { setMsg(params.get('message') || '결제가 취소되었거나 실패했어요.'); return }
    const run = async () => {
      const type = params.get('type')
      const mode = type === 'billing' ? 'billing' : 'confirm'
      const body = mode === 'billing'
        ? { mode: 'billing', authKey: params.get('authKey'), customerKey: params.get('customerKey'), plan: params.get('plan'), period: params.get('period') || 'monthly' }
        : { mode: 'confirm', paymentKey: params.get('paymentKey'), orderId: params.get('orderId'), amount: Number(params.get('amount') || 0) }
      try {
        const { data, error } = await supabase.functions.invoke('toss-confirm', { body })
        if (error || data?.error || data?.ok === false) {
          setState('fail'); setMsg(data?.error || error?.message || '결제 확인에 실패했어요.')
          return
        }
        setState('success'); setMsg(data?.message || '결제가 완료되었어요.')

        // ── 전환 기록 ──
        // already=true 는 새로고침 등으로 다시 들어온 것이라 집계하지 않는다.
        if (data?.already) return
        const eventId = data?.event_id || params.get('orderId') || ''
        const key = 'chr_purchase_' + eventId
        try { if (eventId && localStorage.getItem(key)) return } catch { /* noop */ }

        const plan = data?.plan || params.get('plan') || ''
        const value = await resolveValue({ mode, plan, period: data?.period || params.get('period'), urlAmount: params.get('amount') })

        try { phCapture('purchase', { plan, value, currency: 'KRW', event_id: eventId }) } catch { /* noop */ }
        // eventID 는 toss-confirm 이 CAPI 로 보낸 것과 같은 값 — 메타에서 서버/브라우저 이벤트가 합쳐진다
        fbTrack('Purchase', { value, currency: 'KRW', content_name: plan }, eventId ? { eventID: eventId } : undefined)
        try { if (eventId) localStorage.setItem(key, '1') } catch { /* noop */ }
      } catch (e) { setState('fail'); setMsg(String(e?.message || e)) }
    }
    run()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] px-6 text-center font-sans">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
        {state === 'loading' && <p className="text-lg font-bold text-gray-700">결제를 확인하고 있어요…</p>}
        {state === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0064FF]/10 text-2xl">✅</div>
            <h1 className="text-xl font-bold text-gray-900">결제 완료</h1>
            <p className="mt-2 text-sm text-gray-600">{msg}</p>
            <ReferralCTA variant="card" className="mt-5 text-left" /><Link to="/trend" className="mt-6 inline-block w-full rounded-2xl bg-[#0064FF] py-3.5 text-base font-bold text-white">소재 찾으러 가기</Link>
          </>
        )}
        {state === 'fail' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900">결제 실패</h1>
            <p className="mt-2 text-sm text-gray-600">{msg}</p>
            <Link to="/pricing" className="mt-6 inline-block w-full rounded-2xl border border-gray-200 py-3.5 text-base font-bold text-gray-800">돌아가기</Link>
          </>
        )}
      </div>
    </div>
  )
}
