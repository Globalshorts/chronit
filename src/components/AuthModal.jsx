import { useState } from 'react'
import { X, Gift, ExternalLink, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

const AuthModal = ({ open, onClose, referralCode }) => {
  const [copied, setCopied] = useState(false)
  if (!open) return null

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  // 인앱(웹뷰) 브라우저: 구글 OAuth가 'disallowed_useragent'로 차단됨
  // 인스타·페북·네이버·카카오톡·라인·다음 + 안드로이드 웹뷰(; wv)
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|KAKAOTALK|Line\/|Daum|DaumApps|; wv\)/i.test(ua)
  const isAndroid = /Android/i.test(ua)

  const signIn = async (provider) => {
    try { window.gtag?.('event', 'auth_start', { provider, page: window.location.pathname }) } catch {}
    const options = { redirectTo: window.location.origin + window.location.pathname }
    if (provider === 'kakao') options.scopes = 'profile_nickname'
    await supabase.auth.signInWithOAuth({ provider, options })
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  const openExternal = () => {
    if (isAndroid) {
      const url = window.location.host + window.location.pathname + window.location.search
      window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`
    } else {
      copyLink()
    }
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
            로그인하면 무료로 영상 2개를 바로 드려요.
          </p>
        </div>

        {inApp && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
            인앱 브라우저(네이버·인스타·카톡 등)에서는 <b>구글 로그인이 제한</b>돼요.<br />
            아래 <b>카카오로 계속하기</b>를 쓰거나, 외부 브라우저에서 열어주세요.
            <div className="mt-3 flex gap-2">
              {isAndroid && (
                <button
                  onClick={openExternal}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white active:scale-95"
                >
                  <ExternalLink size={13} /> Chrome에서 열기
                </button>
              )}
              <button
                onClick={copyLink}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-700 active:scale-95"
              >
                {copied ? (<><Check size={13} /> 복사됨</>) : (<><Copy size={13} /> 주소 복사</>)}
              </button>
            </div>
            {!isAndroid && (
              <p className="mt-2 text-xs">복사한 주소를 Safari에 붙여넣거나, 우측 상단 <b>⋯ → 기본 브라우저로 열기</b></p>
            )}
          </div>
        )}

        {referralCode && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#0064FF]/30 bg-[#0064FF]/10 px-4 py-3">
            <Gift size={15} className="shrink-0 text-[#0064FF]" />
            <span className="text-sm font-bold text-[#0064FF]">
              추천 코드 <span className="text-gray-900">{referralCode}</span> — 가입 시 프로 7일 무료 체험
            </span>
          </div>
        )}

        <div className="space-y-3">
          {/* Kakao — 모바일/인앱에서 안정적 (1순위) */}
          <button
            onClick={() => signIn('kakao')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#FEE500] px-4 py-3.5 font-bold text-[#191919] transition-all hover:bg-[#f5dc00] active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#191919" d="M9 1.5C4.86 1.5 1.5 4.14 1.5 7.38c0 2.07 1.38 3.9 3.45 4.95l-.75 2.85a.225.225 0 0 0 .33.255l3.15-2.1c.42.06.855.09 1.32.09 4.14 0 7.5-2.64 7.5-5.88S13.14 1.5 9 1.5z"/>
            </svg>
            카카오로 계속하기
          </button>

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
          {inApp && (
            <p className="text-center text-xs text-gray-400">구글은 인앱에서 막힐 수 있어요 — 카카오를 권장해요</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
