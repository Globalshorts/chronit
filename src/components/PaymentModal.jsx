import { useEffect, useState } from 'react'
import { X, Copy, Check, CreditCard, MessageCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 정가(취소선 표시) — 상시 할인 프레이밍용
const LIST_PRICES = {
  starter: 49000,
  pro: 99000,
  master: 199000,
  pkg6: 594000,
}
// 상시 판매가 (쿠폰/가입코드는 이 위에 추가 할인)
const SALE_PRICES = {
  starter: 29000,
  pro: 49000,
  master: 79000,
  pkg6: 249000,
}
const PLAN_META = {
  starter: { name: '스타터' },
  pro:     { name: '프로' },
  master:  { name: '마스터' },
  pkg6:    { name: '프로 6개월', badge: '안심 패키지' },
}

// 토스페이먼츠 (카드 결제 / 정기결제) — 클라이언트 키는 환경변수
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || ''
// 토스 송금 QR (고정 금액, public/ 에 위치)
const QR_IMAGES = {
  starter: '/qr_starter.png',
  pro:     '/qr_pro.png',
  master:  '/qr_master.png',
  pkg6:    '/qr_pkg6.png',
}
// 네이버 스마트스토어 상품 URL (플랜별) — 네이버페이 결제 → 닉네임 매칭 자동 충전
const STORE_URLS = {
  starter: 'https://smartstore.naver.com/chronit/products/13643192175',
  pro:     'https://smartstore.naver.com/chronit/products/13643192399',
  master:  'https://smartstore.naver.com/chronit/products/13643192539',
  pkg6:    'https://smartstore.naver.com/chronit/products/13643669408',
}

// 쿠폰에서 특정 플랜의 할인 설정을 해석
const resolveDiscount = (coupon, planKey) => {
  if (!coupon) return null
  if (coupon.plan_discounts && typeof coupon.plan_discounts === 'object') {
    return coupon.plan_discounts[planKey] || null
  }
  if (Array.isArray(coupon.allowed_plans) && coupon.allowed_plans.length && !coupon.allowed_plans.includes(planKey)) {
    return null
  }
  if (coupon.type && coupon.type !== 'none') return { type: coupon.type, value: coupon.value }
  return null
}

const calcPrice = (original, coupon, planKey) => {
  const d = resolveDiscount(coupon, planKey)
  if (!d) return original
  if (d.type === 'percent') return Math.floor(original * (1 - d.value / 100))
  if (d.type === 'fixed') return Math.max(0, original - d.value)
  if (d.type === 'free') return 0
  return original
}

const PaymentModal = ({ open, onClose, defaultPlan = 'pro', initialCode = null }) => {
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan)
  const [copied, setCopied] = useState(null)

  const [codeInput, setCodeInput] = useState(initialCode || '')
  const [discount, setDiscount] = useState(null)
  const [codeStatus, setCodeStatus] = useState(null) // null | 'loading' | 'valid' | 'invalid' | 'expired'
  const [trialMsg, setTrialMsg] = useState(null)
  const [dbPrices, setDbPrices] = useState(null)
  const [payMsg, setPayMsg] = useState(null)

  useEffect(() => {
    if (initialCode) {
      setCodeInput(initialCode)
      applyCode(initialCode)
    }
  }, [initialCode])

  useEffect(() => {
    if (!open) return
    supabase.from('plans').select('id, list_price, monthly_price').in('id', ['starter', 'pro', 'master'])
      .then(({ data }) => {
        if (!data || !data.length) return
        setDbPrices(prev => { const m = { ...(prev || {}) }; data.forEach(r => { if (r.list_price > 0 && r.monthly_price > 0) m[r.id] = { list: r.list_price, sale: r.monthly_price } }); return m })
      })
    supabase.from('site_settings').select('key, value').in('key', ['pkg6_list_price', 'pkg6_sale_price'])
      .then(({ data }) => {
        if (!data || !data.length) return
        const o = {}; data.forEach(r => { o[r.key] = Number(r.value) || 0 })
        if (o.pkg6_list_price > 0 && o.pkg6_sale_price > 0) setDbPrices(prev => ({ ...(prev || {}), pkg6: { list: o.pkg6_list_price, sale: o.pkg6_sale_price } }))
      })
  }, [open])

  const applyCode = async (code) => {
    const trimmed = (code || codeInput).trim().toUpperCase()
    if (!trimmed) return
    setCodeStatus('loading')

    const { data, error } = await supabase
      .from('coupon_codes')
      .select('*')
      .eq('code', trimmed)
      .single()

    if (error || !data) { setCodeStatus('invalid'); setDiscount(null); return }
    if (data.type === 'credits') { setCodeStatus('credit_only'); setDiscount(null); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setCodeStatus('expired'); setDiscount(null); return }
    setDiscount(data)
    setCodeStatus('valid')
    // 파트너 코드(owner_email 보유)면 로그인 상태에서 멤버↔파트너 연결을 자동 등록 → 결제확정 시 수수료 적립 연동 (멱등, 비로그인 시 무시)
    if (data.owner_email) {
      try { supabase.rpc('redeem_teacher_code_rpc', { p_code: trimmed }).then(() => {}, () => {}) } catch {}
    }
  }

  const startTrial = async () => {
    if (!discount?.code) return
    setTrialMsg('처리 중...')
    const { data: s } = await supabase.auth.getSession()
    if (!s?.session) { setTrialMsg('로그인 후 앱에서 이 코드를 입력하면 체험이 시작됩니다.'); return }
    const { data, error } = await supabase.rpc('redeem_free_trial_rpc', { p_code: discount.code })
    if (error) { setTrialMsg('실패: ' + error.message); return }
    if (data?.ok === false) { setTrialMsg('실패: ' + data.error); return }
    setTrialMsg(`${data.days}일 무료 체험이 시작됐어요! 잠시 후 새로고침됩니다.`)
    setTimeout(() => window.location.reload(), 1300)
  }

  // 토스페이먼츠 SDK 로드 (모달 열릴 때 1회)
  useEffect(() => {
    if (!open) return
    if (window.TossPayments || document.getElementById('toss-sdk')) return
    const sc = document.createElement('script')
    sc.id = 'toss-sdk'
    sc.src = 'https://js.tosspayments.com/v2/standard'
    sc.async = true
    document.body.appendChild(sc)
  }, [open])

  const genOrderId = (p) => `chronit_${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // 일반결제(카드 인증결제창)
  const payWithToss = async () => {
    setPayMsg(null)
    if (!TOSS_CLIENT_KEY) { setPayMsg('결제 모듈 설정 준비 중이에요. 잠시 후 다시 시도해주세요.'); return }
    const { data: ses } = await supabase.auth.getSession()
    const user = ses?.session?.user
    if (!user) { setPayMsg('로그인 후 결제할 수 있어요.'); return }
    if (!window.TossPayments) { setPayMsg('결제 모듈 로딩 중이에요. 잠시 후 다시 눌러주세요.'); return }
    try {
      const toss = window.TossPayments(TOSS_CLIENT_KEY)
      const payment = toss.payment({ customerKey: user.id })
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: plan.price },
        orderId: genOrderId(selectedPlan),
        orderName: `크로닛 ${plan.name}`,
        customerEmail: user.email,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
      })
    } catch (e) {
      if (e?.code === 'USER_CANCEL') return
      setPayMsg('결제창 오류: ' + (e?.message || e))
    }
  }

  // 정기결제(카드 자동결제 등록 — 빌링 인증창)
  const registerBillingToss = async () => {
    setPayMsg(null)
    if (!TOSS_CLIENT_KEY) { setPayMsg('결제 모듈 설정 준비 중이에요.'); return }
    const { data: ses } = await supabase.auth.getSession()
    const user = ses?.session?.user
    if (!user) { setPayMsg('로그인 후 이용할 수 있어요.'); return }
    if (!window.TossPayments) { setPayMsg('결제 모듈 로딩 중이에요.'); return }
    try {
      const toss = window.TossPayments(TOSS_CLIENT_KEY)
      const payment = toss.payment({ customerKey: user.id })
      await payment.requestBillingAuth({
        method: 'CARD',
        customerEmail: user.email,
        successUrl: `${window.location.origin}/payments/success?type=billing&plan=${selectedPlan}`,
        failUrl: `${window.location.origin}/payments/fail`,
      })
    } catch (e) {
      if (e?.code === 'USER_CANCEL') return
      setPayMsg('정기결제 등록 오류: ' + (e?.message || e))
    }
  }

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => { if (open) { try { window.gtag?.('event','payment_view',{ plan: selectedPlan }); } catch {} } }, [open])

  if (!open) return null

  // ── 네이버 스마트스토어 구매 (네이버페이 결제 → 닉네임 매칭 자동 충전) ──
  const storeUrl = STORE_URLS[selectedPlan] || 'https://smartstore.naver.com/chronit'
  const storePlanName = PLAN_META[selectedPlan]?.name || ''
  const buildPlan = (key) => ({
    name: PLAN_META[key].name,
    badge: PLAN_META[key].badge,
    list: (dbPrices?.[key]?.list ?? LIST_PRICES[key]),
    sale: (dbPrices?.[key]?.sale ?? SALE_PRICES[key]),
    price: calcPrice((dbPrices?.[key]?.sale ?? SALE_PRICES[key]), discount, key),
  })
  const plans = {
    starter: buildPlan('starter'),
    pro:     buildPlan('pro'),
    master:  buildPlan('master'),
    pkg6:    buildPlan('pkg6'),
  }

  const account = { bank: '토스뱅크', number: '1001-4756-8390', holder: '최승호' }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const plan = plans[selectedPlan]
  const isFreedays = discount?.type === 'free_days'
  const planDiscount = resolveDiscount(discount, selectedPlan)
  const hasDiscount = discount && !isFreedays && plan.price < plan.sale
  const notApplicable = discount && !isFreedays && !planDiscount

  const discountLabel = () => {
    const d = isFreedays ? { type: 'free_days', value: discount.value } : planDiscount
    if (!d) return null
    if (d.type === 'percent') return `${d.value}% 할인`
    if (d.type === 'fixed') return `${d.value.toLocaleString('ko-KR')}원 할인`
    if (d.type === 'free') return `무료 (100% 할인)`
    if (d.type === 'free_days') return `${d.value}일 무료 체험`
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-8"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0064FF]/10 text-[#0064FF]">
            <CreditCard size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-900 md:text-2xl">
              {isFreedays ? '무료 체험 신청' : '결제 신청'}
            </h3>
            <p className="text-sm font-medium text-gray-500 md:text-base">
              {isFreedays ? `${discount.value}일 무료 체험이 적용됩니다` : '스마트스토어 결제 후 자동 충전됩니다'}
            </p>
          </div>
        </div>

        {/* 할인 코드 입력 */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-bold tracking-widest text-gray-500 uppercase">할인 코드</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeStatus(null); setDiscount(null) }}
              onKeyDown={(e) => e.key === 'Enter' && applyCode()}
              placeholder="코드 입력 (선택)"
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#0064FF] focus:bg-white"
            />
            <button
              onClick={() => applyCode()}
              disabled={codeStatus === 'loading' || !codeInput.trim()}
              className="flex items-center gap-1.5 rounded-2xl bg-[#0064FF] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#0052D6] disabled:opacity-40 active:scale-95"
            >
              {codeStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : '적용'}
            </button>
          </div>

          {codeStatus === 'valid' && discount && !notApplicable && (
            <div className="mt-2 flex items-center gap-2 text-sm font-bold text-[#0064FF]">
              <Check size={14} /> {discountLabel()} 적용됨
            </div>
          )}
          {codeStatus === 'valid' && notApplicable && (
            <p className="mt-2 text-sm font-bold text-amber-600">이 코드는 선택한 플랜에는 적용되지 않아요.</p>
          )}
          {codeStatus === 'invalid' && (
            <p className="mt-2 text-sm font-bold text-red-500">유효하지 않은 코드입니다.</p>
          )}
          {codeStatus === 'expired' && (
            <p className="mt-2 text-sm font-bold text-red-500">만료된 코드입니다.</p>
          )}
          {codeStatus === 'credit_only' && (
            <p className="mt-2 text-sm font-bold text-amber-600">이용권 지급 코드예요. 앱의 "🎁 무료 이용권 받기"에서 사용해주세요.</p>
          )}
        </div>

        {/* 플랜 선택 (무료체험 시 숨김 — 체험은 플랜 무관) */}
        {!isFreedays && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-bold tracking-widest text-gray-500 uppercase">요금제 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {['starter','pro','master'].map((key) => {
              const p = plans[key]
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`rounded-2xl border px-3 py-3 text-center transition-all ${
                    selectedPlan === key
                      ? 'border-[#0064FF] bg-[#0064FF]/10 text-gray-900 shadow-[0_0_20px_-8px_rgba(3,199,90,0.5)]'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-900'
                  }`}
                >
                  <div className="text-base font-bold">{p.name}</div>
                  {isFreedays ? (
                    <div className="mt-1 text-sm font-medium text-[#0064FF]">무료</div>
                  ) : (
                    <div className="mt-1 leading-tight">
                      <div className="text-[11px] font-medium text-gray-400 line-through">{p.list.toLocaleString('ko-KR')}</div>
                      <div className="text-sm font-bold text-[#0064FF]">{p.price.toLocaleString('ko-KR')}원</div>
                      <div className="text-[10px] font-bold text-gray-400">하루 약 {(Math.round(p.price / 30 / 10) * 10).toLocaleString('ko-KR')}원</div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* 6개월 안심 패키지 */}
          {!isFreedays && (
            <button
              onClick={() => setSelectedPlan('pkg6')}
              className={`mt-2 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                selectedPlan === 'pkg6'
                  ? 'border-amber-400 bg-amber-50 shadow-[0_0_20px_-8px_rgba(251,191,36,0.5)]'
                  : 'border-gray-200 bg-gray-50 hover:border-amber-400/50'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">프로 6개월</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">안심 패키지</span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500">프로 요금제 6개월 유지 · 매월 영상 30개 지급</div>
              </div>
              <div className="text-right leading-tight">
                <div className="text-[11px] font-medium text-gray-400 line-through">{plans.pkg6.list.toLocaleString('ko-KR')}</div>
                <div className="text-base font-black text-amber-600">{plans.pkg6.price.toLocaleString('ko-KR')}원</div>
                <div className="text-[11px] font-bold text-amber-600">월 {Math.round(plans.pkg6.price / 6).toLocaleString('ko-KR')}원 수준</div>
              </div>
            </button>
          )}
        </div>
        )}

        {/* free_days: 무료 체험 안내 */}
        {isFreedays ? (
          <div className="mb-6 rounded-2xl border border-[#0064FF]/20 bg-[#0064FF]/5 p-5">
            <p className="mb-3 text-sm font-bold tracking-widest text-[#0064FF] uppercase">무료 체험 안내</p>
            <div className="space-y-2 text-sm leading-relaxed text-gray-600 md:text-base">
              <p>• 크로닛 앱에서 코드 <strong className="text-gray-900">{discount.code}</strong>를 입력하세요.</p>
              <p>• 로그인 후 <strong className="text-gray-900">{discount.value}일간</strong> 무료로 이용 가능합니다.</p>
              <p>• 체험 종료 후 요금제를 선택해 계속 이용할 수 있습니다.</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-[#0064FF]/20 bg-[#0064FF]/5 p-5">
            <p className="mb-1 text-sm font-bold tracking-widest text-[#0064FF] uppercase">결제 금액</p>
            <div className="mb-4 flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-bold text-gray-400 line-through">
                {plan.list.toLocaleString('ko-KR')}
              </span>
              <span className="text-3xl font-black text-gray-900 md:text-4xl">
                {plan.price.toLocaleString('ko-KR')}
              </span>
              <span className="text-base font-bold text-gray-500">원</span>
              <span className="rounded-full bg-[#0064FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#0064FF]">{plan.name}</span>
              {hasDiscount && (
                <span className="rounded-full bg-[#0064FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#0064FF]">+ {discountLabel()}</span>
              )}
            </div>
            {(!hasDiscount && QR_IMAGES[selectedPlan]) ? (
              <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
                {/* 네이버 스마트스토어 — 현재 결제수단 */}
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { try { window.gtag?.('event','checkout_smartstore',{ plan: selectedPlan, plan_name: plan.name }); } catch {} }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#03C75A] px-6 py-4 text-lg font-black text-white shadow-[0_15px_40px_-12px_rgba(3,199,90,0.55)] transition-all hover:brightness-95 active:scale-[0.98]"
                >
                  네이버페이로 결제 ({plan.price.toLocaleString('ko-KR')}원)
                </a>
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-left text-xs leading-relaxed text-amber-700">
                  결제 시 <strong>크로닛 가입 닉네임</strong>을 옵션에 정확히 입력해 주세요. 해당 닉네임으로 이용권이 자동 충전됩니다.
                </div>
                {/* 토스 카드 결제 */}
                <button onClick={payWithToss}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0064FF] px-6 py-4 text-lg font-black text-white shadow-[0_15px_40px_-12px_rgba(0,100,255,0.5)] transition-all hover:bg-[#0052D6] active:scale-[0.98]">
                  <CreditCard size={18} /> 카드로 결제 ({plan.price.toLocaleString('ko-KR')}원)
                </button>
                {payMsg && <p className="text-center text-sm font-bold text-red-500">{payMsg}</p>}
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-700">
                할인가 결제는 우측 하단 채널톡으로 문의해 주세요 🙏
              </div>
            )}
          </div>
        )}

        {/* 안내사항 */}
        {!isFreedays && (
          <div className="mb-6 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600 md:text-base">
            <p>• <strong className="text-gray-800">네이버페이로 결제</strong> 버튼을 눌러 스마트스토어에서 결제해 주세요.</p>
            <p>• 결제 시 <strong className="rounded bg-amber-100 px-1.5 py-0.5 font-black text-amber-700 ring-1 ring-amber-300">가입 닉네임</strong>을 옵션에 입력하면 이용권이 자동 충전됩니다.</p>
            <p>• 확인 후 영업일 기준 <strong className="text-gray-800">1일 이내</strong> 활성화됩니다. (카드 결제는 즉시 활성화)</p>
            <p>• <strong className="text-gray-800">환불 규정:</strong> 본 상품은 디지털 콘텐츠로, 결제 후 영상을 1회라도 생성하면 환불이 불가합니다. 이용 이력이 전혀 없는 경우에 한해 결제일로부터 <strong className="text-gray-800">7일 이내</strong> 전액 환불이 가능합니다.</p>
          </div>
        )}

        {isFreedays ? (
          <div>
            <button onClick={startTrial} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0064FF] px-6 py-4 text-lg font-black text-white shadow-[0_15px_40px_-12px_rgba(3,199,90,0.6)] transition-all hover:bg-[#0052D6] active:scale-[0.98]">
            {discount.value}일 무료 체험 시작
          </button>
            {trialMsg && <p className="mt-3 text-center text-sm font-bold text-[#0064FF]">{trialMsg}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-xs text-gray-500">스마트스토어 결제 시 가입 닉네임을 옵션에 꼭 입력해 주세요.</p>
            {payMsg && <p className="text-center text-sm font-bold text-red-500">{payMsg}</p>}
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 md:text-base">
          <MessageCircle size={14} className="text-[#0064FF]" />
          문의: help@chronit.kr · 010-4915-3066
        </p>
      </div>
    </div>
  )
}

const Row = ({ label, value, copyKey, copied, onCopy }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm font-bold text-gray-500 md:text-base">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-mono text-base font-bold text-gray-900 md:text-lg">{value}</span>
      {copyKey && (
        <button onClick={onCopy} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-all hover:bg-[#0064FF] hover:text-white">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  </div>
)

export default PaymentModal
