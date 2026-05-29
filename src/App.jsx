import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Manual from './pages/Manual'
import ManualDetail from './pages/ManualDetail'
import Events from './pages/Events'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Admin from './pages/Admin'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/manual" element={<Manual />} />
      <Route path="/manual/:section" element={<ManualDetail />} />
      <Route path="/events" element={<Events />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
)

export default App
