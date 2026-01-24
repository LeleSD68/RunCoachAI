
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Track, MonthlyStats, PlannedWorkout, ApiUsageStats } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';
import TrackPreview from './TrackPreview';
import NextWorkoutWidget from './NextWorkoutWidget';
import LoginModal from './LoginModal';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

// Icons
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>);
const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>);

const DiaryIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" /><path d="M4.75 5.5a1.25 1.25 0 0 0-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H4.75Z" /></svg>);
const ChartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>);
const GuideIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7.75-4.25a1.25 1.25 0 1 1 2.5 0c0 .533-.335.918-.78 1.163-.407.224-.72.576-.72 1.087v.25a.75.75 0 0 1-1.5 0v-.25c0-.942.667-1.761 1.547-2.035.25-.078.453-.312.453-.565 0-.138-.112-.25-.25-.25a.25.25 0 0 0-.25.25.75.75 0 0 1-1.5 0 1.75 1.75 0 0 1 1.75-1.75ZM10 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" /></svg>);
const BackupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13.75 7h-3v5.296l1.943-2.048a.75.75 0 0 1 1.114 1.004l-3.25 3.5a.75.75 0 0 1-1.114 0l-3.25-3.5a.75.75 0 1 1 1.114-1.004l1.943 2.048V7h1.5V1.75a.75.75 0 0 0-1.5 0V7h-3A2.25 2.25 0 0 0 4 9.25v7.5A2.25 2.25 0 0 0 6.25 19h7.5A2.25 2.25 0 0 0 16 16.75v-7.5A2.25 2.25 0 0 0 13.75 7Z" /></svg>);
const GridIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" /></svg>);
const MapFileIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 1 1.186-.672h1.314a1.5 1.5 0 0 1 1.186.672l2.36 3.54A1.5 1.5 0 0 1 13.888 7.5H12.5V14a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 7.5 14V7.5H6.112a1.5 1.5 0 0 1-1.315-1.784l2.36-3.54Z" clipRule="evenodd" /><path d="M15.5 8.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-.75.75h-8a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-1.5 0v4.5A2.25 2.25 0 0 0 6 16h8a2.25 2.25 0 0 0 2.25-2.25v-4.5a.75.75 0 0 0-.75-.75Z" /></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-5.5 8a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z" clipRule="evenodd" /></svg>);
const HomeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" /></svg>);

const LogoIcon = () => (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M13.5 2c-5.621 0-10.212 4.43-10.475 10h-3.006l4.492 4.5 4.492-4.5h-2.975c.26-3.902 3.504-7 7.472-7 4.142 0 7.5 3.358 7.5 7.5s-3.358 7.5-7.5 7.5c-2.381 0-4.502-1.119-5.876-2.854l-1.847 2.449c1.919 2.088 4.664 3.405 7.723 3.405 5.799 0 10.5-4.701 10.5-10.5s-4.701-10.5-10.5-10.5z"/>
        </svg>
    </div>
);

type GroupingMode = 'none' | 'folder' | 'distance' | 'date' | 'activity' | 'tag';
type SortOption = 'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc' | 'name_asc' | 'time_desc';

