import { useState, useRef, useEffect, useId } from 'react'
import {
    ArrowRight,
    Check,
    CheckCircle,
    CircleNotch,
    ClockCountdown,
    DownloadSimple,
    EyeSlash,
    Gauge,
    LinkSimple,
    Play,
    X,
} from '@phosphor-icons/react'
import {
    initiateSpeedEdit,
    getSpeedEditStatus,
    cancelRequest,
    downloadClipBlob,
    ApiError,
} from '../api/clipService'
import { API_BASE_URL, CLIP_TIMEOUT_MS } from '../config'
import {
    copy_text_to_clipboard,
    format_countdown,
    format_duration,
    get_speed_polling_interval,
    resolve_media_url,
} from '../utils/timeUtils'
import RateLimitBanner from './RateLimitBanner'

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

/**
 * Formats the duration difference in seconds into a concise change label.
 */
const format_delta_label = (originalSeconds, estimatedSeconds, speedFactor) => {
    if (!originalSeconds || originalSeconds <= 0) return ''
    if (speedFactor === 1) return 'Original length'

    const diff = Math.round(originalSeconds - estimatedSeconds)
    if (diff === 0) return 'Minimal change'

    const absDiff = Math.abs(diff)
    const readable = absDiff < 60 ? `${absDiff}s` : format_duration(absDiff)
    return diff > 0 ? `${readable} shorter` : `${readable} longer`
}

/**
 * Inline speed-adjustment workspace rendered directly inside a generated ClipResultCard.
 * Shows live estimated output duration, optional video preview, submit/cancel controls,
 * and Share URL + Download buttons once the speed-edited file is ready.
 */
