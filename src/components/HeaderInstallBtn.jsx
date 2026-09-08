import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
}

// 상단 헤더용 설치 버튼 — 설치 완료(standalone)면 숨김. light: 다크 배경 헤더용.
export default function HeaderInstallBtn({ light = false, className = '' }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || isStandalone()) return
    setShow(true)
    const onInstalled = () => setShow(false)
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])
  if (!show) return null
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('chronit:open-install'))}
      title="홈 화면에 앱으로 추가"
      aria-label="앱 설치"
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors ${light ? 'border-white/25 text-white/80 hover:border-white/50' : 'border-slate-300 text-slate-600 hover:border-slate-400'} ${className}`}
    >
      <Download size={14} /> <span className="hidden sm:inline">앱 설치</span>
    </button>
  )
}
