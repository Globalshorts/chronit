import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ActivationOnboarding from './ActivationOnboarding'

// 활성화 온보딩을 띄울지 판단.
//
// 기준은 profiles.activation_at 하나 — null 이면 아직 활성화 전이다.
// (onboarded / onboarded_at 은 '가입' 쪽 값이라 건드리지 않는다. 가입 완료 시각과
//  활성화 완료는 별개고, 기존 회원은 activation_at 이 백필돼 있어 대상에서 빠진다.)
//
// 제외: 가입 절차 중(/register)·결제 결과 화면 — 각자 자기 흐름이 있다.
const SKIP_PATHS = ['/register', '/payments']

// '나중에 하기'를 누르면 이만큼 쉬었다 다시 묻는다(기존 가입 설문과 같은 방식)
const DEFER_MS = 3 * 86400000
const DEFER_KEY = 'chr_activation_deferred'
const DONE_KEY = 'chr_activation_done'

export default function ActivationGate() {
  const { pathname } = useLocation()
  const [show, setShow] = useState(false)
  const suppressed = SKIP_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    let dead = false
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (dead) return

        // 서버 기록이 실패했을 때를 대비한 기기 단위 안전장치
        let skip = false
        try {
          if (localStorage.getItem(DONE_KEY) === '1') skip = true
          const at = Number(localStorage.getItem(DEFER_KEY) || 0)
          if (at && Date.now() - at < DEFER_MS) skip = true
        } catch { /* noop */ }
        if (skip) { setShow(false); return }

        const u = session?.user
        if (!u || u.is_anonymous) { setShow(false); return }

        const { data: prof } = await supabase.from('profiles').select('activation_at').eq('id', u.id).maybeSingle()
        if (dead) return
        setShow(!!prof && !prof.activation_at)
      } catch { if (!dead) setShow(false) }
    }

    check()
    // 로그아웃도 check() 안에서 처리된다(세션이 없으면 닫음)
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check() })
    return () => { dead = true; try { sub?.subscription?.unsubscribe?.() } catch { /* noop */ } }
  }, [])

  if (!show || suppressed) return null
  return (
    <ActivationOnboarding
      onDone={() => setShow(false)}
      onDefer={() => {
        try { localStorage.setItem(DEFER_KEY, String(Date.now())) } catch { /* noop */ }
        setShow(false)
      }}
    />
  )
}
