import { Link } from 'react-router-dom'
import Logo from './Logo'

/**
 * Minimal top bar anchored by the brand mark.
 */
function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 backdrop-blur-md border-b border-zinc-200">
            <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
                <Link to="/" className="rounded-xl shrink-0">
                    <Logo />
                </Link>
            </div>
        </header>
    )
}

export default Header
