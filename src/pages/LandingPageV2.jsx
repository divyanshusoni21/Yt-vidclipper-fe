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
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
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

                <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 md:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 px-1">
                        Turn YouTube Videos <br className="hidden md:block" />
                        into <span className="text-blue-600">Perfect Clips</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-base sm:text-xl text-gray-600 mb-8 sm:mb-12 leading-relaxed px-1">
                        The fastest way to crop, edit, and download clips with {projectName}. No software required.
                    </p>

                    <div className="max-w-3xl mx-auto bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 ring-4 ring-gray-50/50 transform transition-all hover:scale-[1.01] mx-2 sm:mx-auto">
                        <form onSubmit={handle_submit} className="flex flex-col md:flex-row gap-4 p-3 sm:p-4">
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => {
                                    set_youtube_url(e.target.value)
                                    set_error('')
                                }}
                                className="flex-grow min-w-0 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400"
                                placeholder="Paste YouTube URL here..."
                            />
                            <button
                                type="submit"
                                className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-lg hover:shadow-blue-500/30 whitespace-nowrap min-h-[44px]"
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

            {/* Problem & Solution Section */}
            <section className="py-12 sm:py-16 md:py-24 bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30 pointer-events-none">
                    <div className="absolute -left-[10%] top-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 blur-3xl animate-pulse"></div>
                    <div className="absolute -right-[10%] bottom-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-bl from-blue-100 to-cyan-100 blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="container mx-auto px-4 sm:px-6 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
                        <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3 block">Why we built {projectName}?</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 text-gray-900">Solving the <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600">Sharing Dilemma</span></h2>
                        <p className="text-base sm:text-xl text-gray-500 px-1">We've all been there. You find a gem in a long video, but sharing it is a hassle.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center mb-16 md:mb-24">
                        <div className="order-1">
                            <div className="bg-gradient-to-br from-gray-50 to-white p-6 sm:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-xl relative group hover:shadow-2xl transition-all duration-300 overflow-visible pt-12 sm:pt-8">
                                <div className="absolute -top-4 left-4 sm:-top-6 sm:-left-6 bg-red-100 text-red-600 p-3 sm:p-4 rounded-2xl shadow-lg transform rotate-[-6deg] group-hover:rotate-[-12deg] transition-transform duration-300">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4 text-gray-800">The Problem</h3>
                                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-4 md:mb-6">
                                    You watch a fantastic 2-hour podcast and find a hilarious or knowledge-worthy <span className="font-semibold text-gray-900">30/60-second moment</span>. You want to share it, but no one actually clicks or opens <span className="font-semibold text-gray-900">timestamped links</span>, and screen recording is hassle.
                                </p>
                                <div className="h-1 w-20 bg-red-200 rounded-full"></div>
                            </div>
                        </div>
                        <div className="order-2">
                            <div className="bg-gradient-to-br from-blue-50 to-white p-6 sm:p-8 rounded-2xl md:rounded-[2.5rem] border border-blue-100 shadow-xl relative group hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-visible pt-12 sm:pt-8">
                                <div className="absolute -top-4 right-4 sm:-top-6 sm:-right-6 bg-blue-100 text-blue-600 p-3 sm:p-4 rounded-2xl shadow-lg transform rotate-[6deg] group-hover:rotate-[12deg] transition-transform duration-300">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4 text-gray-800">The Solution</h3>
                                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-4 md:mb-6">
                                    {projectName} lets you extract <span className="font-semibold text-blue-600">exact timeframes</span> in high definition. Simply paste the link, choose your start and end times, and get a crisp 720p clip ready to go viral.
                                </p>
                                <div className="h-1 w-20 bg-blue-200 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="order-1">
                            <div className="bg-gradient-to-br from-gray-50 to-white p-6 sm:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-xl relative group hover:shadow-2xl transition-all duration-300 overflow-visible pt-12 sm:pt-8">
                                <div className="absolute -top-4 left-4 sm:-top-6 sm:-left-6 bg-yellow-100 text-yellow-600 p-3 sm:p-4 rounded-2xl shadow-lg transform rotate-[-6deg] group-hover:rotate-[-12deg] transition-transform duration-300">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4 text-gray-800">The Problem</h3>
                                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-4 md:mb-6">
                                    Social media has limits. Instagram Stories and WhatsApp Status only allow <span className="font-semibold text-gray-900">1 minute</span>. But your perfect clip is 1 minute and 15 seconds long.
                                </p>
                                <div className="h-1 w-20 bg-yellow-200 rounded-full"></div>
                            </div>
                        </div>
                        <div className="order-2">
                            <div className="bg-gradient-to-br from-green-50 to-white p-6 sm:p-8 rounded-2xl md:rounded-[2.5rem] border border-green-100 shadow-xl relative group hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300 overflow-visible pt-12 sm:pt-8">
                                <div className="absolute -top-4 right-4 sm:-top-6 sm:-right-6 bg-green-100 text-green-600 p-3 sm:p-4 rounded-2xl shadow-lg transform rotate-[6deg] group-hover:rotate-[12deg] transition-transform duration-300">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4 text-gray-800">The Solution</h3>
                                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-4 md:mb-6">
                                    Our built-in <span className="font-semibold text-green-600">Speed Editor</span> solves this instantly. Speed up your 1:15 clip to 1.25x, and it fits perfectly into a 60-second Story without losing any context.
                                </p>
                                <div className="h-1 w-20 bg-green-200 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-10 sm:py-16 md:py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="text-center mb-8 sm:mb-12 md:mb-16">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">How It Works</h2>
                        <p className="text-gray-500 text-base sm:text-lg">Three simple steps to your new clip.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 max-w-5xl mx-auto">
                        {/* Step 1 */}
                        <div className="relative group text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                                <span className="text-2xl sm:text-3xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">1</span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Paste Link</h3>
                            <p className="text-gray-600 text-sm sm:text-base">Copy the URL from YouTube and paste it into our secure tool.</p>
                        </div>
                        {/* Step 2 */}
                        <div className="relative group text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-purple-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-purple-600 transition-colors duration-300">
                                <span className="text-2xl sm:text-3xl font-bold text-purple-600 group-hover:text-white transition-colors duration-300">2</span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Select Time</h3>
                            <p className="text-gray-600 text-sm sm:text-base">Choose the exact start and end moments for your perfect clip.</p>
                        </div>
                        {/* Step 3 */}
                        <div className="relative group text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-green-600 transition-colors duration-300">
                                <span className="text-2xl sm:text-3xl font-bold text-green-600 group-hover:text-white transition-colors duration-300">3</span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Download</h3>
                            <p className="text-gray-600 text-sm sm:text-base">Get your professional quality clip in 720p or 480p instantly.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bento Grid Features Section */}
            <section id="features" className="pt-10 pb-8 sm:pt-16 sm:pb-12 md:pt-24 md:pb-24 bg-white">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 tracking-tight">Designed for Modern Creators</h2>
                        <p className="text-gray-600 text-lg">Everything you need to create viral content without the friction of traditional editors.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {/* Cloud Clipping Card */}
                        <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl md:rounded-[2.5rem] p-6 sm:p-8 md:p-10 flex flex-col justify-between text-white overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                                <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 sm:mb-8 border border-white/20">
                                    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                </div>
                                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">Clip Without Downloading</h3>
                                <p className="text-blue-100 text-base sm:text-lg md:text-xl leading-relaxed max-w-sm font-light">
                                    Don't waste time downloading entire videos just to edit a small clip. Simply paste the URL, select your timeframe, and get your clip instantly.
                                </p>
                            </div>
                        </div>

                        {/* Quality Card */}
                        <div className="md:col-span-2 bg-gray-50 rounded-2xl md:rounded-[2.5rem] p-6 sm:p-8 md:p-10 border border-gray-100 flex flex-col justify-between group hover:bg-gray-100 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all duration-700">
                                <svg className="w-48 h-48 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="relative z-10">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-indigo-600/20">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">High Definition</h3>
                                <p className="text-gray-600 text-base sm:text-lg leading-relaxed">Download clips in crisp 720p and 480p source quality. No compression artifacts, just pure clarity for your audience.</p>
                            </div>
                        </div>

                        {/* Zero Watermarks Card */}
                        <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-6 sm:p-8 md:p-10 border border-gray-100 flex flex-col items-center text-center group hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-500">
                                ✨
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 tracking-tight">No Watermarks</h3>
                            <p className="text-gray-500 text-base leading-relaxed">Clean, professional clips ready for your brand.</p>
                        </div>

                        {/* Free Forever Card */}
                        <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-6 sm:p-8 md:p-10 border border-gray-100 flex flex-col items-center text-center group hover:border-purple-200 hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-50 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-500">
                                💰
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 tracking-tight">Free Forever</h3>
                            <p className="text-gray-500 text-base leading-relaxed">No credit card or hidden subscription fees.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="pt-8 pb-12 sm:pt-16 sm:pb-16 md:pt-20 md:pb-20 bg-white text-center">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="max-w-4xl mx-auto bg-blue-600 rounded-3xl p-6 sm:p-8 md:p-12 text-white shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black opacity-10 rounded-full blur-3xl"></div>

                        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6 md:mb-8 relative z-10">Ready to make your clip?</h2>
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="px-8 sm:px-10 py-3 sm:py-4 min-h-[44px] bg-white text-blue-600 font-bold text-lg sm:text-xl rounded-full hover:bg-blue-50 transition-colors shadow-lg relative z-10"
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
