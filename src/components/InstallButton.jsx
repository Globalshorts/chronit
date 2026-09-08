import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
}
const AUTO_PROMPT_MIN = 2  // 로그인 후 자동 팝업까지 대기(분)

// 전역 렌더: 모든 페이지에서 브라우저 유저에게 노출(설치 완료=standalone이면 숨김)
export default function InstallButton() {
  const [visible, setVisible] = useState(false)
  const [bottomPx, setBottomPx] = useState(16)
  const loc = useLocation()

  // 하단 탭바(FindsBottomNav)가 있는 페이지에선 그 위로 올림
  useEffect(() => {
    if (typeof window === 'undefined') return
    const recalc = () => {
      try {
        const nav = document.querySelector('[data-app-bottom-nav]')
        const visible = nav && getComputedStyle(nav).display !== 'none' && nav.offsetHeight > 0
        setBottomPx(visible ? nav.offsetHeight + 12 : 16)
      } catch { setBottomPx(16) }
    }
    const t = setTimeout(recalc, 60)   // 라우트 렌더 후 측정
    window.addEventListener('resize', recalc)
    return () => { clearTimeout(t); window.removeEventListener('resize', recalc) }
  }, [loc.pathname])

  useEffect(() => {
    if (typeof window === 'undefined' || isStandalone()) return
    let dismissed = false
    try { dismissed = sessionStorage.getItem('chr_install_x') === '1' } catch {}
    setVisible(!dismissed)
    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  // 첫 방문자: 로그인되면 N분 뒤 자동 팝업 1회
  useEffect(() => {
    if (typeof window === 'undefined' || isStandalone()) return
    let timer = null
    const armIfNeeded = () => {
      try { if (localStorage.getItem('chr_install_prompted') === '1') return } catch {}
      if (timer) return
      timer = setTimeout(() => {
        try {
          if (isStandalone() || localStorage.getItem('chr_install_prompted') === '1') return
          localStorage.setItem('chr_install_prompted', '1')
          window.dispatchEvent(new Event('chronit:open-install'))
        } catch {}
      }, AUTO_PROMPT_MIN * 60 * 1000)
    }
    supabase.auth.getSession().then(({ data }) => { if (data?.session) armIfNeeded() }).catch(() => {})
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { if (s && (e === 'SIGNED_IN' || e === 'INITIAL_SESSION')) armIfNeeded() })
    return () => { if (timer) clearTimeout(timer); try { sub?.subscription?.unsubscribe?.() } catch {} }
  }, [])

  if (!visible) return null
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('chronit:open-install'))}
      aria-label="앱 설치"
      style={{ bottom: `${bottomPx}px` }}
      className="fixed left-4 z-[120] flex items-center gap-1.5 rounded-full bg-[#0064FF] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0064FF]/30 transition-[bottom] duration-200 active:scale-[0.97] md:left-5"
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
