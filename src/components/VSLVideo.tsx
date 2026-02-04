import React from 'react';

interface VSLVideoProps {
    className?: string;
}

export const VSLVideo: React.FC<VSLVideoProps> = ({ className = "" }) => {
    return (
        <div className={`relative group ${className}`}>
            {/* Animated Gradient Border - Thicker and Moving around */}
            <div className="absolute -inset-[5px] bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-3xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-border-flow blur-sm"></div>

            {/* Sharp inner rim */}
            <div className="absolute -inset-[1px] bg-[#050508] rounded-[22px] z-0"></div>

            {/* Container for the video */}
            <div className="relative z-10 rounded-3xl overflow-hidden bg-black aspect-video border border-white/10 shadow-2xl">
                <iframe
                    src="https://drive.google.com/file/d/1LIGoVGBxjiWWqOPoEoM0JXIX7zlE_V65/preview"
                    width="100%"
                    height="100%"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    className="w-full h-full object-cover"
                ></iframe>
            </div>

            {/* Custom Styles for the animation */}
            <style>{`
                @keyframes border-flow {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
                .animate-border-flow {
                    background-size: 300% 300%;
                    animation: border-flow 4s ease infinite;
                }
            `}</style>
        </div>
    );
};
