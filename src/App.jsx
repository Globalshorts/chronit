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
import AdminFab from './components/AdminFab'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => { if (!window.location.hash) window.scrollTo(0, 0) }, [pathname])
  return null
}

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <AdminFab />
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
    </Routes>
  </BrowserRouter>
)

export default App
