import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { initiateSpeedEdit, getSpeedEditStatus, cancelRequest } from '../api/clipService'
import { projectName, API_BASE_URL } from '../config'

function EditVideoSpeed() {
    const location = useLocation()
    const navigate = useNavigate()

    // State from Navigation
    const [remoteVideoUrl, setRemoteVideoUrl] = useState(location.state?.videoUrl || null)
    const sourceClipId = location.state?.clipId || null
    const resolution = location.state?.resolution || 'video'

    // States for Video Source
    const [localFile, setLocalFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)

    // Playback States
    const videoRef = useRef(null)
    const fileInputRef = useRef(null)
    const pollingRef = useRef(null)
    const [speed, setSpeed] = useState(1.0)
    const [duration, setDuration] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)
    const [processStatus, setProcessStatus] = useState(() => {
        const saved = sessionStorage.getItem('speedEditStatus');
        return saved === 'cancelled' ? null : saved;
    }) // 'pending' | 'completed' | 'failed' | 'cancelled'
    const [isCancelling, setIsCancelling] = useState(false)
    const currentRequestIdRef = useRef(sessionStorage.getItem('speedEditRequestId'))

    const MAX_VIDEO_SIZE_MB = 50
    const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

    // Handle Local File Upload
    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > MAX_VIDEO_SIZE_BYTES) {
                alert(`Video size must not exceed ${MAX_VIDEO_SIZE_MB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`)
                e.target.value = ''
                return
            }
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            setLocalFile(file)
            setRemoteVideoUrl(null)
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setSpeed(1.0)
            setProcessStatus(null)
        }
    }

    // Handle Speed Change
    const handleSpeedChange = (newSpeed) => {
        setSpeed(newSpeed)
        if (videoRef.current) {
            videoRef.current.playbackRate = newSpeed
        }
    }

    // Helper: Dynamic Polling Interval
    const getPollingInterval = (sizeMB) => {
        if (!sizeMB || sizeMB < 1) return 1500
        if (sizeMB < 5) return 2500
        if (sizeMB < 15) return 4000
        return 7000
    }

    // API Integration: Apply Speed & Download
    const handleApplyAndDownload = async () => {
        if (!remoteVideoUrl && !localFile) return

        setIsProcessing(true)
        setProcessStatus('pending')

        try {
            // 1. Initiate the Task
            const initialTask = await initiateSpeedEdit({
                speed_factor: speed,
                source_clip: sourceClipId, // Only used if remoteVideoUrl exists
                uploaded_video: localFile  // Only used if local selection
            })

            const requestId = initialTask.id
            currentRequestIdRef.current = requestId
            sessionStorage.setItem('speedEditRequestId', requestId)
            sessionStorage.setItem('speedEditStatus', 'pending')
            const videoSize = initialTask.original_size || 0

            // 2. Polling Logic
            const pollStatus = async () => {
                try {
                    const task = await getSpeedEditStatus(requestId)

                    if (processStatus === 'cancelled') {
                        clearInterval(pollingRef.current)
                        return
                    }

                    if (task.status === 'completed') {
                        setIsProcessing(false)
                        setProcessStatus('completed')

                        // Trigger Download via Blob to force download prompt
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/download-clip/${task.id}/?file_type=speed_edit`)
                            if (!response.ok) {
                                throw new Error('Failed to download clip')
                            }
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `speed_edited_${parseFloat(speed.toFixed(2))}x.mp4`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            window.URL.revokeObjectURL(url)
                        } catch (downloadErr) {
                            console.error('Download prompt failed:', downloadErr)
                            // Fallback
                            const a = document.createElement('a')
                            a.href = task.output_video
                            a.download = `speed_edited_${parseFloat(speed.toFixed(2))}x.mp4`
                            a.target = "_blank"
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                        }

                        clearInterval(pollingRef.current)
                    } else if (task.status === 'failed') {
                        setIsProcessing(false)
                        setProcessStatus('failed')
                        alert(task.error_message || 'Processing failed.')
                        clearInterval(pollingRef.current)
                    }
                } catch (err) {
                    console.error('Polling error:', err)
                }
            }

            // Set dynamic interval based on size
            const interval = getPollingInterval(videoSize)
            pollingRef.current = setInterval(pollStatus, interval)

        } catch (error) {
            console.error('Speed transformation initiation failed:', error)
            alert(error.message || 'Failed to start processing. Please try again.')
            setIsProcessing(false)
            setProcessStatus(null)
            sessionStorage.removeItem('speedEditStatus')
            sessionStorage.removeItem('speedEditRequestId')
        }
    }

    const handleCancelRequest = async () => {
        if (!currentRequestIdRef.current) return
        setIsCancelling(true)
        try {
            await cancelRequest(currentRequestIdRef.current, 'speed_edit')

            if (pollingRef.current) clearInterval(pollingRef.current)

            setProcessStatus('cancelled')
            sessionStorage.setItem('speedEditStatus', 'cancelled')

            setTimeout(() => {
                setProcessStatus(null)
                setIsProcessing(false)
                setIsCancelling(false)
                currentRequestIdRef.current = null
                sessionStorage.removeItem('speedEditStatus')
                sessionStorage.removeItem('speedEditRequestId')
            }, 1000)
        } catch (error) {
            console.error("Cancel failed", error)
            alert("Failed to cancel request: " + (error.message || "Unknown error"))
            setIsCancelling(false)
        }
    }

    // Cleanup interval on unmount
    useEffect(() => {
        return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
    }, [])

    // Scroll to top on mount (fixes redirect landing at footer when navigating from GetClips)
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    const onLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration)
            videoRef.current.playbackRate = speed
        }
    }

    const finalDuration = duration / speed
    const activeVideoUrl = remoteVideoUrl || previewUrl

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const SpeedButton = ({ val }) => (
        <button
            onClick={() => handleSpeedChange(val)}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 ${speed === val
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                } disabled:opacity-50`}
        >
            {val}x
        </button>
    )

    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-900 overflow-x-hidden">
            <Header />

            <main className="flex-grow pt-28 pb-12 px-6">
                <div className="container mx-auto max-w-5xl">

                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-2">
                            Video Speed Editor
                        </h1>
                    </div>

                    {!activeVideoUrl ? (
                        <div
                            onClick={() => fileInputRef.current.click()}
                            className="max-w-2xl mx-auto aspect-video bg-white rounded-3xl border-4 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all group"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="video/*,.mkv,video/x-matroska"
                            />
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-700">Click to Upload Video</h3>
                            <p className="text-gray-400 mt-2">MP4, WebM, MKV or Ogg (max {MAX_VIDEO_SIZE_MB}MB)</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="relative group rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 blur-lg group-hover:opacity-30 transition duration-500"></div>
                                    <div className="relative bg-black aspect-video flex items-center justify-center">
                                        <video
                                            key={activeVideoUrl}
                                            ref={videoRef}
                                            src={activeVideoUrl}
                                            className="w-full h-full object-contain"
                                            controls
                                            onLoadedMetadata={onLoadedMetadata}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={() => { setRemoteVideoUrl(null); setLocalFile(null); setPreviewUrl(null); setProcessStatus(null); }}
                                        className="text-sm font-semibold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Remove & Upload Different Video
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
                                    <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-4">Duration Preview</h3>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-gray-500 font-medium">Original</span>
                                        <span className="text-xl font-bold text-gray-800">{formatTime(duration)}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                                        <span className="text-orange-700 font-medium">New Duration</span>
                                        <span className="text-2xl font-extrabold text-orange-600">{formatTime(finalDuration)}</span>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-gray-800 font-bold text-lg">Speed</h3>
                                            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-mono font-bold">
                                                {parseFloat(speed.toFixed(2))}x
                                            </span>
                                        </div>

                                        <input
                                            type="range"
                                            min="0.25"
                                            max="2"
                                            step="0.05"
                                            value={speed}
                                            disabled={isProcessing}
                                            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 disabled:opacity-50"
                                        />
                                        <div className="relative text-xs text-gray-400 mt-2 font-medium h-4">
                                            <span className="absolute left-0">0.25x</span>
                                            <span className="absolute left-[42.85%] -translate-x-1/2">1x</span>
                                            <span className="absolute right-0">2x</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((acc) => (
                                            <SpeedButton key={acc} val={acc} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        disabled={isProcessing || isCancelling || processStatus === 'cancelled'}
                                        onClick={handleApplyAndDownload}
                                        className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-1
                                            ${(isCancelling || processStatus === 'cancelled')
                                                ? 'bg-red-50 text-red-500 border-2 border-red-100 cursor-default shadow-none scale-100'
                                                : isProcessing
                                                    ? 'bg-gray-800 text-white opacity-90 cursor-wait'
                                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                                            }`}
                                    >
                                        {(isCancelling || processStatus === 'cancelled') ? (
                                            <span className="animate-pulse flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                Cancelling...
                                            </span>
                                        ) : isProcessing ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    Processing...
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest opacity-60">Polling status...</span>
                                            </>
                                        ) : (
                                            "Apply Speed & Download"
                                        )}
                                    </button>

                                    {/* Action Button: Cancel Link */}
                                    {isProcessing && !isCancelling && processStatus !== 'cancelled' && (
                                        <div className="flex justify-center">
                                            <button
                                                onClick={handleCancelRequest}
                                                className="text-sm text-gray-400 hover:text-red-500 font-medium transition-colors flex items-center gap-1 py-1 px-3 rounded-full hover:bg-red-50"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Cancel request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default EditVideoSpeed
