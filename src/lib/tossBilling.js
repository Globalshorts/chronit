import { supabase } from './supabase'

// 토스 결제 SDK 로더 + 정기결제(빌링) 카드 등록.
// 카드 등록은 토스 창으로 이동했다가 successUrl 로 돌아오는 리다이렉트 방식이라,
// authKey / customerKey 는 돌아온 페이지(PaymentResult)의 쿼리스트링으로 받는다.
const BCK = import.meta.env.VITE_TOSS_BILLING_CLIENT_KEY || ''

export function loadToss() {
  return new Promise((res) => {
    if (window.TossPayments) return res()
    const done = () => res()
    if (document.getElementById('toss-sdk')) { const t = setInterval(() => { if (window.TossPayments) { clearInterval(t); done() } }, 100); return }
    const s = document.createElement('script'); s.id = 'toss-sdk'; s.src = 'https://js.tosspayments.com/v2/standard'
    s.onload = done; document.head.appendChild(s)
  })
}

const fail = (code, message) => Object.assign(new Error(message), { code })

export async function requestCardRegistration({ successUrl, failUrl }) {
  const { data: ses } = await supabase.auth.getSession()
  const user = ses?.session?.user
  if (!user || user.is_anonymous) throw fail('NEED_LOGIN', '로그인이 필요해요')
  if (!BCK) throw fail('NO_KEY', '결제 설정 준비 중이에요')
  await loadToss()
  const payment = window.TossPayments(BCK).payment({ customerKey: user.id })
  await payment.requestBillingAuth({ method: 'CARD', customerEmail: user.email, successUrl, failUrl })
}
