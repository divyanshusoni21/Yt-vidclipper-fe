import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'

function Header() {
  const location = useLocation()
  const is_landing_page = location.pathname === '/'


  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/get-clips"
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
            >
              Clip Cutter
            </Link>
            <Link
              to="/edit-video-speed"
              className="text-gray-700 hover:text-orange-600 transition-colors font-medium"
            >
              Video Speed Editor
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header