interface SidebarProps {
    tracks: Track[];
    onFileUpload: (files: File[] | null) => void;
    visibleTrackIds: Set<string>;
    onToggleVisibility: (id: string) => void;
    raceSelectionIds: Set<string>;
    onToggleRaceSelection: (id: string) => void;
    onDeselectAll: () => void;
    onSelectAll: () => void;
    onStartRace: () => void;
    onGoToEditor: () => void;
    onCompareSelected?: () => void;
    onPauseRace: () => void;
    onResumeRace: () => void;
    onResetRace: () => void;
    simulationState: 'idle' | 'running' | 'paused' | 'finished';
    simulationTime: number;
    onTrackHoverStart: (id: string) => void;
    onTrackHoverEnd: () => void;
    hoveredTrackId: string | null;
    raceProgress: Map<string, number>;
    simulationSpeed: number;
    onSpeedChange: (speed: number) => void;
    lapTimes: Map<string, number[]>;
    sortOrder: string;
    onSortChange: (order: string) => void;
    onDeleteTrack: (id: string) => void;
    onDeleteSelected: () => void;
    onViewDetails: (id: string) => void;
    onStartAnimation: (id: string) => void;
    raceRanks: Map<string, number>;
    runnerSpeeds: Map<string, number>;
    runnerDistances: Map<string, number>;
    runnerGapsToLeader: Map<string, number>;
    collapsedGroups: Set<string>;
    onToggleGroup: (group: string) => void;
    onOpenChangelog: () => void;
    onOpenProfile: () => void;
    onOpenGuide: () => void;
    onOpenDiary: () => void;
    dailyTokenUsage: { used: number, limit: number };
    onExportBackup: () => void;
    onImportBackup: (file: File) => void;
    onCloseMobile: () => void;
    onUpdateTrackMetadata: (id: string, meta: Partial<Track>) => void;
    onRegenerateTitles: () => void;
    onToggleExplorer: () => void;
    showExplorer: boolean;
    listViewMode: 'full' | 'compact' | 'minimal';
    onListViewModeChange: (mode: 'full' | 'compact' | 'minimal') => void;
    onAiBulkRate: () => void;
    onOpenReview: (id: string) => void;
    mobileRaceMode: boolean;
    monthlyStats: MonthlyStats;
    plannedWorkouts?: PlannedWorkout[];
    onOpenPlannedWorkout?: (id: string) => void;
    apiUsageStats?: ApiUsageStats;
    onOpenPerformanceAnalysis?: () => void; 
    onOpenHub?: () => void;
    onUserLogin?: () => void; 
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { 
        tracks = [], onFileUpload, visibleTrackIds, onToggleVisibility, 
        raceSelectionIds, onToggleRaceSelection, onDeselectAll, onSelectAll,
        onTrackHoverStart, onTrackHoverEnd, hoveredTrackId,
        onOpenProfile, onOpenDiary, onOpenGuide,
        onExportBackup, onCloseMobile,
        onDeleteSelected, onStartRace, onGoToEditor, onCompareSelected,
        onViewDetails,
        monthlyStats,
        listViewMode, onListViewModeChange, onToggleExplorer,
        showExplorer,
        onAiBulkRate,
        simulationState,
        plannedWorkouts = [], onOpenPlannedWorkout,
        apiUsageStats,
        onUpdateTrackMetadata,
        onOpenPerformanceAnalysis,
        onOpenHub,
        onOpenChangelog,
        onUserLogin
    } = props;

    const [groupingMode, setGroupingMode] = useState<GroupingMode>('date');
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [userSession, setUserSession] = useState<any>(null);

    const backupInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
    const isSidebarHovered = useRef(false);

