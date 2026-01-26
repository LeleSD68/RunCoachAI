
import React, { useRef, useMemo, useState } from 'react';
import { PlannedWorkout } from '../types';
import { isSupabaseConfigured } from '../services/supabaseClient';

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
    onManualCloudSave?: () => void; 
    onCheckAiAccess?: () => boolean; 
}

const SettingsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1 1.187-.447l1.598.54a6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" /></svg>);
const HelpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A.75.75 0 0 0 10 12.5a.75.75 0 0 0 .75-.75v-.105a.25.25 0 0 1 .244-.304l.46-2.067a.75.75 0 0 0-.67-1.03Z" clipRule="evenodd" /></svg>);
const CloudUpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clipRule="evenodd" /></svg>);

const LargeLogoIcon = () => (
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl border-2 border-cyan-500/20 relative z-10">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-14 h-14">
            <path d="M13.5 2c-5.621 0-10.212 4.43-10.475 10h-3.006l4.492 4.5 4.492-4.5h-2.975c.26-3.902 3.504-7 7.472-7 4.142 0 7.5 3.358 7.5 7.5s-3.358 7.5-7.5 7.5c-2.381 0-4.502-1.119-5.876-2.854l-1.847 2.449c1.919 2.088 4.664 3.405 7.723 3.405 5.799 0 10.5-4.701 10.5-10.5s-4.701-10.5-10.5-10.5z"/>
        </svg>
    </div>
);

const HomeModal: React.FC<HomeModalProps> = ({ 
    onOpenDiary, onOpenExplorer, onOpenHelp, onImportBackup, onExportBackup, 
    onUploadTracks, onClose, trackCount, plannedWorkouts = [], onOpenWorkout, 
    onOpenProfile, onOpenChangelog, onUploadOpponent, onEnterRaceMode, onManualCloudSave, onCheckAiAccess
}) => {
    const backupInputRef = useRef<HTMLInputElement>(null);
    const trackInputRef = useRef<HTMLInputElement>(null);
    const opponentInputRef = useRef<HTMLInputElement>(null);
    const [menuStep, setMenuStep] = useState<'main' | 'analyze' | 'plan' | 'race'>('main');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportBackup(e.target.files[0]);
        }
    };

    const handleTrackUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadTracks(Array.from(e.target.files));
            onClose(); 
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
                <span className="text-xs text-slate-400">Carica un file GPX o TCX per una nuova analisi.</span>
                <input type="file" ref={trackInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleTrackUploadChange} />
            </button>
            <button onClick={() => setMenuStep('main')} className="text-xs text-slate-500 hover:text-white underline mt-2 text-center">Torna Indietro</button>
        </div>
    );

    const PlanMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">
                Pianificazione
            </h3>
            <button onClick={() => { onOpenDiary(); onClose(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">📅 Apri Diario</span>
                <span className="text-xs text-slate-400">Visualizza il calendario e gestisci i tuoi allenamenti.</span>
            </button>
            {nextWorkout && (
                <button 
                    onClick={() => { if(onOpenWorkout) onOpenWorkout(nextWorkout.id); }}
                    className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-amber-500 group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-1 bg-amber-500/20 rounded-bl-lg">
                        <span className="text-[9px] font-bold text-amber-400 uppercase px-1">Prossimo</span>
                    </div>
                    <span className="block text-sm font-bold text-white group-hover:text-amber-400 mb-1 truncate pr-8">{nextWorkout.title}</span>
                    <span className="text-xs text-slate-400 block">{new Date(nextWorkout.date).toLocaleDateString()} - {nextWorkout.activityType}</span>
                </button>
            )}
            <button onClick={() => setMenuStep('main')} className="text-xs text-slate-500 hover:text-white underline mt-2 text-center">Torna Indietro</button>
        </div>
    );

    const RaceMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">
                Setup Gara
            </h3>
            <button onClick={() => { onEnterRaceMode?.(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-green-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-green-400 mb-1">🏎️ Configura Griglia</span>
                <span className="text-xs text-slate-400">Seleziona le tracce dall'archivio e avvia la simulazione.</span>
            </button>
            <button onClick={() => opponentInputRef.current?.click()} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">👻 Carica Sfidante (Ghost)</span>
                <span className="text-xs text-slate-400">Carica un GPX esterno da sfidare senza salvarlo.</span>
                <input type="file" ref={opponentInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleOpponentUpload} />
            </button>
            <button onClick={() => setMenuStep('main')} className="text-xs text-slate-500 hover:text-white underline mt-2 text-center">Torna Indietro</button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[5000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700/50 ring-1 ring-white/10 relative" onClick={e => e.stopPropagation()}>
                
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none"></div>
                
                <header className="p-6 md:p-8 text-center relative z-10">
                    <div className="flex justify-center mb-4">
                        <LargeLogoIcon />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase mb-1">
                        RunCoach<span className="text-cyan-400">AI</span>
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400 font-medium">Hub di controllo v1.32</p>
                </header>

                <div className="px-6 md:px-8 pb-8">
                    {menuStep === 'main' ? <MainMenu /> : 
                     menuStep === 'analyze' ? <AnalyzeMenu /> :
                     menuStep === 'plan' ? <PlanMenu /> :
                     <RaceMenu />
                    }
                </div>

                <footer className="bg-slate-950/50 p-4 border-t border-slate-800/50 flex justify-between items-center text-xs font-bold text-slate-500">
                    <div className="flex gap-4">
                        <button onClick={onOpenProfile} className="hover:text-white transition-colors flex items-center gap-1"><SettingsIcon /> Profilo</button>
                        <button onClick={onOpenHelp} className="hover:text-white transition-colors flex items-center gap-1"><HelpIcon /> Guida</button>
                    </div>
                    <div className="flex gap-4">
                        {onManualCloudSave && (
                            <button onClick={onManualCloudSave} className="hover:text-green-400 transition-colors flex items-center gap-1" title="Sincronizza Cloud"><CloudUpIcon /> Cloud</button>
                        )}
                        <div className="relative group">
                            <button className="hover:text-white transition-colors">Dati</button>
                            <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden hidden group-hover:block animate-fade-in">
                                <button onClick={() => backupInputRef.current?.click()} className="block w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-300">Importa</button>
                                <button onClick={onExportBackup} className="block w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-300">Backup</button>
                                <input type="file" ref={backupInputRef} accept="application/json,.json" className="hidden" onChange={handleFileChange} />
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default HomeModal;
