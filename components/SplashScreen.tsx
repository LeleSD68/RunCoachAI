
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [opacity, setOpacity] = useState(1);
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        // Inizia la dissolvenza (fade-out) dell'intero componente dopo 3.5 secondi
        const fadeTimer = setTimeout(() => {
            setOpacity(0);
        }, 3500);

        // Smonta il componente dopo 4.2 secondi
        const finishTimer = setTimeout(() => {
            onFinish();
        }, 4200);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center transition-opacity duration-700 ease-in-out bg-slate-950"
            style={{ opacity }}
        >
            {/* Main Container */}
            <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center">
                
                {/* 1. LAYER SFONDO (Livello inferiore z-10) */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900 z-0">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    {/* Cerchio pulsante dietro al logo (ridotto) */}
                    <div className="absolute w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                {/* 2. LAYER IMMAGINE (Centrale) */}
                {!imageError && (
                    <div className="relative z-20 w-full h-[55%] flex items-center justify-center p-12 md:p-0">
                        <img 
                            src="/splash.png" 
                            alt="Run Coach AI" 
                            className={`max-w-full max-h-full object-contain drop-shadow-2xl transition-opacity duration-1000 ease-out ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => {
                                setImageError(true);
                                setImageLoaded(true); // Proceed with animations even if image fails
                            }}
                        />
                    </div>
                )}

                {/* Fallback testo se immagine fallisce */}
                {imageError && (
                    <div className="relative z-20 text-center animate-fade-in mb-24 px-4">
                        <div className="mb-4 text-6xl">🏃</div>
                        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase drop-shadow-2xl">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Run</span> Coach AI
                        </h1>
                    </div>
                )}
                
                {/* 3. LAYER TESTO SEQUENZIALE (Posizionato all'80% circa) */}
                {imageLoaded && (
                    <div className="absolute top-[80%] w-full flex justify-center items-center z-30 gap-3 sm:gap-8 pointer-events-none">
                        <span className="text-xs sm:text-xl font-black text-cyan-400 uppercase tracking-[0.2em] opacity-0 animate-slide-up-1">
                            Analizza
                        </span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full opacity-0 animate-slide-up-1"></span>
                        <span className="text-xs sm:text-xl font-black text-white uppercase tracking-[0.2em] opacity-0 animate-slide-up-2">
                            Simula
                        </span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full opacity-0 animate-slide-up-2"></span>
                        <span className="text-xs sm:text-xl font-black text-purple-400 uppercase tracking-[0.2em] opacity-0 animate-slide-up-3">
                            Migliora
                        </span>
                    </div>
                )}
                
                {/* 4. Overlay Gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-40 pointer-events-none z-10"></div>
            </div>
            
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                
                @keyframes slide-up-fade {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Delay timing: Immagine appare subito, poi parole in sequenza */
                .animate-slide-up-1 {
                    animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
                }
                .animate-slide-up-2 {
                    animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.9s forwards;
                }
                .animate-slide-up-3 {
                    animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.4s forwards;
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
