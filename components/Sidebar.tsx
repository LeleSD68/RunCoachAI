
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Track, MonthlyStats, PlannedWorkout, ApiUsageStats } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';
import TrackPreview from './TrackPreview';
import NextWorkoutWidget from './NextWorkoutWidget';

// Icons
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>);
const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
);

const EyeSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.533.786.786 0 0 0 0-.886A10.002 10.002 0 0 0 9.297 3.018L3.28 2.22Zm5.706 5.706L7.433 6.372a6 6 0 0 1 8.92 8.92l-1.554-1.554a4 4 0 0 0-5.813-5.812Z" clipRule="evenodd" />
        <path d="M11.531 13.653 3.996 6.117a10.06 10.06 0 0 0-3.332 3.293.786.786 0 0 0 0 .886A10.002 10.002 0 0 0 10 17c1.761 0 3.407-.46 4.848-1.267l-2.222-2.222a4.008 4.008 0 0 1-1.095.142Z" />
    </svg>
);

const DiaryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" />
        <path d="M4.75 5.5a1.25 1.25 0 0 0-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H4.75Z" />
    </svg>
);

const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" />
    </svg>
);

const GuideIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7.75-4.25a1.25 1.25 0 1 1 2.5 0c0 .533-.335.918-.78 1.163-.407.224-.72.576-.72 1.087v.25a.75.75 0 0 1-1.5 0v-.25c0-.942.667-1.761 1.547-2.035.25-.078.453-.312.453-.565 0-.138-.112-.25-.25-.25a.25.25 0 0 0-.25.25.75.75 0 0 1-1.5 0 1.75 1.75 0 0 1 1.75-1.75ZM10 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
    </svg>
);

const BackupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13.75 7h-3v5.296l1.943-2.048a.75.75 0 0 1 1.114 1.004l-3.25 3.5a.75.75 0 0 1-1.114 0l-3.25-3.5a.75.75 0 1 1 1.114-1.004l1.943 2.048V7h1.5V1.75a.75.75 0 0 0-1.5 0V7h-3A2.25 2.25 0 0 0 4 9.25v7.5A2.25 2.25 0 0 0 6.25 19h7.5A2.25 2.25 0 0 0 16 16.75v-7.5A2.25 2.25 0 0 0 13.75 7Z" /></svg>);
const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
    </svg>
);
const CollapseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5v13A1.5 1.5 0 0 0 3.5 18h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 16.5 2h-1ZM9 6.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm0 3.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm0 3.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>);
const MapFileIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 1 1.186-.672h1.314a1.5 1.5 0 0 1 1.186.672l2.36 3.54A1.5 1.5 0 0 1 13.888 7.5H12.5V14a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 7.5 14V7.5H6.112a1.5 1.5 0 0 1-1.315-1.784l2.36-3.54Z" clipRule="evenodd" /><path d="M15.5 8.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-.75.75h-8a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-1.5 0v4.5A2.25 2.25 0 0 0 6 16h8a2.25 2.25 0 0 0 2.25-2.25v-4.5a.75.75 0 0 0-.75-.75Z" /></svg>);

const FavoriteIcon = ({ isFavorite }: { isFavorite: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={isFavorite ? "#fbbf24" : "currentColor"} className="w-3.5 h-3.5">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
    </svg>
);

const ArchiveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" />
        <path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5ZM7 11a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Z" clipRule="evenodd" />
    </svg>
);

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
    </svg>
);

