
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const LogoSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" opacity="0.2" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="url(#logoGradient)" strokeWidth="4" />
        <path d="M35 50 L45 70 L70 30" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="70" cy="30" r="4" fill="white" />
    </svg>
);

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        const fadeTimer = setTimeout(() => setOpacity(0), 3000);
        const finishTimer = setTimeout(() => onFinish(), 3700);
        return () => { clearTimeout(fadeTimer); clearTimeout(finishTimer); };
    }, [onFinish]);

    return (
        <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center transition-opacity duration-700 ease-in-out bg-slate-950"
            style={{ opacity }}
        >
            <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center">
                
                {/* 1. Background Layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900 z-0">
                    <div className="absolute w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                {/* 2. Logo Layer */}
                <div className="relative z-20 w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center mb-8 animate-fade-in">
                    <LogoSVG />
                </div>
                
                {/* 3. Text Layer */}
                <div className="relative z-30 text-center">
                    <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase drop-shadow-2xl mb-6">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Run</span> Coach AI
                    </h1>
                    <div className="flex justify-center items-center gap-4 sm:gap-8">
                        <span className="text-xs sm:text-sm font-black text-cyan-400 uppercase tracking-[0.2em] opacity-0 animate-slide-up-1">Analizza</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full opacity-0 animate-slide-up-1"></span>
                        <span className="text-xs sm:text-sm font-black text-white uppercase tracking-[0.2em] opacity-0 animate-slide-up-2">Simula</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full opacity-0 animate-slide-up-2"></span>
                        <span className="text-xs sm:text-sm font-black text-purple-400 uppercase tracking-[0.2em] opacity-0 animate-slide-up-3">Migliora</span>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
                @keyframes slide-up-fade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up-1 { animation: slide-up-fade 0.5s ease-out 0.3s forwards; }
                .animate-slide-up-2 { animation: slide-up-fade 0.5s ease-out 0.6s forwards; }
                .animate-slide-up-3 { animation: slide-up-fade 0.5s ease-out 0.9s forwards; }
            `}</style>
        </div>
    );
};

export default SplashScreen;
