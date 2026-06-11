import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const TermsModal = ({ open, onAgree, onClose }) => {
  const [checked, setChecked] = useState(false)
  const [marketing, setMarketing] = useState(false)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="mb-6 text-center">
          <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="mx-auto mb-4 h-12 w-12" />
          <h3 className="text-xl font-black text-gray-900">서비스 이용 동의</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            크로닛을 이용하기 전에 아래 약관에 동의해주세요.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-[#FAFAF8] p-4 transition-all hover:border-[#03C75A]/40">
          <div className="mt-0.5 shrink-0">
            {checked ? (
              <CheckCircle2 size={20} className="text-[#03C75A]" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="text-sm leading-relaxed text-gray-600">
            <Link to="/terms" className="font-bold text-[#03C75A] underline underline-offset-2" target="_blank">이용약관</Link>
            {' '}및{' '}
            <Link to="/privacy" className="font-bold text-[#03C75A] underline underline-offset-2" target="_blank">개인정보처리방침</Link>
            에 동의합니다.
          </span>
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[#03C75A]/40">
          <div className="mt-0.5 shrink-0">
            {marketing ? (
              <CheckCircle2 size={20} className="text-[#03C75A]" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
          />
          <span className="text-sm leading-relaxed text-gray-600">
            <span className="font-bold text-gray-400">[선택]</span> 마케팅 정보 수신에 동의합니다.
            <span className="mt-0.5 block text-xs text-gray-400">
              혜택·이벤트·신규 기능 소식을 이메일/카카오톡 등으로 받아봅니다. 미동의해도 서비스 이용에는 영향이 없어요.
            </span>
          </span>
        </label>

        <button
          onClick={() => checked && onAgree(marketing)}
          disabled={!checked}
          className="mt-4 w-full rounded-2xl bg-[#03C75A] px-6 py-3.5 text-base font-black text-white shadow-[0_10px_30px_-10px_rgba(3,199,90,0.5)] transition-all hover:bg-[#02b350] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          동의하고 계속하기
        </button>
      </div>
    </div>
  )
}

export default TermsModal
