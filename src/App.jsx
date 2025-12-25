import { Routes, Route } from 'react-router-dom'
import LandingPageV2 from './pages/LandingPageV2'
import GetClips from './pages/GetClips'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPageV2 />} />
      <Route path="/get-clips" element={<GetClips />} />
    </Routes>
  )
}

export default App
