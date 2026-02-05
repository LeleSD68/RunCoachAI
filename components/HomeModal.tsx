
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { PlannedWorkout, UserProfile, CalendarWeather } from '../types';
import { isStravaConnected } from '../services/stravaService';
import { fetchMonthWeather, analyzeRunningConditions, RunConditions } from '../services/weatherService';
import { loadTracksFromDB } from '../services/dbService';
import WeatherForecastModal from './WeatherForecastModal';

interface HomeModalProps {
    onOpenDiary: () => void;
    onOpenExplorer: () => void;
    onOpenHelp: () => void;
    onImportBackup: (file: File) => void;
    onExportBackup: () => void;
    onUploadTracks: (files: File[] | null) => void;
    onClose: () => void;
    onOpenList?: () => void;
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

// --- ICONS ---
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>);

// New Settings Icon (Sliders)
const SettingsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.75 12.75h1.5a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM12 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 6ZM12 18a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 12 18ZM3.75 6.75h1.5a.75.75 0 1 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5ZM5.25 18.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 0 1.5ZM3 12a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3 12ZM9 3.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5ZM12.75 12a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9 15.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" /></svg>);

const HelpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.202a.75.75 0 0 1-1.5 0v-.202c0-1.009.9-1.97 2.028-2.48a5.25 5.25 0 0 0 1.12-.737c.89-.777.89-2.036 0-2.814Zm.122 7.132a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd" /></svg>);
const LogoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 13.5 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>);
const LoginIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" clipRule="evenodd" /></svg>);
const MapIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 1 1.186-.672h1.314a1.5 1.5 0 0 1 1.186.672l2.36 3.54A1.5 1.5 0 0 1 13.888 7.5H12.5V14a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 7.5 14V7.5H6.112a1.5 1.5 0 0 1-1.315-1.784l2.36-3.54Z" clipRule="evenodd" /><path d="M15.5 8.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-.75.75h-8a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-1.5 0v4.5A2.25 2.25 0 0 0 6 16h8a2.25 2.25 0 0 0 2.25-2.25v-4.5a.75.75 0 0 0-.75-.75Z" /></svg>);

// New Social Icon (User Group)
const SocialIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" /></svg>);

const CloudIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 9.75a6 6 0 0 1 11.573-2.226 3.75 3.75 0 0 1 4.133 4.303A4.5 4.5 0 0 1 18 20.25H6.75a5.25 5.25 0 0 1-2.25-10.5Z" clipRule="evenodd" /></svg>);
const RaceIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 2.25a.75.75 0 0 1 .75.75v.54l1.838-.46a9.75 9.75 0 0 1 6.725.738l.108.054a8.25 8.25 0 0 0 5.58.652l3.109-.732a.75.75 0 0 1 .917.81 47.784 47.784 0 0 0 .005 10.337.75.75 0 0 1-.574.812l-3.123.733a9.75 9.75 0 0 1-6.594-.652l-.108-.054a8.25 8.25 0 0 0-5.71-.737l-1.839.46a.75.75 0 0 1-.933-.726V3a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>);
const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5 .75.75 0 0 0 0 1.5Z" /><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" /></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>);
const ArchiveIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" /><path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087Zm6.163 3.75A.75.75 0 0 1 10 12h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>);
const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
        <path d="M12 12.75c2.685 0 5.19-.504 7.078-1.426a.75.75 0 0 0 .397-.677V8.58c0 2.406-3.722 4.42-8.225 4.42-4.503 0-8.225-2.014-8.225-4.42v2.066c0 .262.15.501.397.677C5.31 12.246 7.815 12.75 12 12.75Z" />
        <path d="M12 18.75c2.685 0 5.19-.504 7.078-1.426a.75.75 0 0 0 .397-.677v-2.066c0 2.406-3.722 4.42-8.225 4.42-4.503 0-8.225-2.014-8.225-4.42v2.066c0 .262.15.501.397.677C5.31 18.246 7.815 18.75 12 18.75Z" />
    </svg>
);
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);
const ListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 15.25ZM2 10a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
);
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
    </svg>
);

