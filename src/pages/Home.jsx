import { useState, useEffect, useRef, useId, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
    CheckCircle,
    CircleNotch,
    ClipboardText,
    ClockCountdown,
    EnvelopeSimple,
    Scissors,
    WarningCircle,
    X,
    YoutubeLogo,
} from '@phosphor-icons/react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ClipRangePicker from '../components/ClipRangePicker'
import ClipResultCard from '../components/ClipResultCard'
import ClipLoader from '../components/ClipLoader'
import RateLimitBanner from '../components/RateLimitBanner'
import {
    ApiError,
    cancelRequest,
    createClipRequest,
    getClipTaskStatus,
    sendClipToEmail,
} from '../api/clipService'
import { CLIP_TIMEOUT_MS } from '../config'
import { useRateLimitCooldown } from '../hooks/useRateLimitCooldown'
import {
    extract_youtube_video_id,
    format_countdown,
    format_duration,
    is_valid_youtube_url,
    seconds_to_time,
    time_to_seconds,
} from '../utils/timeUtils'

const EMPTY_RESULTS = {
    p720: { url: null, size: null, id: null },
    p480: { url: null, size: null, id: null },
}

const RESOLUTION_TABS = [
    { id: '720p', label: '720' },
    { id: '480p', label: '480' },
]

const read_stored_results = () => {
    try {
        const saved = sessionStorage.getItem('results')
        return saved ? JSON.parse(saved) : EMPTY_RESULTS
    } catch {
        return EMPTY_RESULTS
    }
}

const post_youtube_listening = (iframe) => {
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'listening' }),
        'https://www.youtube.com'
    )
}

/**
 * Unified home workspace where users paste a YouTube URL, preview the video,
 * pick start/end timestamps, generate clips, and adjust speed or share URLs inline.
 */
