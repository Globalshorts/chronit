import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
}

// 로그인 후 자동 팝업까지 대기(분)
const AUTO_PROMPT_MIN = 2

export default function InstallButton({ user }) {
  const [visible, setVisible] = useState(false)

  // 표시 조건: 브라우저 유저(설치 안 함) & 이번 세션에 닫지 않음
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) { setVisible(false); return }   // 설치한 사람에겐 안 보임
    const dismissed = (() => { try { return sessionStorage.getItem('chr_install_x') === '1' } catch { return false } })()
    setVisible(!dismissed)
    const onInstalled = () => setVisible(false)
    const onModeChange = () => { if (isStandalone()) setVisible(false) }
    window.addEventListener('appinstalled', onInstalled)
    try { window.matchMedia('(display-mode: standalone)').addEventListener?.('change', onModeChange) } catch {}
    return () => { window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  // 첫 방문자: 로그인 후 N분 뒤 자동 팝업 1회
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return
    if (isStandalone()) return
    let prompted = false
    try { prompted = localStorage.getItem('chr_install_prompted') === '1' } catch {}
    if (prompted) return
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem('chr_install_prompted') === '1') return
        if (isStandalone()) return
        localStorage.setItem('chr_install_prompted', '1')
        window.dispatchEvent(new Event('chronit:open-install'))
      } catch {}
    }, AUTO_PROMPT_MIN * 60 * 1000)
    return () => clearTimeout(t)
  }, [user])

  if (!visible) return null

  return (
    <button
      onClick={() => window.dispatchEvent(new Event('chronit:open-install'))}
      aria-label="앱 설치"
      className="fixed bottom-24 left-4 z-[120] flex items-center gap-1.5 rounded-full bg-[#0064FF] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0064FF]/30 transition-transform active:scale-[0.97] md:bottom-6 md:left-6"
    >
      <Download size={16} /> 앱 설치
      <span
        role="button"
        aria-label="닫기"
        onClick={(e) => { e.stopPropagation(); try { sessionStorage.setItem('chr_install_x', '1') } catch {}; setVisible(false) }}
        className="ml-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/25"
      ><X size={13} /></span>
    </button>
  )
}
