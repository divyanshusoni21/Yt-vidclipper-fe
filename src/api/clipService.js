import { API_BASE_URL } from '../config'

/**
 * Structured API error that preserves HTTP status and rate-limit metadata
 * so UI components can display countdowns instead of generic failures.
 */
export class ApiError extends Error {
    constructor(message, { status = 0, isRateLimited = false, retryAfterSeconds = null, rawData = null } = {}) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.isRateLimited = isRateLimited
        this.retryAfterSeconds = retryAfterSeconds
        this.rawData = rawData
    }
}

/**
 * Extracts wait seconds from Retry-After header or DRF's throttle body message.
 * Reading the body is required because CORS_EXPOSE_HEADERS on the backend does not expose Retry-After.
 */
const parse_retry_after_seconds = (response, errorData) => {
    const headerVal = response.headers?.get?.('Retry-After')
    if (headerVal) {
        const parsedHeader = parseInt(headerVal, 10)
        if (Number.isFinite(parsedHeader) && parsedHeader > 0) {
            return parsedHeader
        }
    }

    if (errorData && typeof errorData.retry_after === 'number' && errorData.retry_after > 0) {
        return Math.ceil(errorData.retry_after)
    }

    const detailText = typeof errorData?.detail === 'string' ? errorData.detail : ''
    const match = detailText.match(/available in\s+(\d+)\s*second/i)
    if (match) {
        const parsedDetail = parseInt(match[1], 10)
        if (Number.isFinite(parsedDetail) && parsedDetail > 0) {
            return parsedDetail
        }
    }

    return null
}

/**
 * Extracts a readable message from DRF error payloads across endpoints.
 */
const parse_error_message = (response, errorData, fallbackMessage) => {
    if (response.status === 429) {
        return 'Too many requests. Please wait before trying again.'
    }

    if (errorData && typeof errorData === 'object') {
        if (typeof errorData.detail === 'string' && errorData.detail.trim()) {
            return errorData.detail
        }
        if (typeof errorData.details === 'string' && errorData.details.trim()) {
            return errorData.details
        }
        if (typeof errorData.error === 'string' && errorData.error.trim()) {
            return errorData.error
        }
        if (typeof errorData.message === 'string' && errorData.message.trim()) {
            return errorData.message
        }

        // Fall back to the first serializer field validation message.
        for (const value of Object.values(errorData)) {
            if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
                return value[0]
            }
            if (typeof value === 'string' && value.trim()) {
                return value
            }
        }
    }

    return fallbackMessage
}

/**
 * Shared response validator that parses JSON or throws an ApiError on non-2xx statuses.
 */
const handle_response = async (response, fallbackMessage) => {
    if (response.ok) {
        return response.json()
    }

    const errorData = await response.json().catch(() => ({}))
    const isRateLimited = response.status === 429
    const retryAfterSeconds = isRateLimited ? parse_retry_after_seconds(response, errorData) : null
    const message = parse_error_message(response, errorData, fallbackMessage)

    throw new ApiError(message, {
        status: response.status,
        isRateLimited,
        retryAfterSeconds,
        rawData: errorData,
    })
}

/**
 * Creates a new clip request.
 * @param {Object} data - { youtube_url, start_time, end_time }
 */
export const createClipRequest = async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/clip-request/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })

    return handle_response(response, 'Failed to create clip request')
}

/**
 * Gets the status of a specific clip request.
 */
export const getClipTaskStatus = async (clipRequestId) => {
    const response = await fetch(
        `${API_BASE_URL}/api/clip-request/task_status?clip_request_id=${encodeURIComponent(clipRequestId)}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    return handle_response(response, 'Failed to fetch task status')
}

/**
 * Sends the clip to a specified email.
 */
export const sendClipToEmail = async (clipRequestId, email) => {
    const response = await fetch(
        `${API_BASE_URL}/api/clip-request/send_clip_to_email?clip_request_id=${encodeURIComponent(clipRequestId)}&email=${encodeURIComponent(email)}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    return handle_response(response, 'Failed to send email')
}

/**
 * Initiates a speed edit request.
 * @param {Object} data - { speed_factor, source_clip, uploaded_video }
 */
export const initiateSpeedEdit = async (data) => {
    const formData = new FormData()
    formData.append('speed_factor', data.speed_factor)

    if (data.uploaded_video) {
        formData.append('uploaded_video', data.uploaded_video)
    } else if (data.source_clip) {
        formData.append('source_clip', data.source_clip)
    }

    const response = await fetch(`${API_BASE_URL}/api/speed-edit/`, {
        method: 'POST',
        body: formData,
    })

    return handle_response(response, 'Failed to initiate speed edit')
}

/**
 * Gets the status of a specific speed edit request.
 */
export const getSpeedEditStatus = async (requestId) => {
    const response = await fetch(
        `${API_BASE_URL}/api/speed-edit/status?request_id=${encodeURIComponent(requestId)}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    return handle_response(response, 'Failed to fetch speed edit status')
}

/**
 * Cancels a clip_request or speed_edit task.
 */
export const cancelRequest = async (requestId, requestType) => {
    const response = await fetch(`${API_BASE_URL}/api/cancel-request/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            request_type: requestType,
            request_id: requestId,
        }),
    })

    return handle_response(response, 'Failed to cancel request')
}

/**
 * Fetches a clip or speed-edited clip as a blob and triggers a browser download.
 */
export const downloadClipBlob = async (clipId, fileType = 'clip', fileName = 'clip.mp4') => {
    const query = fileType === 'speed_edit' ? '?file_type=speed_edit' : ''
    const response = await fetch(`${API_BASE_URL}/api/download-clip/${encodeURIComponent(clipId)}/${query}`)

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const isRateLimited = response.status === 429
        const retryAfterSeconds = isRateLimited ? parse_retry_after_seconds(response, errorData) : null
        throw new ApiError(parse_error_message(response, errorData, 'Failed to download clip'), {
            status: response.status,
            isRateLimited,
            retryAfterSeconds,
            rawData: errorData,
        })
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // Delay revocation slightly so Safari completes reading the blob URL before cleanup.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
