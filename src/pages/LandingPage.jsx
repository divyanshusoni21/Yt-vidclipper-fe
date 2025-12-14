import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LandingPage() {
  const [youtubeUrl, set_youtube_url] = useState('')
  const [error, set_error] = useState('')
  const navigate = useNavigate()

  const validate_youtube_url = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
    return youtubeRegex.test(url)
  }

  const handle_submit = (e) => {
    e.preventDefault()
    set_error('')

    if (!youtubeUrl.trim()) {
      set_error('Please enter a YouTube URL')
      return
    }

    if (!validate_youtube_url(youtubeUrl)) {
      set_error('Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=...)')
      return
    }

    // Navigate to clip editor with URL as state
    navigate('/clip-editor', { state: { youtubeUrl } })
  }

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl md:text-3xl font-bold text-blue-600">YT Clip Helper</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
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
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24 flex-grow">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Create Perfect YouTube Clips
            <span className="block text-blue-600 mt-2">In Seconds</span>
          </h1>

          {/* Problem Section */}
          <div className="mb-8 md:mb-12">
            <p className="text-lg md:text-xl lg:text-2xl text-gray-700 mb-4">
              Tired of the hassle of creating clips from YouTube videos?
            </p>
            <div className="bg-red-50 border-l-4 border-red-400 p-4 md:p-6 rounded-lg text-left max-w-2xl mx-auto mb-6">
              <p className="text-base md:text-lg text-gray-800">
                <span className="font-semibold text-red-700">The Problem:</span> Creating clips requires video editing software, 
                time-consuming downloads, and technical know-how. You just want quick, shareable clips!
              </p>
            </div>
          </div>

          {/* Solution Section */}
          <div id="how-it-works" className="mb-8 md:mb-12 scroll-mt-20">
            <div className="bg-green-50 border-l-4 border-green-400 p-4 md:p-6 rounded-lg text-left max-w-2xl mx-auto">
              <p className="text-base md:text-lg text-gray-800 mb-3">
                <span className="font-semibold text-green-700">Our Solution:</span>
              </p>
              <ul className="list-disc list-inside text-base md:text-lg text-gray-800 space-y-2">
                <li>Simply paste your YouTube URL</li>
                <li>Enter your desired start and end times</li>
                <li>Get high-quality clips (720p and 480p) ready to download</li>
                <li>No software installation needed - it's all in your browser</li>
              </ul>
            </div>
          </div>

          {/* Form Section */}
          <div className="max-w-2xl mx-auto mt-12 md:mt-16">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 lg:p-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                Get Started Now
              </h2>
              <form onSubmit={handle_submit} className="space-y-6">
                <div>
                  <label 
                    htmlFor="youtube-url" 
                    className="block text-sm md:text-base font-medium text-gray-700 mb-2"
                  >
                    YouTube Video URL
                  </label>
                  <input
                    type="text"
                    id="youtube-url"
                    value={youtubeUrl}
                    onChange={(e) => {
                      set_youtube_url(e.target.value)
                      set_error('')
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 md:py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base md:text-lg transition-all"
                  />
                  {error && (
                    <p className="mt-2 text-sm md:text-base text-red-600">{error}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 md:py-4 px-6 rounded-lg text-base md:text-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create Clip
                </button>
              </form>
            </div>
          </div>

          {/* Features Section */}
          <div id="features" className="mt-16 md:mt-20 scroll-mt-20">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 md:mb-12 text-center">
              Why Choose Us
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Fast Processing</h3>
              <p className="text-gray-600">Get your clips ready in minutes, not hours</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-4">🎥</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">High Quality</h3>
              <p className="text-gray-600">Download clips in 720p and 480p resolutions</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Easy to Use</h3>
              <p className="text-gray-600">No technical skills required - just paste and go</p>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <h3 className="text-xl font-bold mb-4">YT Clip Helper</h3>
              <p className="text-gray-400">
                Create perfect YouTube clips quickly and easily. No software installation required.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="hover:text-white transition-colors"
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a 
                    href="#features" 
                    onClick={(e) => handle_smooth_scroll(e, 'features')}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a 
                    href="#how-it-works" 
                    onClick={(e) => handle_smooth_scroll(e, 'how-it-works')}
                    className="hover:text-white transition-colors"
                  >
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                Questions or feedback? We'd love to hear from you.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} YT Clip Helper. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