const LargeLogoIcon = () => (
    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl border border-white/10 p-1.5">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
    </div>
);

const WeatherWidget: React.FC<{ className?: string }> = ({ className }) => {
    const [todaysWeather, setTodaysWeather] = useState<CalendarWeather | null>(null);
    const [runConditions, setRunConditions] = useState<RunConditions | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSearchModal, setShowSearchModal] = useState(false);

    useEffect(() => {
        const loadWeather = async () => {
            try {
                let lat = 41.9028; // Default Rome
                let lon = 12.4964;
                
                if ('geolocation' in navigator) {
                    try {
                        const position: any = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                        });
                        lat = position.coords.latitude;
                        lon = position.coords.longitude;
                    } catch (e) {
                        const tracks = await loadTracksFromDB();
                        if (tracks.length > 0) {
                            lat = tracks[0].points[0].lat;
                            lon = tracks[0].points[0].lon;
                        }
                    }
                }

                const today = new Date();
                const data = await fetchMonthWeather(today.getFullYear(), today.getMonth(), lat, lon);
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                const key = `${y}-${m}-${d}`;
                
                const weather = data[key];
                if (weather) {
                    setTodaysWeather(weather);
                    setRunConditions(analyzeRunningConditions(weather));
                }
            } catch (e) {
                console.warn("Weather widget error", e);
            } finally {
                setLoading(false);
            }
        };
        loadWeather();
    }, []);

    if (loading) return (
        <div className={`bg-slate-800/50 rounded-2xl p-4 flex items-center justify-center min-h-[100px] border border-slate-700 ${className}`}>
            <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700"></div>
                <div className="h-2 w-20 bg-slate-700 rounded"></div>
            </div>
        </div>
    );

    if (!todaysWeather || !runConditions) return null;

    return (
        <>
            <div className={`bg-gradient-to-r ${runConditions.bgGradient} border border-white/10 rounded-2xl p-3 relative overflow-hidden group shadow-lg transition-all hover:shadow-xl ${className}`}>
                {/* Background Icon */}
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 select-none pointer-events-none">
                    {todaysWeather.icon}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center relative z-10 gap-2 h-full">
                    {/* Top/Left: Main Stats */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="text-3xl sm:text-4xl">{todaysWeather.icon}</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-0.5">Oggi</h3>
                                <button 
                                    onClick={() => setShowSearchModal(true)} 
                                    className="bg-black/20 hover:bg-black/40 text-white p-1 rounded transition-colors"
                                    title="Cerca meteo città/gara"
                                >
                                    <SearchIcon />
                                </button>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black text-white">{todaysWeather.maxTemp}°</span>
                                <span className="text-xs sm:text-sm text-white/60 font-medium">/ {todaysWeather.minTemp}°</span>
                            </div>
                            <div className={`text-[9px] font-bold ${runConditions.color} mt-0.5`}>
                                {runConditions.verdict}
                            </div>
                        </div>
                    </div>

                    {/* Middle: Phases (Restored) */}
                    {todaysWeather.details && (
                        <div className="flex items-center gap-2 sm:gap-4 bg-black/10 rounded-lg p-1.5 backdrop-blur-sm border border-white/5 w-full sm:w-auto justify-between sm:justify-center">
                            <div className="flex flex-col items-center px-2 border-r border-white/10 last:border-0">
                                <span className="text-[8px] text-white/50 uppercase font-bold mb-0.5">Mattina</span>
                                <span className="text-sm">{todaysWeather.details.morning.icon}</span>
                                <span className="text-[10px] font-mono font-bold text-white">{todaysWeather.details.morning.temp}°</span>
                            </div>
                            <div className="flex flex-col items-center px-2 border-r border-white/10 last:border-0">
                                <span className="text-[8px] text-white/50 uppercase font-bold mb-0.5">Pom.</span>
                                <span className="text-sm">{todaysWeather.details.afternoon.icon}</span>
                                <span className="text-[10px] font-mono font-bold text-white">{todaysWeather.details.afternoon.temp}°</span>
                            </div>
                            <div className="flex flex-col items-center px-2">
                                <span className="text-[8px] text-white/50 uppercase font-bold mb-0.5">Sera</span>
                                <span className="text-sm">{todaysWeather.details.evening.icon}</span>
                                <span className="text-[10px] font-mono font-bold text-white">{todaysWeather.details.evening.temp}°</span>
                            </div>
                        </div>
                    )}

                    {/* Right: Advice (Hide on very small screens if needed, or keep small) */}
                    <div className="text-right hidden sm:block max-w-[120px]">
                        <div className="bg-white/10 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 inline-block">
                            <p className="text-[9px] text-white leading-tight font-medium truncate">
                                {runConditions.advice}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {showSearchModal && <WeatherForecastModal onClose={() => setShowSearchModal(false)} />}
        </>
    );
};

