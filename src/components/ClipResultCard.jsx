import { useId, useState } from 'react'
import {
    CaretDown,
    Check,
    CircleNotch,
    DownloadSimple,
    Gauge,
    LinkSimple,
} from '@phosphor-icons/react'
import { API_BASE_URL } from '../config'
import { ApiError, downloadClipBlob } from '../api/clipService'
import { copy_text_to_clipboard, resolve_media_url } from '../utils/timeUtils'
import InlineSpeedEditor from './InlineSpeedEditor'

/**
 * Displays a single generated clip resolution row (720p or 480p) with icon-equipped
 * Edit Speed, Share URL, and Download buttons plus an inline expandable speed editor.
 */
function ClipResultCard({
    resolution,
    clip,
    isProcessing,
    clipDuration = 0,
    speedRateLimitCooldown,
}) {
    const panelId = useId()
    const [isSpeedEditorOpen, setIsSpeedEditorOpen] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [copyState, setCopyState] = useState('idle') // 'idle' | 'copied' | 'error'
    const [downloadError, setDownloadError] = useState('')

    const isClipReady = Boolean(clip?.url && clip?.id)

    const handle_share_url = async () => {
        if (!clip?.url) return
        const fullUrl = resolve_media_url(clip.url, API_BASE_URL)
        const ok = await copy_text_to_clipboard(fullUrl)
        setCopyState(ok ? 'copied' : 'error')
        setTimeout(() => setCopyState('idle'), 2500)
    }

    const handle_download = async () => {
        if (!clip?.id) return
        setIsDownloading(true)
        setDownloadError('')
        try {
            await downloadClipBlob(clip.id, 'clip', `clip_${resolution}_${Date.now()}.mp4`)
        } catch (err) {
            if (err instanceof ApiError && err.isRateLimited) {
                speedRateLimitCooldown?.triggerRateLimit?.(err.retryAfterSeconds, err.message)
            } else {
                setDownloadError(err?.message || `Failed to download ${resolution} clip.`)
            }
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {clip?.size ? (
                        <span className="font-mono tabular-nums text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                            {clip.size}
                        </span>
                    ) : (
                        isProcessing && (
                            <span
                                aria-label={`Generating ${resolution} clip`}
                                className="inline-block h-5 w-20 sm:w-24 bg-zinc-200 rounded-md animate-pulse"
                            />
                        )
                    )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                        type="button"
                        disabled={!isClipReady}
                        aria-expanded={isSpeedEditorOpen}
                        aria-controls={panelId}
                        aria-label={`Edit Speed for ${resolution} clip`}
                        onClick={() => setIsSpeedEditorOpen((prev) => !prev)}
                        className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                            isSpeedEditorOpen
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                    >
                        <Gauge size={16} weight="bold" aria-hidden="true" />
                        Edit Speed
                        <CaretDown
                            size={14}
                            weight="bold"
                            aria-hidden="true"
                            className={`transition-transform duration-200 ${
                                isSpeedEditorOpen ? 'rotate-180' : ''
                            }`}
                        />
                    </button>

                    <button
                        type="button"
                        disabled={!clip?.url}
                        aria-label={`Share URL for ${resolution} clip`}
                        title={copyState === 'copied' ? 'Copied!' : 'Share URL'}
                        onClick={handle_share_url}
                        className="w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] inline-flex items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {copyState === 'copied' ? (
                            <Check size={17} weight="bold" aria-hidden="true" className="text-emerald-600" />
                        ) : (
                            <LinkSimple size={17} weight="bold" aria-hidden="true" />
                        )}
                    </button>

                    <button
                        type="button"
                        disabled={!clip?.id || isDownloading}
                        aria-label={`Download ${resolution} clip`}
                        title={isDownloading ? 'Downloading...' : 'Download'}
                        onClick={handle_download}
                        className="w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] inline-flex items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? (
                            <CircleNotch size={17} weight="bold" aria-hidden="true" className="animate-spin" />
                        ) : (
                            <DownloadSimple size={17} weight="bold" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {copyState === 'error' && (
                <p role="alert" className="mt-3 text-xs font-medium text-red-700">
                    Unable to copy URL to clipboard in this browser.
                </p>
            )}

            {downloadError && (
                <p role="alert" className="mt-3 text-xs font-medium text-red-700">
                    {downloadError}
                </p>
            )}

            <span role="status" className="sr-only">
                {copyState === 'copied' ? `${resolution} clip URL copied to clipboard.` : ''}
            </span>

            {isSpeedEditorOpen && isClipReady && (
                <div id={panelId}>
                    <InlineSpeedEditor
                        clip={clip}
                        resolution={resolution}
                        clipDuration={clipDuration}
                        rateLimitCooldown={speedRateLimitCooldown}
                    />
                </div>
            )}
        </div>
    )
}

export default ClipResultCard
