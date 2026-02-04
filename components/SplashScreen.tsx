
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // Aumentata durata di 0.5s (3000->3500, 3700->4200)
        const fadeTimer = setTimeout(() => setOpacity(0), 3500);
        const finishTimer = setTimeout(() => onFinish(), 4200);
        return () => { clearTimeout(fadeTimer); clearTimeout(finishTimer); };
    }, [onFinish]);

    return (
        <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center transition-opacity duration-700 ease-in-out bg-[#02040a]"
            style={{ opacity }}
        >
            {/* Layout cambiato in flex-col justify-end per mettere il testo in basso sopra il gradiente scuro */}
            <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-end pb-20">
                
                {/* 1. Background Layer (Splash Cover) */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[#02040a]"></div>
                    
                    {/* Splash Image Cover - Full Opacity */}
                    <img 
                        src="/splash.png" 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-100"
                        onError={(e) => e.currentTarget.style.display = 'none'} 
                    />
                    
                    {/* Gradient Overlay: Scuro in basso per il testo, trasparente in alto per l'immagine */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/80 to-transparent"></div>
                    
                    {/* Ambient Glow */}
                    <div className="absolute w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-screen"></div>
                </div>

                {/* 2. Text Layer (Logo rimosso come richiesto) */}
                <div className="relative z-30 text-center px-4">
                    <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase drop-shadow-2xl mb-6">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Run</span> Coach AI
                    </h1>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 text-center">
                        <span className="text-[10px] sm:text-sm font-black text-cyan-400 uppercase tracking-[0.15em] opacity-0 animate-slide-up-1 whitespace-nowrap">Analizza il passato</span>
                        <span className="hidden sm:block w-1 h-1 bg-slate-400 rounded-full opacity-0 animate-slide-up-1"></span>
                        <span className="text-[10px] sm:text-sm font-black text-white uppercase tracking-[0.15em] opacity-0 animate-slide-up-2 whitespace-nowrap">Simula il futuro</span>
                        <span className="hidden sm:block w-1 h-1 bg-slate-400 rounded-full opacity-0 animate-slide-up-2"></span>
                        <span className="text-[10px] sm:text-sm font-black text-purple-400 uppercase tracking-[0.15em] opacity-0 animate-slide-up-3 whitespace-nowrap">Migliora oggi</span>
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
