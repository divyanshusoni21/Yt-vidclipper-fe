import { Routes, Route } from 'react-router-dom'
import LandingPageV2 from './pages/LandingPageV2'
import ClipEditorV2 from './pages/ClipEditorV2'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPageV2 />} />
      <Route path="/clip-editor" element={<ClipEditorV2 />} />
    </Routes>
  )
}

export default App
