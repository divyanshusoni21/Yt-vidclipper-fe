import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'

function Header() {
  const location = useLocation()
  const [mobile_menu_open, set_mobile_menu_open] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>

          {/* Desktop nav */}
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

          {/* Mobile hamburger button */}
          <button
            onClick={() => set_mobile_menu_open(!mobile_menu_open)}
            className="md:hidden p-2 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobile_menu_open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobile_menu_open && (
          <nav className="md:hidden pt-4 pb-2 flex flex-col gap-2 border-t border-gray-100 mt-2">
            <Link
              to="/get-clips"
              onClick={() => set_mobile_menu_open(false)}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              Clip Cutter
            </Link>
            <Link
              to="/edit-video-speed"
              onClick={() => set_mobile_menu_open(false)}
              className="text-gray-700 hover:text-orange-600 transition-colors font-medium py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              Video Speed Editor
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header



