import { X, Gift } from 'lucide-react'
import { supabase } from '../lib/supabase'

const AuthModal = ({ open, onClose, referralCode }) => {
  if (!open) return null

  const signIn = async (provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href },
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
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

        <div className="mb-8 text-center">
          <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="mx-auto mb-4 h-12 w-12" />
          <h3 className="text-xl font-black text-gray-900">로그인</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            로그인하면 무료 크레딧 500개를 바로 드려요.
          </p>
        </div>

        {/* 추천인 코드 표시 */}
        {referralCode && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#03C75A]/30 bg-[#03C75A]/10 px-4 py-3">
            <Gift size={15} className="shrink-0 text-[#03C75A]" />
            <span className="text-sm font-bold text-[#03C75A]">
              추천 코드 <span className="text-gray-900">{referralCode}</span> — 가입 시 500 크레딧 추가
            </span>
          </div>
        )}

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => signIn('google')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3.5 font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Google로 계속하기
          </button>

          {/* Kakao */}
          <button
            onClick={() => signIn('kakao')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-4 py-3.5 font-bold text-[#191919] transition-all hover:bg-[#f5dc00] active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#191919" d="M9 1.5C4.86 1.5 1.5 4.14 1.5 7.38c0 2.07 1.38 3.9 3.45 4.95l-.75 2.85a.225.225 0 0 0 .33.255l3.15-2.1c.42.06.855.09 1.32.09 4.14 0 7.5-2.64 7.5-5.88S13.14 1.5 9 1.5z"/>
            </svg>
            카카오로 계속하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
