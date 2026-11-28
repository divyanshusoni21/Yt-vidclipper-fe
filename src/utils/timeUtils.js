// Shared time, URL, clipboard, and polling helpers used across clipper views.

const YOUTUBE_ID_REGEX =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i

/**
 * Extracts the 11-character YouTube video ID from standard watch, short, live, or embed URLs.
 */
export const extract_youtube_video_id = (url) => {
    if (!url || typeof url !== 'string') return null
    const match = url.trim().match(YOUTUBE_ID_REGEX)
    return match ? match[1] : null
}

/**
 * Checks whether the given string points to a valid YouTube video.
 */
export const is_valid_youtube_url = (url) => {
    return Boolean(extract_youtube_video_id(url))
}

/**
 * Converts an "HH:MM:SS" timestamp string into integer seconds.
 */
export const time_to_seconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0
    const parts = timeStr.split(':').map((part) => parseInt(part, 10) || 0)
    const [hours = 0, minutes = 0, seconds = 0] = parts
    return hours * 3600 + minutes * 60 + seconds
}

/**
 * Converts integer seconds into a zero-padded "HH:MM:SS" timestamp string clamped to [0, 86399].
 */
export const seconds_to_time = (totalSeconds) => {
    const safeSeconds = Math.max(0, Math.min(86399, Math.round(Number(totalSeconds) || 0)))
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const seconds = safeSeconds % 60

    return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

/**
 * Parses pasted timestamps such as "00:38:27", "00 : 38 : 27 . 0", "1:25", or raw seconds
 * into integer seconds in [0, 86399], or returns null when the text is invalid.
 */
export const parse_pasted_timestamp = (text) => {
    if (!text || typeof text !== 'string') return null

    const compact = text.trim().replace(/\s*:\s*/g, ':').replace(/\s*\.\s*/g, '.')
    if (!compact) return null

    if (/^\d+(?:\.\d+)?$/.test(compact)) {
        const parsedSeconds = Math.floor(parseFloat(compact))
        return Math.max(0, Math.min(86399, parsedSeconds))
    }

    const parts = compact.split(':')
    if (parts.length !== 2 && parts.length !== 3) return null

    const lastPart = parts[parts.length - 1]
    if (!/^\d+(?:\.\d+)?$/.test(lastPart)) return null
    for (let i = 0; i < parts.length - 1; i += 1) {
        if (!/^\d+$/.test(parts[i])) return null
    }

    let totalSeconds = 0
    if (parts.length === 2) {
        totalSeconds = parseInt(parts[0], 10) * 60 + Math.floor(parseFloat(parts[1]))
    } else {
        totalSeconds =
            parseInt(parts[0], 10) * 3600 +
            parseInt(parts[1], 10) * 60 +
            Math.floor(parseFloat(parts[2]))
    }

    if (!Number.isFinite(totalSeconds)) return null
    return Math.max(0, Math.min(86399, totalSeconds))
}

/**
 * Formats seconds into M:SS or H:MM:SS for duration displays.
 * Rounding avoids floating-point division drift (e.g. 75 / 1.25 showing 0:59 instead of 1:00).
 */
export const format_duration = (totalSeconds) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
    const rounded = Math.round(totalSeconds)
    const hours = Math.floor(rounded / 3600)
    const minutes = Math.floor((rounded % 3600) / 60)
    const seconds = rounded % 60

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Formats remaining rate-limit cooldown seconds (e.g. "45s", "1m 12s", "14m 05s").
 */
export const format_countdown = (totalSeconds) => {
    const safeSeconds = Math.max(0, Math.ceil(Number(totalSeconds) || 0))
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60

    if (minutes > 0) {
        return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
    }
    return `${seconds}s`
}

/**
 * Ensures relative media paths returned by Django resolve against API_BASE_URL.
 */
export const resolve_media_url = (url, apiBaseUrl = '') => {
    if (!url || typeof url !== 'string') return ''
    if (/^(https?:|blob:)/i.test(url)) return url
    const base = (apiBaseUrl || '').replace(/\/+$/, '')
    const path = url.replace(/^\/+/, '')
    return base ? `${base}/${path}` : `/${path}`
}

/**
 * Copies text to the clipboard using the async Clipboard API with a legacy textarea fallback
 * for browsers or non-HTTPS local previews where navigator.clipboard is unavailable.
 */
export const copy_text_to_clipboard = async (text) => {
    if (!text) return false

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // Fall through to execCommand fallback if permissions or context restrict clipboard API.
        }
    }

    try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.top = '-9999px'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(textarea)
        return Boolean(copied)
    } catch {
        return false
    }
}

/**
 * Selects a sensible status polling interval based on source video size in MB.
 */
export const get_speed_polling_interval = (sizeMB) => {
    if (!sizeMB || sizeMB < 1) return 1500
    if (sizeMB < 5) return 2500
    if (sizeMB < 15) return 4000
    return 7000
}
