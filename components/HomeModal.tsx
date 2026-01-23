
import React, { useRef, useMemo, useState } from 'react';
import { PlannedWorkout } from '../types';

interface HomeModalProps {
    onOpenDiary: () => void;
    onOpenExplorer: () => void;
    onOpenHelp: () => void;
    onImportBackup: (file: File) => void;
    onExportBackup: () => void;
    onUploadTracks: (files: File[] | null) => void;
    onClose: () => void;
    trackCount: number;
    plannedWorkouts?: PlannedWorkout[];
    onOpenWorkout?: (workoutId: string) => void; 
    onOpenProfile?: () => void;
    onOpenChangelog?: () => void;
    onUploadOpponent?: (files: File[]) => void;
    onEnterRaceMode?: () => void;
}

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1 1.187-.447l1.598.54a6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7.75-4.25a1.25 1.25 0 1 1 2.5 0c0 .533-.335.918-.78 1.163-.407.224-.72.576-.72 1.087v.25a.75.75 0 0 1-1.5 0v-.25c0-.942.667-1.761 1.547-2.035.25-.078.453-.312.453-.565 0-.138-.112-.25-.25-.25a.25.25 0 0 0-.25.25.75.75 0 0 1-1.5 0 1.75 1.75 0 0 1 1.75-1.75ZM10 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
    </svg>
);

