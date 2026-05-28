import { useEffect, useState } from 'react'
import { X, Copy, Check, CreditCard, MessageCircle, Tag, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ORIGINAL_PRICES = {
  starter: 49000,
  pro: 99000,
  master: 199000,
}

const calcPrice = (original, discount) => {
  if (!discount) return original
  if (discount.type === 'percent') return Math.floor(original * (1 - discount.value / 100))
  if (discount.type === 'fixed') return Math.max(0, original - discount.value)
  return original
}

const PaymentModal = ({ open, onClose, defaultPlan = 'pro', initialCode = null }) => {
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan)
  const [copied, setCopied] = useState(null)

  // 할인 코드
  const [codeInput, setCodeInput] = useState(initialCode || '')
  const [discount, setDiscount] = useState(null)
  const [codeStatus, setCodeStatus] = useState(null) // null | 'loading' | 'valid' | 'invalid' | 'expired'

  // initialCode가 바뀌면 자동 적용 시도
  useEffect(() => {
    if (initialCode) {
      setCodeInput(initialCode)
      applyCode(initialCode)
    }
  }, [initialCode])

  const applyCode = async (code) => {
    const trimmed = (code || codeInput).trim().toUpperCase()
    if (!trimmed) return
    setCodeStatus('loading')

    const { data, error } = await supabase
      .from('coupon_codes')
      .select('*')
      .eq('code', trimmed)
      .single()

    if (error || !data) {
      setCodeStatus('invalid')
      setDiscount(null)
      return
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCodeStatus('expired')
      setDiscount(null)
      return
    }
    setDiscount(data)
    setCodeStatus('valid')
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

  if (!open) return null

  const plans = {
    starter: { name: '스타터', price: calcPrice(ORIGINAL_PRICES.starter, discount), original: ORIGINAL_PRICES.starter },
    pro:     { name: '프로',   price: calcPrice(ORIGINAL_PRICES.pro,     discount), original: ORIGINAL_PRICES.pro     },
    master:  { name: '마스터', price: calcPrice(ORIGINAL_PRICES.master,   discount), original: ORIGINAL_PRICES.master  },
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
  const hasDiscount = discount && !isFreedays && plan.price < plan.original

  const discountLabel = () => {
    if (!discount) return null
    if (discount.type === 'percent') return `${discount.value}% 할인`
    if (discount.type === 'fixed') return `${discount.value.toLocaleString('ko-KR')}원 할인`
    if (discount.type === 'free_days') return `${discount.value}일 무료 체험`
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-8"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-b from-[#0a0f1f] to-[#020617] p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-white/5 hover:text-white"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
            <CreditCard size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-white md:text-2xl">
              {isFreedays ? '무료 체험 신청' : '결제 신청'}
            </h3>
            <p className="text-sm font-medium text-slate-400 md:text-base">
              {isFreedays ? `${discount.value}일 무료 체험이 적용됩니다` : '계좌이체로 결제 후 활성화됩니다'}
            </p>
          </div>
        </div>

        {/* 할인 코드 입력 */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-bold tracking-widest text-slate-400 uppercase">할인 코드</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeStatus(null); setDiscount(null) }}
              onKeyDown={(e) => e.key === 'Enter' && applyCode()}
              placeholder="코드 입력 (선택)"
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white placeholder-slate-600 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.07]"
            />
            <button
              onClick={() => applyCode()}
              disabled={codeStatus === 'loading' || !codeInput.trim()}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-40 active:scale-95"
            >
              {codeStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : '적용'}
            </button>
          </div>

          {/* 코드 상태 메시지 */}
          {codeStatus === 'valid' && discount && (
            <div className="mt-2 flex items-center gap-2 text-sm font-bold text-green-400">
              <Check size={14} /> {discountLabel()} 적용됨
            </div>
          )}
          {codeStatus === 'invalid' && (
            <p className="mt-2 text-sm font-bold text-red-400">유효하지 않은 코드입니다.</p>
          )}
          {codeStatus === 'expired' && (
            <p className="mt-2 text-sm font-bold text-red-400">만료된 코드입니다.</p>
          )}
        </div>

        {/* 플랜 선택 */}
        <div className="mb-6">
          <p className="mb-3 text-sm font-bold tracking-widest text-slate-400 uppercase">요금제 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(plans).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`rounded-2xl border px-3 py-3 text-center transition-all ${
                  selectedPlan === key
                    ? 'border-blue-400 bg-blue-500/15 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]'
                    : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="text-base font-bold">{p.name}</div>
                <div className="mt-1 text-sm font-medium opacity-80">
                  {isFreedays ? (
                    <span className="text-blue-300">무료</span>
                  ) : p.price < p.original ? (
                    <span className="text-blue-300">{p.price.toLocaleString('ko-KR')}원</span>
                  ) : (
                    <span>{p.price.toLocaleString('ko-KR')}원</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* free_days: 무료 체험 안내 */}
        {isFreedays ? (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
            <p className="mb-3 text-sm font-bold tracking-widest text-blue-300 uppercase">무료 체험 안내</p>
            <div className="space-y-2 text-sm leading-relaxed text-slate-300 md:text-base">
              <p>• 크로닛 앱에서 코드 <strong className="text-white">{discount.code}</strong>를 입력하세요.</p>
              <p>• 로그인 후 <strong className="text-white">{discount.value}일간</strong> 무료로 이용 가능합니다.</p>
              <p>• 체험 종료 후 요금제를 선택해 계속 이용할 수 있습니다.</p>
            </div>
          </div>
        ) : (
          /* 계좌이체 안내 */
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
            <p className="mb-1 text-sm font-bold tracking-widest text-blue-300 uppercase">입금 금액</p>
            <div className="mb-4 flex items-baseline gap-2 flex-wrap">
              {hasDiscount && (
                <span className="text-xl font-bold text-slate-500 line-through">
                  {plan.original.toLocaleString('ko-KR')}
                </span>
              )}
              <span className="text-3xl font-black text-white md:text-4xl">
                {plan.price.toLocaleString('ko-KR')}
              </span>
              <span className="text-base font-bold text-slate-400">원</span>
              <span className="rounded-full bg-blue-600/30 px-2 py-0.5 text-[10px] font-bold text-blue-200">{plan.name}</span>
              {hasDiscount && (
                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-300">{discountLabel()}</span>
              )}
            </div>
            <div className="space-y-2">
              <Row label="은행" value={account.bank} />
              <Row label="계좌번호" value={account.number} copyKey="number" copied={copied === 'number'} onCopy={() => copyToClipboard(account.number.replace(/-/g, ''), 'number')} />
              <Row label="예금주" value={account.holder} />
            </div>
          </div>
        )}

        {/* 안내사항 */}
        {!isFreedays && (
          <div className="mb-6 space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm leading-relaxed text-slate-400 md:text-base">
            <p>• <strong className="rounded bg-amber-400/15 px-1.5 py-0.5 font-black text-amber-300 ring-1 ring-amber-400/30">입금자명을 가입 이메일과</strong> 동일하게 적어주세요.</p>
            <p>• 영업일 기준 <strong className="text-slate-200">1일 이내</strong> 요금제가 자동 활성화됩니다.</p>
            <p>• 활성화 후 크로닛 앱에서 동일 이메일로 로그인하시면 즉시 사용 가능합니다.</p>
          </div>
        )}

        {isFreedays ? (
          <button onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-black text-white shadow-[0_15px_40px_-10px_rgba(37,99,235,0.6)] transition-all hover:bg-blue-500 active:scale-[0.98]">
            확인
          </button>
        ) : (
          <button
            onClick={() => copyToClipboard(`${account.bank} ${account.number} ${account.holder} / ${plan.price.toLocaleString('ko-KR')}원 (${plan.name})`, 'all')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-black text-white shadow-[0_15px_40px_-10px_rgba(37,99,235,0.6)] transition-all hover:bg-blue-500 active:scale-[0.98]"
          >
            {copied === 'all' ? <><Check size={18} /> 입금 정보 복사됨</> : <><Copy size={18} /> 입금 정보 한 번에 복사</>}
          </button>
        )}

        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 md:text-base">
          <MessageCircle size={14} className="text-blue-500" />
          문의는 추후 채널톡으로 안내 예정입니다
        </p>
      </div>
    </div>
  )
}

const Row = ({ label, value, copyKey, copied, onCopy }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm font-bold text-slate-500 md:text-base">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-mono text-base font-bold text-white md:text-lg">{value}</span>
      {copyKey && (
        <button onClick={onCopy} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-all hover:bg-blue-600 hover:text-white">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  </div>
)

export default PaymentModal
