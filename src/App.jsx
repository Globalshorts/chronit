// React 19: no React import needed
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Manual from './pages/Manual'

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/manual" element={<Manual />} />
    </Routes>
  </BrowserRouter>
)

export default App
