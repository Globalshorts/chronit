import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

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
const firstMonth = (price) => Math.floor(price * 0.5 / 100) * 100
const perDay = (price) => Math.round(price / 30 / 10) * 10
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

export default function FindsPricing({ open, onClose, defaultTab = 'sub', defaultPeriod = 'monthly' }) {
  const [tab, setTab] = useState(defaultTab)
  const [period, setPeriod] = useState(defaultPeriod)
  const [eligible, setEligible] = useState(true) // 첫 결제 할인 대상 여부
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!open) return
    setTab(defaultTab); setPeriod(defaultPeriod); setMsg('')
    supabase.rpc('finds_first_sub_eligible').then(({ data }) => setEligible(data !== false)).catch(() => setEligible(true))
  }, [open])
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
        successUrl: `${window.location.origin}/payments/success?type=billing&plan=${planId}&period=${period}`,
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

  const annual = period === 'annual'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Finds 이용권 구매</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="relative mb-4 flex rounded-xl bg-slate-100 p-1 text-sm font-bold">
          <span aria-hidden className="absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out" style={{ transform: tab === 'pack' ? 'translateX(100%)' : 'translateX(0)' }} />
          <button onClick={() => setTab('sub')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${tab === 'sub' ? 'text-[#0064FF]' : 'text-slate-500'}`}>구독</button>
          <button onClick={() => setTab('pack')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${tab === 'pack' ? 'text-[#0064FF]' : 'text-slate-500'}`}>단건팩 (1회)</button>
        </div>

        {tab === 'sub' ? (
          <div className="flex flex-col gap-2">
            <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-bold">
              <button onClick={() => setPeriod('monthly')} className={`rounded-full px-3 py-1 transition ${!annual ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>월간</button>
              <button onClick={() => setPeriod('annual')} className={`rounded-full px-3 py-1 transition ${annual ? 'bg-[#0064FF] text-white' : 'bg-slate-100 text-slate-500'}`}>연간 · 3개월 무료</button>
            </div>
            {SUBS.map((p) => (
              <button key={p.id} disabled={!!busy} onClick={() => buySub(p.id)}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-[#0064FF] disabled:opacity-50">
                <div><div className="font-bold text-slate-900">{p.name} · 월 {p.credits}개</div><div className="text-xs text-slate-400">{annual ? '매월 자동 충전 · 연 1회 결제' : '매월 자동 충전 · 언제든 해지'}</div></div>
                {annual ? (
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-[#0064FF]">₩{won(p.price * 9)}<span className="text-[11px] font-medium text-slate-400"> /년</span></div>
                    <div className="text-[11px] text-slate-400"><span className="line-through">₩{won(p.price * 12)}</span> · 3개월 무료</div>
                  </div>
                ) : eligible ? (
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-[#0064FF]">첫 달 ₩{won(firstMonth(p.price))}</div>
                    <div className="text-[11px] text-slate-400">이후 ₩{won(p.price)}/월 · 하루 약 {won(perDay(p.price))}원</div>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="font-bold text-slate-900">₩{won(p.price)}</div>
                    <div className="text-[11px] text-slate-400">/월 · 하루 약 {won(perDay(p.price))}원</div>
                  </div>
                )}
              </button>
            ))}
            <p className="mt-1 text-center text-[11px] text-slate-400">{annual ? '연간은 매월 이용권이 자동 충전돼요.' : eligible ? '첫 달 50% 할인은 첫 구독 1회 한정이에요.' : '언제든 해지할 수 있어요.'}</p>
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
          </div>
        )}

        {msg && <p className="mt-3 text-center text-sm text-red-500">{msg}</p>}
        <p className="mt-4 text-center text-[11px] text-slate-400">결제 시 결제대행 토스페이먼츠 창이 열립니다.</p>
      </div>
    </div>
  )
}
