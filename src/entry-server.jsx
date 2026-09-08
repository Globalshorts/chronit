import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import Home from './pages/Home'

// 홈(로그아웃 상태)을 정적 HTML로 렌더 — 첫 화면 즉시 표시용
export function render() {
  return renderToStaticMarkup(
    <StaticRouter location="/">
      <Home />
    </StaticRouter>
  )
}