function InlineSpeedEditor({ clip, resolution, clipDuration = 0, rateLimitCooldown }) {
    const sliderId = useId()
    const videoRef = useRef(null)
    const pollingRef = useRef(null)
    const activeRequestIdRef = useRef(null)
    const cancelledRef = useRef(false)

    // Default to 1.25x so opening the panel immediately shows an estimated duration change.
    const [speed, setSpeed] = useState(1.25)
    const [metadataDuration, setMetadataDuration] = useState(null)
    const [showPreview, setShowPreview] = useState(false)

    const [isProcessing, setIsProcessing] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [speedOutput, setSpeedOutput] = useState(null)
    const [isDownloadingOutput, setIsDownloadingOutput] = useState(false)
    const [copyState, setCopyState] = useState('idle') // 'idle' | 'copied' | 'error'

    const resolvedClipUrl = resolve_media_url(clip?.url, API_BASE_URL)
    const effectiveOriginalDuration =
        metadataDuration && metadataDuration > 0 ? metadataDuration : clipDuration || 0
    const estimatedDuration = effectiveOriginalDuration > 0 ? effectiveOriginalDuration / speed : 0
    const formattedSpeed = parseFloat(speed.toFixed(2))
    const deltaLabel = format_delta_label(effectiveOriginalDuration, estimatedDuration, formattedSpeed)

    const clear_polling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed
        }
    }, [speed, showPreview])

    useEffect(() => {
        return () => clear_polling()
    }, [])

    const handle_loaded_metadata = () => {
        if (videoRef.current) {
            const videoLen = videoRef.current.duration
            if (Number.isFinite(videoLen) && videoLen > 0) {
                setMetadataDuration(videoLen)
            }
            videoRef.current.playbackRate = speed
        }
    }

    const handle_speed_change = (nextSpeed) => {
        setSpeed(nextSpeed)
        setErrorMessage('')
        if (videoRef.current) {
            videoRef.current.playbackRate = nextSpeed
        }
    }

    const handle_apply_speed = async () => {
        if (!clip?.id || formattedSpeed === 1 || rateLimitCooldown?.isLimited) return

        const submittedSpeed = formattedSpeed
        cancelledRef.current = false
        clear_polling()
        setErrorMessage('')
        setSpeedOutput(null)
        setCopyState('idle')
        setIsProcessing(true)
        rateLimitCooldown?.clearRateLimit?.()

        try {
            const initialTask = await initiateSpeedEdit({
                speed_factor: submittedSpeed,
                source_clip: clip.id,
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
                    // Keep polling on transient network blips unless timeout triggers.
                    console.error('Speed edit polling error:', pollErr)
                }
            }

            pollingRef.current = setInterval(poll_status, intervalMs)
        } catch (err) {
            setIsProcessing(false)
            activeRequestIdRef.current = null

            if (err instanceof ApiError && err.isRateLimited) {
                rateLimitCooldown?.triggerRateLimit?.(err.retryAfterSeconds, err.message)
                return
            }
            setErrorMessage(err?.message || 'Failed to start speed edit. Please try again.')
        }
    }

    const handle_cancel_speed_edit = async () => {
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
            setErrorMessage(err?.message || 'Could not cancel speed edit request.')
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
                `clip_${resolution}_${speedOutput.appliedSpeed}x.mp4`
            )
        } catch (err) {
            if (err instanceof ApiError && err.isRateLimited) {
                rateLimitCooldown?.triggerRateLimit?.(err.retryAfterSeconds, err.message)
            } else {
                setErrorMessage(err?.message || 'Failed to download speed-edited clip.')
            }
        } finally {
            setIsDownloadingOutput(false)
        }
    }

    const isRateLimited = Boolean(rateLimitCooldown?.isLimited)
    const isSubmitDisabled =
        isProcessing || isCancelling || isRateLimited || formattedSpeed === 1 || !clip?.id

    return (
        <div className="mt-4 pt-4 border-t border-zinc-200 space-y-4">
            {/* Estimated Duration Strip */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-sm">
                    <div>
                        <span className="text-zinc-500 mr-1.5">Original</span>
                        <span className="font-mono tabular-nums font-semibold text-zinc-900">
                            {effectiveOriginalDuration > 0 ? format_duration(effectiveOriginalDuration) : '--:--'}
                        </span>
                    </div>

                    <ArrowRight size={15} weight="bold" aria-hidden="true" className="text-zinc-400" />

                    <div>
                        <span className="text-zinc-500 mr-1.5">Estimated total</span>
                        <span className="font-mono tabular-nums font-bold text-blue-600 text-base">
                            {effectiveOriginalDuration > 0 ? format_duration(estimatedDuration) : '--:--'}
                        </span>
                    </div>

                    {deltaLabel && (
                        <span className="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 px-2.5 py-0.5 rounded-lg">
                            {deltaLabel}
                        </span>
                    )}
                </div>

                {resolvedClipUrl && (
                    <button
                        type="button"
                        onClick={() => setShowPreview((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 transition-colors"
                    >
                        {showPreview ? (
                            <>
                                <EyeSlash size={15} weight="bold" aria-hidden="true" />
                                Hide preview
                            </>
                        ) : (
                            <>
                                <Play size={15} weight="bold" aria-hidden="true" />
                                Preview at {formattedSpeed}x
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Optional Inline Video Preview */}
            {showPreview && resolvedClipUrl && (
                <div className="rounded-xl overflow-hidden bg-zinc-950 border border-zinc-200">
                    <video
                        ref={videoRef}
                        src={resolvedClipUrl}
                        controls
                        onLoadedMetadata={handle_loaded_metadata}
                        className="w-full max-h-64 object-contain"
                    />
                </div>
            )}

            {/* Speed Slider & Quick Presets */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor={sliderId} className="text-sm font-semibold text-zinc-900">
                        Playback speed
                    </label>
                    <span className="font-mono tabular-nums text-xs font-bold text-zinc-900 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg">
                        {formattedSpeed}x
                    </span>
                </div>

                <div>
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

                <div className="flex flex-wrap gap-2" role="group" aria-label="Speed presets">
                    {SPEED_PRESETS.map((preset) => {
                        const isActive = formattedSpeed === preset
                        return (
                            <button
                                key={preset}
                                type="button"
                                disabled={isProcessing}
                                aria-pressed={isActive}
                                onClick={() => handle_speed_change(preset)}
                                className={`min-h-[36px] px-3 py-1.5 rounded-lg font-mono tabular-nums text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 ${
                                    isActive
                                        ? 'bg-blue-600 text-white border border-blue-600'
                                        : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
                                }`}
                            >
                                {preset}x
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Submit & Cancel Controls */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    disabled={isSubmitDisabled}
                    onClick={handle_apply_speed}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    {isProcessing ? (
                        <>
                            <CircleNotch size={17} weight="bold" aria-hidden="true" className="animate-spin" />
                            Applying {formattedSpeed}x speed...
                        </>
                    ) : isRateLimited ? (
                        <>
                            <ClockCountdown size={17} weight="bold" aria-hidden="true" />
                            Wait {format_countdown(rateLimitCooldown.remainingSeconds)}
                        </>
                    ) : (
                        <>
                            <Gauge size={17} weight="bold" aria-hidden="true" />
                            Apply {formattedSpeed}x Speed
                        </>
                    )}
                </button>

                {isProcessing && !isCancelling && (
                    <button
                        type="button"
                        onClick={handle_cancel_speed_edit}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all active:scale-[0.98]"
                    >
                        <X size={16} weight="bold" aria-hidden="true" />
                        Cancel
                    </button>
                )}

                {formattedSpeed === 1 && !isProcessing && !isRateLimited && (
                    <span className="text-xs text-zinc-500">Select a speed other than 1x to apply.</span>
                )}
            </div>

            {/* Rate Limit & Inline Error Feedback */}
            {(rateLimitCooldown?.isLimited || rateLimitCooldown?.message) && (
                <RateLimitBanner
                    message={rateLimitCooldown.message}
                    remainingSeconds={rateLimitCooldown.remainingSeconds}
                    onDismiss={rateLimitCooldown.clearRateLimit}
                />
            )}

            {errorMessage && (
                <div
                    role="alert"
                    className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium"
                >
                    {errorMessage}
                </div>
            )}

            {/* Completed Speed-Edited Output Actions */}
            {speedOutput && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-emerald-950">
                        <CheckCircle size={20} weight="fill" aria-hidden="true" className="text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold">
                            {speedOutput.appliedSpeed}x clip ready
                        </span>
                        {speedOutput.size && (
                            <span className="font-mono text-xs text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-lg">
                                {speedOutput.size}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handle_share_output}
                            aria-label={`Share URL for ${speedOutput.appliedSpeed}x ${resolution} clip`}
                            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-zinc-800 hover:bg-zinc-50 text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            {copyState === 'copied' ? (
                                <>
                                    <Check size={16} weight="bold" aria-hidden="true" className="text-emerald-600" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <LinkSimple size={16} weight="bold" aria-hidden="true" />
                                    Share URL
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            disabled={isDownloadingOutput}
                            onClick={handle_download_output}
                            aria-label={`Download ${speedOutput.appliedSpeed}x ${resolution} clip`}
                            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                        >
                            {isDownloadingOutput ? (
                                <>
                                    <CircleNotch size={16} weight="bold" aria-hidden="true" className="animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <DownloadSimple size={16} weight="bold" aria-hidden="true" />
                                    Download
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <span role="status" className="sr-only">
                {copyState === 'copied'
                    ? 'Speed-edited clip URL copied to clipboard.'
                    : copyState === 'error'
                        ? 'Failed to copy speed-edited clip URL.'
                        : ''}
            </span>
        </div>
    )
}

export default InlineSpeedEditor