const HomeModal: React.FC<HomeModalProps> = ({ 
    onOpenDiary, onOpenExplorer, onOpenHelp, onImportBackup, onExportBackup, 
    onUploadTracks, onClose, trackCount, plannedWorkouts = [], onOpenWorkout, 
    onOpenProfile, onOpenChangelog, onUploadOpponent, onEnterRaceMode 
}) => {
    const backupInputRef = useRef<HTMLInputElement>(null);
    const trackInputRef = useRef<HTMLInputElement>(null);
    const opponentInputRef = useRef<HTMLInputElement>(null);
    
    // Internal state for Menu Navigation Flow
    const [menuStep, setMenuStep] = useState<'main' | 'analyze' | 'plan' | 'race'>('main');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportBackup(e.target.files[0]);
        }
    };

    const handleTrackUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadTracks(Array.from(e.target.files));
            onClose(); // Close modal after selecting files to show loading state on main screen
        }
    };

    const handleOpponentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onUploadOpponent) {
            onUploadOpponent(Array.from(e.target.files));
            if (onEnterRaceMode) {
                onEnterRaceMode();
            } else {
                onClose(); 
            }
        }
    };

    const handleSelfRace = () => {
        if (onEnterRaceMode) {
            onEnterRaceMode();
        } else {
            onClose();
        }
    };

    const nextWorkout = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const sorted = [...plannedWorkouts]
            .filter(w => !w.completedTrackId)
            .map(w => ({ ...w, dateObj: new Date(w.date) }))
            .filter(w => w.dateObj >= now)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
            
        return sorted.length > 0 ? sorted[0] : null;
    }, [plannedWorkouts]);

    // --- Sub-View Components ---

    const MainMenu = () => (
        <div className="grid grid-cols-2 gap-3 md:gap-4 flex-grow md:flex-grow-0">
            <button onClick={() => setMenuStep('analyze')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-cyan-600/5 hover:bg-cyan-600/10 border-2 border-cyan-500/20 hover:border-cyan-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">📈</div>
                <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Analizza</span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1 opacity-60">Studia una prestazione</span>
            </button>

            <button onClick={() => setMenuStep('plan')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-purple-600/5 hover:bg-purple-600/10 border-2 border-purple-500/20 hover:border-purple-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">📅</div>
                <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Pianifica</span>
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1 opacity-60">Crea il tuo programma</span>
            </button>

            <button onClick={onOpenExplorer} className="flex flex-col items-center justify-center p-4 md:p-6 bg-slate-700/20 hover:bg-slate-700/40 border-2 border-slate-600/40 hover:border-white/40 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">👁️</div>
                <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Rivedi</span>
                <span className="text-[10px] text-slate-400 group-hover:text-white font-bold uppercase tracking-widest mt-1 opacity-60">Esplora storico</span>
            </button>

            <button onClick={() => setMenuStep('race')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-green-600/5 hover:bg-green-600/10 border-2 border-green-500/20 hover:border-green-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">🏁</div>
                <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Gareggia</span>
                <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-1 opacity-60">Simulazione Live</span>
            </button>
        </div>
    );

    const AnalyzeMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">
                Cosa vuoi analizzare?
            </h3>
            <button onClick={() => { onOpenExplorer(); onClose(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-cyan-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-cyan-400 mb-1">📂 Corsa in Archivio</span>
                <span className="text-xs text-slate-400">Scegli una corsa già caricata per vedere dettagli e statistiche.</span>
            </button>
            <button onClick={() => trackInputRef.current?.click()} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-green-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-green-400 mb-1">📤 Nuova Traccia</span>
                <span className="text-xs text-slate-400">Carica un file GPX o TCX dal tuo dispositivo.</span>
            </button>
            <button onClick={() => setMenuStep('main')} className="mt-4 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest text-center">Indietro</button>
        </div>
    );

    const PlanMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">
                Orizzonte temporale?
            </h3>
            <button onClick={() => { onOpenDiary(); onClose(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">📅 Vai al Diario</span>
                <span className="text-xs text-slate-400">Apri il calendario completo per gestire la pianificazione settimanale o chiedere consiglio al Coach AI.</span>
            </button>
            <p className="text-xs text-slate-500 italic p-2 bg-slate-800/50 rounded">
                💡 Suggerimento: Nel Diario, usa il tasto "Scheda AI" per generare allenamenti su misura per oggi o per i prossimi giorni.
            </p>
            <button onClick={() => setMenuStep('main')} className="mt-4 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest text-center">Indietro</button>
        </div>
    );

    const RaceMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">
                Che tipo di sfida?
            </h3>
            <button onClick={handleSelfRace} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-green-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-green-400 mb-1">👤 Contro me stesso</span>
                <span className="text-xs text-slate-400">Seleziona due o più delle tue corse dall'elenco laterale per confrontarle in tempo reale.</span>
            </button>
            <button onClick={() => opponentInputRef.current?.click()} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">👻 Contro rivale esterno</span>
                <span className="text-xs text-slate-400">Carica il file GPX di un amico o un avversario (Ghost) da sfidare con una tua corsa.</span>
            </button>
            <input 
                type="file" 
                ref={opponentInputRef} 
                accept=".gpx,.tcx" 
                multiple
                className="hidden" 
                onChange={handleOpponentUpload} 
            />
            <button onClick={() => setMenuStep('main')} className="mt-4 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest text-center">Indietro</button>
        </div>
    );

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-900 z-[8000] flex items-center justify-center p-0 md:p-4 animate-fade-in overflow-hidden">
            <div className="w-full h-full md:w-auto md:h-auto md:max-w-5xl bg-slate-800 border-none md:border border-slate-700 rounded-none md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row md:max-h-[600px] relative z-10">
                
                {/* Desktop Top Menu (Settings, Version & Help) */}
                <div className="hidden md:flex absolute top-4 right-4 items-center gap-3 z-50">
                    <button 
                        onClick={onOpenHelp}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors"
                    >
                        <HelpIcon />
                        Guida
                    </button>
                    <button 
                        onClick={onOpenChangelog}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 rounded-lg text-xs font-mono text-slate-400 hover:text-white border border-slate-700 transition-colors"
                    >
                        v1.31
                    </button>
                    <button 
                        onClick={onOpenProfile}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    >
                        <SettingsIcon />
                        Impostazioni
                    </button>
                </div>

                {/* Left Side: Branding & Stats */}
                <div className="w-full md:w-1/3 bg-slate-900 p-5 md:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700/50 shrink-0 pt-8 md:pt-6">
                    <div>
                        {/* Mobile Header with Settings & Version */}
                        <div className="md:hidden flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg shadow-sm" />
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-black text-cyan-400 tracking-tighter italic leading-none">RunCoachAI</h1>
                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5">Analizza, Simula</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={onOpenHelp} className="p-1.5 bg-slate-800 rounded-full text-slate-300 hover:text-cyan-400 border border-slate-700"><HelpIcon /></button>
                                <button onClick={onOpenChangelog} className="px-2 py-1 bg-slate-800 rounded text-[9px] text-slate-400 font-mono border border-slate-700">v1.31</button>
                                <button onClick={onOpenProfile} className="p-1.5 bg-slate-800 rounded-full text-slate-300 hover:text-white border border-slate-700">
                                    <SettingsIcon />
                                </button>
                            </div>
                        </div>

                        {/* Desktop Header - Centered Stack */}
                        <div className="hidden md:flex flex-col items-center text-center">
                            <div className="mb-4 relative group">
                                <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                                <img src="/logo.png" alt="Logo" className="w-24 h-24 rounded-2xl shadow-2xl border-2 border-cyan-500/20 relative z-10" />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black text-cyan-400 tracking-tighter italic mb-2">RunCoachAI</h1>
                            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 rounded-full mb-3"></div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">Analizza, Simula, Migliora</p>
                        </div>
                    </div>
                    
                    {/* Stats & Quick Actions (Always Visible Now) */}
                    <div className="flex flex-col space-y-4 my-4 md:my-8">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 shadow-inner text-center">
                            <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Attività Totali</span>
                            <span className="text-3xl font-black text-white">{trackCount}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => backupInputRef.current?.click()} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-center border border-slate-700 transition-colors group">
                                <span className="block text-xl mb-1 group-hover:scale-110 transition-transform">📥</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Importa</span>
                                <input type="file" ref={backupInputRef} accept=".json" className="hidden" onChange={handleFileChange} />
                             </button>
                             <button onClick={onExportBackup} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-center border border-slate-700 transition-colors group">
                                <span className="block text-xl mb-1 group-hover:scale-110 transition-transform">💾</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Backup</span>
                             </button>
                        </div>
                    </div>

                    {/* Mobile Map CTA */}
                    <div className="md:hidden">
                        <button 
                            onClick={onClose} 
                            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase tracking-widest text-xs rounded-lg border border-slate-700 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 group"
                        >
                            Apri Mappa 
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Desktop Map CTA */}
                    <button 
                        onClick={onClose} 
                        className="hidden md:flex w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase tracking-widest text-xs rounded-xl border border-slate-700 transition-all active:scale-95 shadow-lg items-center justify-center gap-2 group mt-2 md:mt-1"
                    >
                        Accedi alla Mappa 
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Right Side: Navigation Grid */}
                <div className="w-full md:w-2/3 p-4 md:p-6 flex flex-col md:justify-center overflow-y-auto custom-scrollbar pt-2 pb-24 md:pb-6 flex-grow bg-slate-800 relative">
                    
                    <h2 className="text-xs md:text-lg font-black text-white uppercase tracking-tighter mb-4 md:mb-6 flex items-center gap-3 justify-center md:justify-start opacity-70">
                        <span className="hidden md:block w-6 h-0.5 bg-cyan-500 rounded-full"></span>
                        Hub Principale
                    </h2>
                    
                    {/* Main Menu Grid / Sub-Views */}
                    {menuStep === 'main' && <MainMenu />}
                    {menuStep === 'analyze' && <AnalyzeMenu />}
                    {menuStep === 'plan' && <PlanMenu />}
                    {menuStep === 'race' && <RaceMenu />}

                    {/* Hidden Input for generic track upload (used by Analyze -> New Track) */}
                    <input 
                        type="file" 
                        ref={trackInputRef} 
                        multiple 
                        accept=".gpx,.tcx" 
                        className="hidden" 
                        onChange={handleTrackUploadChange} 
                    />
                </div>
            </div>

            {/* NEXT WORKOUT REMINDER BANNER */}
            {nextWorkout && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-fade-in-up">
                    <button 
                        onClick={() => onOpenWorkout ? onOpenWorkout(nextWorkout.id) : onOpenDiary()}
                        className="w-full bg-slate-900/95 backdrop-blur-xl border border-purple-500 rounded-2xl py-3 px-4 flex items-center justify-between shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-400 hover:scale-[1.02] transition-all group cursor-pointer"
                    >
                        <div className="flex flex-col items-start overflow-hidden mr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                </span>
                                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest shrink-0">
                                    {new Date(nextWorkout.date).toDateString() === new Date().toDateString() ? 'OGGI' : new Date(nextWorkout.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <span className="text-xs sm:text-sm font-black text-white truncate w-full text-left group-hover:text-purple-200 transition-colors">
                                {nextWorkout.title}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide bg-slate-800 px-1.5 rounded mt-1">
                                {nextWorkout.activityType}
                            </span>
                        </div>
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-purple-600/20 rounded-full flex items-center justify-center shrink-0 border border-purple-500/30 group-hover:bg-purple-500 group-hover:text-white transition-all text-purple-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </button>
                </div>
            )}

            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                @keyframes fade-in-up { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
                .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }

                @media (max-width: 350px) {
                    .grid-cols-2 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                }
            `}</style>
        </div>
    );
};

export default HomeModal;
