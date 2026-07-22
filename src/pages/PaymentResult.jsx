import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PaymentResult({ fail = false }) {
  const [params] = useSearchParams()
  const [state, setState] = useState(fail ? 'fail' : 'loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (fail) { setMsg(params.get('message') || '결제가 취소되었거나 실패했어요.'); return }
    const run = async () => {
      const type = params.get('type')
      const body = type === 'billing'
        ? { mode: 'billing', authKey: params.get('authKey'), customerKey: params.get('customerKey'), plan: params.get('plan') }
        : { mode: 'confirm', paymentKey: params.get('paymentKey'), orderId: params.get('orderId'), amount: Number(params.get('amount') || 0) }
      try {
        const { data, error } = await supabase.functions.invoke('toss-confirm', { body })
        if (error || data?.error || data?.ok === false) {
          setState('fail'); setMsg(data?.error || error?.message || '결제 확인에 실패했어요.')
        } else { setState('success'); setMsg(data?.message || '결제가 완료되었어요.') }
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
            <h1 className="text-xl font-black text-gray-900">결제 완료</h1>
            <p className="mt-2 text-sm text-gray-600">{msg}</p>
            <Link to="/generate" className="mt-6 inline-block w-full rounded-2xl bg-[#0064FF] py-3.5 text-base font-bold text-white">영상 만들러 가기</Link>
          </>
        )}
        {state === 'fail' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">⚠️</div>
            <h1 className="text-xl font-black text-gray-900">결제 실패</h1>
            <p className="mt-2 text-sm text-gray-600">{msg}</p>
            <Link to="/generate" className="mt-6 inline-block w-full rounded-2xl border border-gray-200 py-3.5 text-base font-bold text-gray-800">돌아가기</Link>
          </>
        )}
      </div>
    </div>
  )
}
