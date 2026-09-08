import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initPosthog } from './lib/posthog'

// ── 첫 방문 유입 캡처 (first-touch) — 광고/유입 귀속용 ──
try {
  if (!localStorage.getItem('chronit_acq')) {
    const _q = new URLSearchParams(location.search);
    localStorage.setItem('chronit_acq', JSON.stringify({
      landing: (location.pathname + location.search).slice(0, 300),
      ref: (document.referrer || '').slice(0, 500),
      source: _q.get('utm_source') || '',
      medium: _q.get('utm_medium') || '',
      campaign: _q.get('utm_campaign') || '',
      content: _q.get('utm_content') || '',
      t: Date.now(),
    }));
  }
} catch { /* noop */ }

// 분석 초기화는 첫 페인트 이후로 지연 (초기 로드/렌더 블로킹 방지)
const _startPH = () => { try { initPosthog() } catch {} }
if ('requestIdleCallback' in window) requestIdleCallback(_startPH, { timeout: 4000 })
else setTimeout(_startPH, 2500)

// 앱 CSS(비차단)가 적용된 뒤 렌더 → 무스타일 깜빡임 방지. 안전 폴백 포함.
function whenCssReady(cb) {
  try {
    const links = Array.from(document.querySelectorAll('link[rel="preload"][as="style"], link[rel="stylesheet"]'))
      .filter((l) => /\/assets\/index-.*\.css/.test(l.href || ''))
    const ready = () => links.length === 0 || links.some((l) => { try { return !!l.sheet } catch { return false } })
    if (ready()) return cb()
    let done = false
    const fire = () => { if (!done) { done = true; cb() } }
    links.forEach((l) => l.addEventListener('load', () => { if (ready()) fire() }, { once: true }))
    setTimeout(fire, 2000)
  } catch { cb() }
}
whenCssReady(() => createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
))
