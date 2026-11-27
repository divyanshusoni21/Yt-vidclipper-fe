import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
// Standalone Speed Editor page is temporarily disabled; speed editing lives inline on Home.
// import EditVideoSpeed from './pages/EditVideoSpeed'

const LegacyGetClipsRedirect = () => {
    const location = useLocation()
    return <Navigate to="/" state={location.state} replace />
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/get-clips" element={<LegacyGetClipsRedirect />} />
            {/* <Route path="/edit-video-speed" element={<EditVideoSpeed />} /> */}
        </Routes>
    )
}

export default App
