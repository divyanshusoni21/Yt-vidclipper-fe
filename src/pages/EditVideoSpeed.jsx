import { useState, useRef, useEffect, useId } from 'react'
import { useLocation } from 'react-router-dom'
import {
    Check,
    CheckCircle,
    CircleNotch,
    ClockCountdown,
    DownloadSimple,
    Gauge,
    LinkSimple,
    Trash,
    UploadSimple,
    WarningCircle,
    X,
} from '@phosphor-icons/react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import RateLimitBanner from '../components/RateLimitBanner'
import {
    ApiError,
    cancelRequest,
    downloadClipBlob,
    getSpeedEditStatus,
    initiateSpeedEdit,
} from '../api/clipService'
import { API_BASE_URL, CLIP_TIMEOUT_MS } from '../config'
import { useRateLimitCooldown } from '../hooks/useRateLimitCooldown'
import {
    copy_text_to_clipboard,
    format_countdown,
    format_duration,
    get_speed_polling_interval,
    resolve_media_url,
} from '../utils/timeUtils'

const MAX_VIDEO_SIZE_MB = 50
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

/**
 * Standalone speed editor page for uploading a local video or editing an existing clip.
 */
function EditVideoSpeed() {
    const location = useLocation()
    const sliderId = useId()

    const [remoteVideoUrl, setRemoteVideoUrl] = useState(location.state?.videoUrl || null)
    const sourceClipId = location.state?.clipId || null

    const [localFile, setLocalFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)

    const videoRef = useRef(null)
    const fileInputRef = useRef(null)
    const pollingRef = useRef(null)
    const activeRequestIdRef = useRef(null)
    const cancelledRef = useRef(false)

    const [speed, setSpeed] = useState(1.25)
    const [duration, setDuration] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [speedOutput, setSpeedOutput] = useState(null)
    const [isDownloadingOutput, setIsDownloadingOutput] = useState(false)
    const [copyState, setCopyState] = useState('idle')

    const speedRateLimit = useRateLimitCooldown('speedEditRateLimitUntil')

    const activeVideoUrl = remoteVideoUrl
        ? resolve_media_url(remoteVideoUrl, API_BASE_URL)
        : previewUrl
    const formattedSpeed = parseFloat(speed.toFixed(2))
    const finalDuration = duration > 0 ? duration / speed : 0

    const clear_polling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0)
        return () => {
            clear_polling()
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed
        }
    }, [speed, activeVideoUrl])

    const handle_file_change = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > MAX_VIDEO_SIZE_BYTES) {
            setErrorMessage(
                `Video size must not exceed ${MAX_VIDEO_SIZE_MB}MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
            )
            e.target.value = ''
            return
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setErrorMessage('')
        setSpeedOutput(null)
        setLocalFile(file)
        setRemoteVideoUrl(null)
        setPreviewUrl(URL.createObjectURL(file))
        setSpeed(1.25)
        setDuration(0)
    }

    const handle_reset_video = () => {
        clear_polling()
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setRemoteVideoUrl(null)
        setLocalFile(null)
        setPreviewUrl(null)
        setDuration(0)
        setIsProcessing(false)
        setIsCancelling(false)
        setErrorMessage('')
        setSpeedOutput(null)
        activeRequestIdRef.current = null
    }

    const handle_speed_change = (nextSpeed) => {
        setSpeed(nextSpeed)
        setErrorMessage('')
        if (videoRef.current) {
            videoRef.current.playbackRate = nextSpeed
        }
    }

    const handle_loaded_metadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration || 0)
            videoRef.current.playbackRate = speed
        }
    }

    const handle_apply_and_download = async () => {
        if ((!remoteVideoUrl && !localFile) || formattedSpeed === 1 || speedRateLimit.isLimited) {
            return
        }

        const submittedSpeed = formattedSpeed
        cancelledRef.current = false
        clear_polling()
        speedRateLimit.clearRateLimit()
        setErrorMessage('')
        setSpeedOutput(null)
        setCopyState('idle')
        setIsProcessing(true)

        try {
            const initialTask = await initiateSpeedEdit({
                speed_factor: submittedSpeed,
                source_clip: sourceClipId,
                uploaded_video: localFile,
            })

            if (cancelledRef.current) return

            const requestId = initialTask.id
            activeRequestIdRef.current = requestId
            const startedAt = Date.now()
            const intervalMs = get_speed_polling_interval(initialTask.original_size || 0)

            const poll_status = async () => {
                if (cancelledRef.current) {
                    clear_polling()
                    return
                }

                if (Date.now() - startedAt > CLIP_TIMEOUT_MS) {
                    clear_polling()
                    activeRequestIdRef.current = null
                    setIsProcessing(false)
                    setErrorMessage('Speed edit timed out after 5 minutes. Please try again.')
                    return
                }

                try {
                    const task = await getSpeedEditStatus(requestId)
                    if (cancelledRef.current) {
                        clear_polling()
                        return
                    }

                    if (task.status === 'completed') {
                        clear_polling()
                        activeRequestIdRef.current = null
                        setIsProcessing(false)
                        setSpeedOutput({
                            id: task.id,
                            outputUrl: task.output_video,
                            appliedSpeed: submittedSpeed,
                            size: task.output_size ? `${task.output_size}MB` : null,
                        })

                        try {
                            await downloadClipBlob(
                                task.id,
                                'speed_edit',
                                `speed_edited_${submittedSpeed}x.mp4`
                            )
                        } catch {
                            // Keep the ready bar visible so user can retry download or copy Share URL.
                        }
                    } else if (task.status === 'failed') {
                        clear_polling()
                        activeRequestIdRef.current = null
                        setIsProcessing(false)
                        setErrorMessage(task.error_message || 'Speed processing failed. Please try again.')
                    } else if (task.status === 'cancelled') {
                        clear_polling()
                        activeRequestIdRef.current = null
                        setIsProcessing(false)
                    }
                } catch (pollErr) {
                    console.error('Polling error:', pollErr)
                }
            }

            pollingRef.current = setInterval(poll_status, intervalMs)
        } catch (err) {
            setIsProcessing(false)
            activeRequestIdRef.current = null

            if (err instanceof ApiError && err.isRateLimited) {
                speedRateLimit.triggerRateLimit(err.retryAfterSeconds, err.message)
                return
            }
            setErrorMessage(err?.message || 'Failed to start processing. Please try again.')
        }
    }

    const handle_cancel_request = async () => {
        if (!activeRequestIdRef.current) return
        setIsCancelling(true)
        cancelledRef.current = true
        clear_polling()

        try {
            await cancelRequest(activeRequestIdRef.current, 'speed_edit')
            activeRequestIdRef.current = null
            setIsProcessing(false)
            setIsCancelling(false)
        } catch (err) {
            setIsCancelling(false)
            setErrorMessage(err?.message || 'Failed to cancel request.')
        }
    }

    const handle_share_output = async () => {
        if (!speedOutput?.outputUrl) return
        const fullUrl = resolve_media_url(speedOutput.outputUrl, API_BASE_URL)
        const ok = await copy_text_to_clipboard(fullUrl)
        setCopyState(ok ? 'copied' : 'error')
        setTimeout(() => setCopyState('idle'), 2500)
    }

    const handle_download_output = async () => {
        if (!speedOutput?.id) return
        setIsDownloadingOutput(true)
        setErrorMessage('')
        try {
            await downloadClipBlob(
                speedOutput.id,
                'speed_edit',
                `speed_edited_${speedOutput.appliedSpeed}x.mp4`
            )
        } catch (err) {
            if (err instanceof ApiError && err.isRateLimited) {
                speedRateLimit.triggerRateLimit(err.retryAfterSeconds, err.message)
            } else {
                setErrorMessage(err?.message || 'Failed to download speed-edited video.')
            }
        } finally {
            setIsDownloadingOutput(false)
        }
    }

    return (
        <div className="min-h-[100dvh] flex flex-col font-sans bg-zinc-50 text-zinc-950 overflow-x-hidden">
            <Header />

            <main className="flex-1 pt-24 pb-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
                            Video Speed Editor
                        </h1>
                        <p className="text-zinc-600 text-base max-w-[65ch]">
                            Upload a video, preview playback speed, and export with live duration estimates.
                        </p>
                    </div>

                    {(speedRateLimit.isLimited || speedRateLimit.message) && (
                        <RateLimitBanner
                            message={speedRateLimit.message}
                            remainingSeconds={speedRateLimit.remainingSeconds}
                            onDismiss={speedRateLimit.clearRateLimit}
                        />
                    )}

                    {errorMessage && (
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
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {!activeVideoUrl ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full max-w-2xl mx-auto aspect-video bg-white rounded-2xl border-2 border-dashed border-zinc-300 hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center justify-center p-6 transition-colors group"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handle_file_change}
                                className="hidden"
                                accept="video/*,.mkv,video/x-matroska"
                            />
                            <span className="w-14 h-14 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                                <UploadSimple size={26} weight="bold" aria-hidden="true" />
                            </span>
                            <span className="text-lg font-bold text-zinc-900">Click to upload video</span>
                            <span className="text-sm text-zinc-500 mt-1">
                                MP4, WebM, MKV or Ogg (max {MAX_VIDEO_SIZE_MB}MB)
                            </span>
                        </button>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                <div className="rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200 shadow-xs aspect-video flex items-center justify-center">
                                    <video
                                        key={activeVideoUrl}
                                        ref={videoRef}
                                        src={activeVideoUrl}
                                        className="w-full h-full object-contain"
                                        controls
                                        onLoadedMetadata={handle_loaded_metadata}
                                    />
                                </div>

                                <div className="flex justify-center sm:justify-start">
                                    <button
                                        type="button"
                                        onClick={handle_reset_video}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                                    >
                                        <Trash size={16} weight="bold" aria-hidden="true" />
                                        Remove and upload different video
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Duration Estimate Card */}
                                <div className="bg-white rounded-2xl p-5 border border-zinc-200 space-y-3">
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                        Duration Estimate
                                    </h2>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-600">Original</span>
                                        <span className="font-mono tabular-nums text-base font-semibold text-zinc-900">
                                            {format_duration(duration)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                                        <span className="text-sm font-semibold text-blue-900">
                                            Estimated total
                                        </span>
                                        <span className="font-mono tabular-nums text-xl font-bold text-blue-600">
                                            {format_duration(finalDuration)}
                                        </span>
                                    </div>
                                </div>

                                {/* Speed Controls Card */}
                                <div className="bg-white rounded-2xl p-5 border border-zinc-200 space-y-5">
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label
                                                htmlFor={sliderId}
                                                className="text-sm font-semibold text-zinc-900"
                                            >
                                                Playback speed
                                            </label>
                                            <span className="font-mono tabular-nums text-xs font-bold bg-zinc-100 border border-zinc-200 text-zinc-900 px-2.5 py-1 rounded-lg">
                                                {formattedSpeed}x
                                            </span>
                                        </div>

                                        <input
                                            id={sliderId}
                                            type="range"
                                            min="0.25"
                                            max="2"
                                            step="0.05"
                                            value={speed}
                                            disabled={isProcessing}
                                            onChange={(e) => handle_speed_change(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                                        />
                                        <div className="flex justify-between text-[11px] font-mono text-zinc-500 mt-1">
                                            <span>0.25x</span>
                                            <span>1x</span>
                                            <span>2x</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Speed presets">
                                        {SPEED_PRESETS.map((val) => {
                                            const isActive = formattedSpeed === val
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    disabled={isProcessing}
                                                    aria-pressed={isActive}
                                                    onClick={() => handle_speed_change(val)}
                                                    className={`min-h-[38px] px-2 py-1.5 rounded-lg font-mono tabular-nums text-xs font-semibold transition-colors disabled:opacity-50 ${
                                                        isActive
                                                            ? 'bg-blue-600 text-white border border-blue-600'
                                                            : 'bg-zinc-50 text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
                                                    }`}
                                                >
                                                    {val}x
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Submit & Cancel */}
                                <div className="space-y-2.5">
                                    <button
                                        type="button"
                                        disabled={
                                            isProcessing ||
                                            isCancelling ||
                                            speedRateLimit.isLimited ||
                                            formattedSpeed === 1
                                        }
                                        onClick={handle_apply_and_download}
                                        className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        {isCancelling ? (
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
                                                Applying {formattedSpeed}x speed...
                                            </>
                                        ) : speedRateLimit.isLimited ? (
                                            <>
                                                <ClockCountdown size={18} weight="bold" aria-hidden="true" />
                                                Wait {format_countdown(speedRateLimit.remainingSeconds)}
                                            </>
                                        ) : (
                                            <>
                                                <Gauge size={18} weight="bold" aria-hidden="true" />
                                                Apply {formattedSpeed}x Speed
                                            </>
                                        )}
                                    </button>

                                    {formattedSpeed === 1 && !isProcessing && !speedRateLimit.isLimited && (
                                        <p className="text-xs text-center text-zinc-500">
                                            Choose a speed other than 1x to process.
                                        </p>
                                    )}

                                    {isProcessing && !isCancelling && (
                                        <div className="flex justify-center">
                                            <button
                                                type="button"
                                                onClick={handle_cancel_request}
                                                className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all active:scale-[0.98]"
                                            >
                                                <X size={15} weight="bold" aria-hidden="true" />
                                                Cancel request
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Completed Output Bar */}
                                {speedOutput && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between gap-2 text-emerald-950">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle
                                                    size={18}
                                                    weight="fill"
                                                    aria-hidden="true"
                                                    className="text-emerald-600"
                                                />
                                                <span className="text-sm font-semibold">
                                                    {speedOutput.appliedSpeed}x video ready
                                                </span>
                                            </div>
                                            {speedOutput.size && (
                                                <span className="font-mono text-xs text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-lg">
                                                    {speedOutput.size}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {speedOutput.outputUrl && (
                                                <button
                                                    type="button"
                                                    onClick={handle_share_output}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-white border border-emerald-200 text-zinc-800 hover:bg-zinc-50 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                                                >
                                                    {copyState === 'copied' ? (
                                                        <>
                                                            <Check
                                                                size={15}
                                                                weight="bold"
                                                                aria-hidden="true"
                                                                className="text-emerald-600"
                                                            />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LinkSimple size={15} weight="bold" aria-hidden="true" />
                                                            Share URL
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                disabled={isDownloadingOutput}
                                                onClick={handle_download_output}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {isDownloadingOutput ? (
                                                    <>
                                                        <CircleNotch
                                                            size={15}
                                                            weight="bold"
                                                            aria-hidden="true"
                                                            className="animate-spin"
                                                        />
                                                        Downloading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <DownloadSimple size={15} weight="bold" aria-hidden="true" />
                                                        Download
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
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
