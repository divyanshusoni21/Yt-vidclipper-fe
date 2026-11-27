import { Scissors } from '@phosphor-icons/react'
import { projectName } from '../config'

/**
 * Brand mark combining a Cobalt Blue icon badge with the product wordmark.
 */
const Logo = ({ className = '' }) => {
    return (
        <div className={`inline-flex items-center gap-2.5 ${className}`}>
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Scissors size={18} weight="bold" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-zinc-950 whitespace-nowrap">
                {projectName}
            </span>
        </div>
    )
}

export default Logo
