
import React from 'react';

interface AuthSelectionModalProps {
    onGuest: () => void;
    onLogin: () => void;
}

const LogoIcon = () => (
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-2xl border border-white/10 mb-6 p-3 animate-float">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
    </div>
);

const AuthSelectionModal: React.FC<AuthSelectionModalProps> = ({ onGuest, onLogin }) => {
    return (
        <div className="fixed inset-0 bg-slate-950 z-[9000] overflow-y-auto animate-fade-in">
            <div className="min-h-full w-full flex items-center justify-center p-6">
                {/* Background Effects */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen"></div>
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen"></div>
                </div>

                <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center">
                    <LogoIcon />
                    
                    <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter mb-2">
                        RunCoach <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">AI</span>
                    </h1>
                    
                    <h2 className="text-xl md:text-2xl font-bold text-slate-200 mb-6 leading-tight">
                        Capisci come corri. <br/><span className="text-cyan-400">Migliora oggi.</span>
                    </h2>

                    <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-10 font-medium max-w-md">
                        Trasforma ogni corsa in analisi intelligente, simulazioni di gara e social hub per runner che vogliono allenarsi con criterio.
                    </p>

                    <div className="w-full space-y-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Scegli come entrare</div>

                        {/* Option 1: Login/Register */}
                        <button 
                            onClick={onLogin}
                            className="group w-full relative overflow-hidden bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 p-1 rounded-2xl transition-all shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
                        >
                            <div className="bg-slate-900/50 group-hover:bg-transparent rounded-[14px] p-4 flex items-center gap-4 transition-colors h-full">
                                <div className="text-3xl bg-white/10 w-12 h-12 flex items-center justify-center rounded-full shrink-0">
                                    🚀
                                </div>
                                <div className="text-left flex-grow">
                                    <div className="font-black text-white text-base uppercase tracking-tight">Accedi / Registrati</div>
                                    <div className="text-xs text-cyan-100 font-medium opacity-90 mt-0.5">
                                        Salva dati, usa il social, ricevi analisi complete
                                    </div>
                                </div>
                                <div className="text-white opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                    →
                                </div>
                            </div>
                        </button>

                        {/* Option 2: Guest */}
                        <button 
                            onClick={onGuest}
                            className="group w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
                        >
                            <div className="text-3xl bg-slate-700/50 w-12 h-12 flex items-center justify-center rounded-full shrink-0 text-slate-300">
                                👤
                            </div>
                            <div className="text-left flex-grow">
                                <div className="font-bold text-slate-200 text-base">Entra come ospite</div>
                                <div className="text-xs text-slate-400 font-medium mt-0.5">
                                    Prova subito senza obblighi
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className="mt-8 text-[10px] text-slate-600 font-mono">
                        RunCoach AI v1.41 • Privacy First
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default AuthSelectionModal;
