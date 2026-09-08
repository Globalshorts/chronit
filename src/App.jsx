import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnalysisProvider } from './context/analysis'
import ErrorBoundary from './components/ErrorBoundary'
import BlobBackground from './components/BlobBackground'
import ErrorReportModal from './components/ErrorReportModal'
import AdminFab from './components/AdminFab'
import OnboardingSurveyGate from './components/OnboardingSurveyGate'
import { installGlobalErrorCapture } from './lib/errorReport'
import { supabase } from './lib/supabase'
import { trackSignupIfNew } from './lib/trackSignup'
import { phIdentify, phReset } from './lib/posthog'

// ── 라우트별 코드 스플리팅 (홈 진입 시 앱 전체가 아니라 필요한 청크만 로드) ──
const Home = lazy(() => import('./pages/Home'))
const VideoGenerator = lazy(() => import('./pages/VideoGenerator'))
const Finds = lazy(() => import('./pages/Finds'))
const Trend = lazy(() => import('./pages/Trend'))
const FastBench = lazy(() => import('./pages/FastBench'))
const ChannelAnalysis = lazy(() => import('./pages/ChannelAnalysis'))
const Landing = lazy(() => import('./pages/Landing'))
const Register = lazy(() => import('./pages/Register'))
const Manual = lazy(() => import('./pages/Manual'))
const ManualDetail = lazy(() => import('./pages/ManualDetail'))
const Events = lazy(() => import('./pages/Events'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const EventWrite = lazy(() => import('./pages/EventWrite'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Admin = lazy(() => import('./pages/Admin'))
const LinkPage = lazy(() => import('./pages/LinkPage'))
const LinksManager = lazy(() => import('./pages/LinksManager'))
const Board = lazy(() => import('./pages/Board'))
const BoardWrite = lazy(() => import('./pages/BoardWrite'))
const BoardPost = lazy(() => import('./pages/BoardPost'))
const MyPage = lazy(() => import('./pages/MyPage'))
const Pricing = lazy(() => import('./pages/Pricing'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const DmAutomation = lazy(() => import('./pages/DmAutomation'))
const PaymentResult = lazy(() => import('./pages/PaymentResult'))

// 렌더(편집) 종료 게이트 — 2026-09-15 0시(KST)부터 작업실 진입 차단, Research로 리다이렉트
const RENDER_CLOSE = new Date('2026-09-15T00:00:00+09:00').getTime()
function GenerateGate() {
  if (Date.now() >= RENDER_CLOSE) return <Navigate to="/research" replace />
  return <VideoGenerator />
}

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0) }, [pathname])
  return null
}

const RouteFallback = () => (
  <div style={{ minHeight: '60vh' }} aria-hidden="true" />
)

const App = () => {
  useEffect(() => { installGlobalErrorCapture() }, [])
  useEffect(() => {
    const GA = 'G-Y46H5BMZ2X'
    const setUid = (session) => {
      try {
        const uid = session && session.user && session.user.id
        if (window.gtag && uid) window.gtag('config', GA, { user_id: uid, send_page_view: false })
      } catch {}
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) { setUid(session); trackSignupIfNew(session); phIdentify(session.user && session.user.id) }
      if (event === 'SIGNED_OUT') { try { window.gtag && window.gtag('config', GA, { user_id: undefined, send_page_view: false }) } catch {}; phReset() }
    })
    return () => { try { sub.subscription.unsubscribe() } catch {} }
  }, [])
  // ★ 자동 업데이트: 새 번들이 배포되면 탭 복귀 시 자동 새로고침 (모바일이 옛 번들 무는 문제 방지) ★
  useEffect(() => {
    const curSrc = () => { try { const el = document.querySelector('script[type="module"][src*="/assets/"]'); return el ? el.src.split('/').pop() : '' } catch { return '' } }
    const mine = curSrc()
    if (!mine) return
    let updateReady = false
    const check = async () => {
      if (updateReady || document.hidden) return
      try {
        const html = await fetch('/?_v=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '')
        const m = html.match(/\/assets\/(index-[A-Za-z0-9_]+\.js)/)
        if (m && m[1] && m[1] !== mine) updateReady = true
      } catch {}
    }
    const onVis = () => {
      if (document.hidden) return
      if (updateReady) { try { window.location.reload() } catch {} ; return }
      check()
    }
    const iv = setInterval(check, 3 * 60 * 1000)
    const t = setTimeout(check, 20000)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => { clearInterval(iv); clearTimeout(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [])
  return (
  <BrowserRouter>
    <AnalysisProvider>
    <BlobBackground />
    <div style={{ position: 'relative', zIndex: 1 }}>
    <ScrollToTop />
    <ErrorReportModal />
    <OnboardingSurveyGate />
    <AdminFab />
    <ErrorBoundary>
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/start" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/manual" element={<Manual />} />
      <Route path="/manual/:section" element={<ManualDetail />} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/write" element={<EventWrite />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/generate" element={<GenerateGate />} />
      <Route path="/research" element={<Finds />} />
      <Route path="/finds" element={<Navigate to="/research" replace />} />
      <Route path="/trend" element={<Trend />} />
      <Route path="/fastbench" element={<FastBench />} />
      <Route path="/channel-analysis" element={<ChannelAnalysis />} />
      <Route path="/links" element={<LinksManager />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/write" element={<BoardWrite />} />
      <Route path="/board/u/:id" element={<UserProfile />} />
      <Route path="/board/:id" element={<BoardPost />} />
      <Route path="/me" element={<MyPage />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/u/:handle" element={<LinkPage />} />
      <Route path="/dm" element={<DmAutomation />} />
      <Route path="/payments/success" element={<PaymentResult />} />
      <Route path="/payments/fail" element={<PaymentResult fail />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
    </div>
    </AnalysisProvider>
  </BrowserRouter>
  )
}

export default App
