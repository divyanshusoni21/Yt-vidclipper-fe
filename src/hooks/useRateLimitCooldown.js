import { useState, useEffect, useCallback } from 'react'

const get_stored_cooldown = (storageKey) => {
    try {
        const rawUntil = sessionStorage.getItem(storageKey)
        if (!rawUntil) return { until: null, remaining: 0, message: '' }

        const parsedUntil = parseInt(rawUntil, 10)
        const now = Date.now()
        if (Number.isFinite(parsedUntil) && parsedUntil > now) {
            return {
                until: parsedUntil,
                remaining: Math.ceil((parsedUntil - now) / 1000),
                message: sessionStorage.getItem(`${storageKey}_msg`) || '',
            }
        }

        // Remove expired cooldown entries so stale locks do not linger after reload.
        sessionStorage.removeItem(storageKey)
        sessionStorage.removeItem(`${storageKey}_msg`)
    } catch {
        // Ignore storage access failures in restricted environments.
    }
    return { until: null, remaining: 0, message: '' }
}

/**
 * Manages a per-endpoint HTTP 429 cooldown timer persisted in sessionStorage
 * so users still see the remaining wait time after refreshing the page.
 */
export function useRateLimitCooldown(storageKey) {
    const [rateLimitUntil, setRateLimitUntil] = useState(() => get_stored_cooldown(storageKey).until)
    const [remainingSeconds, setRemainingSeconds] = useState(() => get_stored_cooldown(storageKey).remaining)
    const [message, setMessage] = useState(() => get_stored_cooldown(storageKey).message)

    const clearRateLimit = useCallback(() => {
        setRateLimitUntil(null)
        setRemainingSeconds(0)
        setMessage('')
        try {
            sessionStorage.removeItem(storageKey)
            sessionStorage.removeItem(`${storageKey}_msg`)
        } catch {
            // Ignore storage errors.
        }
    }, [storageKey])

    const triggerRateLimit = useCallback(
        (retryAfterSeconds, customMessage) => {
            const parsedSeconds = Number(retryAfterSeconds)
            const fallbackMsg = customMessage || 'Too many requests. Please wait before trying again.'

            if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
                const waitSeconds = Math.ceil(parsedSeconds)
                const untilTimestamp = Date.now() + waitSeconds * 1000
                setRateLimitUntil(untilTimestamp)
                setRemainingSeconds(waitSeconds)
                setMessage(fallbackMsg)
                try {
                    sessionStorage.setItem(storageKey, String(untilTimestamp))
                    sessionStorage.setItem(`${storageKey}_msg`, fallbackMsg)
                } catch {
                    // Ignore storage errors.
                }
                return
            }

            // If no Retry-After duration was readable, surface the warning without permanently locking the button.
            setRateLimitUntil(null)
            setRemainingSeconds(0)
            setMessage(fallbackMsg)
            try {
                sessionStorage.removeItem(storageKey)
                sessionStorage.removeItem(`${storageKey}_msg`)
            } catch {
                // Ignore storage errors.
            }
        },
        [storageKey]
    )

    useEffect(() => {
        if (!rateLimitUntil) return undefined

        const intervalId = setInterval(() => {
            const nextRemaining = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000))
            if (nextRemaining <= 0) {
                clearInterval(intervalId)
                clearRateLimit()
                return
            }
            setRemainingSeconds(nextRemaining)
        }, 1000)

        return () => clearInterval(intervalId)
    }, [rateLimitUntil, clearRateLimit])

    return {
        isLimited: Boolean(rateLimitUntil && remainingSeconds > 0),
        remainingSeconds,
        message,
        triggerRateLimit,
        clearRateLimit,
    }
}
