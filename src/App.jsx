import { Routes, Route } from 'react-router-dom'
import LandingPageV2 from './pages/LandingPageV2'
import GetClips from './pages/GetClips'
import EditVideoSpeed from './pages/EditVideoSpeed'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPageV2 />} />
      <Route path="/get-clips" element={<GetClips />} />
      <Route path="/edit-video-speed" element={<EditVideoSpeed />} />
    </Routes>
  )
}

export default App
