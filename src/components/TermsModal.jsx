import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const TermsModal = ({ open, onAgree, onClose }) => {
  const [checked, setChecked] = useState(false)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-[#0a0f1f] to-[#020617] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-white/5 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="mb-6 text-center">
          <img src="/favicon.png" alt="Chronit" className="mx-auto mb-4 h-12 w-12" />
          <h3 className="text-xl font-black text-white">서비스 이용 동의</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            크로닛을 이용하기 전에 아래 약관에 동의해주세요.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-blue-500/30">
          <div className="mt-0.5 shrink-0">
            {checked ? (
              <CheckCircle2 size={20} className="text-blue-400" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-slate-600" />
            )}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="text-sm leading-relaxed text-slate-300">
            <Link to="/terms" className="font-bold text-blue-400 underline underline-offset-2" target="_blank">이용약관</Link>
            {' '}및{' '}
            <Link to="/privacy" className="font-bold text-blue-400 underline underline-offset-2" target="_blank">개인정보처리방침</Link>
            에 동의합니다.
          </span>
        </label>

        <button
          onClick={() => checked && onAgree()}
          disabled={!checked}
          className="mt-4 w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-black text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.5)] transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          동의하고 계속하기
        </button>
      </div>
    </div>
  )
}

export default TermsModal
