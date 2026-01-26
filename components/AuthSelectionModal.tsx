
import React from 'react';

interface AuthSelectionModalProps {
    onGuest: () => void;
    onLogin: () => void;
}

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mb-3 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
    </svg>
);

const GuestIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mb-3 text-slate-400 group-hover:scale-110 transition-transform duration-300">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
);

const LogoIcon = () => (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl border-2 border-cyan-500/20 mb-6 p-2">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
    </div>
);

const AuthSelectionModal: React.FC<AuthSelectionModalProps> = ({ onGuest, onLogin }) => {
    return (
        <div className="fixed inset-0 bg-slate-950 z-[9000] flex items-center justify-center p-4 animate-fade-in">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-cyan-500/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-blue-600/5 blur-[100px] rounded-full"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                <LogoIcon />
                <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter mb-2 text-center">
                    Benvenuto in <span className="text-cyan-400">RunCoachAI</span>
                </h1>
                <p className="text-slate-400 text-sm md:text-base font-medium mb-10 text-center max-w-lg">
                    La piattaforma avanzata per analizzare, simulare e migliorare le tue prestazioni di corsa.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-4 md:px-0">
                    {/* Registered User Card */}
                    <button 
                        onClick={onLogin}
                        className="group relative bg-slate-900/50 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 rounded-3xl p-8 flex flex-col items-center text-center transition-all hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.2)] hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <UserIcon />
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Utente Registrato</h3>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                            Accesso completo. Sincronizzazione Cloud, storico AI persistente e accesso da tutti i dispositivi.
                        </p>
                        <div className="mt-auto w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-colors text-sm uppercase tracking-wide">
                            Accedi / Registrati
                        </div>
                    </button>

                    {/* Guest Card */}
                    <button 
                        onClick={onGuest}
                        className="group relative bg-slate-900/30 backdrop-blur-md border border-slate-700 hover:border-slate-500 rounded-3xl p-8 flex flex-col items-center text-center transition-all hover:bg-slate-800/50 hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <GuestIcon />
                        <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-white transition-colors">Ospite</h3>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Accesso locale (Offline). Dati salvati solo su questo dispositivo. Funzioni AI limitate alla sessione.
                        </p>
                        <div className="mt-auto w-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-bold py-3 px-6 rounded-xl border border-slate-600 transition-colors text-sm uppercase tracking-wide">
                            Continua come Ospite
                        </div>
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default AuthSelectionModal;
