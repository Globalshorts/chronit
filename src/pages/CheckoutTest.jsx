import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk'

// ⚠️ 테스트 전용 — 토스페이먼츠 공개 샌드박스(결제위젯) 키.
//    라이브 전환 시 실제 결제위젯 연동 키로 교체 + successUrl 서버 승인(confirm) 연결 필요.
const TEST_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm'

const SALE_PRICES = { starter: 29000, pro: 49000, master: 79000, pkg6: 249000 }
const PLAN_NAME = { starter: '스타터', pro: '프로', master: '마스터', pkg6: '프로 6개월' }

export default function CheckoutTest() {
  const [sp] = useSearchParams()
  const plan = SALE_PRICES[sp.get('plan')] ? sp.get('plan') : 'pro'
  const amount = SALE_PRICES[plan]

  const [widgets, setWidgets] = useState(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tossPayments = await loadTossPayments(TEST_CLIENT_KEY)
        const w = tossPayments.widgets({ customerKey: ANONYMOUS })
        await w.setAmount({ currency: 'KRW', value: amount })
        await Promise.all([
          w.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
          w.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
        ])
        if (!cancelled) { setWidgets(w); setReady(true) }
      } catch (e) {
        if (!cancelled) setErr(String(e?.message || e))
      }
    })()
    return () => { cancelled = true }
  }, [amount])

  const pay = async () => {
    if (!widgets) return
    setErr('')
    const orderId = 'test_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    try {
      await widgets.requestPayment({
        orderId,
        orderName: `크로닛 ${PLAN_NAME[plan]} 이용권 (테스트)`,
        successUrl: window.location.origin + '/pay/success',
        failUrl: window.location.origin + '/pay/fail',
      })
    } catch (e) {
      setErr(String(e?.message || e))
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 8, display: 'inline-block', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 800, fontSize: 12, padding: '4px 10px' }}>
        TEST MODE · 실제 결제 아님 (토스 샌드박스)
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 2px' }}>크로닛 {PLAN_NAME[plan]} 이용권</h1>
      <p style={{ color: '#6B7280', fontWeight: 700, marginBottom: 16 }}>{amount.toLocaleString('ko-KR')}원</p>

      <div id="payment-method" />
      <div id="agreement" />

      {err && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>{err}</p>}

      <button
        onClick={pay}
        disabled={!ready}
        style={{ width: '100%', marginTop: 16, borderRadius: 16, padding: '16px', fontSize: 17, fontWeight: 900, color: '#fff', border: 'none', background: ready ? '#0064FF' : '#9CA3AF', cursor: ready ? 'pointer' : 'default' }}
      >
        {ready ? `${amount.toLocaleString('ko-KR')}원 결제하기 (테스트)` : '결제창 불러오는 중…'}
      </button>

      <p style={{ color: '#9CA3AF', fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
        테스트 카드로 결제해도 실제 청구되지 않아요. 플랜을 바꾸려면 URL에 <code>?plan=starter|pro|master|pkg6</code>를 붙이세요.
      </p>
    </div>
  )
}
