// 플랜 표기 통일 — 화면에 보이는 이름은 항상 여기서만 가져온다.
// DB plans.name 은 옛 이름(플러스 등)이 남아 있으므로 신뢰하지 않는다.
// 옛 플랜(starter/pro/master/pro_trial)은 더 이상 판매하지 않으며 이름을 노출하지 않는다.
export const PLAN_LABEL = {
  free: '무료',
  finds30: '스탠다드',
  finds100: '프로',
  finds300: '비즈니스',
}

// 관리자 구독 부여 드롭다운 (값 = subscriptions.plan)
export const GRANT_PLANS = [
  ['free', '무료'],
  ['finds30', '스탠다드'],
  ['finds100', '프로'],
  ['finds300', '비즈니스'],
]

export const FINDS_PLANS = ['finds30', 'finds100', 'finds300']

// 통계·표에서 쓰는 정규화: 현재 플랜은 그대로, 레거시는 '기타'로 흡수.
export const normalizePlan = (p) => {
  const v = p || 'free'
  if (v === 'free' || FINDS_PLANS.includes(v)) return v
  return 'legacy'
}

// 라벨 조회 — 알 수 없거나 레거시면 '기타'
export const planLabel = (p) => PLAN_LABEL[p || 'free'] || '기타'

// 요금제 스펙 — 실제 값은 DB(plans)에서 읽고, 이건 DB 응답 전/실패 시 폴백.
// (가격·이용권·워치리스트 한도를 바꿀 땐 plans 테이블을 고치면 배포 없이 반영된다)
export const PLAN_SPEC = {
  finds30:  { price: 9900,  credits: 60,  watch: 100 },
  finds100: { price: 24900, credits: 180, watch: 300 },
  finds300: { price: 34900, credits: 300, watch: 500 },
}

// 플랜별 부가 혜택 (이용권 수·워치리스트 한도는 스펙에서 자동 생성)
export const PLAN_PERKS = {
  finds30:  ['실시간 트렌드 무제한'],
  finds100: ['실시간 트렌드 무제한', '패스트벤치 선점 리스트'],
  finds300: ['패스트벤치 선점 리스트', '니치 알림', '개인화 큐레이션'],
}

// 워치리스트 갱신 과금 단위 — 50계정당 이용권 1개
export const ACCOUNTS_PER_CREDIT = 50
