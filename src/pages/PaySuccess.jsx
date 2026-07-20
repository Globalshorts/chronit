import { useSearchParams } from 'react-router-dom'

// 테스트 성공 페이지.
// ⚠️ 라이브에서는 여기서 서버(엣지함수 confirm-payment)로 paymentKey/orderId/amount를 보내
//    secret key로 토스 결제 승인 API를 호출하고 금액을 검증한 뒤 구독을 활성화해야 함.
//    (현재는 프론트 테스트 단계라 승인 호출 없이 파라미터만 표시)
export default function PaySuccess() {
  const [sp] = useSearchParams()
  const paymentKey = sp.get('paymentKey')
  const orderId = sp.get('orderId')
  const amount = sp.get('amount')

  const Row = ({ k, v }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ color: '#6B7280', fontSize: 13 }}>{k}</span>
      <span style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-all', textAlign: 'right' }}>{v || '-'}</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 800, fontSize: 12, padding: '4px 10px', marginBottom: 12 }}>
        TEST · 서버 승인(confirm) 미연결
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0064FF' }}>결제 요청 성공</h1>
      <p style={{ color: '#6B7280', margin: '8px 0 24px' }}>토스에서 아래 값이 넘어왔어요. 라이브에서는 이 값으로 서버 승인 API를 호출해 구독을 활성화합니다.</p>
      <div style={{ textAlign: 'left', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '8px 16px' }}>
        <Row k="paymentKey" v={paymentKey} />
        <Row k="orderId" v={orderId} />
        <Row k="amount" v={amount ? Number(amount).toLocaleString('ko-KR') + '원' : null} />
      </div>
      <a href="/" style={{ display: 'inline-block', marginTop: 24, color: '#0064FF', fontWeight: 800 }}>홈으로</a>
    </div>
  )
}
