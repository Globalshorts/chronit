// React 19: no React import needed
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Manual from './pages/Manual'
import Events from './pages/Events'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Admin from './pages/Admin'

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/manual" element={<Manual />} />
      <Route path="/events" element={<Events />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
)

export default App
