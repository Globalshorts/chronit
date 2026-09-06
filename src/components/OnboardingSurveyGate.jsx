import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SignupSurveyModal from './SignupSurveyModal'

/**
 * 로그인 후 온보딩(직군·니치) 미완료면 어느 페이지에서든 노출.
 * 판단은 항상 서버(onboarding_state_rpc)로 — 캐시/계정전환에도 정확.
 *  needed: persona 미입력 & 기존유저 / has_source: 경로 이미 답함(→경로 스킵)
 */
const OnboardingSurveyGate = () => {
  const [open, setOpen] = useState(false)
  const [hasSource, setHasSource] = useState(false)

  useEffect(() => {
    let dead = false
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { if (!dead) setOpen(false); return }
        const { data } = await supabase.rpc('onboarding_state_rpc')
        if (dead) return
        if (data?.needed) { setHasSource(!!data.has_source); setOpen(true) }
        else setOpen(false)
      } catch { /* noop */ }
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) check(); else setOpen(false) })
    return () => { dead = true; try { sub?.subscription?.unsubscribe?.() } catch { /* noop */ } }
  }, [])

  return <SignupSurveyModal open={open} hasSource={hasSource} onDone={() => setOpen(false)} />
}

export default OnboardingSurveyGate
