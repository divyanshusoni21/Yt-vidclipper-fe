import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { projectName } from '../config'

const LandingPageV2 = () => {
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
            set_error('Please enter a valid YouTube URL')
            return
        }

        navigate('/get-clips', { state: { youtubeUrl } })
    }

    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900 overflow-x-hidden">
            <Header />

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-200 opacity-20 blur-3xl animate-pulse"></div>
                    <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-blue-200 opacity-20 blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900">
                        Turn YouTube Videos <br className="hidden md:block" />
                        into <span className="text-blue-600">Perfect Clips</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-12 leading-relaxed">
                        The fastest way to crop, edit, and download clips with {projectName}. No software required.
                    </p>

                    <div className="max-w-3xl mx-auto bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 ring-4 ring-gray-50/50 transform transition-all hover:scale-[1.01]">
                        <form onSubmit={handle_submit} className="flex flex-col md:flex-row gap-4 p-4">
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => {
                                    set_youtube_url(e.target.value)
                                    set_error('')
                                }}
                                className="flex-grow px-6 py-4 text-lg bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400"
                                placeholder="Paste YouTube URL here..."
                            />
                            <button
                                type="submit"
                                className="px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-lg hover:shadow-blue-500/30 whitespace-nowrap"
                            >
                                Get Clips
                            </button>
                        </form>
                    </div>
                    {error && (
                        <p className="mt-4 text-red-500 font-medium animate-bounce">{error}</p>
                    )}
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                        <p className="text-gray-500 text-lg">Three simple steps to your new clip.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
                        {/* Step 1 */}
                        <div className="relative group text-center">
                            <div className="w-20 h-20 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                                <span className="text-3xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">1</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Paste Link</h3>
                            <p className="text-gray-600">Copy the URL from YouTube and paste it into our secure tool.</p>
                        </div>
                        {/* Step 2 */}
                        <div className="relative group text-center">
                            <div className="w-20 h-20 mx-auto bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors duration-300">
                                <span className="text-3xl font-bold text-purple-600 group-hover:text-white transition-colors duration-300">2</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Select Time</h3>
                            <p className="text-gray-600">Choose the exact start and end moments for your perfect clip.</p>
                        </div>
                        {/* Step 3 */}
                        <div className="relative group text-center">
                            <div className="w-20 h-20 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors duration-300">
                                <span className="text-3xl font-bold text-green-600 group-hover:text-white transition-colors duration-300">3</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">Download</h3>
                            <p className="text-gray-600">Get your professional quality clip in 720p or 480p instantly.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bento Grid Features Section */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Designed for Modern Creators</h2>
                        <p className="text-gray-600 text-lg">Everything you need to create viral content without the friction of traditional editors.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {/* Speed Card */}
                        <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 flex flex-col justify-between text-white overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                                <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h3 className="text-4xl font-bold mb-6">Lightning Fast</h3>
                                <p className="text-blue-100 text-xl leading-relaxed max-w-sm font-light">
                                    Our cloud-native engine processes your YouTube clips in seconds, not minutes. Spend less time waiting and more time creating.
                                </p>
                            </div>
                            <div className="relative z-10 pt-12">
                                <div className="flex items-center space-x-3 bg-blue-500/30 w-fit px-5 py-2.5 rounded-full border border-white/10 text-sm font-medium backdrop-blur-sm">
                                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                                    <span>Average processing: 14s</span>
                                </div>
                            </div>
                        </div>

                        {/* Quality Card */}
                        <div className="md:col-span-2 bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 flex flex-col justify-between group hover:bg-gray-100 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all duration-700">
                                <svg className="w-48 h-48 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/20">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">High Definition</h3>
                                <p className="text-gray-600 text-lg leading-relaxed">Download clips in crisp 720p and 480p source quality. No compression artifacts, just pure clarity for your audience.</p>
                            </div>
                        </div>

                        {/* Zero Watermarks Card */}
                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 flex flex-col items-center text-center group hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500">
                                ✨
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">No Watermarks</h3>
                            <p className="text-gray-500 text-base leading-relaxed">Clean, professional clips ready for your brand.</p>
                        </div>

                        {/* Free Forever Card */}
                        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 flex flex-col items-center text-center group hover:border-purple-200 hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500">
                            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500">
                                💰
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Free Forever</h3>
                            <p className="text-gray-500 text-base leading-relaxed">No credit card or hidden subscription fees.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-white text-center">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto bg-blue-600 rounded-3xl p-12 text-white shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black opacity-10 rounded-full blur-3xl"></div>

                        <h2 className="text-3xl md:text-5xl font-bold mb-8 relative z-10">Ready to make your clip?</h2>
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="px-10 py-4 bg-white text-blue-600 font-bold text-xl rounded-full hover:bg-blue-50 transition-colors shadow-lg relative z-10"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default LandingPageV2
