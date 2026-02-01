
import React, { useState, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, ApiUsageStats, ActivityType } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';
import TrackPreview from './TrackPreview';

const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414Z" clipRule="evenodd" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);
const MergeTracksIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.75 3a.75.75 0 0 0-1.5 0v4a6.5 6.5 0 0 0 6.5 6.5h4.19l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.75A5 5 0 0 1 3.75 7V3Z" clipRule="evenodd" /></svg>);
const ArchiveBoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" /><path fillRule="evenodd" d="M13 9a1 1 0 1 0 0 2h-6a1 1 0 1 0 0-2h6ZM2.75 7A.75.75 0 0 0 2 7.75v8.5c0 .69.56 1.25 1.25 1.25h13.5c.69 0 1.25-.56 1.25-1.25v-8.5A.75.75 0 0 0 17.25 7H2.75Z" clipRule="evenodd" /></svg>);

type GroupingType = 'none' | 'date' | 'distance' | 'type' | 'folder' | 'tag';
type SortType = 'date_desc' | 'date_asc' | 'dist_desc' | 'dist_asc' | 'dur_desc' | 'name_asc';

interface SidebarProps {
    tracks: Track[];
    onFileUpload: (files: File[] | null) => void;
    focusedTrackId: string | null;
    onFocusTrack: (id: string) => void;
    raceSelectionIds: Set<string>;
    onToggleRaceSelection: (id: string) => void;
    onDeselectAll: () => void;
    onSelectAll: () => void;
    onStartRace: () => void;
    onMergeSelected?: () => void;
    hoveredTrackId: string | null;
    onTrackHoverStart: (id: string) => void;
    onTrackHoverEnd: () => void;
    onDeleteTrack: (id: string) => void;
    onDeleteSelected: () => void;
    onViewDetails: (id: string) => void;
    onToggleArchived: (id: string) => void; 
    [key: string]: any;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { 
        tracks, onFileUpload, focusedTrackId, onFocusTrack, 
        raceSelectionIds, onToggleRaceSelection, onSelectAll, onDeselectAll, 
        onStartRace, onDeleteSelected, onViewDetails, 
        hoveredTrackId, onTrackHoverStart, onTrackHoverEnd,
        onToggleArchived, onMergeSelected
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [grouping, setGrouping] = useState<GroupingType>('date');
    const [sort, setSort] = useState<SortType>('date_desc');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const processedTracks = useMemo(() => {
        let list = tracks.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesArchive = showArchived ? t.isArchived : !t.isArchived;
            return matchesSearch && matchesArchive;
        });

        list.sort((a, b) => {
            const timeA = new Date(a.points[0].time).getTime();
            const timeB = new Date(b.points[0].time).getTime();
            switch(sort) {
                case 'date_desc': return timeB - timeA;
                case 'date_asc': return timeA - timeB;
                case 'dist_desc': return b.distance - a.distance;
                case 'dist_asc': return a.distance - b.distance;
                case 'dur_desc': return b.duration - a.duration;
                case 'name_asc': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });

        return list;
    }, [tracks, searchTerm, showArchived, sort]);

