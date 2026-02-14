import { useEffect, useRef, useState } from 'react'

const RollingColumn = ({ range, value, onChange, label }) => {
    const scrollRef = useRef(null)
    const itemHeight = 36 // Compact height
    const isScrollingRef = useRef(false)

    // Handle scroll to snap to nearest item
    const handleScroll = () => {
        if (scrollRef.current && !isScrollingRef.current) {
            const scrollTop = scrollRef.current.scrollTop
            const index = Math.round(scrollTop / itemHeight)
            if (range[index] !== undefined && range[index] !== value) {
                onChange(range[index])
            }
        }
    }

    // Handle click on item to scroll to it
    const handleItemClick = (num) => {
        if (scrollRef.current) {
            const index = range.indexOf(num)
            if (index !== -1) {
                isScrollingRef.current = true
                scrollRef.current.scrollTo({
                    top: index * itemHeight,
                    behavior: 'smooth'
                })
                onChange(num)
                // Reset the flag after scroll completes
                setTimeout(() => {
                    isScrollingRef.current = false
                }, 300)
            }
        }
    }

    // Initial scroll position
    useEffect(() => {
        if (scrollRef.current) {
            const index = range.indexOf(parseInt(value))
            if (index !== -1) {
                scrollRef.current.scrollTop = index * itemHeight
            }
        }
    }, [value, range])

    return (
        <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-wider bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase">
                {label}
            </span>
            <div className="relative">
                {/* Selection highlight overlay */}
                <div
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[36px] pointer-events-none z-10 rounded-lg"
                    style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                        boxShadow: '0 0 15px rgba(139, 92, 246, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.4)',
                        border: '1.5px solid rgba(139, 92, 246, 0.3)'
                    }}
                />

                {/* Top fade overlay */}
                <div
                    className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-20 rounded-t-lg"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%)'
                    }}
                />

                {/* Bottom fade overlay */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none z-20 rounded-b-lg"
                    style={{
                        background: 'linear-gradient(to top, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%)'
                    }}
                />

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="h-32 w-16 overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative rounded-lg"
                    style={{
                        scrollBehavior: 'smooth',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.9) 100%)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: 'inset 0 1px 6px rgba(0, 0, 0, 0.06)'
                    }}
                >
                    {/* Spacer top */}
                    <div style={{ height: itemHeight * 1.5 }} className="flex-shrink-0"></div>

                    {range.map((num) => {
                        const isSelected = parseInt(value) === num
                        return (
                            <div
                                key={num}
                                className={`h-[36px] flex items-center justify-center snap-center transition-all duration-300 cursor-pointer select-none ${isSelected
                                    ? 'font-bold text-xl scale-105'
                                    : 'text-sm opacity-40 hover:opacity-70'
                                    }`}
                                style={{
                                    background: isSelected
                                        ? 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)'
                                        : 'transparent',
                                    WebkitBackgroundClip: isSelected ? 'text' : 'initial',
                                    WebkitTextFillColor: isSelected ? 'transparent' : 'inherit',
                                    color: isSelected ? 'transparent' : '#9CA3AF',
                                    textShadow: isSelected ? '0 1px 8px rgba(139, 92, 246, 0.3)' : 'none',
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                }}
                                onClick={() => handleItemClick(num)}
                            >
                                {num.toString().padStart(2, '0')}
                            </div>
                        )
                    })}

                    {/* Spacer bottom */}
                    <div style={{ height: itemHeight * 1.5 }} className="flex-shrink-0"></div>
                </div>
            </div>
        </div>
    )
}

const RollingTimePicker = ({ value, onChange }) => {
    // Parse HH:MM:SS safely
    const timeParts = value ? value.split(':') : ['00', '00', '00']
    const h = parseInt(timeParts[0]) || 0
    const m = parseInt(timeParts[1] || '0') || 0
    const s = parseInt(timeParts[2] || '0') || 0

    // Ranges
    const hours = Array.from({ length: 24 }, (_, i) => i) // 0-23
    const minutes = Array.from({ length: 60 }, (_, i) => i) // 0-59
    const seconds = Array.from({ length: 60 }, (_, i) => i) // 0-59

    const updateTime = (type, val) => {
        let newH = h, newM = m, newS = s
        if (type === 'h') newH = val
        if (type === 'm') newM = val
        if (type === 's') newS = val

        onChange(`${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}:${newS.toString().padStart(2, '0')}`)
    }

    return (
        <div className="relative flex flex-col items-center">
            <div
                className="inline-flex items-center gap-2 p-4 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 6px 24px rgba(139, 92, 246, 0.12), 0 1px 6px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.1)'
                }}
            >
                {/* Animated gradient background */}
                <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',
                        backgroundSize: '200% 200%',
                        animation: 'gradient 8s ease infinite'
                    }}
                />

                <style>{`
                    @keyframes gradient {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                    
                    .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>

                <RollingColumn range={hours} value={h} onChange={(v) => updateTime('h', v)} label="HR" />
                <span
                    className="text-2xl font-bold pt-4 select-none"
                    style={{
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 1px 8px rgba(139, 92, 246, 0.3)'
                    }}
                >
                    :
                </span>
                <RollingColumn range={minutes} value={m} onChange={(v) => updateTime('m', v)} label="MIN" />
                <span
                    className="text-2xl font-bold pt-4 select-none"
                    style={{
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 1px 8px rgba(139, 92, 246, 0.3)'
                    }}
                >
                    :
                </span>
                <RollingColumn range={seconds} value={s} onChange={(v) => updateTime('s', v)} label="SEC" />

                {/* Bottom line indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-300/30 to-transparent" />
            </div>
        </div>
    )
}

export default RollingTimePicker
