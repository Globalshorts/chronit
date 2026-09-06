import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SignupSurveyModal from './SignupSurveyModal'

/**
 * 로그인 후 최초 진입 시 온보딩 설문을 어느 페이지에서든 1회 노출.
 * onboarding_state_rpc: { needed(persona 미입력), has_source(경로 이미 답함) }
 */
const OnboardingSurveyGate = () => {
  const [open, setOpen] = useState(false)
  const [hasSource, setHasSource] = useState(false)

  useEffect(() => {
    let dead = false
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        if (localStorage.getItem('chronit_onboarded')) return
        const { data } = await supabase.rpc('onboarding_state_rpc')
        if (dead) return
        if (data?.needed) { setHasSource(!!data.has_source); setOpen(true) }
        else { try { localStorage.setItem('chronit_onboarded', '1') } catch { /* noop */ } }
      } catch { /* noop */ }
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) check() })
    return () => { dead = true; try { sub?.subscription?.unsubscribe?.() } catch { /* noop */ } }
  }, [])

  const onDone = () => {
    try { localStorage.setItem('chronit_onboarded', '1') } catch { /* noop */ }
    setOpen(false)
  }

  return <SignupSurveyModal open={open} hasSource={hasSource} onDone={onDone} />
}

export default OnboardingSurveyGate
