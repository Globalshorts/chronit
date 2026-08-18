import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'

// 렌더(편집) 종료 게이트 — 2026-09-15 0시(KST)부터 작업실 진입 차단, Finds로 리다이렉트
const RENDER_CLOSE = new Date('2026-09-15T00:00:00+09:00').getTime()
function GenerateGate() {
  if (Date.now() >= RENDER_CLOSE) return <Navigate to="/finds" replace />
  return <VideoGenerator />
}
import { AnalysisProvider } from './context/analysis'
import VideoGenerator from './pages/VideoGenerator'
import Finds from './pages/Finds'
import Trend from './pages/Trend'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Register from './pages/Register'
import Manual from './pages/Manual'
import ManualDetail from './pages/ManualDetail'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import EventWrite from './pages/EventWrite'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Admin from './pages/Admin'
import LinkPage from './pages/LinkPage'
import LinksManager from './pages/LinksManager'
import Board from './pages/Board'
import BoardWrite from './pages/BoardWrite'
import BoardPost from './pages/BoardPost'
import MyPage from './pages/MyPage'
import UserProfile from './pages/UserProfile'
import DmAutomation from './pages/DmAutomation'
import PaymentResult from './pages/PaymentResult'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorReportModal from './components/ErrorReportModal'
import AdminFab from './components/AdminFab'
import { installGlobalErrorCapture } from './lib/errorReport'
import { supabase } from './lib/supabase'
import { trackSignupIfNew } from './lib/trackSignup'
import { phIdentify, phReset } from './lib/posthog'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0) }, [pathname])
  return null
}

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
    <ScrollToTop />
    <ErrorReportModal />
    <AdminFab />
    <ErrorBoundary>
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
      <Route path="/finds" element={<Finds />} />
      <Route path="/trend" element={<Trend />} />
      <Route path="/links" element={<LinksManager />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/write" element={<BoardWrite />} />
      <Route path="/board/u/:id" element={<UserProfile />} />
      <Route path="/board/:id" element={<BoardPost />} />
      <Route path="/me" element={<MyPage />} />
      <Route path="/u/:handle" element={<LinkPage />} />
      <Route path="/dm" element={<DmAutomation />} />
      <Route path="/payments/success" element={<PaymentResult />} />
      <Route path="/payments/fail" element={<PaymentResult fail />} />
    </Routes>
    </ErrorBoundary>
    </AnalysisProvider>
  </BrowserRouter>
  )
}

export default App
