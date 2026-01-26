
import React, { useRef } from 'react';

interface InitialChoiceModalProps {
    onImportBackup: (file: File) => void;
    onStartNew: () => void;
    onClose: () => void;
}

const BackupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-purple-400"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2 text-cyan-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);
const MapIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>);

const LogoIcon = () => (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg border border-slate-700 p-1">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
    </div>
);

const InitialChoiceModal: React.FC<InitialChoiceModalProps> = ({ onImportBackup, onStartNew, onClose }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportBackup(e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[6000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 text-white rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-700 overflow-hidden relative">
                
                <header className="p-8 text-center border-b border-slate-800 bg-slate-900/50">
                    <div className="flex justify-center items-center gap-3 mb-2">
                        <LogoIcon />
                        <h2 className="text-3xl font-black text-white italic tracking-tighter">Benvenuto in RunCoachAI</h2>
                    </div>
                    <p className="text-slate-400 font-medium">L'analizzatore di prestazioni per runner evoluti.</p>
                </header>
                
                <div className="p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        <button onClick={onStartNew} className="flex flex-col items-center justify-center p-6 bg-cyan-600/10 hover:bg-cyan-600/20 border-2 border-cyan-500/50 hover:border-cyan-400 rounded-2xl transition-all group scale-105 shadow-xl z-10">
                            <div className="group-hover:scale-110 transition-transform duration-300"><UserIcon /></div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Nuovo Utente</h3>
                            <p className="text-[10px] text-cyan-200 text-center mt-2 font-medium leading-tight">Configura il tuo profilo atleta e inizia il tour guidato.</p>
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-600 hover:border-purple-500 rounded-2xl transition-all group">
                            <div className="group-hover:scale-110 transition-transform duration-300"><BackupIcon /></div>
                            <h3 className="text-base font-bold text-slate-200 group-hover:text-white">Carica Backup</h3>
                            <p className="text-[10px] text-slate-400 text-center mt-2 leading-tight">Ripristina un file .json salvato in precedenza.</p>
                            <input type="file" ref={fileInputRef} accept="application/json,.json" className="hidden" onChange={handleFileChange} />
                        </button>

                        <button onClick={onClose} className="flex flex-col items-center justify-center p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-600 hover:border-slate-400 rounded-2xl transition-all group">
                            <div className="group-hover:scale-110 transition-transform duration-300"><MapIcon /></div>
                            <h3 className="text-base font-bold text-slate-200 group-hover:text-white">Salta Setup</h3>
                            <p className="text-[10px] text-slate-400 text-center mt-2 leading-tight">Vai direttamente alla mappa senza configurare il profilo.</p>
                        </button>
                    </div>
                </div>
                
                <div className="bg-slate-950/50 p-4 text-center border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono">Tutti i dati rimangono sul tuo dispositivo.</p>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default InitialChoiceModal;
