import { useState, useEffect, useRef } from 'react'
import { createClipRequest, getClipTaskStatus, sendClipToEmail } from '../api/clipService'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import RollingTimePicker from '../components/RollingTimePicker'

function GetClips() {
    const location = useLocation()
    const navigate = useNavigate()
    const [youtubeUrl, set_youtube_url] = useState(location.state?.youtubeUrl || '')
    // Default times for the picker (00:00:00)
    const [startTime, set_start_time] = useState('00:00:00')
    const [endTime, set_end_time] = useState('00:00:00')
    const [videoTitle, setVideoTitle] = useState('')
    const [errors, set_errors] = useState({})

    // API State
    const [isProcessing, setIsProcessing] = useState(false)
    const [clipRequestId, setClipRequestId] = useState(() => sessionStorage.getItem('clipRequestId'))
    const [clipStatus, setClipStatus] = useState(() => sessionStorage.getItem('clipStatus'))

    // Result State
    const [results, setResults] = useState(() => {
        const saved = sessionStorage.getItem('results')
        return saved ? JSON.parse(saved) : {
            p720: { url: null, size: null, id: null },
            p480: { url: null, size: null, id: null }
        }
    })
    const [isDownloading, setIsDownloading] = useState(false)
    const [email, setEmail] = useState('')
    const [isEmailSending, setIsEmailSending] = useState(false)
    const [emailStatus, setEmailStatus] = useState(null) // 'success' | 'error'

    const pollingIntervalRef = useRef(null)

    // --- Helpers ---
    const get_video_id = (url) => {
        const regex = /[?&]v=([^&#]*)/
        const match = url.match(regex)
        return match ? match[1] : null
    }
    const videoId = get_video_id(youtubeUrl)

    const time_to_seconds = (time) => {
        const [hours, minutes, seconds] = time.split(':').map(Number)
        return hours * 3600 + minutes * 60 + seconds
    }

    const validate_logic = (start, end) => {
        // Basic format check is implicit with the picker but good to keep
        const s = time_to_seconds(start)
        const e = time_to_seconds(end)
        if (e <= s) return 'End time must be > Start time'
        if ((e - s) > 600) return 'Max duration is 10 mins'
        return ''
    }

    // --- Persistence ---
    useEffect(() => {
        if (youtubeUrl) sessionStorage.setItem('youtubeUrl', youtubeUrl)
        if (startTime) sessionStorage.setItem('startTime', startTime)
        if (endTime) sessionStorage.setItem('endTime', endTime)
        if (videoTitle) sessionStorage.setItem('videoTitle', videoTitle)
        if (clipRequestId) sessionStorage.setItem('clipRequestId', clipRequestId)
        if (clipStatus) sessionStorage.setItem('clipStatus', clipStatus)
        if (results) sessionStorage.setItem('results', JSON.stringify(results))
    }, [youtubeUrl, startTime, endTime, videoTitle, clipRequestId, clipStatus, results])

    // Load static info
    useEffect(() => {
        const savedUrl = sessionStorage.getItem('youtubeUrl')
        const savedStart = sessionStorage.getItem('startTime')
        const savedEnd = sessionStorage.getItem('endTime')
        const savedTitle = sessionStorage.getItem('videoTitle')

        if (savedUrl && !location.state?.youtubeUrl) set_youtube_url(savedUrl)
        if (savedStart) set_start_time(savedStart)
        if (savedEnd) set_end_time(savedEnd)
        if (savedTitle) setVideoTitle(savedTitle)
    }, [])

    // --- API Logic ---
    const handleGenerateClip = async () => {
        set_errors({})
        if (!youtubeUrl) { set_errors({ youtubeUrl: 'Required' }); return }
        // startTime and endTime are always valid format from picker

        const logicErr = validate_logic(startTime, endTime)
        if (logicErr) { set_errors({ logic: logicErr }); return }

        setIsProcessing(true)
        setClipStatus('pending')
        setResults({ p720: { url: null, size: null, id: null }, p480: { url: null, size: null, id: null } })

        try {
            const data = await createClipRequest({
                youtube_url: youtubeUrl,
                start_time: startTime,
                end_time: endTime
            })
            setClipRequestId(data.id)
            setClipStatus(data.status)
        } catch (err) {
            setIsProcessing(false)
            set_errors({ api: err.message })
        }
    }

    // Dynamic Polling Logic
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const data = await getClipTaskStatus(clipRequestId)
                setClipStatus(data.status)
                if (data.status === 'completed') {
                    const newResults = {
                        p720: { url: null, size: null, id: null },
                        p480: { url: null, size: null, id: null }
                    };

                    if (data.clips && Array.isArray(data.clips)) {
                        data.clips.forEach(clip => {
                            const sizeStr = clip.size ? `${clip.size}MB` : null;
                            if (clip.resolution === '720p') {
                                newResults.p720 = { url: clip.clip, size: sizeStr, id: clip.id };
                            } else if (clip.resolution === '480p') {
                                newResults.p480 = { url: clip.clip, size: sizeStr, id: clip.id };
                            }
                        });
                    }
                    setResults(newResults)
                    setIsProcessing(false)
                    clearInterval(pollingIntervalRef.current)
                } else if (data.status === 'failed') {
                    setIsProcessing(false)
                    clearInterval(pollingIntervalRef.current)
                    set_errors(prev => ({ ...prev, api: data.error_message || 'Processing failed' }))
                }
            } catch (err) { console.error(err) }
        }

        if (clipRequestId && clipStatus !== 'completed' && clipStatus !== 'failed') {
            setIsProcessing(true) // Resume processing state if page reloaded/navigated back
            // First check
            checkStatus()

            // Calculate Dynamic Interval
            const duration = time_to_seconds(endTime) - time_to_seconds(startTime)
            let interval = 2000 // Default < 60s

            if (duration >= 60 && duration < 180) { // 60s to 3m (180s)
                interval = 5000
            } else if (duration >= 180) { // > 3m
                interval = 7000
            }

            // Set Interval
            pollingIntervalRef.current = setInterval(checkStatus, interval)
        }
        return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current) }
    }, [clipRequestId, clipStatus, startTime, endTime])

    const handleDownload = async (url, label) => {
        if (!url) return
        setIsDownloading(true)
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `clip_${label}_${Date.now()}.mp4`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        } catch (error) {
            alert('Failed to download clip.')
        } finally {
            setIsDownloading(false)
        }
    }

    const handleSendEmail = async () => {
        if (!email || !clipRequestId) return
        setIsEmailSending(true)
        setEmailStatus(null)
        try {
            await sendClipToEmail(clipRequestId, email)
            setEmailStatus('success')
            setEmail('')
        } catch (error) {
            setEmailStatus('error')
            alert(error.message || 'Failed to send email.')
        } finally {
            setIsEmailSending(false)
        }
    }

    const handleEditSpeed = (url, resolution, targetClipId) => {
        if (!url || !targetClipId) return
        navigate('/edit-video-speed', {
            state: {
                videoUrl: url,
                resolution,
                clipId: targetClipId
            }
        })
    }

    // Attempt to fetch title via oEmbed
    useEffect(() => {
        if (youtubeUrl && videoId) {
            fetch(`https://noembed.com/embed?url=${youtubeUrl}`)
                .then(res => res.json())
                .then(data => { if (data.title) setVideoTitle(data.title) })
                .catch(() => { })
        }
    }, [youtubeUrl, videoId])


    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900 overflow-x-hidden">
            <Header />

            {/* TOP CONTAINER: Input & Preview */}
            <section className="pt-28 pb-12 bg-white border-b border-gray-200">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="flex flex-col items-center space-y-8">

                        {/* 1. Enhanced YouTube URL Input */}
                        <div className="w-full max-w-3xl relative group">
                            {/* Gradient Border Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>

                            <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-7 h-7 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => set_youtube_url(e.target.value)}
                                    className="w-full pl-16 pr-28 py-5 text-lg bg-transparent border-0 outline-none focus:ring-0 placeholder-gray-400 text-gray-800 font-medium"
                                    placeholder="Paste your YouTube link here..."
                                />
                                <button
                                    onClick={async () => {
                                        try { const text = await navigator.clipboard.readText(); set_youtube_url(text) } catch (err) { }
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 transition-all duration-200 text-sm"
                                >
                                    📋 Paste
                                </button>
                            </div>
                            {errors.youtubeUrl && <p className="absolute -bottom-7 left-0 right-0 text-center text-sm text-red-500 font-medium animate-bounce">{errors.youtubeUrl}</p>}
                        </div>

                        {/* 2. Video Preview */}
                        <div className="w-full aspect-video bg-gray-900 rounded-2xl shadow-2xl overflow-hidden relative max-w-3xl ring-4 ring-gray-100">
                            {videoId ? (
                                <iframe
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title="YouTube video player"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-800">
                                    <svg className="w-16 h-16 mb-4 opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                                    <p className="font-medium">Video Preview</p>
                                </div>
                            )}
                        </div>

                        {/* 3. Helper Title - Fixed Width */}
                        {videoTitle && (
                            <div className="w-full max-w-3xl bg-yellow-100 px-6 py-2 rounded-lg border border-yellow-200 shadow-sm text-center">
                                <h2 className="text-gray-800 font-semibold truncate">{videoTitle}</h2>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* BOTTOM CONTAINER: Controls & Results */}
            <section className="flex-grow py-12 bg-gray-50">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 space-y-12">

                        {/* Row 1: Controls with Rolling Pickers */}
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
                            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                                {/* Start Time */}
                                <div className="flex flex-col items-center">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Start Time</label>
                                    <RollingTimePicker value={startTime} onChange={set_start_time} />
                                </div>

                                {/* End Time */}
                                <div className="flex flex-col items-center">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">End Time</label>
                                    <RollingTimePicker value={endTime} onChange={set_end_time} />
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="w-full lg:w-auto pt-8 lg:pt-0">
                                <button
                                    onClick={handleGenerateClip}
                                    disabled={isProcessing}
                                    className={`w-full lg:w-48 py-5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-orange-500/40 transition-all transform hover:scale-105 active:scale-95 text-xl ${isProcessing ? 'opacity-75 cursor-wait' : ''}`}
                                >
                                    {isProcessing ? 'Processing... ' : 'Get Clips'}
                                </button>
                            </div>
                        </div>

                        {/* Errors Area */}
                        {(errors.logic || errors.api) && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center font-medium border border-red-100 animate-pulse">
                                {errors.logic || errors.api}
                            </div>
                        )}

                        {/* Row 2 & 3: Results (Only show if completed or processing) */}
                        {(clipStatus === 'completed' || isProcessing) && (
                            <div className="border-t border-gray-100 pt-8 space-y-4 animate-in fade-in duration-700">

                                {/* 720p Card */}
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                                        <span className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-md text-sm border border-yellow-200">720p</span>
                                        {results.p720.size && (
                                            <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-md text-sm border border-yellow-100">{results.p720.size}</span>
                                        )}
                                        {isProcessing && <div className="h-2 w-24 bg-gray-200 rounded-full animate-pulse"></div>}
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => handleEditSpeed(results.p720.url, '720p', results.p720.id)}
                                            disabled={!results.p720.url}
                                            className="flex-1 md:flex-none px-4 py-2 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Edit Speed
                                        </button>
                                        <button
                                            onClick={() => handleDownload(results.p720.url, '720p')}
                                            disabled={!results.p720.url || isDownloading}
                                            className="flex-1 md:flex-none px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDownloading ? '...' : 'Download'}
                                        </button>
                                    </div>
                                </div>

                                {/* 480p Card */}
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                                        <span className="bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-md text-sm border border-yellow-200">480p</span>
                                        {results.p480.size && (
                                            <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-md text-sm border border-yellow-100">{results.p480.size}</span>
                                        )}
                                        {isProcessing && <div className="h-2 w-24 bg-gray-200 rounded-full animate-pulse"></div>}
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => handleEditSpeed(results.p480.url, '480p', results.p480.id)}
                                            disabled={!results.p480.url}
                                            className="flex-1 md:flex-none px-4 py-2 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Edit Speed
                                        </button>
                                        <button
                                            onClick={() => handleDownload(results.p480.url, '480p')}
                                            disabled={!results.p480.url || isDownloading}
                                            className="flex-1 md:flex-none px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDownloading ? '...' : 'Download'}
                                        </button>
                                    </div>
                                </div>

                                {/* Refined Components: Email & Coffee */}
                                {clipStatus === 'completed' && (
                                    <div className="pt-4 space-y-4">
                                        {/* Email Component */}
                                        <div className="bg-blue-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-200">
                                            <div className="flex flex-col">
                                                <h3 className="text-blue-900 font-semibold text-lg text-center md:text-left">Send the clips to my email.</h3>
                                                {emailStatus === 'success' && (
                                                    <p className="text-green-600 text-sm font-medium mt-1 animate-fade-in">✓ Email sent successfully!</p>
                                                )}
                                            </div>
                                            <div className="flex w-full md:w-auto gap-2 bg-white p-1.5 rounded-xl border border-blue-200 shadow-sm">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Enter your email"
                                                    className="px-3 py-2 outline-none text-gray-700 w-full md:w-64 bg-transparent placeholder-gray-400"
                                                />
                                                <button
                                                    onClick={handleSendEmail}
                                                    disabled={isEmailSending || !email}
                                                    className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all ${isEmailSending ? 'opacity-70 cursor-wait' : ''}`}
                                                >
                                                    {isEmailSending ? 'Sending...' : 'Send'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Coffee Component */}
                                        <div className="bg-blue-100 rounded-2xl p-6 text-center border border-blue-200 hover:bg-blue-200/50 transition-colors cursor-pointer group">
                                            <h3 className="text-blue-900 font-semibold text-lg group-hover:scale-105 transition-transform">
                                                Did it help you? <span className="underline decoration-blue-400 decoration-2 underline-offset-4">Buy me a coffee</span> ☕️
                                            </h3>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}

                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default GetClips
