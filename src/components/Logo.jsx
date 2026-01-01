import { projectName } from '../config';

const Logo = ({ className = "" }) => {
    return (
        <div className={`flex items-center space-x-2 group ${className}`}>
            <div className="relative flex items-center justify-center w-10 h-10 group-hover:scale-105 transition-transform duration-300">
                <svg
                    viewBox="0 0 24 24"
                    className="w-full h-full drop-shadow-md"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <rect x="2" y="2" width="20" height="20" rx="6" fill="#2563eb" />
                    <path
                        d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"
                        stroke="white"
                        strokeWidth="1"
                    />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white" />
                </svg>
                <div className="absolute -top-1 -right-1 flex">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white"></span>
                    </span>
                </div>
            </div>
            <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                {projectName}
            </span>
        </div>
    );
};

export default Logo;
