
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { PlannedWorkout, UserProfile } from '../types';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { isStravaConnected } from '../services/stravaService';

interface HomeModalProps {
    onOpenDiary: () => void;
    onOpenExplorer: () => void;
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { PlannedWorkout, UserProfile } from '../types';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { isStravaConnected } from '../services/stravaService';

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
    onOpenSettings?: () => void; 
    onOpenChangelog?: () => void;
    onUploadOpponent?: (files: File[]) => void;
    onEnterRaceMode?: () => void;
    onManualCloudSave?: () => void; 
    onCheckAiAccess?: () => boolean; 
    onLogout?: () => void;
    onLogin?: () => void; 
    isGuest?: boolean;
    onOpenStravaConfig?: () => void;
    userProfile?: UserProfile; 
    onOpenSocial?: () => void;
    unreadCount?: number;
    onlineCount?: number;
}

const SettingsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1 1.187-.447l1.598.54a6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" /></svg>);
const HelpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A.75.75 0 0 0 10 12.5a.75.75 0 0 0 .75-.75v-.105a.25.25 0 0 1 .244-.304l.46-2.067a.75.75 0 0 0-.67-1.03Z" clipRule="evenodd" /></svg>);
const CloudUpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clipRule="evenodd" /></svg>);
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
    </svg>
);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A9.916 9.916 0 0 0 10 18c2.695 0 5.145-1.075 6.99-2.825A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" /></svg>);
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l.962.962a1 1 0 0 1 .125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 0 1 .804.98v1.361a1 1 0 0 1-.804.98l-1.473.295a6.995 6.995 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-.962.962a1 1 0 0 1-1.262.125l-1.25-.834a6.953 6.953 0 0 1-.587-1.416l-1.473-.294A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262l.962-.962A1 1 0 0 1 5.38 3.03l1.25.834a6.957 6.957 0 0 1 1.416-.587l.294-1.473ZM13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" /></svg>);
const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2 4.75A2.75 2.75 0 0 1 4.75 2h3.185a.75.75 0 0 1 .53.22l2.25 2.25a.75.75 0 0 0 .53.22h4.005A2.75 2.75 0 0 1 18 7.64v7.61a2.75 2.75 0 0 1-2.75 2.75H4.75A2.75 2.75 0 0 1 2 15.25V4.75Z" />
    </svg>
);
const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
    </svg>
);
const ReloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
    </svg>
);
const UserGroupIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" />
    </svg>
);

const LargeLogoIcon = () => (
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl border-2 border-cyan-500/20 relative z-10 p-2">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
    </div>
);

