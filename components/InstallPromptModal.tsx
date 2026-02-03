
import React, { useState } from 'react';

interface InstallPromptModalProps {
    onInstall: () => void;
    onIgnore: () => void;
    isIOS: boolean;
}

const InstallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-cyan-400 mb-4">
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mx-1 text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const PlusSquareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 inline-block mx-1 text-gray-400">
        <path fillRule="evenodd" d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm2 6a1 1 0 0 1 1-1h2V7a1 1 0 1 1 2 0v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H7a1 1 0 0 1-1-1Z" clipRule="evenodd" />
    </svg>
);

const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ onInstall, onIgnore, isIOS }) => {
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    return (
        <div className="fixed inset-0 z-[20000] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center mb-4 sm:mb-0">
                {!showIOSInstructions ? (
                    <>
                        <div className="flex justify-center animate-bounce-subtle">
                            <InstallIcon />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Installa l'App</h2>
                        <p className="text-sm text-slate-300 mb-6">
                            Per un'esperienza migliore a tutto schermo e prestazioni ottimali, installa RunCoachAI sul tuo dispositivo.
                        </p>
                        
                        <div className="space-y-3">
                            {isIOS ? (
                                <button 
                                    onClick={() => setShowIOSInstructions(true)}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
                                >
                                    Installa su iPhone
                                </button>
                            ) : (
                                <button 
                                    onClick={onInstall}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
                                >
                                    Installa Ora
                                </button>
                            )}
                            
                            <button 
                                onClick={onIgnore}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-all"
                            >
                                Continua su Browser
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-left animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setShowIOSInstructions(false)} className="text-slate-400 hover:text-white">&larr;</button>
                            <h3 className="font-bold text-white uppercase text-sm">Istruzioni iOS</h3>
                        </div>
                        <ol className="text-sm text-slate-300 space-y-4 list-decimal list-inside bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <li>Tocca il pulsante <span className="font-bold text-white">Condividi</span> <ShareIcon /> nella barra in basso di Safari.</li>
                            <li>Scorri verso il basso e seleziona <span className="font-bold text-white">Aggiungi alla schermata Home</span> <PlusSquareIcon />.</li>
                            <li>Tocca <span className="font-bold text-white">Aggiungi</span> in alto a destra.</li>
                        </ol>
                        <button 
                            onClick={onIgnore}
                            className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition-all"
                        >
                            Chiudi
                        </button>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-subtle { animation: bounce-subtle 2s infinite ease-in-out; }
            `}</style>
        </div>
    );
};

export default InstallPromptModal;
