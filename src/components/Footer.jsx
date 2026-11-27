import { useState } from 'react'
import {
    Check,
    Coffee,
    Copy,
    EnvelopeSimple,
    GithubLogo,
    Globe,
    InstagramLogo,
    LinkedinLogo,
    XLogo,
} from '@phosphor-icons/react'
import Logo from './Logo'
import { projectName, adminEmail, socialLinks } from '../config'
import { copy_text_to_clipboard } from '../utils/timeUtils'

/**
 * Light-themed studio footer matching the main workspace canvas.
 */
function Footer() {
    const [copied, setCopied] = useState(false)

    const handle_copy_email = async () => {
        const success = await copy_text_to_clipboard(adminEmail)
        if (success) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <footer className="bg-white border-t border-zinc-200 text-zinc-600 mt-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-between">
                    <div className="space-y-3">
                        <Logo />
                        <p className="text-sm text-zinc-600 leading-relaxed max-w-xs">
                            Fast YouTube clip extraction and playback speed editing in one place.
                        </p>
                    </div>

                    <div className="space-y-3 md:justify-self-end w-full max-w-xs">
                        <h3 className="text-sm font-semibold text-zinc-950">Contact</h3>
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2.5 bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl text-zinc-700">
                                <EnvelopeSimple size={17} weight="bold" aria-hidden="true" className="text-zinc-500 shrink-0" />
                                <span className="text-xs sm:text-sm truncate flex-1">{adminEmail}</span>
                                <button
                                    type="button"
                                    onClick={handle_copy_email}
                                    aria-label={copied ? 'Email copied' : 'Copy contact email'}
                                    className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70 transition-colors shrink-0"
                                >
                                    {copied ? (
                                        <Check size={15} weight="bold" aria-hidden="true" className="text-emerald-600" />
                                    ) : (
                                        <Copy size={15} weight="bold" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                            <span role="status" className="sr-only">
                                {copied ? 'Contact email copied to clipboard.' : ''}
                            </span>

                            <a
                                href="https://buymeacoffee.com/divyanshu_soni"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-between gap-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 border border-zinc-200 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                            >
                                <span>Buy me a coffee</span>
                                <Coffee size={18} weight="bold" aria-hidden="true" className="text-amber-600" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-200 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
                    <p>&copy; {new Date().getFullYear()} {projectName}. All rights reserved.</p>
                    <div className="flex items-center gap-2">
                        <a
                            href={socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                        >
                            <LinkedinLogo size={18} weight="regular" aria-hidden="true" />
                        </a>
                        <a
                            href={socialLinks.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Twitter"
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                        >
                            <XLogo size={18} weight="regular" aria-hidden="true" />
                        </a>
                        <a
                            href={socialLinks.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                        >
                            <InstagramLogo size={18} weight="regular" aria-hidden="true" />
                        </a>
                        <a
                            href={socialLinks.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                        >
                            <GithubLogo size={18} weight="regular" aria-hidden="true" />
                        </a>
                        <a
                            href={socialLinks.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Website"
                            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                        >
                            <Globe size={18} weight="regular" aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
