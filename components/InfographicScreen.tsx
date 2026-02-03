
import React from 'react';

interface InfographicScreenProps {
    onNext: () => void;
    isLoading: boolean;
}

const InfographicScreen: React.FC<InfographicScreenProps> = ({ onNext, isLoading }) => {
    return (
        <div className="fixed inset-0 z-[50000] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            {/* Immagine per Mobile Verticale (Portrait) */}
            <img 
                src="/infografica v.png" 
                alt="Infografica Verticale" 
                className="absolute inset-0 w-full h-full object-contain p-4 pb-32 block md:hidden landscape:hidden"
            />

            {/* Immagine per Desktop e Mobile Orizzontale (Landscape) */}
            <img 
                src="/infografica oriz.png" 
                alt="Infografica Orizzontale" 
                className="absolute inset-0 w-full h-full object-contain p-4 pb-32 md:p-8 md:pb-32 hidden md:block landscape:block"
            />

            {/* Overlay Gradient per rendere il bottone leggibile */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none"></div>

            {/* Controlli in basso */}
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center justify-center gap-4 z-10 px-4">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-2 animate-fade-in">
                        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                        <span className="text-white text-xs font-black uppercase tracking-widest drop-shadow-md">Caricamento dati...</span>
                    </div>
                ) : (
                    <button 
                        onClick={onNext}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-sm py-4 px-12 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.5)] transition-all transform hover:scale-105 active:scale-95 animate-bounce-subtle border border-cyan-400/50"
                    >
                        Avanti &rarr;
                    </button>
                )}
            </div>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default InfographicScreen;
