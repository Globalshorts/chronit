import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { FINDS_PLANS, PLAN_LABEL, PLAN_SPEC, PLAN_PERKS } from './planLabels'

// 요금제 정보를 DB(plans)에서 읽어온다 — 가격·이용권·워치리스트 한도를 바꾸려면
// plans 테이블만 고치면 되고 배포가 필요 없다. 응답 전/실패 시엔 PLAN_SPEC 폴백.
// 이름만은 DB(plans.name)가 아니라 PLAN_LABEL 을 쓴다 — DB에 옛 이름이 남는 일이 있어서.
const build = (row, id) => {
  const f = PLAN_SPEC[id]
  const num = (v, fb) => (Number(v) > 0 ? Number(v) : fb)
  const credits = num(row?.max_credits, f.credits)
  const watch = num(row?.watch_limit, f.watch)
  return {
    id,
    name: PLAN_LABEL[id],
    price: num(row?.monthly_price, f.price),
    credits,
    watch,
    perks: [
      '베라 대본 비서 · 내 말투 학습 대본',
      `월 이용권 ${credits.toLocaleString('ko-KR')}개 (대본 · 채널 분석)`,
      `워치리스트 감시 계정 ${watch.toLocaleString('ko-KR')}개`,
      ...(PLAN_PERKS[id] || []),
    ],
  }
}

const fallback = () => FINDS_PLANS.map((id) => build(null, id))

export function usePlans() {
  const [plans, setPlans] = useState(fallback)

  useEffect(() => {
    let alive = true
    supabase.from('plans').select('id, monthly_price, max_credits, watch_limit').in('id', FINDS_PLANS)
      .then(({ data }) => {
        if (!alive || !Array.isArray(data) || !data.length) return
        const by = {}
        data.forEach((r) => { by[r.id] = r })
        setPlans(FINDS_PLANS.map((id) => build(by[id], id)))
      }, () => {})
    return () => { alive = false }
  }, [])

  return plans
}
