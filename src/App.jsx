import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import VideoGenerator from './pages/VideoGenerator'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Register from './pages/Register'
import Manual from './pages/Manual'
import ManualDetail from './pages/ManualDetail'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
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
import AdminFab from './components/AdminFab'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorReportModal from './components/ErrorReportModal'
import { installGlobalErrorCapture } from './lib/errorReport'
import { supabase } from './lib/supabase'
import { trackSignupIfNew } from './lib/trackSignup'

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
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) { setUid(session); trackSignupIfNew(session) }
      if (event === 'SIGNED_OUT') { try { window.gtag && window.gtag('config', GA, { user_id: undefined, send_page_view: false }) } catch {} }
    })
    return () => { try { sub.subscription.unsubscribe() } catch {} }
  }, [])
  return (
  <BrowserRouter>
    <ScrollToTop />
    <AdminFab />
    <ErrorReportModal />
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/start" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/manual" element={<Manual />} />
      <Route path="/manual/:section" element={<ManualDetail />} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/generate" element={<VideoGenerator />} />
      <Route path="/links" element={<LinksManager />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/write" element={<BoardWrite />} />
      <Route path="/board/u/:id" element={<UserProfile />} />
      <Route path="/board/:id" element={<BoardPost />} />
      <Route path="/me" element={<MyPage />} />
      <Route path="/u/:handle" element={<LinkPage />} />
      <Route path="/dm" element={<DmAutomation />} />
    </Routes>
    </ErrorBoundary>
  </BrowserRouter>
  )
}

export default App
