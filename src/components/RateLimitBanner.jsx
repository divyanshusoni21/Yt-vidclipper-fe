import { ClockCountdown, X } from '@phosphor-icons/react'
import { format_countdown } from '../utils/timeUtils'

/**
 * Displays an accessible warning banner when an endpoint returns HTTP 429 rate limiting,
 * along with a live countdown badge when Retry-After seconds are known.
 */
function RateLimitBanner({ message, remainingSeconds = 0, onDismiss }) {
    if (!message && remainingSeconds <= 0) return null

    const displayMessage =
        message || 'Too many requests right now. Please wait before trying again.'

    return (
        <div
            role="alert"
            aria-live="assertive"
            className="bg-amber-50 border border-amber-200 text-amber-950 rounded-xl px-4 py-3 flex items-start justify-between gap-3"
        >
            <div className="flex items-start gap-2.5 min-w-0">
                <ClockCountdown
                    size={20}
                    weight="bold"
                    aria-hidden="true"
                    className="text-amber-700 shrink-0 mt-0.5"
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <p className="font-medium text-amber-950">{displayMessage}</p>
                    {remainingSeconds > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-mono font-semibold tabular-nums whitespace-nowrap">
                            Retry in {format_countdown(remainingSeconds)}
                        </span>
                    )}
                </div>
            </div>

            {onDismiss && remainingSeconds <= 0 && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss rate limit warning"
                    className="p-1 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors shrink-0"
                >
                    <X size={16} weight="bold" aria-hidden="true" />
                </button>
            )}
        </div>
    )
}

export default RateLimitBanner
