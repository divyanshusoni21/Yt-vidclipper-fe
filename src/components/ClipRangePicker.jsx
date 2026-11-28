import { useId, useRef, useState } from 'react'
import {
    format_duration,
    parse_pasted_timestamp,
    seconds_to_time,
    time_to_seconds,
} from '../utils/timeUtils'

const SEGMENTS = [
    { key: 'h', max: 23, label: 'hours' },
    { key: 'm', max: 59, label: 'minutes' },
    { key: 's', max: 59, label: 'seconds' },
]

/**
 * Splits total seconds into bounded { h, m, s } segments.
 */
const split_seconds = (totalSeconds) => {
    const safe = Math.max(0, Math.min(86399, Math.round(Number(totalSeconds) || 0)))
    return {
        h: Math.floor(safe / 3600),
        m: Math.floor((safe % 3600) / 60),
        s: safe % 60,
    }
}

/**
 * Compact three-segment (HH : MM : SS) timestamp input box supporting direct typing,
 * arrow stepping, keyboard navigation between fields, and clipboard timestamp pasting.
 */
function TimestampBox({
    label,
    value,
    maxSeconds = 0,
    onChange,
    disabled = false,
    dotClass = '',
}) {
    const labelId = useId()
    const inputRefs = {
        h: useRef(null),
        m: useRef(null),
        s: useRef(null),
    }

    // Keep an explicit draft string for the focused segment so single-digit edits stay natural.
    const [activeSegment, setActiveSegment] = useState(null)
    const [draft, setDraft] = useState('')

    const totalSec = time_to_seconds(value)
    const segmentValues = split_seconds(totalSec)
    const ceiling = maxSeconds > 0 ? Math.min(86399, Math.floor(maxSeconds)) : 86399

    const focus_segment = (targetKey, selectAll = true) => {
        const el = inputRefs[targetKey]?.current
        if (!el) return
        el.focus()
        if (selectAll) {
            requestAnimationFrame(() => el.select())
        }
    }

    const commit_parts = (nextParts) => {
        const clampedH = Math.max(0, Math.min(23, nextParts.h))
        const clampedM = Math.max(0, Math.min(59, nextParts.m))
        const clampedS = Math.max(0, Math.min(59, nextParts.s))
        const rawTotal = clampedH * 3600 + clampedM * 60 + clampedS
        const finalTotal = Math.max(0, Math.min(ceiling, rawTotal))
        onChange(seconds_to_time(finalTotal))
        return finalTotal
    }

    const handle_focus = (segKey, e) => {
        const target = e.currentTarget
        setActiveSegment(segKey)
        setDraft(String(segmentValues[segKey]).padStart(2, '0'))
        requestAnimationFrame(() => target.select())
    }

    const handle_blur = () => {
        setActiveSegment(null)
        setDraft('')
    }

    const handle_change = (segKey, maxSegVal, rawValue, segIndex) => {
        const digits = rawValue.replace(/\D/g, '').slice(0, 2)
        if (!digits) {
            setActiveSegment(segKey)
            setDraft('')
            commit_parts({ ...segmentValues, [segKey]: 0 })
            return
        }

        const parsedSeg = Math.min(maxSegVal, parseInt(digits, 10) || 0)
        const unclampedTotal =
            (segKey === 'h' ? parsedSeg : segmentValues.h) * 3600 +
            (segKey === 'm' ? parsedSeg : segmentValues.m) * 60 +
            (segKey === 's' ? parsedSeg : segmentValues.s)

        const finalTotal = commit_parts({ ...segmentValues, [segKey]: parsedSeg })
        const resultingParts = split_seconds(finalTotal)

        // When typing two digits pushes past video duration or segment max, display the clamped digits.
        const nextSeg = SEGMENTS[segIndex + 1]?.key
        if (digits.length === 2 && nextSeg) {
            focus_segment(nextSeg)
            return
        }

        setActiveSegment(segKey)
        if (digits.length === 2 && (parsedSeg !== parseInt(digits, 10) || finalTotal !== unclampedTotal)) {
            setDraft(String(resultingParts[segKey]).padStart(2, '0'))
        } else {
            setDraft(digits)
        }
    }

    const handle_key_down = (segKey, segIndex, e) => {
        if (disabled) return

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const delta = segKey === 'h' ? 3600 : segKey === 'm' ? 60 : 1
            const nextTotal =
                e.key === 'ArrowUp'
                    ? Math.min(ceiling, totalSec + delta)
                    : Math.max(0, totalSec - delta)
            onChange(seconds_to_time(nextTotal))
            const nextParts = split_seconds(nextTotal)
            setActiveSegment(segKey)
            setDraft(String(nextParts[segKey]).padStart(2, '0'))
            return
        }

        if (e.key === ':' || e.key === '.') {
            e.preventDefault()
            const nextSeg = SEGMENTS[segIndex + 1]?.key
            if (nextSeg) focus_segment(nextSeg)
            return
        }

        const inputEl = e.currentTarget
        if (
            e.key === 'ArrowRight' &&
            inputEl.selectionStart === inputEl.value.length &&
            inputEl.selectionEnd === inputEl.value.length
        ) {
            const nextSeg = SEGMENTS[segIndex + 1]?.key
            if (nextSeg) {
                e.preventDefault()
                focus_segment(nextSeg)
            }
            return
        }

        if (e.key === 'ArrowLeft' && inputEl.selectionStart === 0 && inputEl.selectionEnd === 0) {
            const prevSeg = SEGMENTS[segIndex - 1]?.key
            if (prevSeg) {
                e.preventDefault()
                focus_segment(prevSeg)
            }
            return
        }

        if (e.key === 'Backspace' && inputEl.value === '') {
            const prevSeg = SEGMENTS[segIndex - 1]?.key
            if (prevSeg) {
                e.preventDefault()
                focus_segment(prevSeg)
            }
        }
    }

    const handle_paste = (e) => {
        if (disabled) return
        const pasted = e.clipboardData?.getData('text')
        const parsed = parse_pasted_timestamp(pasted)
        if (parsed === null) return

        e.preventDefault()
        const clamped = Math.max(0, Math.min(ceiling, parsed))
        onChange(seconds_to_time(clamped))
        setActiveSegment(null)
        setDraft('')
    }

    return (
        <div className="space-y-1.5 min-w-0">
            <span
                id={labelId}
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
                {dotClass && <span aria-hidden="true" className={`w-2 h-2 rounded-full ${dotClass}`} />}
                {label}
            </span>

            <div
                role="group"
                aria-labelledby={labelId}
                className={`flex items-center justify-center gap-0.5 sm:gap-1.5 min-h-[48px] px-2 sm:px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 transition-colors focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-600/20 ${
                    disabled ? 'opacity-60 cursor-not-allowed' : ''
                }`}
            >
                {SEGMENTS.map((seg, idx) => {
                    const displayValue =
                        activeSegment === seg.key
                            ? draft
                            : String(segmentValues[seg.key]).padStart(2, '0')
                    return (
                        <div key={seg.key} className="flex items-center gap-0.5 sm:gap-1.5">
                            {idx > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="font-mono font-semibold text-sm sm:text-base text-zinc-400 select-none"
                                >
                                    :
                                </span>
                            )}
                            <input
                                ref={inputRefs[seg.key]}
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                disabled={disabled}
                                value={displayValue}
                                aria-label={`${label} ${seg.label}`}
                                onFocus={(e) => handle_focus(seg.key, e)}
                                onBlur={handle_blur}
                                onChange={(e) =>
                                    handle_change(seg.key, seg.max, e.target.value, idx)
                                }
                                onKeyDown={(e) => handle_key_down(seg.key, idx, e)}
                                onPaste={handle_paste}
                                className="w-7 sm:w-8 py-0.5 text-center font-mono tabular-nums text-base sm:text-lg font-medium text-zinc-900 bg-transparent rounded-md border-0 outline-none focus-visible:outline-none focus:bg-blue-50 focus:text-blue-700 disabled:cursor-not-allowed"
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/**
 * Paired start/end HH:MM:SS timestamp inputs synced bidirectionally with a Cobalt Blue
 * dual-thumb range slider.
 */
function ClipRangePicker({
    startTime,
    endTime,
    maxDuration = 0,
    disabled = false,
    onStartChange,
    onEndChange,
}) {
    // Remember the last moved handle so overlapping handles at the right edge stay separable.
    const [activeThumb, setActiveThumb] = useState('end')

    const startSec = time_to_seconds(startTime)
    const endSec = time_to_seconds(endTime)

    const sliderMax =
        maxDuration > 0
            ? Math.max(1, Math.floor(maxDuration))
            : Math.max(300, startSec, endSec)

    const clampedStart = Math.max(0, Math.min(sliderMax, startSec))
    const clampedEnd = Math.max(0, Math.min(sliderMax, endSec))

    // Guard against inverted widths if the user momentarily types a start value past end time.
    const fillStart = Math.min(clampedStart, clampedEnd)
    const fillEnd = Math.max(clampedStart, clampedEnd)
    const leftPct = (fillStart / sliderMax) * 100
    const rightPct = (fillEnd / sliderMax) * 100
    const startThumbPct = (clampedStart / sliderMax) * 100
    const startOnTop = activeThumb === 'start' || startThumbPct > 95

    const handle_start_slider_change = (e) => {
        const maxAllowedStart = clampedEnd > 0 ? clampedEnd - 1 : 0
        const nextStart = Math.max(0, Math.min(Number(e.target.value), maxAllowedStart))
        setActiveThumb('start')
        onStartChange(seconds_to_time(nextStart))
    }

    const handle_end_slider_change = (e) => {
        const minAllowedEnd = Math.min(sliderMax, clampedStart + 1)
        const nextEnd = Math.min(sliderMax, Math.max(Number(e.target.value), minAllowedEnd))
        setActiveThumb('end')
        onEndChange(seconds_to_time(nextEnd))
    }

    const handle_track_pointer_down = (e) => {
        if (disabled || e.target.tagName === 'INPUT') return

        const rect = e.currentTarget.getBoundingClientRect()
        if (!rect.width) return

        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const clickedSec = Math.round(ratio * sliderMax)

        const distStart = Math.abs(clickedSec - clampedStart)
        const distEnd = Math.abs(clickedSec - clampedEnd)

        if (distStart < distEnd || (distStart === distEnd && clickedSec < clampedStart)) {
            const maxAllowedStart = clampedEnd > 0 ? clampedEnd - 1 : 0
            const nextStart = Math.max(0, Math.min(clickedSec, maxAllowedStart))
            setActiveThumb('start')
            onStartChange(seconds_to_time(nextStart))
        } else {
            const minAllowedEnd = Math.min(sliderMax, clampedStart + 1)
            const nextEnd = Math.min(sliderMax, Math.max(clickedSec, minAllowedEnd))
            setActiveThumb('end')
            onEndChange(seconds_to_time(nextEnd))
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <TimestampBox
                    label="Start Time"
                    value={startTime}
                    maxSeconds={maxDuration}
                    disabled={disabled}
                    dotClass="bg-blue-600"
                    onChange={onStartChange}
                />
                <TimestampBox
                    label="End Time"
                    value={endTime}
                    maxSeconds={maxDuration}
                    disabled={disabled}
                    dotClass="bg-blue-700"
                    onChange={onEndChange}
                />
            </div>

            <div className="pt-2 pb-1 space-y-1.5">
                <div
                    onPointerDown={handle_track_pointer_down}
                    className={`relative h-7 flex items-center select-none touch-none ${
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                >
                    <div className="w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden relative">
                        <div
                            className="absolute inset-y-0 bg-blue-600 rounded-full"
                            style={{
                                left: `${leftPct}%`,
                                width: `${Math.max(0, rightPct - leftPct)}%`,
                            }}
                        />
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={sliderMax}
                        step={1}
                        disabled={disabled}
                        value={clampedStart}
                        aria-label="Clip start time"
                        aria-valuetext={startTime}
                        onPointerDown={() => setActiveThumb('start')}
                        onFocus={() => setActiveThumb('start')}
                        onChange={handle_start_slider_change}
                        className={`dual-range-input dual-range-input--start absolute inset-0 w-full h-7 m-0 ${
                            startOnTop ? 'z-30' : 'z-20'
                        }`}
                    />

                    <input
                        type="range"
                        min={0}
                        max={sliderMax}
                        step={1}
                        disabled={disabled}
                        value={clampedEnd}
                        aria-label="Clip end time"
                        aria-valuetext={endTime}
                        onPointerDown={() => setActiveThumb('end')}
                        onFocus={() => setActiveThumb('end')}
                        onChange={handle_end_slider_change}
                        className={`dual-range-input dual-range-input--end absolute inset-0 w-full h-7 m-0 ${
                            startOnTop ? 'z-20' : 'z-30'
                        }`}
                    />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                    <span>0:00</span>
                    <span>{format_duration(sliderMax)}</span>
                </div>
            </div>
        </div>
    )
}

export default ClipRangePicker
