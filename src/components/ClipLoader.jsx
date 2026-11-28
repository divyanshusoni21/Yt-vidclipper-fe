import { Play, Scissors } from '@phosphor-icons/react'

const FILMSTRIP_HALVES = [0, 1]
const FILMSTRIP_FRAMES = [0, 1, 2, 3]

/**
 * Animated Cobalt Blue scissor-on-filmstrip loader shown inside the clip
 * skeleton card while a requested clip is being generated.
 */
function ClipLoader({ ariaLabel = 'Clipping video...' }) {
    return (
        <span role="status" aria-live="polite" className="inline-flex items-center">
            <span
                aria-hidden="true"
                className="relative block h-11 w-36 shrink-0 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/90"
            >
                {/* Doubled identical halves let the -50% transform scroll loop without visible seams. */}
                <span className="clip-loader-filmstrip-track flex h-full w-max items-center">
                    {FILMSTRIP_HALVES.map((halfKey) => (
                        <span key={halfKey} className="flex h-full shrink-0 items-center">
                            {FILMSTRIP_FRAMES.map((frameKey) => (
                                <span
                                    key={frameKey}
                                    className="relative flex h-full w-9 shrink-0 items-center justify-center border-r border-blue-200/90"
                                >
                                    <span className="absolute top-1 left-1 right-1 flex justify-between">
                                        <span className="block h-[3px] w-1.5 rounded-full bg-blue-200" />
                                        <span className="block h-[3px] w-1.5 rounded-full bg-blue-200" />
                                    </span>
                                    <Play size={11} weight="fill" className="text-blue-500/80" />
                                    <span className="absolute bottom-1 left-1 right-1 flex justify-between">
                                        <span className="block h-[3px] w-1.5 rounded-full bg-blue-200" />
                                        <span className="block h-[3px] w-1.5 rounded-full bg-blue-200" />
                                    </span>
                                </span>
                            ))}
                        </span>
                    ))}
                </span>

                {/* Trailing wake dashes and bobbing Cobalt scissor gliding left to right across frames. */}
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                    <span className="clip-loader-scissor-glide inline-flex items-center gap-1">
                        <span className="flex flex-col justify-center gap-1">
                            <span className="clip-loader-ripple block h-[2px] w-3 rounded-full bg-blue-400" />
                            <span className="clip-loader-ripple clip-loader-ripple--delayed block h-[2px] w-2 rounded-full bg-blue-400" />
                        </span>
                        <span className="clip-loader-scissor-bob inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-blue-600 text-white shadow-xs">
                            <Scissors size={15} weight="bold" />
                        </span>
                    </span>
                </span>
            </span>

            <span className="sr-only">{ariaLabel}</span>
        </span>
    )
}

export default ClipLoader
