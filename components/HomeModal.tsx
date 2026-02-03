
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

// Icons
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>);
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.389c-.42.12-.83.263-1.228.428l-1.09-1.09a1.875 1.875 0 0 0-2.652 0l-2.25 2.25a1.875 1.875 0 0 0 0 2.652l1.09 1.09c-.165.398-.309.809-.428 1.228L.683 13.23a1.875 1.875 0 0 0 1.566 1.849l1.554.17c.12.42.263.83.428 1.228l-1.09 1.09a1.875 1.875 0 0 0 0 2.652l2.25 2.25a1.875 1.875 0 0 0 2.652 0l1.09-1.09c.398.165.809.309 1.228.428l.17 1.554a1.875 1.875 0 0 0 1.848 1.566h3.182a1.875 1.875 0 0 0 1.849-1.566l.17-1.554c.42-.12.83-.263 1.228-.428l1.09 1.09a1.875 1.875 0 0 0 2.652 0l2.25-2.25a1.875 1.875 0 0 0 0-2.652l-1.09-1.09c.165-.398.309-.809.428-1.228l1.554-.17a1.875 1.875 0 0 0 1.566-1.849v-3.182a1.875 1.875 0 0 0-1.566-1.849l-1.554-.17c-.12-.42-.263-.83-.428-1.228l1.09-1.09a1.875 1.875 0 0 0 0-2.652l-2.25-2.25a1.875 1.875 0 0 0-2.652 0l-1.09 1.09c-.398-.165-.809-.309-1.228-.428l-.17-1.554a1.875 1.875 0 0 0-1.849-1.566h-3.182Zm-.638 1.95a.375.375 0 0 1 .375-.375h3.182a.375.375 0 0 1 .375.375v.85c0 .552.392 1.03.921 1.136 1.077.215 2.072.7 2.922 1.36a1.125 1.125 0 0 0 1.401-.065l.6-.6a.375.375 0 0 1 .53 0l2.25 2.25a.375.375 0 0 1 0 .53l-.6.6a1.125 1.125 0 0 0 .065 1.401c.66.85 1.145 1.845 1.36 2.922.106.529.584.921 1.136.921h.85a.375.375 0 0 1 .375.375v3.182a.375.375 0 0 1-.375.375h-.85a1.125 1.125 0 0 0-1.136.921c-.215 1.077-.7 2.072-1.36 2.922a1.125 1.125 0 0 0 .065 1.401l.6.6a.375.375 0 0 1 0 .53l-2.25 2.25a.375.375 0 0 1-.53 0l-.6-.6a1.125 1.125 0 0 0-1.401-.065c-.85.66-1.846 1.145-2.922 1.36a1.125 1.125 0 0 0-.921 1.136v.85a.375.375 0 0 1-.375.375h-3.182a.375.375 0 0 1-.375-.375v-.85a1.125 1.125 0 0 0-.921-1.136c-1.077-.215-2.072-.7-2.922-1.36a1.125 1.125 0 0 0-1.401.065l-.6.6a.375.375 0 0 1-.53 0l-2.25-2.25a.375.375 0 0 1 0-.53l.6.6a1.125 1.125 0 0 0-1.401.065c.85-.66 1.845-1.145 2.922-1.36a1.125 1.125 0 0 0 .921-1.136v-.85a.375.375 0 0 1 .375-.375Z" clipRule="evenodd" /><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>);
const HelpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.202a.75.75 0 0 1-1.5 0v-.202c0-1.009.9-1.97 2.028-2.48a5.25 5.25 0 0 0 1.12-.737c.89-.777.89-2.036 0-2.814Zm.122 7.132a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd" /></svg>);
const LogoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 13.5 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>);
const MapIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 1 1.186-.672h1.314a1.5 1.5 0 0 1 1.186.672l2.36 3.54A1.5 1.5 0 0 1 13.888 7.5H12.5V14a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 7.5 14V7.5H6.112a1.5 1.5 0 0 1-1.315-1.784l2.36-3.54Z" clipRule="evenodd" /><path d="M15.5 8.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-.75.75h-8a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-1.5 0v4.5A2.25 2.25 0 0 0 6 16h8a2.25 2.25 0 0 0 2.25-2.25v-4.5a.75.75 0 0 0-.75-.75Z" /></svg>);
const ChatSocialIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-2.351a4.494 4.494 0 0 0-2.139-3.862 13.946 13.946 0 0 0-1.106-6.502c.433-2.615 2.139-5.402 2.158-5.627Zm6.077 8.01c-1.355 0-2.54.89-2.54 1.989v.213c0 1.098 1.185 1.989 2.54 1.989 1.355 0 2.54-.89 2.54-1.99v-.212c0-1.098-1.185-1.989-2.54-1.989Z" />
        <path fillRule="evenodd" d="M12.552 6.533a3.507 3.507 0 0 0-1.047-.134 49.337 49.337 0 0 0-8.42 0C2.463 6.452 1.5 6.945 1.5 8.07 1.5 10.521 3.262 12.7 5 14.163a2.535 2.535 0 0 0 1.13.435 6.402 6.402 0 0 1-.954.912c-1.294 1.077-1.43 2.164-.26 2.37.917.158 1.93.308 2.87.308.286 0 .584-.04.915-.12a6.47 6.47 0 0 1 3.844-3.513v-8.02Z" clipRule="evenodd" />
    </svg>
);
const CloudIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 9.75a6 6 0 0 1 11.573-2.226 3.75 3.75 0 0 1 4.133 4.303A4.5 4.5 0 0 1 18 20.25H6.75a5.25 5.25 0 0 1-2.25-10.5Z" clipRule="evenodd" /></svg>);
const RaceIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M3 2.25a.75.75 0 0 1 .75.75v.54l1.838-.46a9.75 9.75 0 0 1 6.725.738l.108.054a8.25 8.25 0 0 0 5.58.652l3.109-.732a.75.75 0 0 1 .917.81 47.784 47.784 0 0 0 .005 10.337.75.75 0 0 1-.574.812l-3.123.733a9.75 9.75 0 0 1-6.594-.652l-.108-.054a8.25 8.25 0 0 0-5.71-.737l-1.839.46a.75.75 0 0 1-.933-.726V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>);
const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5Z" /><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" /></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>);
const ArchiveIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" /><path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087Zm6.163 3.75A.75.75 0 0 1 10 12h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>);
const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
        <path d="M12 12.75c2.685 0 5.19-.504 7.078-1.426a.75.75 0 0 0 .397-.677V8.58c0 2.406-3.722 4.42-8.225 4.42-4.503 0-8.225-2.014-8.225-4.42v2.066c0 .262.15.501.397.677C5.31 12.246 7.815 12.75 12 12.75Z" />
        <path d="M12 18.75c2.685 0 5.19-.504 7.078-1.426a.75.75 0 0 0 .397-.677v-2.066c0 2.406-3.722 4.42-8.225 4.42-4.503 0-8.225-2.014-8.225-4.42v2.066c0 .262.15.501.397.677C5.31 18.246 7.815 18.75 12 18.75Z" />
    </svg>
);

