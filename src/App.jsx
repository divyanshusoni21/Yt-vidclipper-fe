import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ClipEditor from './pages/ClipEditor'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/clip-editor" element={<ClipEditor />} />
    </Routes>
  )
}

export default App
