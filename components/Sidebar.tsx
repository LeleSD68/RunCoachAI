
import React, { useState, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, ApiUsageStats } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';

// Icons
const HomeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" /></svg>);
const GridIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" /></svg>);
const DiaryIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" /><path d="M4.75 5.5a1.25 1.25 0 0 0-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H4.75Z" />
    </svg>
);
const ChartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>);
const UserGroupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" /></svg>);
const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414Z" clipRule="evenodd" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);
const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>);
const EyeSlashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.59 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" /><path d="M10.748 13.93 5.39 8.57a10.015 10.015 0 0 0-3.39 1.42 1.651 1.651 0 0 0 0 1.186A10.004 10.004 0 0 0 9.999 17c1.9 0 3.682-.534 5.194-1.465l-2.637-2.637a3.987 3.987 0 0 1-1.808.032Z" /></svg>);
const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" /></svg>);
const CompareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" /></svg>);

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
    dailyTokenUsage: { used: number; limit: number };
    onExportBackup: () => void;
    onImportBackup: (file: File) => void;
    onCloseMobile: () => void;
    onUpdateTrackMetadata: (id: string, meta: Partial<Track>) => void;
    onRegenerateTitles: () => void;
    onToggleExplorer: () => void;
    showExplorer: boolean;
    listViewMode: string;
    onListViewModeChange: (mode: string) => void;
    onAiBulkRate: () => void;
    onOpenReview: (id: string) => void;
    mobileRaceMode: boolean;
    monthlyStats: any;
    plannedWorkouts: PlannedWorkout[];
    onOpenPlannedWorkout: (id: string) => void;
    apiUsageStats: ApiUsageStats;
    onOpenHub: () => void;
    onOpenPerformanceAnalysis: () => void;
    onUserLogin: () => void;
    onCompareSelected: () => void;
    userProfile: UserProfile;
    onOpenSocial: () => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { 
        tracks, onFileUpload, visibleTrackIds, onToggleVisibility, 
        raceSelectionIds, onToggleRaceSelection, onSelectAll, onDeselectAll, 
        onStartRace, onGoToEditor, onDeleteTrack, onDeleteSelected, onViewDetails, 
        hoveredTrackId, onTrackHoverStart, onTrackHoverEnd, simulationState, 
        onOpenDiary, showExplorer, onToggleExplorer,
        onOpenHub, onOpenPerformanceAnalysis, onOpenSocial, onCompareSelected
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [grouping, setGrouping] = useState<'date' | 'month' | 'folder' | 'type'>('month');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileUpload(Array.from(e.target.files));
        }
    };

    const isSimulationInProgress = simulationState === 'running' || simulationState === 'paused' || simulationState === 'finished';

    const filteredTracks = useMemo(() => {
        return tracks.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tracks, searchTerm]);

    const groupedTracks = useMemo(() => {
        const groups: Record<string, Track[]> = {};
        filteredTracks.forEach(t => {
            let key = 'Other';
            if (grouping === 'month') {
                key = new Date(t.points[0].time).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
            } else if (grouping === 'type') {
                key = t.activityType || 'Run';
            } else if (grouping === 'folder') {
                key = t.folder || 'Uncategorized';
            } else {
                key = 'All';
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [filteredTracks, grouping]);

    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 shrink-0 flex items-center justify-between">
                <h2 className="text-lg font-bold text-cyan-400">Attività</h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-xs text-white flex items-center gap-1 transition-colors"
                        title="Carica GPX/TCX"
                    >
                        <UploadIcon />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept=".gpx,.tcx" onChange={handleFileChange} />
                </div>
            </div>

            {/* Controls */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/50 space-y-3 shrink-0">
                <input 
                    type="text" 
                    placeholder="Cerca..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                />
                
                <div className="flex justify-between items-center text-xs">
                    <select 
                        value={grouping} 
                        onChange={(e) => setGrouping(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none"
                    >
                        <option value="month">Mese</option>
                        <option value="type">Tipo</option>
                        <option value="folder">Cartella</option>
                    </select>
                    
                    <div className="flex gap-2">
                        <button onClick={onSelectAll} className="text-cyan-400 hover:text-cyan-300">Tutti</button>
                        <button onClick={onDeselectAll} className="text-slate-400 hover:text-slate-200">Nessuno</button>
                    </div>
                </div>

                {raceSelectionIds.size > 0 && (
                    <div className="flex gap-1 animate-fade-in">
                        <button onClick={onStartRace} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded">
                            Gara ({raceSelectionIds.size})
                        </button>
                        <button onClick={onCompareSelected} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 rounded" title="Confronta">
                            <CompareIcon />
                        </button>
                        <button onClick={onDeleteSelected} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-2 rounded" title="Elimina selezionati">
                            <TrashIcon />
                        </button>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
                {Object.entries(groupedTracks).map(([group, groupTracks]) => (
                    <div key={group}>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-2 sticky top-0 bg-slate-900 z-10 py-1">{group}</h3>
                        <div className="space-y-1">
                            {groupTracks.map(track => (
                                <div 
                                    key={track.id} 
                                    className={`flex items-center p-2 rounded hover:bg-slate-800 transition-colors group relative ${hoveredTrackId === track.id ? 'bg-slate-800' : ''}`}
                                    onMouseEnter={() => onTrackHoverStart(track.id)}
                                    onMouseLeave={onTrackHoverEnd}
                                >
                                    <div className="flex items-center h-full mr-2">
                                        <input 
                                            type="checkbox" 
                                            checked={raceSelectionIds.has(track.id)} 
                                            onChange={() => onToggleRaceSelection(track.id)}
                                            className="accent-cyan-500 cursor-pointer"
                                        />
                                    </div>
                                    
                                    <div 
                                        className="flex-grow min-w-0 cursor-pointer"
                                        onClick={() => onViewDetails(track.id)}
                                    >
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-sm font-medium text-white truncate" title={track.name}>{track.name}</span>
                                            {track.rating && <RatingStars rating={track.rating} size="xs" />}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                                            <span>{new Date(track.points[0].time).toLocaleDateString()}</span>
                                            <span className="font-mono">{track.distance.toFixed(2)}km</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onToggleVisibility(track.id)} 
                                            className={`p-1 rounded ${visibleTrackIds.has(track.id) ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
                                            title={visibleTrackIds.has(track.id) ? "Nascondi da mappa" : "Mostra su mappa"}
                                        >
                                            {visibleTrackIds.has(track.id) ? <EyeIcon /> : <EyeSlashIcon />}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                onToggleRaceSelection(track.id);
                                                // Trigger editor selection via external effect or prop
                                                onGoToEditor(); 
                                            }}
                                            className="p-1 text-slate-500 hover:text-white"
                                            title="Modifica"
                                        >
                                            <PencilIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {filteredTracks.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-8">
                        Nessuna attività trovata.
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
                            <button onClick={onOpenSocial} className="p-2.5 text-slate-400 hover:text-pink-400 hover:bg-slate-800 rounded-xl transition-all">
                                <UserGroupIcon />
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
