import { supabase } from './supabase'

// 코드 1개 입력 → 기존 코드 시스템에 순서대로 태워보고 첫 성공을 반환.
//
// 무료 체험 코드(coupon_codes, type='free_days')는 여기서 지급하지 않는다.
// 카드 등록이 필수라서 validate_partner_code_rpc 로 유효성만 확인하고 { trial } 을 돌려주면,
// 호출한 화면이 고지 카드 → 카드 등록 → toss-confirm(trial) 흐름으로 넘긴다.
// (예전엔 redeem_free_trial_rpc 가 카드 없이 무료일수를 줬는데, 그 경로는 체인에서 뺐다.)
//
// 나머지는 기존대로 즉시 적용:
// - plan_codes   : redeem_plan_code  (강사/배포용 플랜 코드)
// - promo_codes  : redeem_promo_rpc  (이벤트/광고 코드 — 보너스 이용권)
const CHAIN = [
  { rpc: 'redeem_plan_code', args: (c) => ({ p_code: c }) },
  { rpc: 'redeem_promo_rpc', args: (c) => ({ p_code: c }) },
]

// 이 사유면 "다른 코드 체계일 수 있다"는 뜻이라 다음 체계로 넘어간다.
const NOT_MINE = /존재하지 않|코드가 아닙|잘못된 코드/

const okText = (rpc, data) => {
  if (rpc === 'redeem_promo_rpc') return `🎉 코드 적용! 이용권 ${data?.credits ?? 0}개가 지급됐어요`
  const days = Number(data?.days) || 0
  if (days >= 28) return '🎉 코드 적용! 첫 달 무료로 시작해요'
  if (days > 0) return `🎉 코드 적용! ${days}일 무료로 이용할 수 있어요`
  return '🎉 코드가 적용됐어요'
}

export const normalizeCode = (v) => String(v || '').trim().toUpperCase().replace(/\s/g, '')

// 무료 체험(카드 필수) 코드인지 확인.
// returns { ok:true, plan, days } | { ok:false, error, notTrial }
export async function validateTrialCode(raw) {
  const code = normalizeCode(raw)
  if (!code) return { ok: false, error: '코드를 입력해주세요' }
  try {
    const { data, error } = await supabase.rpc('validate_partner_code_rpc', { p_code: code })
    if (error) return { ok: false, error: '코드를 확인하지 못했어요', notTrial: true }
    if (data?.ok) return { ok: true, code, plan: data.plan || 'finds300', days: Number(data.days) || 30 }
    const e = data?.error || '사용할 수 없는 코드예요'
    return { ok: false, error: e, notTrial: NOT_MINE.test(e) }
  } catch {
    return { ok: false, error: '코드를 확인하지 못했어요', notTrial: true }
  }
}

// returns { ok, text, rpc?, data?, trial? }
//   trial 이 있으면 무료 체험 코드 — 지급하지 않았고 카드 등록 흐름으로 넘겨야 한다.
export async function redeemAnyCode(raw) {
  const code = normalizeCode(raw)
  if (!code) return { ok: false, text: '코드를 입력해주세요' }

  const v = await validateTrialCode(code)
  if (v.ok) return { ok: false, trial: { code, plan: v.plan, days: v.days }, text: '무료 체험 코드예요 — 카드 등록 후 시작할 수 있어요' }
  // 체험 코드는 맞는데 쓸 수 없는 경우(만료·중복·이미 이용 중)는 그 사유를 그대로 보여준다
  if (!v.notTrial) return { ok: false, text: v.error }

  let reason = ''
  for (const step of CHAIN) {
    try {
      const { data, error } = await supabase.rpc(step.rpc, step.args(code))
      if (error) continue
      if (data?.ok) return { ok: true, text: okText(step.rpc, data), rpc: step.rpc, data }
      const e = data?.error
      if (e && !reason && !NOT_MINE.test(e)) reason = e
    } catch { /* 다음 코드 체계로 계속 */ }
  }
  return { ok: false, text: reason || '사용할 수 없는 코드예요' }
}
