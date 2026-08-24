import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, ChevronDown } from 'lucide-react'

const CK = import.meta.env.VITE_TOSS_CLIENT_KEY || ''
const BCK = import.meta.env.VITE_TOSS_BILLING_CLIENT_KEY || ''

const SUBS = [
  { id: 'finds30',  name: '스탠다드', credits: 30,  price: 9900 },
  { id: 'finds100', name: '프로',     credits: 100, price: 19900 },
  { id: 'finds300', name: '비즈니스', credits: 300, price: 29900 },
]
const PACKS = [
  { id: 'pack10',  credits: 10,  price: 4900 },
  { id: 'pack30',  credits: 30,  price: 12900 },
  { id: 'pack100', credits: 100, price: 34900 },
]
const won = (n) => n.toLocaleString('ko-KR')
const genOrderId = (plan) => `chr_${plan}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

function loadToss() {
  return new Promise((res) => {
    if (window.TossPayments) return res()
    const done = () => res()
    if (document.getElementById('toss-sdk')) { const t = setInterval(() => { if (window.TossPayments) { clearInterval(t); done() } }, 100); return }
    const s = document.createElement('script'); s.id = 'toss-sdk'; s.src = 'https://js.tosspayments.com/v2/standard'
    s.onload = done; document.head.appendChild(s)
  })
}

export default function FindsPricing({ open, onClose }) {
  const [tab, setTab] = useState('sub')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => { if (open) { setTab('sub'); setMsg('') } }, [open])
  if (!open) return null

  const buySub = async (planId) => {
    setMsg(''); setBusy(planId)
    try {
      const { data: ses } = await supabase.auth.getSession()
      const user = ses?.session?.user
      if (!user || user.is_anonymous) { setMsg('로그인이 필요해요'); setBusy(''); return }
      if (!BCK) { setMsg('결제 설정 준비 중이에요'); setBusy(''); return }
      await loadToss()
      const payment = window.TossPayments(BCK).payment({ customerKey: user.id })
      await payment.requestBillingAuth({
        method: 'CARD', customerEmail: user.email,
        successUrl: `${window.location.origin}/payments/success?type=billing&plan=${planId}`,
        failUrl: `${window.location.origin}/payments/fail`,
      })
    } catch (e) { if (e?.code !== 'USER_CANCEL') setMsg('결제 오류: ' + (e?.message || e)); setBusy('') }
  }

  const buyPack = async (pk) => {
    setMsg(''); setBusy(pk.id)
    try {
      const { data: ses } = await supabase.auth.getSession()
      const user = ses?.session?.user
      if (!user || user.is_anonymous) { setMsg('로그인이 필요해요'); setBusy(''); return }
      if (!CK) { setMsg('결제 설정 준비 중이에요'); setBusy(''); return }
      await loadToss()
      const payment = window.TossPayments(CK).payment({ customerKey: user.id })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: pk.price },
        orderId: genOrderId(pk.id),
        orderName: `크로닛 Finds 이용권 ${pk.credits}개`,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
      })
    } catch (e) { if (e?.code !== 'USER_CANCEL') setMsg('결제 오류: ' + (e?.message || e)); setBusy('') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Finds 이용권 구매</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {tab === 'sub' ? (
          <div className="flex flex-col gap-2">
            {SUBS.map((p) => (
              <button key={p.id} disabled={!!busy} onClick={() => buySub(p.id)}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-[#0064FF] disabled:opacity-50">
                <div><div className="font-bold text-slate-900">{p.name} · 월 {p.credits}개</div><div className="text-xs text-slate-400">매월 자동 충전 · 언제든 해지</div></div>
                <div className="text-right"><div className="font-bold text-slate-900">₩{won(p.price)}</div><div className="text-[11px] text-slate-400">/월 · 하루 약 {won(Math.round(p.price / 30 / 10) * 10)}원</div></div>
              </button>
            ))}
            <button onClick={() => setTab('pack')} className="mt-1 flex items-center justify-center gap-1 py-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
              구독 없이 한 번만? 낱개 충전 <ChevronDown size={13} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {PACKS.map((p) => (
              <button key={p.id} disabled={!!busy} onClick={() => buyPack(p)}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-[#0064FF] disabled:opacity-50">
                <div><div className="font-bold text-slate-900">Finds 이용권 {p.credits}개</div><div className="text-xs text-slate-400">1회 결제 · 소진식 (유효 12개월)</div></div>
                <div className="font-bold text-slate-900">₩{won(p.price)}</div>
              </button>
            ))}
            <button onClick={() => setTab('sub')} className="mt-1 py-1 text-xs font-semibold text-slate-400 hover:text-slate-600">← 구독으로 보기</button>
          </div>
        )}

        {msg && <p className="mt-3 text-center text-sm text-red-500">{msg}</p>}
        <p className="mt-4 text-center text-[11px] text-slate-400">결제 시 결제대행 토스페이먼츠 창이 열립니다.</p>
      </div>
    </div>
  )
}
