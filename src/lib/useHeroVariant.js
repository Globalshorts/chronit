import { useState, useEffect } from 'react'
import { phFeatureFlag, onPhFlags } from './posthog'

// 랜딩 히어로 A/B — PostHog 실험(플래그 키: landing-hero)
//   control → A안(현재형) · problem → B안(문제직격형)
// 플래그 로드 전/PostHog 미설정 시 기본 'A'(control)로 표시하고, 로드되면 배정값으로 전환.
export function useHeroVariant() {
  const [variant, setVariant] = useState(() => phFeatureFlag('landing-hero'))
  useEffect(() => {
    const cur = phFeatureFlag('landing-hero'); if (cur) setVariant(cur)
    const off = onPhFlags(() => { const f = phFeatureFlag('landing-hero'); if (f) setVariant(f) })
    return off
  }, [])
  return variant === 'problem' ? 'B' : 'A'
}
