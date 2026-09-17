import { useState } from 'react'
import { CreditCard, X } from 'lucide-react'
import { PLAN_LABEL, PLAN_SPEC } from '../lib/planLabels'
import { requestCardRegistration } from '../lib/tossBilling'
import { phCapture } from '../lib/posthog'

// 카드 필수 무료 체험 — 고지 카드 + 카드 등록 진입.
// 정기결제 고지 의무: 자동결제 금액·시점·해지 방법을 카드 등록 버튼과 같은 화면에 노출한다.
// trial: { code, plan, days }
export default function TrialCodeNotice({ trial, onClose }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!trial) return null

  const { code, plan, days } = trial
  const name = PLAN_LABEL[plan] || '비즈니스'
  // 고지 금액은 실제 청구액과 같은 출처여야 한다. renew-subscriptions 는 plans 테이블이 아니라
  // 하드코딩된 SALE 로 청구하므로, 그와 동일한 PLAN_SPEC 을 쓴다(DB 가격만 바뀌면 고지가 어긋난다).
  const price = PLAN_SPEC[plan]?.price
  const priceText = price ? `${price.toLocaleString('ko-KR')}원` : '정상 요금'

  const start = async () => {
    if (busy) return
    setBusy(true); setErr('')
    try { phCapture('trial_card_started', { plan, days, code }) } catch { /* noop */ }
    const o = window.location.origin
    const q = new URLSearchParams({ type: 'billing', trial: '1', plan, code })
    try {
      await requestCardRegistration({
        successUrl: `${o}/payments/success?${q.toString()}`,
        failUrl: `${o}/payments/fail?from=trial`,
      })
    } catch (e) {
      if (e?.code !== 'USER_CANCEL') setErr(e?.message || '카드 등록 창을 열지 못했어요')
      setBusy(false)
    }
  }

  return (
    <div className="relative mt-4 rounded-3xl border-2 border-[#7C3AED]/40 bg-white p-5">
      {onClose && (
        <button onClick={onClose} aria-label="닫기" className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"><X size={18} /></button>
      )}
      <p className="text-xs font-bold text-[#7C3AED]">코드 {code}</p>
      <h3 className="mt-1 text-lg font-bold text-gray-900">{name} {days}일 무료 — 카드 등록 후 시작</h3>

      {/* 자동결제 고지 — 카드 등록 버튼 바로 위에 항상 노출 */}
      <div className="mt-3 rounded-2xl bg-[#7C3AED]/10 px-4 py-3 text-sm leading-relaxed text-gray-700">
        <p><b className="text-gray-900">무료 체험 {days}일 종료 후 매월 {priceText}</b>이 등록한 카드로 <b className="text-gray-900">자동결제</b>됩니다.</p>
        <p className="mt-1">마이페이지에서 언제든 해지할 수 있어요.</p>
      </div>

      <button onClick={start} disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] py-3.5 text-base font-bold text-white transition hover:bg-[#6D28D9] disabled:opacity-50">
        <CreditCard size={18} /> {busy ? '카드 등록 창 여는 중…' : '카드 등록하고 시작'}
      </button>
      {err && <p className="mt-2 text-center text-sm font-medium text-red-500">{err}</p>}
      <p className="mt-2 text-center text-[11px] text-slate-400">카드 등록은 결제대행 토스페이먼츠 창에서 진행돼요. 체험 기간에는 청구되지 않아요.</p>
    </div>
  )
}
