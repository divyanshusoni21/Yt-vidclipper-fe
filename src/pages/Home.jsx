import { useState, useEffect, useRef, useId } from 'react'
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
import RollingTimePicker from '../components/RollingTimePicker'
import ClipResultCard from '../components/ClipResultCard'
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
    time_to_seconds,
} from '../utils/timeUtils'

const EMPTY_RESULTS = {
    p720: { url: null, size: null, id: null },
    p480: { url: null, size: null, id: null },
}

const read_stored_results = () => {
    try {
        const saved = sessionStorage.getItem('results')
        return saved ? JSON.parse(saved) : EMPTY_RESULTS
    } catch {
        return EMPTY_RESULTS
    }
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
    const urlInputRef = useRef(null)
    const iframeRef = useRef(null)
    const pollingIntervalRef = useRef(null)

    const initialNavUrl = location.state?.youtubeUrl || ''
    const initialStoredUrl = sessionStorage.getItem('youtubeUrl') || ''
    // Clear older background clip tasks when arriving via a link carrying a different video.
    const navOverridesStoredVideo = Boolean(
        initialNavUrl &&
            extract_youtube_video_id(initialNavUrl) !== extract_youtube_video_id(initialStoredUrl)
    )

    const [youtubeUrl, setYoutubeUrl] = useState(() => initialNavUrl || initialStoredUrl)
    const [startTime, setStartTime] = useState(() => sessionStorage.getItem('startTime') || '00:00:00')
    const [endTime, setEndTime] = useState(() => sessionStorage.getItem('endTime') || '00:00:00')

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
    const [clipDuration, setClipDuration] = useState(() => {
        if (navOverridesStoredVideo) return 0
        return parseInt(sessionStorage.getItem('clipDuration') || '0', 10) || 0
    })
    const [results, setResults] = useState(() =>
        navOverridesStoredVideo ? EMPTY_RESULTS : read_stored_results()
    )

    // Store video metadata keyed by videoId so stale metadata never bleeds across URL changes.
    const [videoMeta, setVideoMeta] = useState(() => ({
        videoId: extract_youtube_video_id(initialNavUrl || initialStoredUrl),
        title: navOverridesStoredVideo ? '' : sessionStorage.getItem('videoTitle') || '',
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
    const videoTitle = videoMeta.videoId === videoId ? videoMeta.title : ''
    const videoDuration = videoMeta.videoId === videoId ? videoMeta.duration : 0

    const isClipTaskActive = Boolean(
        clipRequestId &&
            clipStatus &&
            clipStatus !== 'completed' &&
            clipStatus !== 'failed' &&
            clipStatus !== 'cancelled'
    )
    const isProcessing = isSubmittingClip || isClipTaskActive

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

    const reset_clip_task_state = () => {
        clear_polling()
        setIsSubmittingClip(false)
        setClipRequestId(null)
        setClipStatus(null)
        setProcessStartTime(null)
        setClipDuration(0)
        setResults(EMPTY_RESULTS)
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
        setErrors((prev) => ({ ...prev, youtubeUrl: '', api: '' }))

        if (nextVideoId !== videoId) {
            reset_clip_task_state()
            setVideoMeta({ videoId: nextVideoId, title: '', duration: 0 })
            sessionStorage.removeItem('videoTitle')
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
        sessionStorage.setItem('videoTitle', videoTitle)
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
    }, [youtubeUrl, startTime, endTime, videoTitle, clipDuration, clipRequestId, clipStatus, processStartTime, results])

    // Fetch video title via noembed and duration via YouTube iframe postMessage when videoId changes.
    useEffect(() => {
        if (!videoId) return undefined

        let ignore = false
        const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`

        fetch(`https://noembed.com/embed?url=${encodeURIComponent(normalizedUrl)}`)
            .then((res) => res.json())
            .then((data) => {
                if (!ignore && data?.title) {
                    setVideoMeta((prev) => ({
                        videoId,
                        title: data.title,
                        duration: prev.videoId === videoId ? prev.duration : 0,
                    }))
                }
            })
            .catch(() => {})

        const handle_iframe_message = (event) => {
            if (event.origin !== 'https://www.youtube.com') return
            try {
                const payload = JSON.parse(event.data)
                if (payload.event === 'infoDelivery' && payload.info?.duration) {
                    setVideoMeta((prev) => ({
                        videoId,
                        title: prev.videoId === videoId ? prev.title : '',
                        duration: payload.info.duration,
                    }))
                }
            } catch {
                // Ignore unrelated postMessage frames.
            }
        }

        window.addEventListener('message', handle_iframe_message)

        const listeningTimer = setTimeout(() => {
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                    JSON.stringify({ event: 'listening' }),
                    'https://www.youtube.com'
                )
            }
        }, 1000)

        return () => {
            ignore = true
            window.removeEventListener('message', handle_iframe_message)
            clearTimeout(listeningTimer)
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

    const handle_generate_clip = async (e) => {
        e.preventDefault()
        if (isProcessing || isCancelling || clipRateLimit.isLimited) return

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
        setIsSubmittingClip(true)
        setClipRequestId(null)
        setClipStatus('pending')
        setProcessStartTime(null)
        setClipDuration(Math.max(0, time_to_seconds(endTime) - time_to_seconds(startTime)))
        setResults(EMPTY_RESULTS)
        setEmailFeedback(null)

        try {
            const data = await createClipRequest({
                youtube_url: youtubeUrl.trim(),
                start_time: startTime,
                end_time: endTime,
            })
            setClipRequestId(data.id)
            setClipStatus(data.status || 'pending')
            setProcessStartTime(Date.now())
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

    const showResultsSection =
        clipStatus === 'completed' || (isProcessing && clipStatus !== 'cancelled')

    return (
        <div className="min-h-[100dvh] flex flex-col bg-zinc-50 text-zinc-950 font-sans overflow-x-hidden">
            <Header />

            <main className="flex-1 pt-20 pb-14 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto space-y-5">
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
                                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-100 text-xs sm:text-sm font-semibold transition-colors shrink-0"
                                    >
                                        <ClipboardText size={16} weight="bold" aria-hidden="true" />
                                        Paste
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

                            {/* Side-by-side Preview & Timestamp Controls once URL is pasted so everything stays above the fold */}
                            <div
                                className={`pt-4 border-t border-zinc-200 ${
                                    videoId ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : ''
                                }`}
                            >
                                {videoId && (
                                    <div className="lg:col-span-6 min-w-0 space-y-2.5">
                                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-200">
                                            <iframe
                                                ref={iframeRef}
                                                className="w-full h-full"
                                                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
                                                title={videoTitle ? `Preview of ${videoTitle}` : 'YouTube video preview'}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                        {(videoTitle || videoDuration > 0) && (
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm">
                                                <p className="font-medium text-zinc-900 truncate flex-1 min-w-0">
                                                    {videoTitle || 'Video ready'}
                                                </p>
                                                {videoDuration > 0 && (
                                                    <span className="font-mono tabular-nums text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 px-2.5 py-0.5 rounded-lg shrink-0">
                                                        Total {format_duration(videoDuration)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div
                                    className={
                                        videoId
                                            ? 'lg:col-span-6 min-w-0 space-y-4'
                                            : 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-end'
                                    }
                                >
                                    <div
                                        className={
                                            videoId
                                                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                                                : 'lg:col-span-7 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3'
                                        }
                                    >
                                        <RollingTimePicker
                                            label="Start Time"
                                            value={startTime}
                                            onChange={(val) => {
                                                setStartTime(val)
                                                setErrors((prev) => ({ ...prev, logic: '' }))
                                            }}
                                            ariaPrefix="Start time"
                                        />
                                        <RollingTimePicker
                                            label="End Time"
                                            value={endTime}
                                            onChange={(val) => {
                                                setEndTime(val)
                                                setErrors((prev) => ({ ...prev, logic: '' }))
                                            }}
                                            ariaPrefix="End time"
                                        />
                                    </div>

                                    <div className={videoId ? 'space-y-3 min-w-0' : 'lg:col-span-5 min-w-0 space-y-3'}>
                                        <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                                            <span
                                                className={`font-mono tabular-nums font-semibold ${
                                                    selectedLengthSeconds >= 5 && selectedLengthSeconds <= 300
                                                        ? 'text-blue-700'
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

                                        <div className="flex flex-wrap items-center gap-2.5 w-full">
                                            <button
                                                type="submit"
                                                disabled={
                                                    !videoId ||
                                                    isProcessing ||
                                                    isCancelling ||
                                                    clipStatus === 'cancelled' ||
                                                    clipRateLimit.isLimited
                                                }
                                                className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                {isCancelling || clipStatus === 'cancelled' ? (
                                                    <>
                                                        <X size={18} weight="bold" aria-hidden="true" />
                                                        Cancelling...
                                                    </>
                                                ) : isProcessing ? (
                                                    <>
                                                        <CircleNotch
                                                            size={18}
                                                            weight="bold"
                                                            aria-hidden="true"
                                                            className="animate-spin"
                                                        />
                                                        Creating clips...
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
                                                    className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[46px] px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all active:scale-[0.98] whitespace-nowrap"
                                                >
                                                    <X size={16} weight="bold" aria-hidden="true" />
                                                    Cancel
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
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                                    Your Clips
                                </h2>
                                <span className="font-mono tabular-nums text-xs font-medium text-zinc-600 bg-white border border-zinc-200 px-3 py-1 rounded-lg">
                                    {startTime} to {endTime} ({format_duration(effectiveClipDuration)})
                                </span>
                            </div>

                            <div className="space-y-3">
                                <ClipResultCard
                                    key={`720p-${results.p720.id || 'pending'}`}
                                    resolution="720p"
                                    clip={results.p720}
                                    isProcessing={isProcessing}
                                    clipDuration={effectiveClipDuration}
                                    speedRateLimitCooldown={speedRateLimit}
                                />
                                <ClipResultCard
                                    key={`480p-${results.p480.id || 'pending'}`}
                                    resolution="480p"
                                    clip={results.p480}
                                    isProcessing={isProcessing}
                                    clipDuration={effectiveClipDuration}
                                    speedRateLimitCooldown={speedRateLimit}
                                />
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
                        </section>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default Home
