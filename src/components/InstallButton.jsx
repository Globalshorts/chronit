import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true } catch { return false }
}
const AUTO_PROMPT_MIN = 2  // 로그인 후 자동 팝업까지 대기(분)

// 헤드리스: 첫 방문자 로그인 후 N분 뒤 설치 팝업 1회. (버튼은 각 헤더의 HeaderInstallBtn)
export default function InstallButton() {
  useEffect(() => {
    if (typeof window === 'undefined' || isStandalone()) return
    let timer = null
    const arm = () => {
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
    supabase.auth.getSession().then(({ data }) => { if (data?.session) arm() }).catch(() => {})
    const { data: sub } = supabase.auth.onAuthStateChange((e, sess) => { if (sess && (e === 'SIGNED_IN' || e === 'INITIAL_SESSION')) arm() })
    return () => { if (timer) clearTimeout(timer); try { sub?.subscription?.unsubscribe?.() } catch {} }
  }, [])
  return null
}