const HomeModal: React.FC<HomeModalProps> = ({ 
    onOpenDiary, onOpenExplorer, onOpenHelp, onImportBackup, onExportBackup, 
    onUploadTracks, onClose, trackCount, plannedWorkouts = [], onOpenWorkout, 
    onOpenProfile, onOpenSettings, onOpenChangelog, onUploadOpponent, onEnterRaceMode, onManualCloudSave, onCheckAiAccess,
    onLogout, onLogin, isGuest, onOpenStravaConfig, userProfile, onOpenSocial, unreadCount = 0, onlineCount = 0
}) => {
    const backupInputRef = useRef<HTMLInputElement>(null);
    const trackInputRef = useRef<HTMLInputElement>(null);
    const opponentInputRef = useRef<HTMLInputElement>(null);
    const [menuStep, setMenuStep] = useState<'main' | 'analyze' | 'plan' | 'race'>('main');
    const [isStravaLinked, setIsStravaLinked] = useState(false);

    useEffect(() => {
        setIsStravaLinked(isStravaConnected());
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportBackup(e.target.files[0]);
            setMenuStep('main'); 
        }
    };

    const handleTrackUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadTracks(Array.from(e.target.files));
            setMenuStep('main'); 
        }
    };

    const handleOpponentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onUploadOpponent) {
            onUploadOpponent(Array.from(e.target.files));
            if (onEnterRaceMode) onEnterRaceMode();
            else onClose(); 
        }
    };

    const handleRestart = () => {
        if(confirm("Riavviare l'applicazione?")) {
            window.location.reload();
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
        <div className="flex flex-col gap-3 md:gap-4 flex-grow md:flex-grow-0">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button onClick={() => setMenuStep('analyze')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-cyan-600/5 hover:bg-cyan-600/10 border-2 border-cyan-500/20 hover:border-cyan-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[100px] md:min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">📥</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Carica Dati</span>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1 opacity-60">GPX, Strava, Backup</span>
                </button>

                <button onClick={() => setMenuStep('plan')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-purple-600/5 hover:bg-purple-600/10 border-2 border-purple-500/20 hover:border-purple-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[100px] md:min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">📅</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Pianifica</span>
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1 opacity-60">Calendario & AI</span>
                </button>

                <button onClick={() => { onOpenExplorer(); }} className="flex flex-col items-center justify-center p-4 md:p-6 bg-slate-700/20 hover:bg-slate-700/40 border-2 border-slate-600/40 hover:border-white/40 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[100px] md:min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">👁️</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Archivio</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white font-bold uppercase tracking-widest mt-1 opacity-60">Esplora storico</span>
                </button>

                <button onClick={() => setMenuStep('race')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-green-600/5 hover:bg-green-600/10 border-2 border-green-500/20 hover:border-green-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[100px] md:min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">🏁</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Gareggia</span>
                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-1 opacity-60">Simulazione Live</span>
                </button>

                <button onClick={onOpenSocial} className="flex flex-col items-center justify-center p-4 md:p-6 bg-pink-600/5 hover:bg-pink-600/10 border-2 border-pink-500/20 hover:border-pink-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[100px] md:min-h-[120px] relative col-span-2 sm:col-span-1">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform"><UserGroupIcon /></div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Social Hub</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest opacity-60">Amici & Chat</span>
                        {onlineCount > 0 && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>}
                    </div>
                    {unreadCount > 0 && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-slate-900 animate-bounce">
                            {unreadCount > 9 ? '!' : unreadCount}
                        </div>
                    )}
                </button>

                <button onClick={onClose} className="flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-br from-slate-800 to-slate-700 border-2 border-slate-600/50 hover:border-cyan-400/50 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[100px] md:min-h-[120px] col-span-2 sm:col-span-1">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">🗺️</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Esplora Mappa</span>
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1 opacity-60">Visuale Completa</span>
                </button>
            </div>
        </div>
    );

    const AnalyzeMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">Caricamento & Dati</h3>
            
            <button onClick={() => trackInputRef.current?.click()} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-green-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-green-400 mb-1">📤 Nuova Traccia (GPX/TCX)</span>
                <span className="text-xs text-slate-400">Carica file dal dispositivo per una nuova analisi profonda.</span>
            </button>
            <input type="file" ref={trackInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleTrackUploadChange} />

            {onOpenStravaConfig && (
                <button onClick={onOpenStravaConfig} className={`p-4 border rounded-xl text-left transition-all group ${isStravaLinked ? 'bg-green-900/10 border-green-500/30 hover:bg-green-900/20' : 'bg-[#fc4c02]/10 border-[#fc4c02]/30 hover:bg-[#fc4c02]/20 hover:border-[#fc4c02]'}`}>
                    <span className={`block text-sm font-bold mb-1 flex items-center gap-2 ${isStravaLinked ? 'text-green-400' : 'text-white group-hover:text-[#fc4c02]'}`}>
                        <StravaIcon /> {isStravaLinked ? 'Sincronizza con Strava' : 'Connetti account Strava'}
                        {isStravaLinked && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                    </span>
                    <span className="text-xs text-slate-400">{isStravaLinked ? 'Scarica subito le tue ultime corse.' : 'Ottieni automaticamente le tue attività via API.'}</span>
                </button>
            )}

            <div className="grid grid-cols-2 gap-3 mt-1">
                <button onClick={() => backupInputRef.current?.click()} className="p-3 bg-slate-800 border border-slate-600 rounded-xl text-center hover:border-purple-500 transition-all text-xs font-bold text-slate-300 hover:text-white">
                    <DatabaseIcon /> Importa Backup
                </button>
                <button onClick={onExportBackup} className="p-3 bg-slate-800 border border-slate-600 rounded-xl text-center hover:border-blue-500 transition-all text-xs font-bold text-slate-300 hover:text-white">
                    <CloudUpIcon /> Esporta Backup
                </button>
            </div>
            <input type="file" ref={backupInputRef} accept="application/json,.json" className="hidden" onChange={handleFileChange} />

            <button onClick={() => setMenuStep('main')} className="text-xs font-black text-slate-500 hover:text-white uppercase mt-2 text-center tracking-widest">Torna al Menu Principale</button>
        </div>
    );

    const PlanMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">Diario & Allenamento</h3>
            <button onClick={() => { onOpenDiary(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">📅 Calendario Allenamenti</span>
                <span className="text-xs text-slate-400">Gestisci i tuoi impegni e segui la scheda suggerita dal Coach AI.</span>
            </button>
            {nextWorkout && (
                <button onClick={() => { if(onOpenWorkout) onOpenWorkout(nextWorkout.id); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-amber-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 bg-amber-500/20 rounded-bl-lg">
                        <span className="text-[9px] font-bold text-amber-400 uppercase px-1">Prossimo</span>
                    </div>
                    <span className="block text-sm font-bold text-white group-hover:text-amber-400 mb-1 truncate pr-8">{nextWorkout.title}</span>
                    <span className="text-xs text-slate-400 block">{new Date(nextWorkout.date).toLocaleDateString()} - {nextWorkout.activityType}</span>
                </button>
            )}
            <button onClick={() => setMenuStep('main')} className="text-xs font-black text-slate-500 hover:text-white uppercase mt-2 text-center tracking-widest">Torna al Menu Principale</button>
        </div>
    );

    const RaceMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">Virtual Race Mode</h3>
            <button onClick={() => { onEnterRaceMode?.(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-green-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-green-400 mb-1">🏎️ Gestione Griglia Gara</span>
                <span className="text-xs text-slate-400">Seleziona le tracce dallo storico e avvia il replay simultaneo.</span>
            </button>
            <button onClick={() => opponentInputRef.current?.click()} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">👻 Sfida Runner Esterno (Ghost)</span>
                <span className="text-xs text-slate-400">Carica un GPX esterno per usarlo come avversario temporaneo.</span>
                <input type="file" ref={opponentInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleOpponentUpload} />
            </button>
            <button onClick={() => setMenuStep('main')} className="text-xs font-black text-slate-500 hover:text-white uppercase mt-2 text-center tracking-widest">Torna al Menu Principale</button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[5000] flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-slate-700/50 ring-1 ring-white/10 relative" onClick={e => e.stopPropagation()}>
                {/* Header Banner - Fixed */}
                <div className="shrink-0 relative z-10">
                    {isGuest ? (
                        <div className="bg-amber-600 text-white text-[10px] font-black text-center py-1 uppercase tracking-widest shadow-md relative z-20">⚠️ Modalità Ospite: Dati salvati solo localmente</div>
                    ) : (
                        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-black text-center py-1 uppercase tracking-widest shadow-md relative z-20">☁️ Connesso al Database Cloud</div>
                    )}
                    <header className="p-6 md:p-8 text-center relative z-10">
                        <div className="flex justify-center mb-4"><LargeLogoIcon /></div>
                        <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase mb-1">Ciao, <span className="text-cyan-400">{userProfile?.name || 'Atleta'}</span></h2>
                        <div className="flex items-center justify-center gap-2 mt-2">
                             <button onClick={onOpenChangelog} className="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider hover:bg-slate-700 hover:text-white transition-colors">v1.41</button>
                            <span className={`border text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${trackCount > 0 ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{trackCount} {trackCount === 1 ? 'Attività' : 'Attività'}</span>
                        </div>
                    </header>
                </div>

                <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none"></div>

                {/* Scrollable Content */}
                <div className="flex-grow overflow-y-auto custom-scrollbar px-6 md:px-8 pb-4 relative z-10">
                    {menuStep === 'main' ? <MainMenu /> : menuStep === 'analyze' ? <AnalyzeMenu /> : menuStep === 'plan' ? <PlanMenu /> : <RaceMenu />}
                </div>
                
                {/* Footer - Fixed */}
                <footer className="bg-slate-950/50 p-4 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 relative gap-4 md:gap-0 shrink-0 z-10">
                    <div className="flex w-full md:w-auto justify-between md:justify-start gap-2 md:gap-6">
                        <button onClick={onOpenProfile} className="hover:text-white transition-colors flex flex-col md:flex-row items-center gap-1">
                            <UserIcon /> 
                            <span>Profilo</span>
                        </button>
                        <button onClick={onOpenSettings} className="hover:text-white transition-colors flex flex-col md:flex-row items-center gap-1">
                            <CogIcon /> 
                            <span>Impostazioni</span>
                        </button>
                        <button onClick={onOpenHelp} className="hover:text-white transition-colors flex flex-col md:flex-row items-center gap-1">
                            <HelpIcon /> 
                            <span>Guida</span>
                        </button>
                    </div>
                    
                    <div className="flex w-full md:w-auto justify-center md:justify-end gap-6 md:gap-4 border-t md:border-t-0 border-slate-800/50 pt-3 md:pt-0">
                        <button onClick={handleRestart} className="hover:text-amber-400 transition-colors flex flex-col md:flex-row items-center gap-1" title="Riavvia App">
                            <ReloadIcon />
                            <span>Riavvia</span>
                        </button>
                        {onManualCloudSave && !isGuest && (
                            <button onClick={onManualCloudSave} className="hover:text-green-400 transition-colors flex flex-col md:flex-row items-center gap-1" title="Sincronizza ora">
                                <CloudUpIcon /> 
                                <span>Cloud</span>
                            </button>
                        )}
                        {isGuest ? (
                            <button onClick={onLogin} className="hover:text-cyan-400 transition-colors flex flex-col md:flex-row items-center gap-1 text-cyan-500 font-black">
                                <LoginIcon /> 
                                <span>Accedi</span>
                            </button>
                        ) : (
                            <button onClick={onLogout} className="hover:text-red-400 transition-colors flex flex-col md:flex-row items-center gap-1">
                                <LogoutIcon /> 
                                <span>Esci</span>
                            </button>
                        )}
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

    onOpenHelp: () => void;
    onImportBackup: (file: File) => void;
    onExportBackup: () => void;
    onUploadTracks: (files: File[] | null) => void;
    onClose: () => void;
    trackCount: number;
    plannedWorkouts?: PlannedWorkout[];
    onOpenWorkout?: (workoutId: string) => void; 
    onOpenProfile?: () => void;
    onOpenSettings?: () => void; 
    onOpenChangelog?: () => void;
    onUploadOpponent?: (files: File[]) => void;
    onEnterRaceMode?: () => void;
    onManualCloudSave?: () => void; 
    onCheckAiAccess?: () => boolean; 
    onLogout?: () => void;
    onLogin?: () => void; 
    isGuest?: boolean;
    onOpenStravaConfig?: () => void;
    userProfile?: UserProfile; 
    onOpenSocial?: () => void;
    unreadCount?: number;
    onlineCount?: number;
}

const SettingsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1 1.187-.447l1.598.54a6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" /></svg>);
const HelpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A.75.75 0 0 0 10 12.5a.75.75 0 0 0 .75-.75v-.105a.25.25 0 0 1 .244-.304l.46-2.067a.75.75 0 0 0-.67-1.03Z" clipRule="evenodd" /></svg>);
const CloudUpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clipRule="evenodd" /></svg>);
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
    </svg>
);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A9.916 9.916 0 0 0 10 18c2.695 0 5.145-1.075 6.99-2.825A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" /></svg>);
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l.962.962a1 1 0 0 1 .125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 0 1 .804.98v1.361a1 1 0 0 1-.804.98l-1.473.295a6.995 6.995 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-.962.962a1 1 0 0 1-1.262.125l-1.25-.834a6.953 6.953 0 0 1-.587-1.416l-1.473-.294A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262l.962-.962A1 1 0 0 1 5.38 3.03l1.25.834a6.957 6.957 0 0 1 1.416-.587l.294-1.473ZM13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" /></svg>);
const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2 4.75A2.75 2.75 0 0 1 4.75 2h3.185a.75.75 0 0 1 .53.22l2.25 2.25a.75.75 0 0 0 .53.22h4.005A2.75 2.75 0 0 1 18 7.64v7.61a2.75 2.75 0 0 1-2.75 2.75H4.75A2.75 2.75 0 0 1 2 15.25V4.75Z" />
    </svg>
);
const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
    </svg>
);
const ReloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
    </svg>
);
const UserGroupIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" />
    </svg>
);

const LargeLogoIcon = () => (
    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl border-2 border-cyan-500/20 relative z-10 p-2">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
    </div>
);

const HomeModal: React.FC<HomeModalProps> = ({ 
    onOpenDiary, onOpenExplorer, onOpenHelp, onImportBackup, onExportBackup, 
    onUploadTracks, onClose, trackCount, plannedWorkouts = [], onOpenWorkout, 
    onOpenProfile, onOpenSettings, onOpenChangelog, onUploadOpponent, onEnterRaceMode, onManualCloudSave, onCheckAiAccess,
    onLogout, onLogin, isGuest, onOpenStravaConfig, userProfile, onOpenSocial, unreadCount = 0, onlineCount = 0
}) => {
    const backupInputRef = useRef<HTMLInputElement>(null);
    const trackInputRef = useRef<HTMLInputElement>(null);
    const opponentInputRef = useRef<HTMLInputElement>(null);
    const [menuStep, setMenuStep] = useState<'main' | 'analyze' | 'plan' | 'race'>('main');
    const [isStravaLinked, setIsStravaLinked] = useState(false);

    useEffect(() => {
        setIsStravaLinked(isStravaConnected());
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportBackup(e.target.files[0]);
            setMenuStep('main'); // Torna al menu principale dopo l'importazione
        }
    };

    const handleTrackUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadTracks(Array.from(e.target.files));
            setMenuStep('main'); // Torna al menu principale dopo il caricamento
        }
    };

    const handleOpponentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onUploadOpponent) {
            onUploadOpponent(Array.from(e.target.files));
            if (onEnterRaceMode) onEnterRaceMode();
            else onClose(); 
        }
    };

    const handleRestart = () => {
        if(confirm("Riavviare l'applicazione?")) {
            window.location.reload();
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
        <div className="flex flex-col gap-3 md:gap-4 flex-grow md:flex-grow-0">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button onClick={() => setMenuStep('analyze')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-cyan-600/5 hover:bg-cyan-600/10 border-2 border-cyan-500/20 hover:border-cyan-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">📥</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Carica Dati</span>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1 opacity-60">GPX, Strava, Backup</span>
                </button>

                <button onClick={() => setMenuStep('plan')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-purple-600/5 hover:bg-purple-600/10 border-2 border-purple-500/20 hover:border-purple-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">📅</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Pianifica</span>
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1 opacity-60">Calendario & AI</span>
                </button>

                <button onClick={() => { onOpenExplorer(); }} className="flex flex-col items-center justify-center p-4 md:p-6 bg-slate-700/20 hover:bg-slate-700/40 border-2 border-slate-600/40 hover:border-white/40 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">👁️</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Archivio</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white font-bold uppercase tracking-widest mt-1 opacity-60">Esplora storico</span>
                </button>

                <button onClick={() => setMenuStep('race')} className="flex flex-col items-center justify-center p-4 md:p-6 bg-green-600/5 hover:bg-green-600/10 border-2 border-green-500/20 hover:border-green-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px]">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">🏁</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Gareggia</span>
                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-1 opacity-60">Simulazione Live</span>
                </button>

                <button onClick={onOpenSocial} className="flex flex-col items-center justify-center p-4 md:p-6 bg-pink-600/5 hover:bg-pink-600/10 border-2 border-pink-500/20 hover:border-pink-400 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px] relative col-span-2 sm:col-span-1">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform"><UserGroupIcon /></div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Social Hub</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-pink-400 font-bold uppercase tracking-widest opacity-60">Amici & Chat</span>
                        {onlineCount > 0 && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>}
                    </div>
                    {unreadCount > 0 && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-slate-900 animate-bounce">
                            {unreadCount > 9 ? '!' : unreadCount}
                        </div>
                    )}
                </button>

                <button onClick={onClose} className="flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-br from-slate-800 to-slate-700 border-2 border-slate-600/50 hover:border-cyan-400/50 rounded-2xl transition-all group active:scale-95 shadow-lg min-h-[120px] col-span-2 sm:col-span-1">
                    <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">🗺️</div>
                    <span className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Esplora Mappa</span>
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1 opacity-60">Visuale Completa</span>
                </button>
            </div>
        </div>
    );

    const AnalyzeMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">Caricamento & Dati</h3>
            
            <button onClick={() => trackInputRef.current?.click()} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-green-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-green-400 mb-1">📤 Nuova Traccia (GPX/TCX)</span>
                <span className="text-xs text-slate-400">Carica file dal dispositivo per una nuova analisi profonda.</span>
            </button>
            <input type="file" ref={trackInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleTrackUploadChange} />

            {onOpenStravaConfig && (
                <button onClick={onOpenStravaConfig} className={`p-4 border rounded-xl text-left transition-all group ${isStravaLinked ? 'bg-green-900/10 border-green-500/30 hover:bg-green-900/20' : 'bg-[#fc4c02]/10 border-[#fc4c02]/30 hover:bg-[#fc4c02]/20 hover:border-[#fc4c02]'}`}>
                    <span className={`block text-sm font-bold mb-1 flex items-center gap-2 ${isStravaLinked ? 'text-green-400' : 'text-white group-hover:text-[#fc4c02]'}`}>
                        <StravaIcon /> {isStravaLinked ? 'Sincronizza con Strava' : 'Connetti account Strava'}
                        {isStravaLinked && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                    </span>
                    <span className="text-xs text-slate-400">{isStravaLinked ? 'Scarica subito le tue ultime corse.' : 'Ottieni automaticamente le tue attività via API.'}</span>
                </button>
            )}

            <div className="grid grid-cols-2 gap-3 mt-1">
                <button onClick={() => backupInputRef.current?.click()} className="p-3 bg-slate-800 border border-slate-600 rounded-xl text-center hover:border-purple-500 transition-all text-xs font-bold text-slate-300 hover:text-white">
                    <DatabaseIcon /> Importa Backup
                </button>
                <button onClick={onExportBackup} className="p-3 bg-slate-800 border border-slate-600 rounded-xl text-center hover:border-blue-500 transition-all text-xs font-bold text-slate-300 hover:text-white">
                    <CloudUpIcon /> Esporta Backup
                </button>
            </div>
            <input type="file" ref={backupInputRef} accept="application/json,.json" className="hidden" onChange={handleFileChange} />

            <button onClick={() => setMenuStep('main')} className="text-xs font-black text-slate-500 hover:text-white uppercase mt-2 text-center tracking-widest">Torna al Menu Principale</button>
        </div>
    );

    const PlanMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">Diario & Allenamento</h3>
            <button onClick={() => { onOpenDiary(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">📅 Calendario Allenamenti</span>
                <span className="text-xs text-slate-400">Gestisci i tuoi impegni e segui la scheda suggerita dal Coach AI.</span>
            </button>
            {nextWorkout && (
                <button onClick={() => { if(onOpenWorkout) onOpenWorkout(nextWorkout.id); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-amber-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 bg-amber-500/20 rounded-bl-lg">
                        <span className="text-[9px] font-bold text-amber-400 uppercase px-1">Prossimo</span>
                    </div>
                    <span className="block text-sm font-bold text-white group-hover:text-amber-400 mb-1 truncate pr-8">{nextWorkout.title}</span>
                    <span className="text-xs text-slate-400 block">{new Date(nextWorkout.date).toLocaleDateString()} - {nextWorkout.activityType}</span>
                </button>
            )}
            <button onClick={() => setMenuStep('main')} className="text-xs font-black text-slate-500 hover:text-white uppercase mt-2 text-center tracking-widest">Torna al Menu Principale</button>
        </div>
    );

    const RaceMenu = () => (
        <div className="flex flex-col gap-4 animate-fade-in">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 border-b border-slate-700 pb-2">Virtual Race Mode</h3>
            <button onClick={() => { onEnterRaceMode?.(); }} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-green-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-green-400 mb-1">🏎️ Gestione Griglia Gara</span>
                <span className="text-xs text-slate-400">Seleziona le tracce dallo storico e avvia il replay simultaneo.</span>
            </button>
            <button onClick={() => opponentInputRef.current?.click()} className="p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-600 rounded-xl text-left transition-all hover:border-purple-500 group">
                <span className="block text-sm font-bold text-white group-hover:text-purple-400 mb-1">👻 Sfida Runner Esterno (Ghost)</span>
                <span className="text-xs text-slate-400">Carica un GPX esterno per usarlo come avversario temporaneo.</span>
                <input type="file" ref={opponentInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleOpponentUpload} />
            </button>
            <button onClick={() => setMenuStep('main')} className="text-xs font-black text-slate-500 hover:text-white uppercase mt-2 text-center tracking-widest">Torna al Menu Principale</button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[5000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700/50 ring-1 ring-white/10 relative" onClick={e => e.stopPropagation()}>
                {isGuest ? (
                    <div className="bg-amber-600 text-white text-[10px] font-black text-center py-1 uppercase tracking-widest shadow-md z-20 relative">⚠️ Modalità Ospite: Dati salvati solo localmente</div>
                ) : (
                    <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-black text-center py-1 uppercase tracking-widest shadow-md z-20 relative">☁️ Connesso al Database Cloud</div>
                )}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none"></div>
                <header className="p-6 md:p-8 text-center relative z-10">
                    <div className="flex justify-center mb-4"><LargeLogoIcon /></div>
                    <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase mb-1">Ciao, <span className="text-cyan-400">{userProfile?.name || 'Atleta'}</span></h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                         <button onClick={onOpenChangelog} className="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider hover:bg-slate-700 hover:text-white transition-colors">v1.41</button>
                        <span className={`border text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${trackCount > 0 ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{trackCount} {trackCount === 1 ? 'Attività' : 'Attività'}</span>
                    </div>
                </header>
                <div className="px-6 md:px-8 pb-8">
                    {menuStep === 'main' ? <MainMenu /> : menuStep === 'analyze' ? <AnalyzeMenu /> : menuStep === 'plan' ? <PlanMenu /> : <RaceMenu />}
                </div>
                
                <footer className="bg-slate-950/50 p-4 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 relative gap-4 md:gap-0">
                    <div className="flex w-full md:w-auto justify-between md:justify-start gap-2 md:gap-6">
                        <button onClick={onOpenProfile} className="hover:text-white transition-colors flex flex-col md:flex-row items-center gap-1">
                            <UserIcon /> 
                            <span>Profilo</span>
                        </button>
                        <button onClick={onOpenSettings} className="hover:text-white transition-colors flex flex-col md:flex-row items-center gap-1">
                            <CogIcon /> 
                            <span>Impostazioni</span>
                        </button>
                        <button onClick={onOpenHelp} className="hover:text-white transition-colors flex flex-col md:flex-row items-center gap-1">
                            <HelpIcon /> 
                            <span>Guida</span>
                        </button>
                    </div>
                    
                    <div className="flex w-full md:w-auto justify-center md:justify-end gap-6 md:gap-4 border-t md:border-t-0 border-slate-800/50 pt-3 md:pt-0">
                        <button onClick={handleRestart} className="hover:text-amber-400 transition-colors flex flex-col md:flex-row items-center gap-1" title="Riavvia App">
                            <ReloadIcon />
                            <span>Riavvia</span>
                        </button>
                        {onManualCloudSave && !isGuest && (
                            <button onClick={onManualCloudSave} className="hover:text-green-400 transition-colors flex flex-col md:flex-row items-center gap-1" title="Sincronizza ora">
                                <CloudUpIcon /> 
                                <span>Cloud</span>
                            </button>
                        )}
                        {isGuest ? (
                            <button onClick={onLogin} className="hover:text-cyan-400 transition-colors flex flex-col md:flex-row items-center gap-1 text-cyan-500 font-black">
                                <LoginIcon /> 
                                <span>Accedi</span>
                            </button>
                        ) : (
                            <button onClick={onLogout} className="hover:text-red-400 transition-colors flex flex-col md:flex-row items-center gap-1">
                                <LogoutIcon /> 
                                <span>Esci</span>
                            </button>
                        )}
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
