import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'

function Header() {
  const location = useLocation()
  const is_landing_page = location.pathname === '/'

  const handle_smooth_scroll = (e, targetId) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      const headerOffset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {is_landing_page ? (
              <>
                <a
                  href="#features"
                  onClick={(e) => handle_smooth_scroll(e, 'features')}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={(e) => handle_smooth_scroll(e, 'how-it-works')}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  How It Works
                </a>
              </>
            ) : (
              <Link
                to="/"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Home
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header


