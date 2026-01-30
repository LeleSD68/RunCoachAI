
import React, { useState, useMemo } from 'react';
import { Track, TrackStats, UserProfile, PlannedWorkout, ApiUsageStats, MonthlyStats } from '../types';
import TrackPreview from './TrackPreview';
import RatingStars from './RatingStars';
import Tooltip from './Tooltip';

// Icons
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" /></svg>;
const StravaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#fc4c02]"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" /></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-400"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-11-4.69v.447a3.5 3.5 0 0 0 1.025 2.475L8.293 10 8 10.293a1 1 0 0 0 0 1.414l1.06 1.06a1.5 1.5 0 0 1 .44 1.061v.363a6.5 6.5 0 0 1-5.5-2.259V10a6.5 6.5 0 0 1 12.5 0Z" clipRule="evenodd" /><path fillRule="evenodd" d="M9 2.5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM5.5 5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM14.5 13a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM12.5 16a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1Z" clipRule="evenodd" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M13.75 7h-3V3.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1V7h-3A2.25 2.25 0 0 0 4 9.25v7.5A2.25 2.25 0 0 0 6.25 19h7.5A2.25 2.25 0 0 0 16 16.75v-7.5A2.25 2.25 0 0 0 13.75 7Z" clipRule="evenodd" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>;
const EyeSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.59 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" /><path d="M10.748 13.93 5.39 8.57a10.015 10.015 0 0 0-3.39 1.42 1.651 1.651 0 0 0 0 1.186A10.004 10.004 0 0 0 9.999 17c1.9 0 3.682-.534 5.194-1.465l-2.637-2.637a3.987 3.987 0 0 1-1.808.032Z" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" /></svg>;
const GridIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" /></svg>;
const DiaryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" /><path d="M4.75 5.5a1.25 1.25 0 0 0-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H4.75Z" /></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" /></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>;
const CheckSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M7.25 2a.75.75 0 0 0-.75.75v.5a.75.75 0 0 0 .75.75h5.5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-5.5Z" /><path fillRule="evenodd" d="M5 6.75A.75.75 0 0 1 5.75 6h8.5a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75h-8.5A.75.75 0 0 1 5 7.25v-.5Zm-1 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75v-.5Z" clipRule="evenodd" /><path d="M2.5 13.5a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75H3.25a.75.75 0 0 1-.75-.75v-.5Z" /></svg>; // Used for Select All icon
const SquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 4h12v12H4z" /></svg>; // Simple Square

