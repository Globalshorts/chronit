import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ActivationOnboarding from './ActivationOnboarding'

// 활성화 온보딩을 띄울지 판단.
//
// 대상: 가입을 마쳤고(onboarded) 아직 활성화를 안 한(onboarded_at is null) 진짜 로그인 유저.
// 제외:
//  - 이미 첫 분석을 한 사람(subscriptions.first_analysis_bonus) — 이미 활성화된 셈이고,
//    이 흐름의 '첫 분석 무료'도 이미 써버린 상태라 다시 띄우면 이상하다.
//  - 가입 절차 중(/register)·결제 결과 화면 — 각자 자기 흐름이 있다.
//  ※ 기존 회원은 마이그레이션의 백필로 onboarded_at 이 채워져 대상에서 빠진다.
//    백필을 안 돌리면 전 회원에게 강제로 뜬다.
const SKIP_PATHS = ['/register', '/payments']

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

        let done = false
        try { done = localStorage.getItem('chr_activation_done') === '1' } catch { /* noop */ }
        if (done) { setShow(false); return }

        const u = session?.user
        if (!u || u.is_anonymous) { setShow(false); return }

        const [{ data: prof }, { data: sub }] = await Promise.all([
          supabase.from('profiles').select('onboarded, onboarded_at').eq('id', u.id).maybeSingle(),
          supabase.from('subscriptions').select('first_analysis_bonus').eq('user_id', u.id).maybeSingle(),
        ])
        if (dead) return
        if (!prof) { setShow(false); return }
        setShow(prof.onboarded === true && !prof.onboarded_at && sub?.first_analysis_bonus !== true)
      } catch { if (!dead) setShow(false) }
    }

    check()
    // 로그아웃도 check() 안에서 처리된다(세션이 없으면 닫음)
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check() })
    return () => { dead = true; try { sub?.subscription?.unsubscribe?.() } catch { /* noop */ } }
  }, [])

  if (!show || suppressed) return null
  return <ActivationOnboarding onDone={() => setShow(false)} />
}
