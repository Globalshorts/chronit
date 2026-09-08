import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnalysisProvider } from './context/analysis'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import BlobBackground from './components/BlobBackground'
import ErrorReportModal from './components/ErrorReportModal'
import OnboardingSurveyGate from './components/OnboardingSurveyGate'
import { installGlobalErrorCapture } from './lib/errorReport'
import { supabase } from './lib/supabase'
import { trackSignupIfNew } from './lib/trackSignup'
import { phIdentify, phReset } from './lib/posthog'

// ── 라우트별 코드 스플리팅 (홈 진입 시 앱 전체가 아니라 필요한 청크만 로드) ──
// 청크 로드 실패(배포 갱신으로 옛 해시 요청 등) 시 1회 새로고침해 최신 청크를 받음 → 빈 화면 방지
const lazyRetry = (factory) => lazy(() => factory().catch((err) => {
  try {
    const k = 'chr_chunk_reload'
    if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, '1'); window.location.reload(); return new Promise(() => {}) }
  } catch {}
  throw err
}))

const AdminFab = lazyRetry(() => import('./components/AdminFab'))
const VideoGenerator = lazyRetry(() => import('./pages/VideoGenerator'))
const Finds = lazyRetry(() => import('./pages/Finds'))
const Trend = lazyRetry(() => import('./pages/Trend'))
const FastBench = lazyRetry(() => import('./pages/FastBench'))
const ChannelAnalysis = lazyRetry(() => import('./pages/ChannelAnalysis'))
const Landing = lazyRetry(() => import('./pages/Landing'))
const Register = lazyRetry(() => import('./pages/Register'))
const Manual = lazyRetry(() => import('./pages/Manual'))
const ManualDetail = lazyRetry(() => import('./pages/ManualDetail'))
const Events = lazyRetry(() => import('./pages/Events'))
const EventDetail = lazyRetry(() => import('./pages/EventDetail'))
const EventWrite = lazyRetry(() => import('./pages/EventWrite'))
const Terms = lazyRetry(() => import('./pages/Terms'))
const Privacy = lazyRetry(() => import('./pages/Privacy'))
const Admin = lazyRetry(() => import('./pages/Admin'))
const LinkPage = lazyRetry(() => import('./pages/LinkPage'))
const LinksManager = lazyRetry(() => import('./pages/LinksManager'))
const Board = lazyRetry(() => import('./pages/Board'))
const BoardWrite = lazyRetry(() => import('./pages/BoardWrite'))
const BoardPost = lazyRetry(() => import('./pages/BoardPost'))
const MyPage = lazyRetry(() => import('./pages/MyPage'))
const Pricing = lazyRetry(() => import('./pages/Pricing'))
const UserProfile = lazyRetry(() => import('./pages/UserProfile'))
const DmAutomation = lazyRetry(() => import('./pages/DmAutomation'))
const PaymentResult = lazyRetry(() => import('./pages/PaymentResult'))

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
  <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
    <div style={{ width: 26, height: 26, border: '2.5px solid rgba(255,255,255,.15)', borderTopColor: '#4d7cff', borderRadius: '50%', animation: 'bootspin .8s linear infinite' }} />
  </div>
)

const App = () => {
  useEffect(() => { installGlobalErrorCapture(); try { sessionStorage.removeItem('chr_chunk_reload') } catch {} }, [])
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
  // 자동 재접속(강제 새로고침) 비활성화 — must-revalidate 헤더가 다음 접속에 최신본을 보장하므로 불필요.
  // (매 접속마다 재로딩되는 문제 방지)

  return (
  <BrowserRouter>
    <AnalysisProvider>
    <BlobBackground />
    <div style={{ position: 'relative', zIndex: 1 }}>
    <ScrollToTop />
    <ErrorReportModal />
    <OnboardingSurveyGate />
    <Suspense fallback={null}><AdminFab /></Suspense>
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
