import React from 'react';

interface VSLVideoProps {
    className?: string;
}

export const VSLVideo: React.FC<VSLVideoProps> = ({ className = "" }) => {
    return (
        <div className={`relative group ${className}`}>
            {/* Animated Gradient Border */}
            <div className="absolute -inset-[3px] bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 animate-gradient-xy"></div>

            {/* Container for the video */}
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border border-white/10 shadow-2xl">
                <iframe
                    src="https://drive.google.com/file/d/1itWO19wFT7-57RX9ohYhD72gVoO3xrAx/preview"
                    width="100%"
                    height="100%"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    className="w-full h-full object-cover"
                ></iframe>
            </div>

            {/* Custom Styles for the animation if not present elsewhere */}
            <style>{`
                @keyframes gradient-xy {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }
                .animate-gradient-xy {
                    background-size: 200% 200%;
                    animation: gradient-xy 6s ease infinite;
                }
            `}</style>
        </div>
    );
};