const LargeLogoIcon = () => (
    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl border border-white/10 p-2">
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
    const [isStravaLinked, setIsStravaLinked] = useState(false);
    const [activeSection, setActiveSection] = useState<'main' | 'upload'>('main');

    useEffect(() => {
        setIsStravaLinked(isStravaConnected());
    }, []);

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

    const handleUploadClick = () => setActiveSection('upload');
    const handleBack = () => setActiveSection('main');

    return (
        <div className="fixed inset-0 z-[5000] bg-slate-950 flex flex-col md:bg-black/80 md:backdrop-blur-md md:items-center md:justify-center md:p-6 animate-fade-in font-sans text-white pb-16 md:pb-0">
            
            {/* Main Card Container */}
            <div className="flex flex-col w-full h-full md:max-w-5xl md:h-[85vh] md:bg-slate-900 md:rounded-3xl md:shadow-2xl md:border md:border-slate-800 relative overflow-hidden">
                
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                {/* --- HEADER --- */}
                <header className="p-5 md:p-8 flex justify-between items-start z-10 shrink-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/50">
                    <div className="flex items-center gap-4">
                        <LargeLogoIcon />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase text-white">
                                    RunCoach <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
                                </h1>
                                <button onClick={onOpenChangelog} className="bg-slate-800 text-[9px] font-black text-slate-400 px-2 py-0.5 rounded border border-slate-700 hover:text-white transition-colors">v1.42</button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs md:text-sm font-medium text-slate-300">Ciao, {userProfile?.name || 'Atleta'}</span>
                                {isGuest ? (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 uppercase font-bold tracking-wider">Ospite</span>
                                ) : (
                                    <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded border border-green-500/30 uppercase font-bold tracking-wider">Cloud Sync</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm transition-all border border-slate-700"
                    >
                        <MapIcon /> 
                        <span>Mappa</span>
                    </button>
                </header>

                {/* --- MAIN GRID CONTENT --- */}
                <div className="flex-grow p-4 md:p-8 overflow-y-auto custom-scrollbar z-10 pb-4 md:pb-8">
                    {activeSection === 'main' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-min">
                            
                            {/* 1. UPLOAD (Hero) */}
                            <button 
                                onClick={handleUploadClick}
                                className="col-span-2 md:row-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-cyan-500 rounded-3xl p-6 relative group overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between text-left min-h-[160px] md:min-h-auto"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-cyan-500/20 p-2 rounded-full text-cyan-400"><PlusIcon /></div>
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2 leading-tight">Carica <br/>& Analizza</h3>
                                    <p className="text-xs md:text-sm text-slate-400 font-medium max-w-[200px]">Importa GPX, collega Strava o carica backup.</p>
                                </div>
                                <div className="mt-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
                                        Nuova Attività <span className="text-lg">→</span>
                                    </div>
                                </div>
                            </button>

                            {/* 2. DIARY */}
                            <button 
                                onClick={onOpenDiary}
                                className="col-span-1 md:row-span-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 rounded-3xl p-4 md:p-5 relative group transition-all text-left flex flex-col justify-between"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400"><CalendarIcon /></div>
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-white mb-1">Diario</h3>
                                    {nextWorkout ? (
                                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50 mt-2">
                                            <p className="text-[9px] text-purple-400 font-black uppercase mb-0.5">Prossimo:</p>
                                            <p className="text-[10px] md:text-xs text-white truncate font-bold">{nextWorkout.title}</p>
                                            <p className="text-[9px] text-slate-400">{new Date(nextWorkout.date).toLocaleDateString()}</p>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 mt-1">Pianifica con AI.</p>
                                    )}
                                </div>
                            </button>

                            {/* 3. EXPLORER */}
                            <button 
                                onClick={onOpenExplorer}
                                className="col-span-1 md:row-span-2 bg-slate-800/30 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-3xl p-4 flex flex-col justify-between group transition-all text-left"
                            >
                                <div className="p-2 bg-slate-700 rounded-xl text-slate-300 group-hover:text-white w-fit"><ArchiveIcon /></div>
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-white">Archivio</h3>
                                    <p className="text-[10px] text-slate-400">{trackCount} attività salvate</p>
                                </div>
                            </button>

                            {/* 4. SOCIAL */}
                            <button 
                                onClick={onOpenSocial}
                                className="col-span-1 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-pink-500 rounded-3xl p-4 relative group transition-all text-left flex flex-col justify-between h-[120px] md:h-auto"
                            >
                                <div className="flex justify-between w-full">
                                    <div className="p-2 bg-pink-500/20 rounded-xl text-pink-400 w-fit mb-2"><ChatSocialIcon /></div>
                                    {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full h-fit shadow-lg animate-pulse">{unreadCount}</span>}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Social</h3>
                                    <p className="text-[10px] text-slate-400">{onlineCount} online</p>
                                </div>
                            </button>

                            {/* 5. RACE */}
                            <button 
                                onClick={onEnterRaceMode}
                                className="col-span-1 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-green-500 rounded-3xl p-4 relative group transition-all text-left flex flex-col justify-between h-[120px] md:h-auto"
                            >
                                <div className="p-2 bg-green-500/20 rounded-xl text-green-400 w-fit mb-2"><RaceIcon /></div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Gara</h3>
                                    <p className="text-[10px] text-slate-400">Simulazione 3D</p>
                                </div>
                            </button>

                            {/* SYSTEM & SETTINGS BAR (Desktop & Mobile Unified) */}
                            <div className="col-span-2 md:col-span-4 mt-2 grid grid-cols-4 md:grid-cols-6 gap-2">
                                <button onClick={onOpenProfile} className="bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 transition-colors">
                                    <UserIcon /> <span className="text-[9px] font-bold uppercase text-slate-400">Profilo</span>
                                </button>
                                <button onClick={onOpenSettings} className="bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 transition-colors">
                                    <CogIcon /> <span className="text-[9px] font-bold uppercase text-slate-400">Settings</span>
                                </button>
                                <button onClick={onOpenHelp} className="bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 transition-colors">
                                    <HelpIcon /> <span className="text-[9px] font-bold uppercase text-slate-400">Aiuto</span>
                                </button>
                                <button onClick={isGuest ? onLogin : onLogout} className="bg-slate-800/60 hover:bg-red-900/20 border border-slate-700 hover:border-red-900/50 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 transition-colors group">
                                    <span className="text-red-400"><LogoutIcon /></span> 
                                    <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-red-400">{isGuest ? 'Login' : 'Esci'}</span>
                                </button>
                                {onManualCloudSave && !isGuest && (
                                    <button onClick={onManualCloudSave} className="hidden md:flex bg-slate-800/60 hover:bg-green-900/20 border border-slate-700 hover:border-green-900/50 rounded-2xl p-3 flex-col items-center justify-center gap-1 transition-colors group">
                                        <span className="text-green-500"><CloudIcon /></span> 
                                        <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-green-400">Sync</span>
                                    </button>
                                )}
                            </div>

                        </div>
                    ) : (
                        // UPLOAD SUB-MENU
                        <div className="h-full flex flex-col animate-fade-in-right">
                            <div className="flex items-center gap-3 mb-6">
                                <button onClick={handleBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">←</button>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Carica Attività</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => trackInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-2xl p-6 text-left transition-all group">
                                    <div className="text-3xl mb-2">📂</div>
                                    <h3 className="font-bold text-white">File GPX / TCX</h3>
                                    <p className="text-xs text-slate-400 mt-1">Carica file dal tuo dispositivo.</p>
                                </button>
                                <input type="file" ref={trackInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={(e) => { if(e.target.files?.length) onUploadTracks(Array.from(e.target.files)); handleBack(); }} />

                                <button onClick={onOpenStravaConfig} className={`bg-slate-800 hover:bg-slate-700 border rounded-2xl p-6 text-left transition-all group ${isStravaLinked ? 'border-[#fc4c02]/50' : 'border-slate-600'}`}>
                                    <div className="text-3xl mb-2 text-[#fc4c02]"><StravaIcon /></div>
                                    <h3 className="font-bold text-white">Strava Sync</h3>
                                    <p className="text-xs text-slate-400 mt-1">{isStravaLinked ? 'Account collegato. Clicca per sincronizzare.' : 'Collega il tuo account Strava.'}</p>
                                </button>

                                <button onClick={() => backupInputRef.current?.click()} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left transition-all group">
                                    <div className="text-3xl mb-2 text-purple-400"><DatabaseIcon /></div>
                                    <h3 className="font-bold text-white">Ripristina Backup</h3>
                                    <p className="text-xs text-slate-400 mt-1">Carica un file .json completo.</p>
                                </button>
                                <input type="file" ref={backupInputRef} accept=".json" className="hidden" onChange={(e) => { if(e.target.files?.[0]) onImportBackup(e.target.files[0]); handleBack(); }} />
                                
                                <button onClick={onExportBackup} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left transition-all group">
                                    <div className="text-3xl mb-2 text-blue-400"><CloudIcon /></div>
                                    <h3 className="font-bold text-white">Salva Backup</h3>
                                    <p className="text-xs text-slate-400 mt-1">Scarica tutti i tuoi dati.</p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                @keyframes fade-in-right { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                .animate-fade-in-right { animation: fade-in-right 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default HomeModal;
