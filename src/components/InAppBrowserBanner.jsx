import { useEffect, useState } from 'react'
import { ExternalLink, Copy, Check, X } from 'lucide-react'
import { phCapture } from '../lib/posthog'
import { isInAppBrowser, isAndroid, osOf, androidIntentUrl, copyCurrentUrl } from '../lib/inAppBrowser'

// 인스타·페북 웹뷰에서 뜨는 상단 배너.
// 안드로이드는 기기 기본 브라우저로 바로 보내고, iOS 는 강제할 방법이 없어 안내 + 링크 복사.
const DISMISS_KEY = 'chr_iab_dismissed'

// userAgent 는 페이지가 떠 있는 동안 바뀌지 않으니 한 번만 본다(렌더마다 읽지 않게)
const IAB = isInAppBrowser()
const ANDROID = isAndroid()
const wasDismissed = () => { try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false } }

export default function InAppBrowserBanner() {
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [copied, setCopied] = useState(false)
  const android = ANDROID

  useEffect(() => {
    if (IAB) { try { phCapture('iab_detected', { os: osOf() }) } catch { /* noop */ } }
  }, [])

  if (!IAB || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* noop */ }
  }

  const escape = () => {
    try { phCapture('iab_escape_clicked', { os: 'android', action: 'intent' }) } catch { /* noop */ }
    window.location.href = androidIntentUrl()
  }

  const copy = async () => {
    try { phCapture('iab_escape_clicked', { os: osOf(), action: 'copy' }) } catch { /* noop */ }
    const ok = await copyCurrentUrl()
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-black/10 shadow-lg" style={{ background: '#111318' }}>
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-snug text-white">
            {android ? '기본 브라우저로 열면 더 안정적이에요' : '외부 브라우저로 열어주세요'}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/55">
            {android
              ? '앱 안 브라우저에서는 로그인이 풀릴 수 있어요'
              : '우측 상단 ⋯ → ‘외부 브라우저로 열기’를 눌러주세요'}
          </p>
        </div>

        {android ? (
          <button onClick={escape}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#0064FF] px-3 py-2 text-xs font-bold text-white active:scale-95">
            <ExternalLink size={13} /> 열기
          </button>
        ) : (
          <button onClick={copy}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#0064FF] px-3 py-2 text-xs font-bold text-white active:scale-95">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? '복사됨' : '링크 복사'}
          </button>
        )}

        <button onClick={dismiss} aria-label="닫기" className="shrink-0 p-1 text-white/40 active:text-white/70">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
