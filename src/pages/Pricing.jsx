import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import FindsPricing from '../components/FindsPricing'
import AuthModal from '../components/AuthModal'

const SUBS = [
  { name: '스탠다드', credits: 30, price: 9900 },
  { name: '프로', credits: 100, price: 19900, hot: true },
  { name: '비즈니스', credits: 300, price: 29900 },
]
const PACKS = [{ credits: 10, price: 4900 }, { credits: 30, price: 12900, hot: true }, { credits: 100, price: 34900 }]

export default function Pricing() {
  const nav = useNavigate()
  const [user, setUser] = useState(null)
  const [priceTab, setPriceTab] = useState('monthly')
  const [firstEligible] = useState(true)
  const [buyOpen, setBuyOpen] = useState(false)
  const [buyTab, setBuyTab] = useState('sub')
  const [buyPeriod, setBuyPeriod] = useState('monthly')
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { const u = data.session?.user; setUser(u && u.is_anonymous !== true ? u : null) }) }, [])

  const buy = (tab, period) => {
    setBuyTab(tab); setBuyPeriod(period)
    if (user) { setBuyOpen(true); return }
    setAuthOpen(true)
  }
  const annual = priceTab === 'annual'
  const cardCls = (hot) => `flex cursor-pointer flex-col rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(20,20,20,0.05)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_22px_48px_rgba(20,40,90,0.18)] ${hot ? 'border-2 border-[#0064FF]' : 'border border-gray-100'}`
  const btnCls = (hot) => `mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition ${hot ? 'bg-[#0064FF] text-white hover:brightness-95' : 'border border-gray-200 text-gray-700 hover:border-[#0064FF] hover:text-[#0064FF]'}`

  return (
    <div className="min-h-screen overflow-x-hidden font-sans break-keep text-gray-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/55 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex min-w-0 items-center gap-1 md:gap-1.5">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Chronit</h1>
          </a>
          <SiteNav active="/pricing" />
          <button onClick={() => (user ? nav('/me') : setAuthOpen(true))} className="shrink-0 rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-95">{user ? '마이페이지' : '로그인'}</button>
        </div>
      </header>

      <section className="px-5 pt-32 pb-20 md:px-8 md:pt-40">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <h1 className="text-3xl font-bold text-gray-900 md:text-5xl">필요한 만큼만</h1>
            <p className="mt-4 text-base text-gray-500 md:text-lg">가입하면 무료 이용권을 드려요. 더 필요하면 구독하세요.</p>
            <p className="mt-2 inline-block rounded-full bg-[#0064FF]/10 px-4 py-1.5 text-sm font-extrabold text-[#0064FF]">🎉 첫 달 반값 — 지금 시작하면 절반 가격</p>
          </div>

          <div className="relative mx-auto mt-8 mb-2 flex max-w-sm rounded-xl bg-gray-100 p-1 text-sm font-bold">
            <span aria-hidden className="absolute left-1 top-1 bottom-1 w-[calc(33.333%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out" style={{ transform: `translateX(${priceTab === 'annual' ? '100%' : priceTab === 'pack' ? '200%' : '0%'})` }} />
            <button onClick={() => setPriceTab('monthly')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${priceTab === 'monthly' ? 'text-[#0064FF]' : 'text-gray-500'}`}>월간</button>
            <button onClick={() => setPriceTab('annual')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${priceTab === 'annual' ? 'text-[#0064FF]' : 'text-gray-500'}`}>연간</button>
            <button onClick={() => setPriceTab('pack')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${priceTab === 'pack' ? 'text-[#0064FF]' : 'text-gray-500'}`}>단건팩</button>
          </div>
          <p className="mb-8 text-center text-xs font-semibold text-[#0064FF]">{priceTab === 'annual' ? '연간 결제로 3개월 무료' : priceTab === 'pack' ? '필요할 때만 1회 결제' : '매월 자동 충전 · 언제든 해지'}</p>

          {priceTab === 'pack' ? (
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {PACKS.map((p) => (
                <div key={p.credits} onClick={() => buy('pack', 'monthly')} className={cardCls(p.hot)}>
                  <div className="flex items-center gap-2"><h4 className="text-lg font-semibold text-gray-900">이용권 {p.credits}개</h4>{p.hot && <span className="rounded-full bg-[#0064FF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0064FF]">인기</span>}</div>
                  <p className="mt-1 text-sm text-gray-400">1회 결제 · 유효 12개월</p>
                  <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-gray-900">₩{p.price.toLocaleString('ko-KR')}</span></div>
                  <div className="mt-2.5 inline-flex items-center rounded-full bg-[#0064FF]/10 px-3 py-1 text-sm font-extrabold text-[#0064FF]">개당 약 {(Math.round(p.price / p.credits / 10) * 10).toLocaleString('ko-KR')}원</div>
                  <button className={btnCls(p.hot)}>구매하기</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(20,20,20,0.05)]">
                <h4 className="text-lg font-semibold text-gray-900">무료</h4>
                <p className="mt-1 text-sm text-gray-400">먼저 써보기</p>
                <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-gray-900">₩0</span></div>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">매월 이용권 5개</p>
                <button onClick={() => (user ? nav('/finds') : setAuthOpen(true))} className="mt-6 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#0064FF] hover:text-[#0064FF]">무료로 시작</button>
              </div>
              {SUBS.map((p) => (
                <div key={p.name} onClick={() => buy('sub', annual ? 'annual' : 'monthly')} className={cardCls(p.hot)}>
                  <div className="flex items-center gap-2"><h4 className="text-lg font-semibold text-gray-900">{p.name}</h4>{p.hot && <span className="rounded-full bg-[#0064FF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0064FF]">인기</span>}</div>
                  <p className="mt-1 text-sm text-gray-400">월 {p.credits}회 분석</p>
                  {annual ? (
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-[#0064FF]">₩{(p.price * 9).toLocaleString('ko-KR')}</span><span className="text-sm text-gray-400">/ 년</span></div>
                      <div className="mt-0.5 text-xs text-gray-400"><span className="line-through">₩{(p.price * 12).toLocaleString('ko-KR')}</span> · 3개월 무료</div>
                    </div>
                  ) : firstEligible ? (
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-[#0064FF]">₩{(Math.floor(p.price * 0.5 / 100) * 100).toLocaleString('ko-KR')}</span><span className="text-sm text-gray-400">첫 달</span></div>
                      <div className="mt-0.5 text-xs text-gray-400">이후 ₩{p.price.toLocaleString('ko-KR')}/월</div>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-gray-900">₩{p.price.toLocaleString('ko-KR')}</span><span className="text-sm text-gray-400">/ 월</span></div>
                  )}
                  <div className="mt-2.5 inline-flex items-center rounded-full bg-[#0064FF]/10 px-3 py-1 text-sm font-extrabold text-[#0064FF]">하루 약 {(annual ? Math.round(p.price * 9 / 365 / 10) * 10 : Math.round(p.price / 30 / 10) * 10).toLocaleString('ko-KR')}원</div>
                  <button className={btnCls(p.hot)}>{firstEligible && !annual ? '첫 달 반값으로 시작' : '시작하기'}</button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-6 text-center text-sm text-gray-400">이용권은 <span className="font-semibold text-gray-600">매월 초기화</span>돼요 · 남은 이용권은 이월·누적되지 않아요.</p>
        </div>
      </section>

      <Footer />
      <FindsPricing open={buyOpen} onClose={() => setBuyOpen(false)} defaultTab={buyTab} defaultPeriod={buyPeriod} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