interface SidebarProps {
    tracks: Track[];
    onFileUpload: (files: File[] | null) => void;
    visibleTrackIds: Set<string>;
    onToggleVisibility: (id: string) => void;
    raceSelectionIds: Set<string>;
    onToggleRaceSelection: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onStartRace: () => void;
    onGoToEditor: () => void;
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
    lapTimes: Map<string, number>;
    sortOrder: string;
    onSortChange: (order: string) => void;
    onDeleteTrack: (id: string) => void;
    onDeleteSelected: () => void;
    onViewDetails: (id: string) => void;
    onStartAnimation: (id: string) => void;
    raceRanks: Map<string, number>;
    runnerSpeeds: Map<string, number>;
    runnerDistances: Map<string, number>;
    runnerGapsToLeader: Map<string, number | undefined>;
    collapsedGroups: Set<string>;
    onToggleGroup: (group: string) => void;
    onOpenChangelog: () => void;
    onOpenProfile: () => void;
    onOpenGuide: () => void;
    onOpenDiary: () => void;
    dailyTokenUsage: { used: number; limit: number };
    onExportBackup: () => void;
    onImportBackup: (file: File) => void;
    onCloseMobile: () => void;
    onUpdateTrackMetadata: (id: string, metadata: Partial<Track>) => void;
    onRegenerateTitles: () => void;
    onToggleExplorer: () => void;
    showExplorer: boolean;
    listViewMode: 'list' | 'cards';
    onListViewModeChange: (mode: 'list' | 'cards') => void;
    onAiBulkRate: () => void;
    onOpenReview: (id: string) => void;
    mobileRaceMode: boolean;
    monthlyStats: Record<string, MonthlyStats>;
    plannedWorkouts: PlannedWorkout[];
    onOpenPlannedWorkout: (id: string) => void;
    apiUsageStats: ApiUsageStats;
    onOpenHub: () => void;
    onOpenPerformanceAnalysis: () => void;
    onUserLogin: () => void;
    onUserLogout: () => void;
    onCompareSelected: () => void;
    userProfile: UserProfile;
    onOpenSocial: () => void;
    onToggleArchived: (id: string) => void;
    isGuest: boolean;
    onlineCount: number;
    unreadCount: number;
    onTogglePrivacySelected: (isPublic: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    // Destructure props used inside
    const { 
        tracks, visibleTrackIds, raceSelectionIds, hoveredTrackId, 
        onTrackHoverStart, onTrackHoverEnd, onToggleRaceSelection, 
        onViewDetails, onToggleArchived, onUpdateTrackMetadata,
        onOpenHub, onToggleExplorer, showExplorer, onOpenDiary, onOpenSocial, onOpenPerformanceAnalysis,
        onlineCount, unreadCount, simulationState, onSelectAll, onDeselectAll
    } = props;

    const isSimulationInProgress = simulationState === 'running' || simulationState === 'paused';

    // State
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [groupBy, setGroupBy] = useState<'none' | 'folder' | 'date' | 'distance' | 'type' | 'tag'>('date');
    const [showArchived, setShowArchived] = useState(false);
    const [sortOption, setSortOption] = useState('date_desc');

    // Helpers
    const handleToggleGroup = (group: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    };

    const handleEditClick = (id: string) => {
        const t = tracks.find(tr => tr.id === id);
        if (t) {
            setEditingId(id);
            setEditName(t.name);
        }
    };

    const startRenaming = (track: Track) => {
        setEditingId(track.id);
        setEditName(track.name);
    };

    const saveRename = () => {
        if (editingId && editName.trim()) {
            onUpdateTrackMetadata(editingId, { name: editName.trim() });
            setEditingId(null);
        }
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveRename();
        if (e.key === 'Escape') cancelRename();
    };

    // Filter & Sort & Group Logic
    const processedTracks = useMemo(() => {
        let result = tracks.filter(t => showArchived ? true : !t.isArchived);
        
        result.sort((a, b) => {
            switch (sortOption) {
                case 'date_desc': return b.points[0].time.getTime() - a.points[0].time.getTime();
                case 'date_asc': return a.points[0].time.getTime() - b.points[0].time.getTime();
                case 'distance_desc': return b.distance - a.distance;
                case 'distance_asc': return a.distance - b.distance;
                case 'name_asc': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });
        
        return result;
    }, [tracks, showArchived, sortOption]);

    const groupedTracks = useMemo(() => {
        const groups: Record<string, Track[]> = {};
        processedTracks.forEach(t => {
            let key = 'Altro';
            if (groupBy === 'date') {
                key = new Date(t.points[0].time).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            } else if (groupBy === 'folder') {
                key = t.folder || 'Nessuna Cartella';
            } else if (groupBy === 'type') {
                key = t.activityType || 'Altro';
            } else if (groupBy === 'distance') {
                if (t.distance < 5) key = '< 5k';
                else if (t.distance < 10) key = '5k - 10k';
                else if (t.distance < 21) key = '10k - 21k';
                else key = '> 21k';
            } else if (groupBy === 'tag') {
                const firstTag = (t.tags && t.tags.length > 0) ? t.tags[0] : 'Nessun Tag';
                key = firstTag.toUpperCase();
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [processedTracks, groupBy]);

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white border-r border-slate-800">
            {/* Header Title */}
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest">Le Mie Corse</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={onSelectAll} 
                        className="p-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-bold text-slate-300"
                        title="Seleziona Tutto"
                    >
                       <CheckSquareIcon />
                    </button>
                    <button 
                        onClick={onDeselectAll} 
                        className="p-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-bold text-slate-300"
                        title="Deseleziona Tutto"
                    >
                        <SquareIcon />
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="p-2 border-b border-slate-800 flex flex-col gap-2">
                <div className="flex gap-2 justify-between items-center">
                    <select 
                        value={groupBy} 
                        onChange={(e) => setGroupBy(e.target.value as any)}
                        className="bg-slate-800 text-[10px] rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500 flex-grow"
                    >
                        <option value="date">Rag: Data</option>
                        <option value="folder">Rag: Cartella</option>
                        <option value="type">Rag: Tipo</option>
                        <option value="distance">Rag: Dist.</option>
                        <option value="tag">Rag: Tag</option>
                    </select>
                    <select 
                        value={sortOption} 
                        onChange={(e) => setSortOption(e.target.value)}
                        className="bg-slate-800 text-[10px] rounded border border-slate-700 px-2 py-1 outline-none focus:border-cyan-500 flex-grow"
                    >
                        <option value="date_desc">Ord: Recenti</option>
                        <option value="date_asc">Ord: Vecchi</option>
                        <option value="distance_desc">Ord: Lunghi</option>
                        <option value="name_asc">Ord: Nome</option>
                    </select>
                </div>
                <div className="flex justify-between items-center">
                    <button onClick={() => setViewMode(v => v === 'list' ? 'cards' : 'list')} className="p-1 bg-slate-800 rounded border border-slate-700 text-[10px] px-2 w-full text-center hover:bg-slate-700">
                        Vista: {viewMode === 'list' ? 'Compatta' : 'Schede'}
                    </button>
                    <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer select-none ml-2 whitespace-nowrap">
                        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-cyan-500" />
                        Archivio
                    </label>
                </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
                {(Object.entries(groupedTracks) as [string, Track[]][]).map(([group, groupTracks]) => {
                     const isCollapsed = collapsedGroups.has(group);
                     
                     return (
                        <div key={group} className="transition-all duration-300">
                            <div 
                                className="sticky top-0 bg-slate-900 z-10 py-1.5 px-2 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 rounded transition-colors group"
                                onClick={() => handleToggleGroup(group)}
                            >
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300">{group}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-600 font-mono bg-slate-800 px-1.5 rounded border border-slate-700">{groupTracks.length}</span>
                                    <span className={`text-slate-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                                        <ChevronRightIcon />
                                    </span>
                                </div>
                            </div>
                            
                            {!isCollapsed && (
                                <div className={`space-y-1 mt-1 ${viewMode === 'list' ? 'space-y-0' : ''} animate-fade-in`}>
                                    {groupTracks.map(track => {
                                        const isStrava = track.id.startsWith('strava-') || track.tags?.includes('Strava');
                                        return (
                                        <div 
                                            key={track.id} 
                                            className={`
                                                flex flex-col p-2 rounded hover:bg-slate-800 transition-colors group relative 
                                                ${hoveredTrackId === track.id ? 'bg-slate-800' : ''} 
                                                ${viewMode === 'list' ? 'border-b border-slate-800/50 py-2' : 'bg-slate-800/20 mb-2 border border-slate-700/30'}
                                            `}
                                            onMouseEnter={() => onTrackHoverStart(track.id)}
                                            onMouseLeave={onTrackHoverEnd}
                                        >
                                            <div className="flex items-center w-full">
                                                <div className="flex items-center h-full mr-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={raceSelectionIds.has(track.id)} 
                                                        onChange={() => onToggleRaceSelection(track.id)}
                                                        className="accent-cyan-500 cursor-pointer"
                                                    />
                                                </div>
                                                
                                                {viewMode === 'cards' && (
                                                    <div 
                                                        className="mr-3 w-16 h-12 bg-slate-900 rounded overflow-hidden relative cursor-pointer group-inner flex-shrink-0 border border-slate-700"
                                                        onClick={() => onViewDetails(track.id)}
                                                    >
                                                        <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )}

                                                <div className="flex-grow min-w-0">
                                                    {editingId === track.id ? (
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <input 
                                                                type="text" 
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                onKeyDown={handleRenameKeyDown}
                                                                className="w-full bg-slate-950 text-white text-xs border border-cyan-500 rounded px-1 py-0.5 outline-none"
                                                                autoFocus
                                                                onBlur={saveRename}
                                                            />
                                                            <button onClick={saveRename} className="text-green-400 hover:text-green-300"><CheckIcon /></button>
                                                            <button onClick={cancelRename} className="text-red-400 hover:text-red-300"><XMarkIcon /></button>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className="cursor-pointer"
                                                            onClick={() => onViewDetails(track.id)}
                                                            onDoubleClick={(e) => { e.stopPropagation(); startRenaming(track); }}
                                                            title="Doppio clic per rinominare"
                                                        >
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <div className="flex items-center gap-1 truncate">
                                                                    <span className={`text-sm font-medium text-white truncate ${viewMode === 'list' ? 'text-xs' : ''}`}>
                                                                        {track.name}
                                                                    </span>
                                                                    {isStrava && <StravaIcon />}
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    {track.isPublic && <GlobeIcon />} 
                                                                    {track.rating && <RatingStars rating={track.rating} size="xs" />}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                                <span>{new Date(track.points[0].time).toLocaleDateString()}</span>
                                                                <span className="font-mono">{track.distance.toFixed(2)}km</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => onToggleArchived(track.id)} 
                                                        className={`p-1 rounded ${visibleTrackIds.has(track.id) ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
                                                        title={track.isArchived ? "Ripristina" : "Nascondi e Archivia"}
                                                    >
                                                        {track.isArchived ? <UploadIcon /> : (visibleTrackIds.has(track.id) ? <EyeIcon /> : <EyeSlashIcon />)}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEditClick(track.id)}
                                                        className="p-1 text-slate-500 hover:text-white"
                                                        title="Modifica"
                                                    >
                                                        <PencilIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>
                    );
                })}
                {processedTracks.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-8">
                        {showArchived ? 'Nessuna attività in archivio.' : 'Nessuna attività trovata.'}
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            {!isSimulationInProgress && (
                <div className="bg-slate-950 border-t border-slate-800 shrink-0 hidden md:block">
                    <div className="p-2 flex justify-around items-center">
                        <Tooltip text="Home" subtext="Menu Hub" position="top">
                            <button onClick={onOpenHub} className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all">
                                <HomeIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Explorer" subtext="Galleria attività" position="top">
                            <button 
                                onClick={onToggleExplorer} 
                                className={`p-2.5 rounded-xl transition-all ${showExplorer ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-400'}`}
                            >
                                <GridIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Diario" subtext="Calendario allenamenti" position="top">
                            <button onClick={onOpenDiary} className="p-2.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-xl transition-all">
                                <DiaryIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Social" subtext="Amici & Feed" position="top">
                            <button onClick={onOpenSocial} className="p-2.5 text-slate-400 hover:text-pink-400 hover:bg-slate-800 rounded-xl transition-all relative">
                                <UserGroupIcon />
                                {onlineCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-green-500 text-slate-900 text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-slate-900">{onlineCount}</span>
                                )}
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 left-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950"></span>
                                )}
                            </button>
                        </Tooltip>
                        <Tooltip text="Performance" subtext="Analisi & Previsioni" position="top">
                            <button onClick={onOpenPerformanceAnalysis} className="p-2.5 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded-xl transition-all">
                                <ChartIcon />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