    const groupedData = useMemo(() => {
        if (grouping === 'none') return { 'Tutte le attività': processedTracks };

        const groups: Record<string, Track[]> = {};
        processedTracks.forEach(t => {
            let key = 'Altro';
            const date = new Date(t.points[0].time);
            
            if (grouping === 'date') {
                key = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
            } else if (grouping === 'distance') {
                if (t.distance < 5) key = '< 5 km';
                else if (t.distance < 10) key = '5 - 10 km';
                else if (t.distance < 21) key = '10 - 21 km';
                else key = '> 21 km';
            } else if (grouping === 'type') {
                key = t.activityType || 'Non classificato';
            } else if (grouping === 'folder') {
                key = t.folder || 'Senza cartella';
            } else if (grouping === 'tag') {
                key = (t.tags && t.tags.length > 0) ? `#${t.tags[0]}` : 'Nessun tag';
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [processedTracks, grouping]);

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName);
            else next.add(groupName);
            return next;
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-white overflow-hidden">
            <div className="p-3 border-b border-slate-800 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <h2 className="text-sm font-black text-cyan-400 uppercase tracking-tighter italic">Le Mie Corse</h2>
                   <span className="text-[10px] bg-slate-800 px-1.5 rounded font-mono text-slate-500">{processedTracks.length}</span>
                </div>
                <div className="flex gap-1">
                    <Tooltip text="Seleziona Tutto">
                        <button onClick={onSelectAll} className="p-1.5 rounded hover:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase">Tutti</button>
                    </Tooltip>
                    <Tooltip text="Deseleziona Tutto">
                        <button onClick={onDeselectAll} className="p-1.5 rounded hover:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase">Nessuno</button>
                    </Tooltip>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 p-1.5 rounded transition-colors border border-cyan-500/30 ml-1"><UploadIcon /></button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".gpx,.tcx" onChange={e => onFileUpload(e.target.files ? Array.from(e.target.files) : null)} />
            </div>

            <div className="p-2 border-b border-slate-800 bg-slate-900/50 space-y-2 shrink-0">
                <div className="flex gap-1">
                    <input type="text" placeholder="Filtra..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] outline-none focus:border-cyan-500" />
                    <Tooltip text={showArchived ? "Attività" : "Archivio"}>
                        <button onClick={() => setShowArchived(!showArchived)} className={`p-1.5 rounded border transition-colors ${showArchived ? 'bg-amber-600 border-amber-500' : 'border-slate-700 hover:bg-slate-700'}`}><ArchiveBoxIcon /></button>
                    </Tooltip>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex flex-col">
                        <label className="text-slate-500 font-bold uppercase text-[8px] mb-0.5">Raggruppa</label>
                        <select value={grouping} onChange={e => setGrouping(e.target.value as GroupingType)} className="bg-slate-800 border border-slate-700 rounded p-1 outline-none cursor-pointer">
                            <option value="none">Nessuno</option>
                            <option value="date">Mese</option>
                            <option value="distance">Distanza</option>
                            <option value="type">Tipo</option>
                            <option value="folder">Cartella</option>
                            <option value="tag">Tag</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-slate-500 font-bold uppercase text-[8px] mb-0.5">Ordina</label>
                        <select value={sort} onChange={e => setSort(e.target.value as SortType)} className="bg-slate-800 border border-slate-700 rounded p-1 outline-none cursor-pointer">
                            <option value="date_desc">Data (Nuove)</option>
                            <option value="date_asc">Data (Vecchie)</option>
                            <option value="dist_desc">Distanza ↓</option>
                            <option value="dist_asc">Distanza ↑</option>
                            <option value="dur_desc">Durata ↓</option>
                            <option value="name_asc">Nome A-Z</option>
                        </select>
                    </div>
                </div>

                {raceSelectionIds.size > 0 && (
                    <div className="flex gap-1 pt-1 border-t border-slate-800">
                        <button onClick={onStartRace} className="flex-grow bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase py-1.5 rounded">Gara ({raceSelectionIds.size})</button>
                        {raceSelectionIds.size >= 2 && onMergeSelected && (
                            <button onClick={onMergeSelected} className="bg-cyan-700 hover:bg-cyan-600 px-2 rounded"><MergeTracksIcon /></button>
                        )}
                        <button onClick={onDeleteSelected} className="bg-red-900/50 hover:bg-red-900 px-2 rounded"><TrashIcon /></button>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {Object.entries(groupedData).map(([groupName, groupTracks]) => {
                    const isCollapsed = collapsedGroups.has(groupName);
                    return (
                        <div key={groupName} className="mb-1">
                            <div 
                                onClick={() => toggleGroup(groupName)}
                                className="bg-slate-800/40 px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700/50 sticky top-0 z-10 backdrop-blur-sm flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>▼</span>
                                    {groupName} <span className="text-[8px] opacity-60 ml-1">({groupTracks.length})</span>
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className="divide-y divide-slate-800/30">
                                    {groupTracks.map(track => {
                                        const isFocused = focusedTrackId === track.id;
                                        return (
                                            <div 
                                                key={track.id} 
                                                className={`flex items-center p-1.5 hover:bg-slate-800 transition-all group relative ${hoveredTrackId === track.id || isFocused ? 'bg-slate-800/80' : ''}`}
                                                onMouseEnter={() => onTrackHoverStart(track.id)}
                                                onMouseLeave={onTrackHoverEnd}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={raceSelectionIds.has(track.id)} 
                                                    onChange={(e) => { e.stopPropagation(); onToggleRaceSelection(track.id); }} 
                                                    className="mr-2 accent-cyan-500 w-3 h-3 flex-shrink-0 cursor-pointer" 
                                                />
                                                
                                                <div 
                                                    onClick={() => onViewDetails(track.id)}
                                                    className="w-10 h-8 bg-slate-950 rounded border border-slate-700 overflow-hidden mr-2 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-95"
                                                    title="Clicca per analisi dettaglio"
                                                >
                                                    <TrackPreview points={track.points} color={track.color} className="w-full h-full" />
                                                </div>

                                                <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onFocusTrack(track.id)}>
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <span className={`text-[11px] font-bold truncate pr-1 transition-colors ${isFocused ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`}>{track.name}</span>
                                                    </div>
                                                    <div className="flex items-center text-[9px] text-slate-500 font-mono gap-2">
                                                        <span className={isFocused ? 'text-cyan-400' : 'text-cyan-100/70'}>{track.distance.toFixed(1)}k</span>
                                                        <span className="w-px h-2 bg-slate-700"></span>
                                                        <span>{new Date(track.points[0].time).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'})}</span>
                                                        {track.rating && <div className="ml-auto scale-75 origin-right"><RatingStars rating={track.rating} size="xs" /></div>}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 bg-slate-800 shadow-xl rounded px-1 z-20">
                                                    <button onClick={() => onToggleArchived(track.id)} className="p-1 text-slate-500 hover:text-white" title={track.isArchived ? "Ripristina" : "Archivia"}>
                                                        {track.isArchived ? <UploadIcon /> : <ArchiveBoxIcon />}
                                                    </button>
                                                </div>
                                                
                                                {isFocused && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Sidebar;
