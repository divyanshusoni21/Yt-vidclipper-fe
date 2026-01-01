import { Link } from 'react-router-dom'
import Logo from './Logo'
import { projectName } from '../config'

function Footer() {

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <Logo className="invert brightness-200" />
            <p className="text-gray-400 text-lg leading-relaxed">
              The professional way to create perfect clips with {projectName}. Fast, free, and beautiful.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link
                  to="/"
                  className="hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/get-clips"
                  className="hover:text-white transition-colors"
                >
                  Clip Cutter
                </Link>
              </li>
              <li>
                <Link
                  to="/edit-video-speed"
                  className="hover:text-white transition-colors"
                >
                  Video Speed Editor
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <p className="text-gray-400 mb-6">
              Questions or feedback? We'd love to hear from you.
            </p>
            <a
              href="https://buymeacoffee.com/divyanshu_soni"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-xl border border-yellow-500/20 hover:bg-yellow-500 hover:text-white transition-all duration-300 group"
            >
              <span className="font-bold">Buy me a coffee</span>
              <span className="group-hover:rotate-12 transition-transform">☕️</span>
            </a>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {projectName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer



