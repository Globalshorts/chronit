// React 19: no React import needed
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Manual from './pages/Manual'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/manual" element={<Manual />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  </BrowserRouter>
)

export default App