const LayoutIcons = {
    full: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v11.5A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75V4.25Z" /></svg>,
    compact: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10ZM2 15.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 15.25ZM2 10a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>,
    minimal: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Z" /></svg>
};

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
    onCompareSelected?: () => void; // Added for comparison
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
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { 
        tracks, onFileUpload, visibleTrackIds, onToggleVisibility, 
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
        onOpenChangelog
    } = props;

    const [groupingMode, setGroupingMode] = useState<GroupingMode>('date');
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const backupInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);
    
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const isSidebarHovered = useRef(false);

    const isSimulationInProgress = simulationState === 'running' || simulationState === 'paused';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileUpload(Array.from(e.target.files));
        }
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

    useEffect(() => {
        if (hoveredTrackId && !isSidebarHovered.current) {
            const element = itemRefs.current.get(hoveredTrackId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [hoveredTrackId]);

    const toggleFolder = (folderName: string) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderName)) next.delete(folderName);
            else next.add(folderName);
            return next;
        });
    };

    const toggleAllFolders = () => {
        if (collapsedFolders.size > 0) {
            setCollapsedFolders(new Set());
        } else {
            const allGroups = Object.keys(groupedTracks);
            setCollapsedFolders(new Set(allGroups));
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
            }
        };
        if (showAddMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAddMenu]);

    const sortTracks = (trackList: Track[]) => {
        return trackList.sort((a, b) => {
            switch (sortOption) {
                case 'date_desc': return b.points[0].time.getTime() - a.points[0].time.getTime();
                case 'date_asc': return a.points[0].time.getTime() - b.points[0].time.getTime();
                case 'distance_desc': return b.distance - a.distance;
                case 'distance_asc': return a.distance - b.distance;
                case 'time_desc': return b.duration - a.duration;
                case 'name_asc': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });
    };

    const groupedTracks = useMemo<Record<string, Track[]>>(() => {
        const groups: Record<string, Track[]> = {};
        
        const tracksToFilter = isSimulationInProgress ? tracks.filter(t => raceSelectionIds.has(t.id)) : tracks;
        const tracksToSort = tracksToFilter.filter(t => showArchived ? t.isArchived : !t.isArchived);

        if (groupingMode === 'none') {
            groups['Tutte'] = sortTracks(tracksToSort);
            return groups;
        }

        tracksToSort.forEach(t => {
            let groupName = 'Altro';
            if (groupingMode === 'folder') groupName = t.folder || 'Senza Cartella';
            else if (groupingMode === 'distance') {
                 const d = t.distance;
                 if (d < 5) groupName = '< 5 km';
                 else if (d < 10) groupName = '5 - 10 km';
                 else if (d < 15) groupName = '10 - 15 km';
                 else if (d <= 22) groupName = '15 - 22 km';
                 else groupName = '> 22 km';
            } else if (groupingMode === 'date') {
                groupName = t.points[0].time.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
            } else if (groupingMode === 'activity') {
                groupName = t.activityType || 'Altro';
            } else if (groupingMode === 'tag') {
                const firstTag = (t.tags && t.tags.length > 0) ? t.tags[0] : null;
                groupName = firstTag ? `#${firstTag.toUpperCase()}` : 'Nessun Tag';
            }
            
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(t);
        });
        
        Object.keys(groups).forEach(key => {
            groups[key] = sortTracks(groups[key]);
        });

        const sortedGroups: Record<string, Track[]> = {};
        let sortedKeys: string[] = [];

        if (groupingMode === 'date') {
            sortedKeys = Object.keys(groups).sort((a, b) => {
                const dateA = groups[a][0]?.points[0].time.getTime() || 0;
                const dateB = groups[b][0]?.points[0].time.getTime() || 0;
                return dateB - dateA;
            });
        } else if (groupingMode === 'distance') {
            const order = ['< 5 km', '5 - 10 km', '10 - 15 km', '15 - 22 km', '> 22 km'];
            sortedKeys = Object.keys(groups).sort((a, b) => order.indexOf(a) - order.indexOf(b));
        } else {
            sortedKeys = Object.keys(groups).sort();
        }

        sortedKeys.forEach(key => {
            sortedGroups[key] = groups[key];
        });

        return sortedGroups;
    }, [tracks, groupingMode, sortOption, isSimulationInProgress, raceSelectionIds, showArchived]);

    const selectionCount = raceSelectionIds.size;
    const archivedCount = tracks.filter(t => t.isArchived).length;

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden border-r border-slate-800 relative">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 flex-shrink-0 relative z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm border border-slate-800" />
                    <h1 className="text-lg sm:text-xl font-black text-cyan-400 italic tracking-tighter">RunCoachAI</h1>
                </div>
                <div className="flex gap-2 items-center">
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

            {/* Next Workout Widget */}
            {nextWorkout && !isSimulationInProgress && (
                <div className="px-3 pt-2">
                    <NextWorkoutWidget 
                        workout={nextWorkout} 
                        onClick={() => onOpenPlannedWorkout?.(nextWorkout.id)}
                    />
                </div>
            )}

            {/* FILTERS & SORT */}
            {!isSimulationInProgress && (
                <div className="px-3 pb-2 pt-2 border-b border-slate-800 flex flex-col gap-2 bg-slate-900 flex-shrink-0">
                    <div className="flex gap-2">
                        <select 
                            value={groupingMode} 
                            onChange={e => setGroupingMode(e.target.value as GroupingMode)} 
                            className="flex-grow bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded px-2 py-1.5 outline-none cursor-pointer focus:border-cyan-500 hover:bg-slate-750 transition-colors"
                        >
                            <option value="activity">Gruppo: Tipo</option>
                            <option value="date">Gruppo: Data</option>
                            <option value="tag">Gruppo: Tag</option>
                            <option value="folder">Gruppo: Cartella</option>
                            <option value="distance">Gruppo: Distanza</option>
                            <option value="none">Gruppo: Nessuno</option>
                        </select>
                        <Tooltip text={showArchived ? "Torna a Corse Attive" : "Vedi Archivio"} subtext={showArchived ? "Mostra corse principali" : `Mostra ${archivedCount} corse nascoste`} position="bottom">
                            <button 
                                onClick={() => setShowArchived(!showArchived)}
                                className={`p-1.5 border border-slate-700 rounded transition-colors ${showArchived ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <ArchiveIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text={collapsedFolders.size > 0 ? "Espandi Tutto" : "Comprimi Tutto"} subtext="Mostra/Nascondi gruppi" position="bottom">
                            <button 
                                onClick={toggleAllFolders}
                                className="p-1.5 bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <CollapseIcon />
                            </button>
                        </Tooltip>
                    </div>
                    <div className="flex justify-between gap-2">
                        <select 
                            value={sortOption} 
                            onChange={e => setSortOption(e.target.value as SortOption)} 
                            className="flex-grow bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold rounded px-2 py-1.5 outline-none cursor-pointer focus:border-cyan-500 hover:bg-slate-750 transition-colors"
                        >
                            <option value="date_desc">Data (Recenti)</option>
                            <option value="date_asc">Data (Vecchi)</option>
                            <option value="distance_desc">Distanza (Max)</option>
                            <option value="distance_asc">Distanza (Min)</option>
                            <option value="time_desc">Durata (Max)</option>
                            <option value="name_asc">Nome (A-Z)</option>
                        </select>
                        <div className="flex bg-slate-800 rounded border border-slate-700 p-0.5">
                            {(['full', 'compact', 'minimal'] as const).map(mode => (
                                <button key={mode} onClick={() => onListViewModeChange(mode)} className={`p-1 rounded ${listViewMode === mode ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                    {LayoutIcons[mode]()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SELECTION TOOLBAR */}
            {selectionCount > 0 && !isSimulationInProgress && (
                <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 animate-fade-in-down z-20">
                    <div className="flex flex-col gap-2 p-3 bg-cyan-600/10 border border-cyan-500/30 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">{selectionCount} Selezionate</span>
                            <button onClick={onDeselectAll} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase">Annulla</button>
                        </div>
                        <div className="flex gap-2">
                            {selectionCount > 1 ? (
                                <>
                                    <button onClick={onStartRace} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase py-2 px-1 rounded-lg transition-all active:scale-95 shadow-md">🏁 Gara</button>
                                    <button onClick={onCompareSelected} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase py-2 px-1 rounded-lg transition-all active:scale-95 shadow-md">📊 Confronta</button>
                                </>
                            ) : null}
                            <button onClick={onGoToEditor} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase py-2 px-1 rounded-lg transition-all active:scale-95 shadow-md">{selectionCount > 1 ? '🔗 Unisci' : '✂️ Edit'}</button>
                            <button onClick={onDeleteSelected} className="flex-1 bg-red-900/50 hover:bg-red-600 text-white text-[10px] font-black uppercase py-2 px-1 rounded-lg transition-all active:scale-95 shadow-md">🗑️ Elimina</button>
                        </div>
                        <button onClick={onSelectAll} className="text-[9px] font-bold text-slate-500 hover:text-slate-300 underline underline-offset-2">Seleziona tutte ({tracks.length})</button>
                    </div>
                </div>
            )}

            {/* Track List */}
            <div 
                className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar relative pb-16"
                onMouseEnter={() => isSidebarHovered.current = true}
                onMouseLeave={() => isSidebarHovered.current = false}
            >
                {Object.entries(groupedTracks).map(([groupName, rawGroupTracks]) => {
                    const groupTracks = rawGroupTracks as Track[];
                    const isCollapsed = collapsedFolders.has(groupName);
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
                                <ul className={`space-y-1 pl-1 ${listViewMode === 'minimal' ? 'gap-0.5' : 'gap-1'}`}>
                                    {groupTracks.map(track => {
                                        const isHovered = hoveredTrackId === track.id;
                                        const isSelected = raceSelectionIds.has(track.id);
                                        const isVisible = visibleTrackIds.has(track.id);
                                        
                                        return (
                                            <div 
                                                key={track.id}
                                                id={`track-item-${track.id}`}
                                                ref={(el) => {
                                                    if (el) itemRefs.current.set(track.id, el);
                                                    else itemRefs.current.delete(track.id);
                                                }}
                                                className={`
                                                    rounded-lg border transition-all cursor-pointer group relative
                                                    ${isHovered ? 'bg-slate-700 border-cyan-500 shadow-md shadow-cyan-500/10 z-10 scale-[1.01]' : 'bg-slate-800/80 border-slate-700/50 hover:bg-slate-700 hover:border-slate-600'}
                                                    ${isSelected ? 'ring-1 ring-cyan-500/50 bg-cyan-900/10' : ''}
                                                    ${listViewMode === 'full' ? 'p-3' : listViewMode === 'compact' ? 'p-2 flex items-center gap-3' : 'px-2 py-1.5 flex items-center justify-between'}
                                                `}
                                                onMouseEnter={() => onTrackHoverStart(track.id)}
                                                onMouseLeave={onTrackHoverEnd}
                                                onClick={() => onViewDetails(track.id)}
                                            >
                                                {/* Actions row for full mode */}
                                                {listViewMode === 'full' && (
                                                    <div className="flex items-start gap-3 w-full">
                                                        <div className="w-16 h-12 shrink-0 bg-slate-900 rounded-md overflow-hidden border border-slate-700 shadow-sm relative">
                                                            <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover" />
                                                            {track.isFavorite && (
                                                                <div className="absolute top-0 left-0 p-0.5 bg-black/60 rounded-br">
                                                                    <FavoriteIcon isFavorite={true} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <div className="min-w-0 pr-2">
                                                                    <div className={`text-sm font-bold leading-tight truncate ${isHovered ? 'text-cyan-300' : 'text-white'}`}>{track.name}</div>
                                                                    <div className="mt-1 flex items-center gap-1">
                                                                        <RatingStars rating={track.rating} size="xs" />
                                                                        {track.tags?.slice(0, 2).map(tag => (
                                                                            <span key={tag} className="text-[7px] px-1 bg-slate-700 rounded text-slate-400 uppercase font-bold tracking-tighter">#{tag}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <div className="flex items-center gap-1">
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(track.id); }}
                                                                            className={`p-1 rounded hover:bg-slate-600 transition-colors ${isVisible ? 'text-cyan-400' : 'text-slate-600'}`}
                                                                        >
                                                                            {isVisible ? <EyeIcon /> : <EyeSlashIcon />}
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); onUpdateTrackMetadata(track.id, { isArchived: !track.isArchived }); }}
                                                                            className={`p-1 rounded hover:bg-slate-600 transition-colors ${track.isArchived ? 'text-amber-500' : 'text-slate-600'}`}
                                                                            title={track.isArchived ? "Ripristina" : "Archivia"}
                                                                        >
                                                                            <ArchiveIcon />
                                                                        </button>
                                                                        <input type="checkbox" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => onToggleRaceSelection(track.id)} className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-0 cursor-pointer" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-700/50">
                                                                <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-cyan-500 uppercase font-bold tracking-wider">{track.activityType || 'Altro'}</span>
                                                                <div className="text-[10px] font-mono text-slate-400">
                                                                    <span className="text-white font-bold">{track.distance.toFixed(2)} km</span>
                                                                    <span className="mx-1 opacity-50">|</span>
                                                                    <span>{new Date(track.points[0].time).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {(listViewMode === 'compact' || listViewMode === 'minimal') && (
                                                    <>
                                                        <div className="flex items-center gap-2 flex-grow min-w-0">
                                                            {listViewMode === 'compact' && (
                                                                <div className="w-10 h-10 shrink-0 bg-slate-900 rounded overflow-hidden border border-slate-700 relative">
                                                                    <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover" />
                                                                    {track.isFavorite && <div className="absolute top-0 left-0 p-0.5 bg-black/60"><FavoriteIcon isFavorite={true} /></div>}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex flex-col justify-center">
                                                                <div className={`text-xs font-bold truncate ${isHovered ? 'text-cyan-300' : 'text-slate-200'}`}>
                                                                    {track.isFavorite && listViewMode === 'minimal' && <span className="mr-1">★</span>}
                                                                    {track.name}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <RatingStars rating={track.rating} size="xs" />
                                                                    <span className="text-[10px] font-mono text-slate-500">{track.distance.toFixed(1)}k</span>
                                                                    {track.tags?.length ? <span className="text-[8px] text-slate-600">#{track.tags[0]}</span> : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); onToggleVisibility(track.id); }}
                                                                className={`p-1 rounded hover:bg-slate-600 transition-colors ${isVisible ? 'text-cyan-400' : 'text-slate-600'}`}
                                                            >
                                                                {isVisible ? <EyeIcon /> : <EyeSlashIcon />}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onUpdateTrackMetadata(track.id, { isArchived: !track.isArchived }); }}
                                                                className={`p-1 rounded hover:bg-slate-600 transition-colors ${track.isArchived ? 'text-amber-500' : 'text-slate-600'}`}
                                                                title={track.isArchived ? "Ripristina" : "Archivia"}
                                                            >
                                                                <ArchiveIcon />
                                                            </button>
                                                            <input type="checkbox" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => onToggleRaceSelection(track.id)} className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-0 cursor-pointer" />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Stats & Menu */}
            {!isSimulationInProgress && (
                <div className="bg-slate-950 border-t border-slate-800 shrink-0 hidden md:block">
                    <div className="p-3 flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-800">
                        {apiUsageStats ? (
                            <div className="flex items-center gap-4 w-full">
                                <div className="flex flex-col w-1/3">
                                    <div className="flex justify-between mb-0.5">
                                        <span className="font-bold">RPM</span>
                                        <span className={`font-mono ${apiUsageStats.rpm > 10 ? (apiUsageStats.rpm > 14 ? 'text-red-500' : 'text-amber-400') : 'text-slate-400'}`}>
                                            {apiUsageStats.rpm}/{apiUsageStats.limitRpm}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ${apiUsageStats.rpm > 10 ? (apiUsageStats.rpm > 14 ? 'bg-red-500' : 'bg-amber-400') : 'bg-cyan-500'}`} 
                                            style={{ width: `${Math.min(100, (apiUsageStats.rpm / apiUsageStats.limitRpm) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="flex flex-col w-1/3">
                                    <div className="flex justify-between mb-0.5">
                                        <span className="font-bold">Daily</span>
                                        <span className="font-mono text-slate-400">{apiUsageStats.daily}/{apiUsageStats.limitDaily}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 transition-all duration-500" 
                                            style={{ width: `${Math.min(100, (apiUsageStats.daily / apiUsageStats.limitDaily) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="flex flex-col w-1/3">
                                    <div className="flex justify-between mb-0.5">
                                        <span className="font-bold">Tokens</span>
                                        <span className="font-mono text-cyan-400">{apiUsageStats.totalTokens || 0}</span>
                                    </div>
                                </div>
                                <button onClick={onAiBulkRate} className="hover:text-amber-400 transition-colors ml-auto" title="Valuta tutte (Bulk)">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.683a1 1 0 0 1 .633.633l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1-.633-.633L6.95 5.684Z" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-4 w-full justify-between">
                                <span>Mese: <b className="text-slate-300">{monthlyStats.totalDistance.toFixed(1)} km</b></span>
                                <span>Uscite: <b className="text-slate-300">{monthlyStats.activityCount}</b></span>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-2 flex justify-around items-center">
                        <Tooltip text="Home" subtext="Menu Hub" position="top"><button onClick={onOpenHub} className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all"><HomeIcon /></button></Tooltip>
                        <Tooltip text="Explorer" subtext="Galleria attività" position="top"><button onClick={onToggleExplorer} className={`p-2.5 rounded-xl transition-all ${showExplorer ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-400'}`}><GridIcon /></button></Tooltip>
                        <Tooltip text="Diario" subtext="Calendario allenamenti" position="top"><button onClick={onOpenDiary} className="p-2.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-xl transition-all"><DiaryIcon /></button></Tooltip>
                        <Tooltip text="Performance" subtext="Analisi & Previsioni" position="top"><button onClick={onOpenPerformanceAnalysis} className="p-2.5 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded-xl transition-all"><ChartIcon /></button></Tooltip>
                        <Tooltip text="Guida" subtext="Manuale d'uso" position="top"><button onClick={onOpenGuide} className="p-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all"><GuideIcon /></button></Tooltip>
                        <Tooltip text="Backup" subtext="Esporta/Importa dati" position="top"><button onClick={onExportBackup} className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-xl transition-all"><BackupIcon /></button></Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