    const isSimulationInProgress = simulationState === 'running' || simulationState === 'paused';

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUserSession(session);
    };

    useEffect(() => {
        checkSession();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileUpload(Array.from(e.target.files));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setShowUserMenu(false);
        setUserSession(null);
    };

    const nextWorkout = useMemo(() => {
        if (!plannedWorkouts.length) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const sorted = [...plannedWorkouts]
            .filter(w => !w.completedTrackId) 
            .map(w => ({ ...w, dateObj: new Date(w.date) }))
            .filter(w => w.dateObj >= now)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
            
        return sorted.length > 0 ? sorted[0] : null;
    }, [plannedWorkouts]);

    const toggleFolder = (folderName: string) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderName)) next.delete(folderName);
            else next.add(folderName);
            return next;
        });
    };

    const sortTracks = (trackList: Track[]) => {
        return trackList.sort((a, b) => {
            switch (sortOption) {
                case 'date_desc': return b.points[0].time.getTime() - a.points[0].time.getTime();
                case 'date_asc': return a.points[0].time.getTime() - b.points[0].time.getTime();
                default: return 0;
            }
        });
    };

    const groupedTracks = useMemo<Record<string, Track[]>>(() => {
        const groups: Record<string, Track[]> = {};
        if (!tracks) return groups;

        const tracksToFilter = isSimulationInProgress ? tracks.filter(t => raceSelectionIds?.has(t.id)) : tracks;
        const tracksToSort = tracksToFilter.filter(t => showArchived ? t.isArchived : !t.isArchived);

        if (groupingMode === 'none') {
            groups['Tutte'] = sortTracks(tracksToSort);
            return groups;
        }
        
        tracksToSort.forEach(t => {
             let groupName = 'Altro';
             if (groupingMode === 'date') groupName = t.points[0].time.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
             else if (groupingMode === 'activity') groupName = t.activityType || 'Altro';
             else groupName = 'Gruppo';
             if (!groups[groupName]) groups[groupName] = [];
             groups[groupName].push(t);
        });
        return groups;
    }, [tracks, groupingMode, sortOption, isSimulationInProgress, raceSelectionIds, showArchived]);

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden border-r border-slate-800 relative">
            <div className="p-3 sm:p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 flex-shrink-0 relative z-50">
                <div className="flex items-center gap-3">
                    <LogoIcon />
                    <h1 className="text-lg sm:text-xl font-black text-cyan-400 italic tracking-tighter">RunCoachAI</h1>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <button 
                            onClick={() => userSession ? setShowUserMenu(!showUserMenu) : setShowLoginModal(true)}
                            className={`p-1.5 rounded-full text-white shadow-lg transition-all border ${userSession ? 'bg-green-600 border-green-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
                            title={userSession ? `Loggato come ${userSession.user.email}` : "Accedi / Registrati"}
                        >
                            <UserIcon />
                        </button>
                        
                        {showUserMenu && userSession && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-fade-in-down">
                                <div className="px-3 py-2 border-b border-slate-700 mb-1">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Utente</p>
                                    <p className="text-xs text-white truncate font-mono">{userSession.user.email}</p>
                                    <div className="mt-1 flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                        <span className={`text-[9px] font-bold uppercase ${isSupabaseConfigured() ? 'text-green-400' : 'text-amber-400'}`}>
                                            {isSupabaseConfigured() ? 'Cloud Attivo' : 'Offline Mode'}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setShowUserMenu(false); onOpenProfile(); }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-left"
                                >
                                    Profilo
                                </button>
                                <button 
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors text-left"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    {!isSimulationInProgress && (
                        <>
                            <div className="relative" ref={addMenuRef}>
                                <Tooltip text="Nuova Corsa" subtext="Importa GPX/TCX" position="left">
                                    <button 
                                        onClick={() => setShowAddMenu(!showAddMenu)}
                                        className={`p-1.5 rounded-full text-white shadow-lg transition-all ${showAddMenu ? 'bg-cyan-500 scale-105' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20 active:scale-95'}`}
                                    >
                                        <PlusIcon />
                                    </button>
                                </Tooltip>
                                
                                {showAddMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-fade-in-down">
                                        <button 
                                            onClick={() => { fileInputRef.current?.click(); setShowAddMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-left"
                                        >
                                            <span className="p-1 bg-cyan-500/20 text-cyan-400 rounded"><MapFileIcon /></span>
                                            Carica Corse (GPX/TCX)
                                        </button>
                                        <button 
                                            onClick={() => { backupInputRef.current?.click(); setShowAddMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-left"
                                        >
                                            <span className="p-1 bg-purple-500/20 text-purple-400 rounded"><BackupIcon /></span>
                                            Importa Backup (JSON)
                                        </button>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleFileChange} />
                        </>
                    )}
                </div>
            </div>

            {nextWorkout && !isSimulationInProgress && (
                <div className="px-3 pt-2">
                    <NextWorkoutWidget 
                        workout={nextWorkout} 
                        onClick={() => onOpenPlannedWorkout?.(nextWorkout.id)}
                    />
                </div>
            )}

            {!isSimulationInProgress && (
                <div className="px-3 pb-2 pt-2 border-b border-slate-800 flex flex-col gap-2 bg-slate-900 flex-shrink-0">
                    <div className="flex gap-2">
                        <select 
                            value={groupingMode} 
                            onChange={e => setGroupingMode(e.target.value as GroupingMode)} 
                            className="flex-grow bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded px-2 py-1.5 outline-none cursor-pointer"
                        >
                            <option value="activity">Gruppo: Tipo</option>
                            <option value="date">Gruppo: Data</option>
                            <option value="none">Gruppo: Nessuno</option>
                        </select>
                    </div>
                </div>
            )}

            <div 
                className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar relative pb-16"
                onMouseEnter={() => isSidebarHovered.current = true}
                onMouseLeave={() => isSidebarHovered.current = false}
            >
                {Object.entries(groupedTracks).map(([groupName, rawGroupTracks]) => {
                    const groupTracks = rawGroupTracks as Track[];
                    // Safety check for Set
                    const isCollapsed = collapsedFolders?.has(groupName);
                    if (groupTracks.length === 0) return null;
                    
                    return (
                        <div key={groupName} className="mb-2">
                            {groupingMode !== 'none' && (
                                <button onClick={() => toggleFolder(groupName)} className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded mb-1 transition-colors group border border-transparent hover:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <ChevronIcon isOpen={!isCollapsed} />
                                        <span className="text-[10px] font-bold uppercase text-cyan-500 tracking-wider truncate max-w-[150px]">{groupName}</span>
                                    </div>
                                    <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 rounded-full font-mono">{groupTracks.length}</span>
                                </button>
                            )}
                            
                            {!isCollapsed && (
                                <ul className="space-y-1 pl-1">
                                    {groupTracks.map(track => {
                                        const isHovered = hoveredTrackId === track.id;
                                        // Safety check for Set
                                        const isSelected = raceSelectionIds?.has(track.id);
                                        
                                        return (
                                            <li 
                                                key={track.id}
                                                ref={(el) => { if (el) itemRefs.current.set(track.id, el); }}
                                                className={`
                                                    rounded-lg border transition-all cursor-pointer group relative p-2 flex items-center gap-3
                                                    ${isHovered ? 'bg-slate-700 border-cyan-500 shadow-md shadow-cyan-500/10 z-10 scale-[1.01]' : 'bg-slate-800/80 border-slate-700/50 hover:bg-slate-700 hover:border-slate-600'}
                                                    ${isSelected ? 'ring-1 ring-cyan-500/50 bg-cyan-900/10' : ''}
                                                `}
                                                onMouseEnter={() => onTrackHoverStart(track.id)}
                                                onMouseLeave={onTrackHoverEnd}
                                                onClick={() => onViewDetails(track.id)}
                                            >
                                                <div className="w-10 h-10 shrink-0 bg-slate-900 rounded overflow-hidden border border-slate-700 relative">
                                                    <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="min-w-0 flex flex-col justify-center flex-grow">
                                                    <div className={`text-xs font-bold truncate ${isHovered ? 'text-cyan-300' : 'text-slate-200'}`}>{track.name}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <RatingStars rating={track.rating} size="xs" />
                                                        <span className="text-[10px] font-mono text-slate-500">{track.distance.toFixed(1)}k</span>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>

            {!isSimulationInProgress && (
                <div className="bg-slate-950 border-t border-slate-800 shrink-0 hidden md:block">
                    <div className="p-2 flex justify-around items-center">
                        <Tooltip text="Home" subtext="Menu Hub" position="top"><button onClick={onOpenHub} className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all"><HomeIcon /></button></Tooltip>
                        <Tooltip text="Explorer" subtext="Galleria attività" position="top"><button onClick={onToggleExplorer} className={`p-2.5 rounded-xl transition-all ${showExplorer ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-400'}`}><GridIcon /></button></Tooltip>
                        <Tooltip text="Diario" subtext="Calendario allenamenti" position="top"><button onClick={onOpenDiary} className="p-2.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-xl transition-all"><DiaryIcon /></button></Tooltip>
                        <Tooltip text="Performance" subtext="Analisi & Previsioni" position="top"><button onClick={onOpenPerformanceAnalysis} className="p-2.5 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded-xl transition-all"><ChartIcon /></button></Tooltip>
                        <Tooltip text="Guida" subtext="Manuale d'uso" position="top"><button onClick={onOpenGuide} className="p-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all"><GuideIcon /></button></Tooltip>
                        <Tooltip text="Backup" subtext="Esporta/Importa dati" position="top"><button onClick={onExportBackup} className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-all"><BackupIcon /></button></Tooltip>
                    </div>
                </div>
            )}

            {showLoginModal && (
                <LoginModal 
                    onClose={() => setShowLoginModal(false)} 
                    onLoginSuccess={() => {
                        setShowLoginModal(false);
                        checkSession(); // FORCE REFRESH HERE
                        if (onUserLogin) onUserLogin();
                    }} 
                    tracks={tracks}
                />
            )}
        </div>
    );
};

export default Sidebar;
