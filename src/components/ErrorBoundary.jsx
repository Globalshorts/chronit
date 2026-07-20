import { Component } from 'react'
import { captureError } from '../lib/errorReport'

// React 렌더 중 터지는 오류를 잡아 리포트로 넘기고, 폴백 화면을 보여줌.
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) {
    captureError({ source: 'react', message: error?.message || 'Render error', stack: (error?.stack || '') + '\n\n[componentStack]' + (info?.componentStack || '') })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
          <p style={{ fontSize: 36 }}>😵</p>
          <h2 style={{ fontWeight: 900, fontSize: 20, margin: '4px 0 8px' }}>화면에 문제가 발생했어요</h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>오류 리포트 창이 떴다면 보내주시면 큰 도움이 돼요.</p>
          <button onClick={() => window.location.reload()} style={{ borderRadius: 12, padding: '12px 24px', fontWeight: 800, border: 'none', background: '#0064FF', color: '#fff', cursor: 'pointer' }}>새로고침</button>
        </div>
      )
    }
    return this.props.children
  }
}