const HomeModal: React.FC<HomeModalProps> = ({ 
    onOpenDiary, onOpenExplorer, onOpenHelp, onImportBackup, onExportBackup, 
    onUploadTracks, onClose, onOpenList, trackCount, plannedWorkouts = [], onOpenWorkout, 
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
        <div className="fixed inset-0 z-[5000] bg-slate-950 flex flex-col md:bg-black/80 md:backdrop-blur-md md:items-center md:justify-center md:p-6 animate-fade-in font-sans text-white pb-safe">
            
            {/* Main Card Container */}
            <div className="flex flex-col w-full h-full md:max-w-6xl md:h-[85vh] md:bg-slate-900 md:rounded-3xl md:shadow-2xl md:border md:border-slate-800 relative overflow-hidden">
                
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                {/* --- HEADER --- */}
                <header className="p-4 md:px-8 md:py-6 flex justify-between items-center z-10 shrink-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <LargeLogoIcon />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg md:text-2xl font-black italic tracking-tighter uppercase text-white leading-none">
                                    RunCoach <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
                                </h1>
                                <button onClick={onOpenChangelog} className="bg-slate-800 hover:bg-slate-700 text-[9px] font-black text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-700 transition-colors">v1.45</button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-300 font-medium">Ciao, {userProfile?.name || 'Atleta'}</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${isGuest ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
                                    {isGuest ? 'Ospite' : 'Cloud Sync'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all border border-slate-700 shadow-sm"
                    >
                        <MapIcon /> <span>Mappa</span>
                    </button>
                </header>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="flex-grow overflow-y-auto custom-scrollbar z-10 p-2 md:p-8">
                    {activeSection === 'main' ? (
                        <div className="max-w-5xl mx-auto flex flex-col gap-2 md:gap-4 h-full">
                            
                            {/* SECTION 1: DASHBOARD HEADER */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                                <div className="md:col-span-2">
                                    <WeatherWidget className="h-full w-full" />
                                </div>
                                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex flex-col justify-center relative overflow-hidden group hover:border-purple-500/50 transition-colors min-h-[80px]">
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400 text-lg"><CalendarIcon /></span>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Prossimo</span>
                                        </div>
                                    </div>
                                    {nextWorkout ? (
                                        <div className="relative z-10">
                                            <h4 className="text-white font-bold text-sm truncate">{nextWorkout.title}</h4>
                                            <p className="text-xs text-slate-400">{new Date(nextWorkout.date).toLocaleDateString()}</p>
                                        </div>
                                    ) : (
                                        <div className="relative z-10 text-slate-500 text-xs">Nessun programma.</div>
                                    )}
                                    <div className="absolute right-[-10px] bottom-[-10px] opacity-5 text-6xl rotate-12">📅</div>
                                </div>
                            </div>

                            {/* SECTION 2: HERO ACTIONS - Grid 2 columns on mobile now */}
                            <div className="grid grid-cols-2 gap-2 md:gap-4">
                                <button 
                                    onClick={handleUploadClick}
                                    className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-cyan-500 rounded-2xl p-3 md:p-6 relative group overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col justify-between min-h-[100px] md:min-h-[160px]"
                                >
                                    <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-cyan-500/20 p-2 md:p-3 rounded-full text-cyan-400 group-hover:scale-110 transition-transform"><PlusIcon /></div>
                                    <div>
                                        <h3 className="text-lg md:text-3xl font-black text-white uppercase tracking-tight leading-none mb-1">Carica</h3>
                                        <p className="text-[9px] md:text-sm text-slate-400 font-medium hidden md:block">Carica GPX, collega Strava o ripristina backup.</p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[9px] md:text-xs font-bold text-cyan-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                        Inizia <span>→</span>
                                    </div>
                                </button>

                                <button 
                                    onClick={onOpenDiary}
                                    className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 rounded-2xl p-3 md:p-6 relative group transition-all flex flex-col justify-between min-h-[100px] md:min-h-[160px]"
                                >
                                    <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-purple-500/20 p-2 md:p-3 rounded-full text-purple-400 group-hover:scale-110 transition-transform"><CalendarIcon /></div>
                                    <div>
                                        <h3 className="text-lg md:text-3xl font-black text-white uppercase tracking-tight leading-none mb-1">Diario</h3>
                                        <p className="text-[9px] md:text-sm text-slate-400 font-medium hidden md:block">Pianifica allenamenti e ricevi consigli AI.</p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[9px] md:text-xs font-bold text-purple-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                        Apri <span>→</span>
                                    </div>
                                </button>
                            </div>

                            {/* SECTION 3: FEATURES GRID - 4 columns on mobile */}
                            <div className="grid grid-cols-4 gap-2 md:gap-4">
                                <button onClick={onOpenSocial} className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-pink-500 rounded-xl p-2 flex flex-col gap-1 transition-all group min-h-[80px] items-center justify-center md:items-start md:justify-start">
                                    <div className="flex justify-between w-full md:w-auto">
                                        <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400 mx-auto md:mx-0"><SocialIcon /></div>
                                        {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full h-fit animate-pulse absolute top-1 right-1 md:relative md:top-auto md:right-auto">{unreadCount}</span>}
                                    </div>
                                    <div className="text-center md:text-left">
                                        <h4 className="font-bold text-white text-[10px] md:text-sm">Social</h4>
                                        <p className="text-[9px] text-slate-400 hidden md:block">{onlineCount} online</p>
                                    </div>
                                </button>

                                <button onClick={onEnterRaceMode} className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-green-500 rounded-xl p-2 flex flex-col gap-1 transition-all group min-h-[80px] items-center justify-center md:items-start md:justify-start">
                                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400 w-fit mx-auto md:mx-0"><RaceIcon /></div>
                                    <div className="text-center md:text-left">
                                        <h4 className="font-bold text-white text-[10px] md:text-sm">Gara</h4>
                                        <p className="text-[9px] text-slate-400 hidden md:block">Simulazione</p>
                                    </div>
                                </button>

                                <button onClick={onOpenExplorer} className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-2 flex flex-col gap-1 transition-all group min-h-[80px] items-center justify-center md:items-start md:justify-start">
                                    <div className="p-2 bg-slate-700 rounded-lg text-slate-300 w-fit group-hover:text-white mx-auto md:mx-0"><ArchiveIcon /></div>
                                    <div className="text-center md:text-left">
                                        <h4 className="font-bold text-white text-[10px] md:text-sm">Archivio</h4>
                                        <p className="text-[9px] text-slate-400 hidden md:block">{trackCount} attività</p>
                                    </div>
                                </button>

                                {/* Mobile: List Button / Desktop: Changelog */}
                                <button onClick={onOpenList || onOpenChangelog} className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-xl p-2 flex flex-col gap-1 transition-all group min-h-[80px] items-center justify-center md:items-start md:justify-start">
                                    <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 w-fit mx-auto md:mx-0">{onOpenList ? <ListIcon /> : <SparklesIcon />}</div>
                                    <div className="text-center md:text-left">
                                        <h4 className="font-bold text-white text-[10px] md:text-sm">{onOpenList ? 'Lista' : 'Novità'}</h4>
                                        <p className="text-[9px] text-slate-400 hidden md:block">Vedi tutto</p>
                                    </div>
                                </button>
                            </div>

                            {/* SECTION 4: SYSTEM FOOTER (Updated Layout for Mobile Overflow) */}
                            <div className="mt-auto pt-4 border-t border-slate-800/50 flex flex-wrap items-center gap-3">
                                {/* Navigation Group */}
                                <div className="flex gap-2 w-full md:w-auto justify-center md:justify-start">
                                    <button onClick={onOpenProfile} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700">
                                        <UserIcon /> <span className="text-xs font-bold uppercase">Profilo</span>
                                    </button>
                                    <button onClick={onOpenSettings} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700">
                                        <SettingsIcon /> <span className="text-xs font-bold uppercase">Settings</span>
                                    </button>
                                    <button onClick={onOpenHelp} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700">
                                        <HelpIcon /> <span className="text-xs font-bold uppercase">Aiuto</span>
                                    </button>
                                </div>
                                
                                {/* Actions Group */}
                                <div className="flex gap-2 w-full md:w-auto justify-center md:ml-auto">
                                    {onManualCloudSave && !isGuest && (
                                        <button onClick={onManualCloudSave} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-green-900/20 text-green-500/70 hover:text-green-400 transition-colors border border-transparent hover:border-green-500/30" title="Sincronizza">
                                            <CloudIcon /> <span className="md:hidden text-xs font-bold uppercase">Sync</span>
                                        </button>
                                    )}
                                    <button onClick={isGuest ? onLogin : onLogout} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors border border-transparent ${isGuest ? 'hover:bg-green-900/20 text-green-400 hover:border-green-500/30' : 'hover:bg-red-900/20 text-red-400 hover:border-red-500/30'}`}>
                                        {isGuest ? <LoginIcon /> : <LogoutIcon />} <span className="text-xs font-bold uppercase">{isGuest ? 'Login' : 'Logout'}</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        // UPLOAD SECTION (Keeping same logic, just wrapping)
                        <div className="h-full flex flex-col animate-fade-in-right justify-center max-w-2xl mx-auto w-full">
                            <div className="flex items-center gap-3 mb-6">
                                <button onClick={handleBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-700">← Indietro</button>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Carica Attività</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => trackInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-3xl p-6 text-left transition-all group shadow-lg">
                                    <div className="text-3xl mb-3">📂</div>
                                    <h3 className="font-bold text-white text-lg">File Locale</h3>
                                    <p className="text-xs text-slate-400 mt-1">Carica GPX o TCX dal dispositivo.</p>
                                </button>
                                <input type="file" ref={trackInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={(e) => { if(e.target.files?.length) onUploadTracks(Array.from(e.target.files)); handleBack(); }} />

                                <button onClick={onOpenStravaConfig} className={`bg-slate-800 hover:bg-slate-700 border rounded-3xl p-6 text-left transition-all group shadow-lg ${isStravaLinked ? 'border-[#fc4c02]/50' : 'border-slate-600'}`}>
                                    <div className="text-3xl mb-3 text-[#fc4c02]"><StravaIcon /></div>
                                    <h3 className="font-bold text-white text-lg">Strava Sync</h3>
                                    <p className="text-xs text-slate-400 mt-1">{isStravaLinked ? 'Sincronizza le tue corse.' : 'Collega il tuo account.'}</p>
                                </button>

                                <button onClick={() => backupInputRef.current?.click()} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-3xl p-6 text-left transition-all group">
                                    <div className="text-3xl mb-3 text-purple-400"><DatabaseIcon /></div>
                                    <h3 className="font-bold text-white text-lg">Ripristina</h3>
                                    <p className="text-xs text-slate-400 mt-1">Carica un backup .json completo.</p>
                                </button>
                                <input type="file" ref={backupInputRef} accept=".json" className="hidden" onChange={(e) => { if(e.target.files?.[0]) onImportBackup(e.target.files[0]); handleBack(); }} />
                                
                                <button onClick={onExportBackup} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-3xl p-6 text-left transition-all group">
                                    <div className="text-3xl mb-3 text-blue-400"><CloudIcon /></div>
                                    <h3 className="font-bold text-white text-lg">Salva Backup</h3>
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

                /* Custom Scrollbar for Hub */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.5); border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.8); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default HomeModal;
