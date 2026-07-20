import { useSearchParams } from 'react-router-dom'

// 테스트 실패 페이지 — 토스가 failUrl로 code, message를 붙여 보냄.
export default function PayFail() {
  const [sp] = useSearchParams()
  const code = sp.get('code')
  const message = sp.get('message')

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontWeight: 800, fontSize: 12, padding: '4px 10px', marginBottom: 12 }}>
        TEST MODE
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#DC2626' }}>결제 실패</h1>
      <p style={{ color: '#374151', margin: '12px 0', fontWeight: 700 }}>{message || '결제가 취소되었거나 실패했어요.'}</p>
      <p style={{ color: '#9CA3AF', fontSize: 13 }}>코드: {code || '-'}</p>
      <a href="/pay/test" style={{ display: 'inline-block', marginTop: 24, color: '#0064FF', fontWeight: 800 }}>다시 시도</a>
    </div>
  )
}
