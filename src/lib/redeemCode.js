import { supabase } from './supabase'

// 코드 1개 입력 → 기존 코드 시스템에 순서대로 태워보고 첫 성공을 반환.
// - plan_codes      : redeem_plan_code        (강사/배포용 플랜 코드 — N일 무료)
// - coupon_codes    : redeem_free_trial_rpc   (type='free_days' — N일 무료 체험)
// - promo_codes     : redeem_promo_rpc        (이벤트/광고 코드 — 보너스 이용권)
// 적용 이력은 각 RPC가 code_redemptions / promo_redemptions 에 기록한다.
// 코드를 넣지 않으면 어떤 할인·무료도 적용되지 않는다.
const CHAIN = [
  { rpc: 'redeem_plan_code', args: (c) => ({ p_code: c }) },
  { rpc: 'redeem_free_trial_rpc', args: (c) => ({ p_code: c }) },
  { rpc: 'redeem_promo_rpc', args: (c) => ({ p_code: c }) },
]

const okText = (rpc, data) => {
  if (rpc === 'redeem_promo_rpc') return `🎉 코드 적용! 이용권 ${data?.credits ?? 0}개가 지급됐어요`
  const days = Number(data?.days) || 0
  if (days >= 28) return '🎉 코드 적용! 첫 달 무료로 시작해요'
  if (days > 0) return `🎉 코드 적용! ${days}일 무료로 이용할 수 있어요`
  return '🎉 코드가 적용됐어요'
}

export const normalizeCode = (v) => String(v || '').trim().toUpperCase().replace(/\s/g, '')

// returns { ok, text, rpc?, data? }
export async function redeemAnyCode(raw) {
  const code = normalizeCode(raw)
  if (!code) return { ok: false, text: '코드를 입력해주세요' }

  // "존재하지 않는 코드"는 다음 체계로 넘어가면 되므로, 그 외의 사유(만료·중복·마감)를 우선 보여준다.
  let reason = ''
  for (const step of CHAIN) {
    try {
      const { data, error } = await supabase.rpc(step.rpc, step.args(code))
      if (error) continue
      if (data?.ok) return { ok: true, text: okText(step.rpc, data), rpc: step.rpc, data }
      const e = data?.error
      if (e && !reason && !/존재하지 않|코드가 아닙|잘못된 코드/.test(e)) reason = e
    } catch { /* 다음 코드 체계로 계속 */ }
  }
  return { ok: false, text: reason || '사용할 수 없는 코드예요' }
}