function Home() {
    const location = useLocation()
    const urlInputId = useId()
    const urlErrorId = useId()
    const emailInputId = useId()
    const resolutionTabsId = useId()
    const urlInputRef = useRef(null)
    const iframeRef = useRef(null)
    const pollingIntervalRef = useRef(null)
    const resolutionTabRefs = useRef({})

    const initialNavUrl = location.state?.youtubeUrl || ''
    const initialStoredUrl = sessionStorage.getItem('youtubeUrl') || ''
    // Clear older background clip tasks when arriving via a link carrying a different video.
    const navOverridesStoredVideo = Boolean(
        initialNavUrl &&
            extract_youtube_video_id(initialNavUrl) !== extract_youtube_video_id(initialStoredUrl)
    )

    const [youtubeUrl, setYoutubeUrl] = useState(() => initialNavUrl || initialStoredUrl)
    const [startTime, setStartTime] = useState(() => sessionStorage.getItem('startTime') || '00:00:00')
    const [endTime, setEndTime] = useState(() => sessionStorage.getItem('endTime') || '00:05:00')

    const [clipRequestId, setClipRequestId] = useState(() => {
        if (navOverridesStoredVideo || sessionStorage.getItem('clipStatus') === 'cancelled') {
            return null
        }
        return sessionStorage.getItem('clipRequestId')
    })
    const [clipStatus, setClipStatus] = useState(() => {
        if (navOverridesStoredVideo) return null
        const saved = sessionStorage.getItem('clipStatus')
        return saved === 'cancelled' ? null : saved
    })
    const [processStartTime, setProcessStartTime] = useState(() => {
        if (navOverridesStoredVideo || sessionStorage.getItem('clipStatus') === 'cancelled') {
            return null
        }
        const saved = sessionStorage.getItem('processStartTime')
        return saved ? parseInt(saved, 10) : null
    })
    const [nowMs, setNowMs] = useState(() => Date.now())
    const [clipDuration, setClipDuration] = useState(() => {
        if (navOverridesStoredVideo) return 0
        return parseInt(sessionStorage.getItem('clipDuration') || '0', 10) || 0
    })
    const [results, setResults] = useState(() =>
        navOverridesStoredVideo ? EMPTY_RESULTS : read_stored_results()
    )
    const [activeResolution, setActiveResolution] = useState('720p')
    const [activeSpeedEditResolution, setActiveSpeedEditResolution] = useState(null)
    const [completionNoticeSeconds, setCompletionNoticeSeconds] = useState(null)

    // Store video duration keyed by videoId so stale metadata never bleeds across URL changes.
    const [videoMeta, setVideoMeta] = useState(() => ({
        videoId: extract_youtube_video_id(initialNavUrl || initialStoredUrl),
        duration: 0,
    }))

    const [isSubmittingClip, setIsSubmittingClip] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [errors, setErrors] = useState({})

    const [email, setEmail] = useState('')
    const [isEmailSending, setIsEmailSending] = useState(false)
    const [emailFeedback, setEmailFeedback] = useState(null) // { type: 'success' | 'error', text: string }

    const clipRateLimit = useRateLimitCooldown('clipRateLimitUntil')
    const speedRateLimit = useRateLimitCooldown('speedEditRateLimitUntil')

    const videoId = extract_youtube_video_id(youtubeUrl)
    const videoDuration = videoMeta.videoId === videoId ? videoMeta.duration : 0

    const isClipTaskActive = Boolean(
        clipRequestId &&
            clipStatus &&
            clipStatus !== 'completed' &&
            clipStatus !== 'failed' &&
            clipStatus !== 'cancelled'
    )
    const isProcessing = isSubmittingClip || isClipTaskActive
    const isSpeedEditing = Boolean(activeSpeedEditResolution)
    const elapsedSeconds =
        isProcessing && processStartTime
            ? Math.max(0, Math.floor((nowMs - processStartTime) / 1000))
            : 0

    const startSeconds = time_to_seconds(startTime)
    const endSeconds = time_to_seconds(endTime)
    const selectedLengthSeconds = endSeconds - startSeconds
    const effectiveClipDuration =
        clipDuration > 0 ? clipDuration : Math.max(0, selectedLengthSeconds)

    const clear_polling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
        }
    }

    const handle_speed_processing_change = useCallback((resolution, isActive) => {
        setActiveSpeedEditResolution((prev) =>
            isActive ? resolution : prev === resolution ? null : prev
        )
    }, [])

    const reset_clip_task_state = () => {
        clear_polling()
        setIsSubmittingClip(false)
        setClipRequestId(null)
        setClipStatus(null)
        setProcessStartTime(null)
        setClipDuration(0)
        setResults(EMPTY_RESULTS)
        setActiveResolution('720p')
        setActiveSpeedEditResolution(null)
        setCompletionNoticeSeconds(null)
        setEmailFeedback(null)
        sessionStorage.removeItem('clipRequestId')
        sessionStorage.removeItem('clipStatus')
        sessionStorage.removeItem('processStartTime')
        sessionStorage.removeItem('clipDuration')
        sessionStorage.removeItem('results')
    }

    const handle_url_change = (nextUrl) => {
        const nextVideoId = extract_youtube_video_id(nextUrl)
        setYoutubeUrl(nextUrl)
        setErrors((prev) => ({ ...prev, youtubeUrl: '', api: '', logic: '' }))

        if (nextVideoId !== videoId) {
            reset_clip_task_state()
            setStartTime('00:00:00')
            setEndTime('00:05:00')
            setVideoMeta({ videoId: nextVideoId, duration: 0 })
        }
    }

    const handle_paste_url = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (text) {
                handle_url_change(text.trim())
            }
        } catch {
            urlInputRef.current?.focus()
        }
    }

    const validate_clip_range = (start, end) => {
        const s = time_to_seconds(start)
        const e = time_to_seconds(end)
        const duration = e - s

        if (e <= s) return 'End time must be greater than start time.'
        if (videoDuration > 0 && e > videoDuration) return 'End time exceeds the video duration.'
        if (duration < 5) return 'Clip duration must be at least 5 seconds.'
        if (duration > 300) return 'Clip duration cannot exceed 5 minutes.'
        return ''
    }

    // Persist active workspace state in sessionStorage so refreshes keep results and timers intact.
    useEffect(() => {
        if (youtubeUrl) {
            sessionStorage.setItem('youtubeUrl', youtubeUrl)
        } else {
            sessionStorage.removeItem('youtubeUrl')
        }
        sessionStorage.setItem('startTime', startTime)
        sessionStorage.setItem('endTime', endTime)
        sessionStorage.setItem('clipDuration', String(clipDuration || 0))

        if (clipRequestId) {
            sessionStorage.setItem('clipRequestId', clipRequestId)
        } else {
            sessionStorage.removeItem('clipRequestId')
        }

        if (clipStatus) {
            sessionStorage.setItem('clipStatus', clipStatus)
        } else {
            sessionStorage.removeItem('clipStatus')
        }

        if (processStartTime) {
            sessionStorage.setItem('processStartTime', String(processStartTime))
        } else {
            sessionStorage.removeItem('processStartTime')
        }

        sessionStorage.setItem('results', JSON.stringify(results))
    }, [youtubeUrl, startTime, endTime, clipDuration, clipRequestId, clipStatus, processStartTime, results])

    // Fetch video duration via YouTube iframe postMessage when videoId changes.
    useEffect(() => {
        if (!videoId) return undefined

        const handle_iframe_message = (event) => {
            if (event.origin !== 'https://www.youtube.com') return
            try {
                const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
                const reportedDuration = payload?.info?.duration
                if (
                    (payload?.event === 'initialDelivery' || payload?.event === 'infoDelivery') &&
                    typeof reportedDuration === 'number' &&
                    reportedDuration > 0
                ) {
                    const safeDuration = Math.floor(reportedDuration)
                    setVideoMeta({ videoId, duration: safeDuration })
                    // Keep saved or default timestamps within the actual loaded video length.
                    setStartTime((prevStart) => {
                        const sec = time_to_seconds(prevStart)
                        return sec > Math.max(0, safeDuration - 1)
                            ? seconds_to_time(Math.max(0, safeDuration - 5))
                            : prevStart
                    })
                    setEndTime((prevEnd) => {
                        const sec = time_to_seconds(prevEnd)
                        if (sec <= 0 || sec > safeDuration) {
                            return seconds_to_time(Math.min(300, safeDuration))
                        }
                        return prevEnd
                    })
                }
            } catch {
                // Ignore unrelated postMessage frames.
            }
        }

        window.addEventListener('message', handle_iframe_message)

        const retryTimerOne = setTimeout(() => post_youtube_listening(iframeRef.current), 800)
        const retryTimerTwo = setTimeout(() => post_youtube_listening(iframeRef.current), 2000)

        return () => {
            window.removeEventListener('message', handle_iframe_message)
            clearTimeout(retryTimerOne)
            clearTimeout(retryTimerTwo)
        }
    }, [videoId])

    // Poll clip task status while processing.
    useEffect(() => {
        if (!isClipTaskActive) return undefined

        const check_status = async () => {
            if (processStartTime && Date.now() - processStartTime > CLIP_TIMEOUT_MS) {
                clear_polling()
                setClipStatus('failed')
                setErrors((prev) => ({
                    ...prev,
                    api: 'Processing timed out after 5 minutes. Please try again with a shorter clip.',
                }))
                return
            }

            try {
                const data = await getClipTaskStatus(clipRequestId)
                setClipStatus(data.status)

                if (typeof data.clip_duration === 'number' && data.clip_duration > 0) {
                    setClipDuration(data.clip_duration)
                }

                if (Array.isArray(data.clips) && data.clips.length > 0) {
                    setResults((prev) => {
                        const next = { ...prev }
                        data.clips.forEach((clip) => {
                            const sizeStr = clip.size ? `${clip.size}MB` : null
                            if (clip.resolution === '720p') {
                                next.p720 = { url: clip.clip, size: sizeStr, id: clip.id }
                            } else if (clip.resolution === '480p') {
                                next.p480 = { url: clip.clip, size: sizeStr, id: clip.id }
                            }
                        })
                        return next
                    })
                }

                if (data.status === 'completed') {
                    clear_polling()
                    if (processStartTime) {
                        const totalSeconds = Math.max(
                            1,
                            Math.round((Date.now() - processStartTime) / 1000)
                        )
                        setCompletionNoticeSeconds(totalSeconds)
                    }
                } else if (data.status === 'failed') {
                    clear_polling()
                    setErrors((prev) => ({
                        ...prev,
                        api: data.error_message || 'Clip processing failed. Please try again.',
                    }))
                }
            } catch (err) {
                console.error('Clip status polling error:', err)
            }
        }

        check_status()

        const duration = Math.max(0, time_to_seconds(endTime) - time_to_seconds(startTime))
        let intervalMs = 2000
        if (duration >= 60 && duration < 180) {
            intervalMs = 5000
        } else if (duration >= 180) {
            intervalMs = 7000
        }

        pollingIntervalRef.current = setInterval(check_status, intervalMs)
        return () => clear_polling()
    }, [clipRequestId, isClipTaskActive, startTime, endTime, processStartTime])

    // Tick elapsed processing duration once per second so the submit button gives calm feedback without a second spinner.
    useEffect(() => {
        if (!isProcessing || !processStartTime) return undefined
        const timerId = setInterval(() => {
            setNowMs(Date.now())
        }, 1000)
        return () => clearInterval(timerId)
    }, [isProcessing, processStartTime])

    // Auto-dismiss the total clip creation time pill after 5 seconds.
    useEffect(() => {
        if (completionNoticeSeconds === null) return undefined
        const hideTimer = setTimeout(() => {
            setCompletionNoticeSeconds(null)
        }, 5000)
        return () => clearTimeout(hideTimer)
    }, [completionNoticeSeconds])

    const handle_generate_clip = async (e) => {
        e.preventDefault()
        if (isProcessing || isCancelling || isSpeedEditing || clipRateLimit.isLimited) return

        setErrors({})

        if (!youtubeUrl.trim()) {
            setErrors({ youtubeUrl: 'Please enter a YouTube URL.' })
            urlInputRef.current?.focus()
            return
        }

        if (!is_valid_youtube_url(youtubeUrl)) {
            setErrors({ youtubeUrl: 'Please enter a valid YouTube link.' })
            urlInputRef.current?.focus()
            return
        }

        const rangeError = validate_clip_range(startTime, endTime)
        if (rangeError) {
            setErrors({ logic: rangeError })
            return
        }

        clear_polling()
        clipRateLimit.clearRateLimit()
        const startedAt = Date.now()
        setIsSubmittingClip(true)
        setClipRequestId(null)
        setClipStatus('pending')
        setProcessStartTime(startedAt)
        setNowMs(startedAt)
        setClipDuration(Math.max(0, time_to_seconds(endTime) - time_to_seconds(startTime)))
        setResults(EMPTY_RESULTS)
        setCompletionNoticeSeconds(null)
        setEmailFeedback(null)

        try {
            const data = await createClipRequest({
                youtube_url: youtubeUrl.trim(),
                start_time: startTime,
                end_time: endTime,
            })
            setClipRequestId(data.id)
            setClipStatus(data.status || 'pending')
            if (typeof data.clip_duration === 'number' && data.clip_duration > 0) {
                setClipDuration(data.clip_duration)
            }
        } catch (err) {
            setClipStatus(null)
            setClipRequestId(null)
            setProcessStartTime(null)

            if (err instanceof ApiError && err.isRateLimited) {
                clipRateLimit.triggerRateLimit(err.retryAfterSeconds, err.message)
            } else {
                setErrors({ api: err?.message || 'Failed to create clip request.' })
            }
        } finally {
            setIsSubmittingClip(false)
        }
    }

    const handle_cancel_request = async () => {
        if (!clipRequestId) return
        setIsCancelling(true)
        try {
            await cancelRequest(clipRequestId, 'clip_request')
            clear_polling()
            setClipStatus('cancelled')
            setTimeout(() => {
                reset_clip_task_state()
                setIsCancelling(false)
                setErrors({})
            }, 150)
        } catch (err) {
            setIsCancelling(false)
            setErrors((prev) => ({
                ...prev,
                api: err?.message || 'Failed to cancel clip request.',
            }))
        }
    }

    const handle_send_email = async (e) => {
        e.preventDefault()
        if (!clipRequestId) return

        const trimmedEmail = email.trim()
        if (!trimmedEmail) {
            setEmailFeedback({ type: 'error', text: 'Please enter an email address.' })
            return
        }

        setIsEmailSending(true)
        setEmailFeedback(null)

        try {
            await sendClipToEmail(clipRequestId, trimmedEmail)
            setEmailFeedback({ type: 'success', text: `Clips sent to ${trimmedEmail}.` })
            setEmail('')
        } catch (err) {
            setEmailFeedback({
                type: 'error',
                text: err?.message || 'Failed to send email. Please try again.',
            })
        } finally {
            setIsEmailSending(false)
        }
    }

    const handle_resolution_tab_keydown = (currentIndex, e) => {
        if (isSpeedEditing) return
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        const nextIndex =
            e.key === 'ArrowRight'
                ? (currentIndex + 1) % RESOLUTION_TABS.length
                : (currentIndex - 1 + RESOLUTION_TABS.length) % RESOLUTION_TABS.length
        const nextTab = RESOLUTION_TABS[nextIndex]
        setActiveResolution(nextTab.id)
        resolutionTabRefs.current[nextTab.id]?.focus()
    }

    const showResultsSection =
        clipStatus === 'completed' || (isProcessing && clipStatus !== 'cancelled')

    return (
        <div className="min-h-[100dvh] flex flex-col bg-zinc-50 text-zinc-950 font-sans overflow-x-hidden">
            <Header />

            <main className="flex-1 pt-20 pb-14">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-5">
                    {/* Compact Studio Header */}
                    <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
                            Clip any YouTube moment in seconds.
                        </h1>
                        <p className="text-zinc-600 text-sm sm:text-base max-w-[65ch]">
                            Paste a link, set your timestamps, and download or adjust speed.
                        </p>
                    </div>

                    {/* Unified Clipper Workspace */}
                    <section className="bg-white border border-zinc-200 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
                        <form onSubmit={handle_generate_clip} noValidate className="space-y-5">
                            {/* YouTube URL Field */}
                            <div className="space-y-2">
                                <label
                                    htmlFor={urlInputId}
                                    className="block text-sm font-semibold text-zinc-900"
                                >
                                    YouTube URL
                                </label>
                                <div
                                    className={`flex items-center gap-2 rounded-xl border bg-zinc-50 px-3 py-1.5 transition-colors focus-within:bg-white focus-within:ring-2 ${
                                        errors.youtubeUrl
                                            ? 'border-red-400 focus-within:border-red-600 focus-within:ring-red-600/20'
                                            : 'border-zinc-200 focus-within:border-blue-500 focus-within:ring-blue-600/20'
                                    }`}
                                >
                                    <YoutubeLogo
                                        size={22}
                                        weight="fill"
                                        aria-hidden="true"
                                        className="text-red-600 shrink-0"
                                    />
                                    <input
                                        ref={urlInputRef}
                                        id={urlInputId}
                                        name="youtubeUrl"
                                        type="url"
                                        value={youtubeUrl}
                                        onChange={(e) => handle_url_change(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        autoCorrect="off"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        enterKeyHint="done"
                                        aria-invalid={Boolean(errors.youtubeUrl) || undefined}
                                        aria-describedby={errors.youtubeUrl ? urlErrorId : undefined}
                                        className="flex-1 min-w-0 py-2 text-base bg-transparent border-0 outline-none text-zinc-950 placeholder:text-zinc-400"
                                    />
                                    {youtubeUrl && (
                                        <button
                                            type="button"
                                            onClick={() => handle_url_change('')}
                                            aria-label="Clear YouTube URL"
                                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 transition-colors shrink-0"
                                        >
                                            <X size={16} weight="bold" aria-hidden="true" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handle_paste_url}
                                        aria-label="Paste YouTube URL"
                                        title="Paste"
                                        className="w-[38px] h-[38px] inline-flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors shrink-0"
                                    >
                                        <ClipboardText size={18} weight="bold" aria-hidden="true" />
                                    </button>
                                </div>
                                {errors.youtubeUrl && (
                                    <p
                                        id={urlErrorId}
                                        role="alert"
                                        className="text-sm font-medium text-red-600 flex items-center gap-1.5"
                                    >
                                        <WarningCircle size={16} weight="bold" aria-hidden="true" />
                                        {errors.youtubeUrl}
                                    </p>
                                )}
                            </div>

                            {/* Persistent side-by-side layout: video preview on the left, timestamp controls on the right */}
                            <div className="pt-4 border-t border-zinc-200 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                <div className="lg:col-span-6 min-w-0 space-y-2.5">
                                    {videoId ? (
                                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-200">
                                            <iframe
                                                ref={iframeRef}
                                                onLoad={() => post_youtube_listening(iframeRef.current)}
                                                className="w-full h-full"
                                                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
                                                title="YouTube video preview"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-video rounded-xl bg-zinc-50 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-center px-6 gap-2">
                                            <YoutubeLogo
                                                size={36}
                                                weight="duotone"
                                                aria-hidden="true"
                                                className="text-zinc-400"
                                            />
                                            <p className="text-sm font-semibold text-zinc-700">Video preview</p>
                                            <p className="text-xs text-zinc-500 max-w-xs">
                                                Paste a YouTube link above to load the player.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="lg:col-span-6 min-w-0 space-y-4">
                                    <ClipRangePicker
                                        startTime={startTime}
                                        endTime={endTime}
                                        maxDuration={videoDuration}
                                        disabled={isProcessing}
                                        onStartChange={(val) => {
                                            setStartTime(val)
                                            setErrors((prev) => ({ ...prev, logic: '' }))
                                        }}
                                        onEndChange={(val) => {
                                            setEndTime(val)
                                            setErrors((prev) => ({ ...prev, logic: '' }))
                                        }}
                                    />

                                    <div className="space-y-3 min-w-0">
                                        <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                                            <span
                                                className={`font-mono tabular-nums font-semibold ${
                                                    selectedLengthSeconds >= 5 && selectedLengthSeconds <= 300
                                                        ? 'text-blue-700'
                                                        : selectedLengthSeconds > 300 ||
                                                            (selectedLengthSeconds > 0 &&
                                                                selectedLengthSeconds < 5)
                                                          ? 'text-red-600'
                                                          : 'text-zinc-800'
                                                }`}
                                            >
                                                Clip length:{' '}
                                                {selectedLengthSeconds > 0
                                                    ? format_duration(selectedLengthSeconds)
                                                    : '0:00'}
                                            </span>
                                            <span className="text-zinc-500">Allowed: 5s to 5m</span>
                                        </div>

                                        <div className="flex items-center gap-2.5 w-full">
                                            <button
                                                type="submit"
                                                disabled={
                                                    !videoId ||
                                                    isProcessing ||
                                                    isCancelling ||
                                                    isSpeedEditing ||
                                                    clipStatus === 'cancelled' ||
                                                    clipRateLimit.isLimited
                                                }
                                                title={
                                                    isSpeedEditing
                                                        ? 'Wait for speed edit to finish'
                                                        : undefined
                                                }
                                                className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {isCancelling || clipStatus === 'cancelled' ? (
                                                    <>
                                                        <X size={18} weight="bold" aria-hidden="true" />
                                                        Cancelling...
                                                    </>
                                                ) : isProcessing ? (
                                                    <>
                                                        <span>Creating clips</span>
                                                        <span className="font-mono tabular-nums text-white/90">
                                                            ({format_duration(elapsedSeconds)})
                                                        </span>
                                                    </>
                                                ) : clipRateLimit.isLimited ? (
                                                    <>
                                                        <ClockCountdown size={18} weight="bold" aria-hidden="true" />
                                                        Wait {format_countdown(clipRateLimit.remainingSeconds)}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Scissors size={18} weight="bold" aria-hidden="true" />
                                                        Get Clips
                                                    </>
                                                )}
                                            </button>

                                            {isProcessing && !isCancelling && clipStatus !== 'cancelled' && (
                                                <button
                                                    type="button"
                                                    onClick={handle_cancel_request}
                                                    aria-label="Cancel clip request"
                                                    title="Cancel"
                                                    className="shrink-0 inline-flex items-center justify-center w-[46px] h-[46px] rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all active:scale-[0.98]"
                                                >
                                                    <X size={18} weight="bold" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Rate Limit & Validation / API Alerts */}
                        {(clipRateLimit.isLimited || clipRateLimit.message) && (
                            <RateLimitBanner
                                message={clipRateLimit.message}
                                remainingSeconds={clipRateLimit.remainingSeconds}
                                onDismiss={clipRateLimit.clearRateLimit}
                            />
                        )}

                        {(errors.logic || errors.api) && (
                            <div
                                role="alert"
                                className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2.5"
                            >
                                <WarningCircle
                                    size={18}
                                    weight="bold"
                                    aria-hidden="true"
                                    className="text-red-600 shrink-0 mt-0.5"
                                />
                                <span>{errors.logic || errors.api}</span>
                            </div>
                        )}
                    </section>

                    {/* Generated Clip Results */}
                    {showResultsSection && (
                        <section className="space-y-4">
                            {isProcessing ? (
                                /* Show only the centered loader container while clips are generating. */
                                <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex items-center justify-center">
                                    <ClipLoader ariaLabel="Creating clips" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <div
                                            role="tablist"
                                            aria-label="Clip resolution"
                                            className="inline-grid grid-cols-2 shrink-0 sm:min-w-[180px] p-1 rounded-xl bg-zinc-200/70 border border-zinc-200"
                                        >
                                            {RESOLUTION_TABS.map((tab, index) => {
                                                const isActive = activeResolution === tab.id
                                                const isTabDisabled = Boolean(
                                                    activeSpeedEditResolution &&
                                                        activeSpeedEditResolution !== tab.id
                                                )
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        ref={(el) => {
                                                            resolutionTabRefs.current[tab.id] = el
                                                        }}
                                                        type="button"
                                                        role="tab"
                                                        id={`${resolutionTabsId}-tab-${tab.id}`}
                                                        aria-selected={isActive}
                                                        aria-controls={`${resolutionTabsId}-panel-${tab.id}`}
                                                        aria-label={`${tab.id} clip`}
                                                        tabIndex={isActive ? 0 : -1}
                                                        disabled={isTabDisabled}
                                                        title={
                                                            isTabDisabled
                                                                ? 'Wait for speed edit to finish'
                                                                : undefined
                                                        }
                                                        onClick={() => {
                                                            if (!isTabDisabled) setActiveResolution(tab.id)
                                                        }}
                                                        onKeyDown={(e) => handle_resolution_tab_keydown(index, e)}
                                                        className={`min-h-[32px] sm:min-h-[38px] px-3 sm:px-5 py-1 sm:py-1.5 rounded-lg font-mono tabular-nums text-xs sm:text-sm font-semibold transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                                            isActive
                                                                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                                                                : 'text-zinc-600 border border-transparent hover:text-zinc-900'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <span className="ml-auto font-mono tabular-nums text-[11px] sm:text-xs font-medium text-zinc-600 bg-white border border-zinc-200 px-2 sm:px-3 py-1 rounded-lg whitespace-nowrap truncate">
                                            {startTime} to {endTime} ({format_duration(effectiveClipDuration)})
                                        </span>
                                    </div>

                                    <div>
                                        {/* Keep both resolution cards mounted so switching tabs preserves open or active speed edits. */}
                                        <div
                                            role="tabpanel"
                                            id={`${resolutionTabsId}-panel-720p`}
                                            aria-labelledby={`${resolutionTabsId}-tab-720p`}
                                            hidden={activeResolution !== '720p'}
                                        >
                                            <ClipResultCard
                                                key={`720p-${results.p720.id || 'pending'}`}
                                                resolution="720p"
                                                clip={results.p720}
                                                clipDuration={effectiveClipDuration}
                                                speedRateLimitCooldown={speedRateLimit}
                                                isSpeedEditing={activeSpeedEditResolution === '720p'}
                                                onSpeedProcessingChange={handle_speed_processing_change}
                                            />
                                        </div>
                                        <div
                                            role="tabpanel"
                                            id={`${resolutionTabsId}-panel-480p`}
                                            aria-labelledby={`${resolutionTabsId}-tab-480p`}
                                            hidden={activeResolution !== '480p'}
                                        >
                                            <ClipResultCard
                                                key={`480p-${results.p480.id || 'pending'}`}
                                                resolution="480p"
                                                clip={results.p480}
                                                clipDuration={effectiveClipDuration}
                                                speedRateLimitCooldown={speedRateLimit}
                                                isSpeedEditing={activeSpeedEditResolution === '480p'}
                                                onSpeedProcessingChange={handle_speed_processing_change}
                                            />
                                        </div>
                                    </div>

                                    {clipStatus === 'completed' && (
                                        <form
                                            onSubmit={handle_send_email}
                                            noValidate
                                            className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                                <div className="space-y-1 flex-1">
                                                    <label
                                                        htmlFor={emailInputId}
                                                        className="block text-sm font-semibold text-zinc-900"
                                                    >
                                                        Send clips to email
                                                    </label>
                                                    <p className="text-xs text-zinc-500">
                                                        Receive download links for both clips in your inbox.
                                                    </p>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                                                    <input
                                                        id={emailInputId}
                                                        name="email"
                                                        type="email"
                                                        autoComplete="email"
                                                        value={email}
                                                        onChange={(e) => {
                                                            setEmail(e.target.value)
                                                            setEmailFeedback(null)
                                                        }}
                                                        placeholder="you@example.com"
                                                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-sm text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-zinc-400 sm:w-64"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={isEmailSending}
                                                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        {isEmailSending ? (
                                                            <>
                                                                <CircleNotch
                                                                    size={16}
                                                                    weight="bold"
                                                                    aria-hidden="true"
                                                                    className="animate-spin"
                                                                />
                                                                Sending...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <EnvelopeSimple size={16} weight="bold" aria-hidden="true" />
                                                                Send
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {emailFeedback && (
                                                <p
                                                    role={emailFeedback.type === 'error' ? 'alert' : 'status'}
                                                    className={`text-xs font-medium flex items-center gap-1.5 ${
                                                        emailFeedback.type === 'success'
                                                            ? 'text-emerald-700'
                                                            : 'text-red-600'
                                                    }`}
                                                >
                                                    {emailFeedback.type === 'success' ? (
                                                        <CheckCircle size={15} weight="fill" aria-hidden="true" />
                                                    ) : (
                                                        <WarningCircle size={15} weight="bold" aria-hidden="true" />
                                                    )}
                                                    {emailFeedback.text}
                                                </p>
                                            )}
                                        </form>
                                    )}
                                </>
                            )}
                        </section>
                    )}
                </div>
            </main>

            {/* Transient 5-second pill showing total clip creation time without shifting layout. */}
            {completionNoticeSeconds !== null && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4 w-full max-w-max"
                >
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-md px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap">
                        <CheckCircle
                            size={17}
                            weight="fill"
                            aria-hidden="true"
                            className="text-emerald-600 shrink-0"
                        />
                        <span>
                            Clips created in{' '}
                            <span className="font-mono tabular-nums text-emerald-800">
                                {format_countdown(completionNoticeSeconds)}
                            </span>
                        </span>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default Home
