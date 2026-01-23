
import React from 'react';
import { Commentary } from '../types';

interface LiveCommentaryProps {
    messages: Commentary[];
    isLoading: boolean;
}

const LiveCommentary: React.FC<LiveCommentaryProps> = ({ messages, isLoading }) => {
    // Only show the very last message to keep it clean like subtitles
    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    return (
        <div className="absolute bottom-28 sm:bottom-24 left-0 right-0 flex justify-center z-[1500] pointer-events-none px-4">
            <div className="max-w-3xl text-center">
                {isLoading && (
                    <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 mb-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                        <span className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest">AI Commentator</span>
                    </div>
                )}
                
                {latestMessage && (
                    <div className="animate-slide-up">
                        <p className="text-lg sm:text-2xl font-black text-white italic tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight bg-black/20 backdrop-blur-md px-6 py-2 rounded-2xl inline-block border border-white/10 shadow-2xl">
                            "{latestMessage.text}"
                        </p>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes slide-up { 
                    from { opacity: 0; transform: translateY(20px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default LiveCommentary;
