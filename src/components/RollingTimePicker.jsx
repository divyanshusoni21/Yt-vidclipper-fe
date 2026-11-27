import { useEffect, useId, useRef, useState } from 'react'
import { parse_flexible_timestamp } from '../utils/timeUtils'

const RollingColumn = ({ range, value, onChange, label, ariaLabel }) => {
    const scrollRef = useRef(null)
    const itemHeight = 32
    const isScrollingRef = useRef(false)
    const scrollTimeoutRef = useRef(null)

    const handle_scroll = () => {
        if (scrollRef.current && !isScrollingRef.current) {
            const scrollTop = scrollRef.current.scrollTop
            const index = Math.round(scrollTop / itemHeight)
            if (range[index] !== undefined && range[index] !== value) {
                onChange(range[index])
            }
        }
    }

    const handle_item_click = (num) => {
        if (!scrollRef.current) return
        const index = range.indexOf(num)
        if (index === -1) return

        isScrollingRef.current = true
        scrollRef.current.scrollTo({
            top: index * itemHeight,
            behavior: 'smooth',
        })
        onChange(num)

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false
        }, 300)
    }

    useEffect(() => {
        if (scrollRef.current) {
            const index = range.indexOf(parseInt(value, 10))
            if (index !== -1) {
                scrollRef.current.scrollTop = index * itemHeight
            }
        }
    }, [value, range])

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        }
    }, [])

    return (
        <div className="flex flex-col items-center min-w-0 max-w-full gap-1">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-500 uppercase">
                {label}
            </span>
            <div className="relative">
                {/* Active row indicator aligned to the 32px center slot inside the 96px wheel */}
                <div
                    aria-hidden="true"
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[32px] pointer-events-none z-10 rounded-lg bg-white border border-blue-200 ring-1 ring-blue-600/15"
                />

                {/* Top and bottom fade masks matching the zinc-50 picker surface */}
                <div
                    aria-hidden="true"
                    className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-20 rounded-t-lg"
                    style={{
                        background:
                            'linear-gradient(to bottom, rgba(250, 250, 250, 0.96) 0%, rgba(250, 250, 250, 0) 100%)',
                    }}
                />
                <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-20 rounded-b-lg"
                    style={{
                        background:
                            'linear-gradient(to top, rgba(250, 250, 250, 0.96) 0%, rgba(250, 250, 250, 0) 100%)',
                    }}
                />

                <div
                    ref={scrollRef}
                    role="listbox"
                    aria-label={ariaLabel || label}
                    onScroll={handle_scroll}
                    className="h-24 w-12 overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative rounded-lg bg-zinc-50 scroll-smooth"
                >
                    {/* Spacer equals 1 itemHeight so index 0 centers cleanly in the 3*itemHeight viewport */}
                    <div style={{ height: itemHeight }} className="shrink-0" aria-hidden="true" />

                    {range.map((num) => {
                        const isSelected = parseInt(value, 10) === num
                        const padded = num.toString().padStart(2, '0')
                        return (
                            <button
                                key={num}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handle_item_click(num)}
                                className={`relative z-10 w-full h-[32px] flex items-center justify-center snap-center font-mono tabular-nums transition-colors select-none ${
                                    isSelected
                                        ? 'font-bold text-base text-zinc-950'
                                        : 'text-xs text-zinc-400 hover:text-zinc-700'
                                }`}
                            >
                                {padded}
                            </button>
                        )
                    })}

                    <div style={{ height: itemHeight }} className="shrink-0" aria-hidden="true" />
                </div>
            </div>
        </div>
    )
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const SECONDS = Array.from({ length: 60 }, (_, i) => i)

/**
 * Compact timestamp picker combining a direct text input ("HH:MM:SS", "MM:SS", or seconds)
 * with synchronized scroll-snapping HR/MIN/SEC wheels.
 */
const RollingTimePicker = ({ value, onChange, ariaPrefix = 'Time', label }) => {
    const inputId = useId()
    const [isFocused, setIsFocused] = useState(false)
    const [draftValue, setDraftValue] = useState(value)

    const timeParts = value ? value.split(':') : ['00', '00', '00']
    const h = parseInt(timeParts[0], 10) || 0
    const m = parseInt(timeParts[1] || '0', 10) || 0
    const s = parseInt(timeParts[2] || '0', 10) || 0

    const update_time = (type, val) => {
        let newH = h
        let newM = m
        let newS = s
        if (type === 'h') newH = val
        if (type === 'm') newM = val
        if (type === 's') newS = val

        onChange(
            `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}:${newS.toString().padStart(2, '0')}`
        )
    }

    const commit_draft = () => {
        const parsed = parse_flexible_timestamp(draftValue)
        if (parsed && parsed !== value) {
            onChange(parsed)
        }
    }

    const handle_input_change = (e) => {
        const next = e.target.value
        setDraftValue(next)
        // Live-sync wheels immediately once a full HH:MM:SS pattern is entered without interrupting typing.
        if (/^\d{2}:\d{2}:\d{2}$/.test(next)) {
            const parsed = parse_flexible_timestamp(next)
            if (parsed && parsed !== value) {
                onChange(parsed)
            }
        }
    }

    return (
        <div className="w-full min-w-0 flex flex-col items-center gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="w-full space-y-1">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    type="text"
                    inputMode="numeric"
                    value={isFocused ? draftValue : value}
                    onFocus={() => {
                        setDraftValue(value)
                        setIsFocused(true)
                    }}
                    onChange={handle_input_change}
                    onBlur={() => {
                        commit_draft()
                        setIsFocused(false)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            commit_draft()
                            e.currentTarget.blur()
                        }
                    }}
                    placeholder="00:00:00"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-label={label ? undefined : `${ariaPrefix} (HH:MM:SS)`}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-zinc-200 focus:border-blue-500 font-mono tabular-nums text-sm font-semibold text-zinc-950 text-center tracking-wider outline-none transition-colors"
                />
            </div>

            <div className="inline-flex items-center justify-center gap-1 max-w-full">
                <RollingColumn
                    range={HOURS}
                    value={h}
                    onChange={(v) => update_time('h', v)}
                    label="HR"
                    ariaLabel={`${ariaPrefix} hours`}
                />
                <span className="font-mono font-bold text-zinc-400 pt-4 select-none" aria-hidden="true">
                    :
                </span>
                <RollingColumn
                    range={MINUTES}
                    value={m}
                    onChange={(v) => update_time('m', v)}
                    label="MIN"
                    ariaLabel={`${ariaPrefix} minutes`}
                />
                <span className="font-mono font-bold text-zinc-400 pt-4 select-none" aria-hidden="true">
                    :
                </span>
                <RollingColumn
                    range={SECONDS}
                    value={s}
                    onChange={(v) => update_time('s', v)}
                    label="SEC"
                    ariaLabel={`${ariaPrefix} seconds`}
                />
            </div>
        </div>
    )
}

export default RollingTimePicker
