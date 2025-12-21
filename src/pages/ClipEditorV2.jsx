import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function ClipEditorV2() {
    const location = useLocation()
    const [youtubeUrl, set_youtube_url] = useState(location.state?.youtubeUrl || '')
    const [startTime, set_start_time] = useState('')
    const [endTime, set_end_time] = useState('')
    const [errors, set_errors] = useState({})

    const validate_time_format = (time) => {
        if (!time.trim()) return 'Please enter a time'
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
        if (!timeRegex.test(time)) return 'Format: HH:MM:SS'
        return ''
    }

    const time_to_seconds = (time) => {
        const [hours, minutes, seconds] = time.split(':').map(Number)
        return hours * 3600 + minutes * 60 + seconds
    }

    const validate_logic = (start, end) => {
        if (!start || !end) return ''
        if (validate_time_format(start) || validate_time_format(end)) return ''

        const s = time_to_seconds(start)
        const e = time_to_seconds(end)

        if (e <= s) return 'End time must be after start'
        if ((e - s) > 600) return 'Clip max duration is 10 mins'

        return ''
    }

    const format_time_input = (value) => {
        const numbers = value.replace(/\D/g, '').slice(0, 6)
        if (numbers.length > 4) return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}:${numbers.slice(4)}`
        if (numbers.length > 2) return `${numbers.slice(0, 2)}:${numbers.slice(2)}`
        return numbers
    }

    const handle_time_change = (value, setter, field, otherTime, isStart) => {
        const formatted = format_time_input(value)
        setter(formatted)

        let newErrors = { ...errors }
        if (formatted.length === 8) {
            const formatErr = validate_time_format(formatted)
            if (formatErr) {
                newErrors[field] = formatErr
            } else {
                delete newErrors[field]
                // Logic check
                if (otherTime && otherTime.length === 8) {
                    const logicErr = isStart ? validate_logic(formatted, otherTime) : validate_logic(otherTime, formatted)
                    if (logicErr) newErrors.logic = logicErr
                    else delete newErrors.logic
                }
            }
        }
        set_errors(newErrors)
    }

    const get_video_id = (url) => {
        const regex = /[?&]v=([^&#]*)/
        const match = url.match(regex)
        return match ? match[1] : null
    }

    const videoId = get_video_id(youtubeUrl)

    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900 overflow-x-hidden">
            <Header />

            {/* Main Content */}
            <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 flex-grow">
                {/* Decorative Background */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-0 w-96 h-96 rounded-full bg-blue-100 opacity-30 blur-3xl transform -translate-x-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-100 opacity-30 blur-3xl transform translate-x-1/4"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-start">

                        {/* Left Column: Controls */}
                        <div className="order-2 lg:order-1">
                            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                                <h1 className="text-3xl font-bold mb-2">Clip Configuration</h1>
                                <p className="text-gray-500 mb-8">Fine-tune your clip settings below.</p>

                                <div className="space-y-6">
                                    {/* URL Input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">YouTube URL</label>
                                        <input
                                            type="text"
                                            value={youtubeUrl}
                                            onChange={(e) => set_youtube_url(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                            placeholder="https://youtube.com/..."
                                        />
                                    </div>

                                    {/* Time Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Start Time</label>
                                            <input
                                                type="text"
                                                value={startTime}
                                                onChange={(e) => handle_time_change(e.target.value, set_start_time, 'startTime', endTime, true)}
                                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-center font-mono text-lg tracking-widest placeholder-gray-300 ${errors.startTime ? 'border-red-500 ring-red-200' : 'border-gray-200'}`}
                                                placeholder="00:00:00"
                                                maxLength={8}
                                            />
                                            {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">End Time</label>
                                            <input
                                                type="text"
                                                value={endTime}
                                                onChange={(e) => handle_time_change(e.target.value, set_end_time, 'endTime', startTime, false)}
                                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-center font-mono text-lg tracking-widest placeholder-gray-300 ${errors.endTime ? 'border-red-500 ring-red-200' : 'border-gray-200'}`}
                                                placeholder="00:00:00"
                                                maxLength={8}
                                            />
                                            {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
                                        </div>
                                    </div>

                                    {/* Logic Error Display */}
                                    {errors.logic && (
                                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center font-medium border border-red-100">
                                            {errors.logic}
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <button className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                                        Generate Clip
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Preview */}
                        <div className="order-1 lg:order-2">
                            <div className="bg-gray-900 rounded-3xl shadow-2xl overflow-hidden aspect-video relative group">
                                {videoId ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${videoId}`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                        <svg className="w-20 h-20 mb-4 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                                        <p className="font-medium">Video Preview</p>
                                    </div>
                                )}
                            </div>

                            {/* Preview Meta Info */}
                            {videoId && (
                                <div className="mt-6 flex items-center justify-between px-2">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-sm font-semibold text-gray-500">Ready to clip</span>
                                    </div>
                                    <span className="text-sm text-gray-400">720p • 480p Source</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </section>

            <Footer />
        </div>
    )
}

export default ClipEditorV2
