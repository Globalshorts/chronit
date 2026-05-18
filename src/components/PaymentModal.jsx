import { useEffect, useState } from 'react'
import { X, Copy, Check, CreditCard, MessageCircle } from 'lucide-react'

/**
 * 결제 안내 모달 - 사업자 등록 + PG 연동 전 임시 계좌이체 흐름.
 * PG 연동 후엔 이 컴포넌트 내용만 "결제하기" 버튼으로 교체하면 됨.
 */
const PaymentModal = ({ open, onClose, defaultPlan = 'pro' }) => {
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const plans = {
    starter: { name: '스타터', price: 49000, label: '월 49,000원' },
    pro: { name: '프로', price: 99000, label: '월 99,000원' },
    master: { name: '마스터', price: 199000, label: '월 199,000원' },
  }

  const account = {
    bank: '토스뱅크',
    number: '1001-4756-8390',
    holder: '최승호',
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const plan = plans[selectedPlan]

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
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
            <CreditCard size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-white md:text-2xl">
              프리오더 신청
            </h3>
            <p className="text-xs font-medium text-slate-400 md:text-sm">
              계좌이체로 결제 후 활성화됩니다
            </p>
          </div>
        </div>

        {/* 플랜 선택 */}
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
            요금제 선택
          </p>
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
                <div className="text-sm font-bold">{p.name}</div>
                <div className="mt-1 text-xs font-medium opacity-80">
                  {p.price.toLocaleString('ko-KR')}원
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 입금 안내 */}
        <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
          <p className="mb-1 text-xs font-bold tracking-widest text-blue-300 uppercase">
            입금 금액
          </p>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white md:text-4xl">
              {plan.price.toLocaleString('ko-KR')}
            </span>
            <span className="text-sm font-bold text-slate-400">원</span>
            <span className="ml-2 rounded-full bg-blue-600/30 px-2 py-0.5 text-[10px] font-bold text-blue-200">
              {plan.name}
            </span>
          </div>

          <div className="space-y-2">
            <Row
              label="은행"
              value={account.bank}
            />
            <Row
              label="계좌번호"
              value={account.number}
              copyKey="number"
              copied={copied === 'number'}
              onCopy={() => copyToClipboard(account.number.replace(/-/g, ''), 'number')}
            />
            <Row label="예금주" value={account.holder} />
          </div>
        </div>

        {/* 안내 사항 */}
        <div className="mb-6 space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs leading-relaxed text-slate-400 md:text-sm">
          <p>
            • <strong className="text-slate-200">입금자명을 가입 이메일</strong>과 동일하게 적어주세요.
          </p>
          <p>
            • 영업일 기준 <strong className="text-slate-200">1일 이내</strong> 요금제가 자동 활성화됩니다.
          </p>
          <p>
            • 활성화 후 크로닛 데스크탑 앱에서 동일 이메일로 로그인하시면 즉시 사용 가능합니다.
          </p>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-black text-white shadow-[0_15px_40px_-10px_rgba(37,99,235,0.6)] transition-all hover:bg-blue-500 active:scale-[0.98]"
          onClick={() =>
            copyToClipboard(
              `${account.bank} ${account.number} ${account.holder} / ${plan.price.toLocaleString('ko-KR')}원 (${plan.name})`,
              'all'
            )
          }
        >
          {copied === 'all' ? (
            <>
              <Check size={18} /> 입금 정보 복사됨
            </>
          ) : (
            <>
              <Copy size={18} /> 입금 정보 한 번에 복사
            </>
          )}
        </button>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 md:text-sm">
          <MessageCircle size={14} className="text-blue-500" />
          문의는 추후 채널톡으로 안내 예정입니다
        </p>
      </div>
    </div>
  )
}

const Row = ({ label, value, copyKey, copied, onCopy }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs font-bold text-slate-500 md:text-sm">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-bold text-white md:text-base">{value}</span>
      {copyKey && (
        <button
          onClick={onCopy}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-all hover:bg-blue-600 hover:text-white"
          aria-label="복사"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  </div>
)

export default PaymentModal
