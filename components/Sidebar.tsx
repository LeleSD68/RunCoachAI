
import React, { useState, useRef, useMemo } from 'react';
import { Track } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';
import TrackPreview from './TrackPreview';
import MergeConfirmationModal from './MergeConfirmationModal';

const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);
const ArchiveBoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" /><path fillRule="evenodd" d="M13 9a1 1 0 1 0 0 2h-6a1 1 0 1 0 0-2h6ZM2.75 7A.75.75 0 0 0 2 7.75v8.5c0 .69.56 1.25 1.25 1.25h13.5c.69 0 1.25-.56 1.25-1.25v-8.5A.75.75 0 0 0 17.25 7H2.75Z" clipRule="evenodd" /></svg>);
const UnarchiveIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.08l5.925 2.847A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z" clipRule="evenodd" /><path d="M10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Z" /><path d="M7.75 8.25a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z" /></svg>); // Simplified visual for restore
const MergeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.75 3a.75.75 0 0 0-1.5 0v4a6.5 6.5 0 0 0 6.5 6.5h4.19l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.75A5 5 0 0 1 3.75 7V3Z" clipRule="evenodd" /></svg>);
const FolderIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 4.75A2.75 2.75 0 0 1 4.75 2h3.185a.75.75 0 0 1 .53.22l2.25 2.25a.75.75 0 0 0 .53.22h4.005A2.75 2.75 0 0 1 18 7.64v7.61a2.75 2.75 0 0 1-2.75 2.75H4.75A2.75 2.75 0 0 1 2 15.25V4.75Z" /></svg>);
const FlagIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5V15a3 3 0 1 0 6 0V3.5A1.5 1.5 0 0 0 6.5 2h-3Zm11.753 3.29a1 1 0 0 0-1.242-.92l-4.215.91a4.5 4.5 0 0 1-1.796 0l-.603-.13a3 3 0 0 0-3.627 2.112l-.028.113c-.308 1.23.473 2.453 1.726 2.657l.012.002.493.08a4.5 4.5 0 0 1 1.93 5.432l.06-.239c.29-1.157 1.492-1.874 2.645-1.577l4.331 1.116a1 1 0 0 0 1.229-1.233l-.915-8.325Z" clipRule="evenodd" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>);

const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={filled ? "#fbbf24" : "currentColor"} className={`w-4 h-4 ${filled ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'}`}>
        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
    </svg>
);
const StravaSmallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-[#fc4c02]">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

type GroupingType = 'none' | 'date' | 'distance' | 'type' | 'folder' | 'tag';
type SortType = 'date_desc' | 'date_asc' | 'dist_desc' | 'dur_desc' | 'name_asc';

interface SidebarProps {
    tracks: Track[];
    visibleTrackIds: Set<string>;
    focusedTrackId: string | null;
    onFocusTrack: (id: string) => void;
    raceSelectionIds: Set<string>;
    onToggleRaceSelection: (id: string) => void;
    onDeselectAll: () => void;
    onSelectAll: () => void;
    onStartRace: () => void;
    onViewDetails: (id: string) => void;
    onEditTrack: (id: string) => void; 
    onDeleteTrack: (id: string) => void;
    onFileUpload: (files: File[] | null) => void;
    onDeleteSelected: () => void;
    onToggleArchived: (id: string) => void;
    onBulkArchive: () => void;
    onMergeSelected: (deleteOriginals: boolean) => void;
    onToggleFavorite: (id: string) => void;
    onBulkGroup: (folderName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { 
        tracks, focusedTrackId, onFocusTrack, raceSelectionIds, 
        onToggleRaceSelection, onSelectAll, onDeselectAll, 
        onStartRace, onViewDetails, onEditTrack, onDeleteTrack, onBulkArchive, 
        onDeleteSelected, onToggleArchived, onMergeSelected, onToggleFavorite, onBulkGroup
    } = props;

    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [grouping, setGrouping] = useState<GroupingType>('date');
    const [sort, setSort] = useState<SortType>('date_desc');
    const [showMergeConfirm, setShowMergeConfirm] = useState(false);

    const processedTracks = useMemo(() => {
        let list = tracks.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            // Show archived logic: if showArchived is true, show ONLY archived. If false, show ONLY active.
            const matchesArchive = showArchived ? t.isArchived : !t.isArchived;
            const matchesFavorite = showOnlyFavorites ? t.isFavorite : true;
            return matchesSearch && matchesArchive && matchesFavorite;
        });

        list.sort((a, b) => {
            const timeA = new Date(a.points[0].time).getTime();
            const timeB = new Date(b.points[0].time).getTime();
            switch(sort) {
                case 'date_desc': return timeB - timeA;
                case 'date_asc': return timeA - timeB;
                case 'dist_desc': return b.distance - a.distance;
                case 'dur_desc': return b.duration - a.duration;
                case 'name_asc': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });
        return list;
    }, [tracks, searchTerm, showArchived, showOnlyFavorites, sort]);

    const groupedData = useMemo(() => {
        if (grouping === 'none') return { 'Tutte le attività': processedTracks };
        const groups: Record<string, Track[]> = {};
        processedTracks.forEach(t => {
            let key = 'Altro';
            if (grouping === 'date') key = new Date(t.points[0].time).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
            else if (grouping === 'distance') {
                if (t.distance < 5) key = '< 5 km';
                else if (t.distance < 10) key = '5 - 10 km';
                else if (t.distance < 21) key = '10 - 21 km';
                else key = '> 21 km';
            } else if (grouping === 'type') key = t.activityType || 'Non classificato';
            else if (grouping === 'folder') key = t.folder || 'Senza cartella';
            else if (grouping === 'tag') key = (t.tags && t.tags.length > 0) ? `#${t.tags[0]}` : 'Nessun tag';

            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [processedTracks, grouping]);

    const selectedTracksForMerge = useMemo(() => {
        return tracks.filter(t => raceSelectionIds.has(t.id));
    }, [tracks, raceSelectionIds]);

    const handleBulkGroupClick = () => {
        const folderName = prompt("Inserisci il nome della cartella per le corse selezionate:");
        if (folderName !== null) {
            onBulkGroup(folderName.trim());
        }
    };

    const areAllSelected = tracks.length > 0 && raceSelectionIds.size === tracks.length;

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 text-white overflow-hidden relative">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h2 className="text-sm font-black text-cyan-400 uppercase italic">Le Mie Corse</h2>
                <div className="flex gap-2">
                    <Tooltip text={showOnlyFavorites ? "Mostra Tutte" : "Mostra Preferiti"}>
                        <button onClick={() => setShowOnlyFavorites(!showOnlyFavorites)} className={`p-1 rounded transition-colors ${showOnlyFavorites ? 'text-amber-400 bg-amber-900/20' : 'text-slate-500 hover:text-white'}`}>
                            <StarIcon filled={showOnlyFavorites} />
                        </button>
                    </Tooltip>
                    <Tooltip text={showArchived ? "Vedi Attive" : "Vedi Archivio"}>
                        <button onClick={() => setShowArchived(!showArchived)} className={`p-1 rounded transition-colors ${showArchived ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><ArchiveBoxIcon /></button>
                    </Tooltip>
                </div>
            </div>

            <div className="p-2 border-b border-slate-800 bg-slate-950/50 space-y-2 shrink-0">
                <div className="flex gap-2">
                    <input type="text" placeholder="Filtra per nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] outline-none" />
                    <button 
                        onClick={areAllSelected ? onDeselectAll : onSelectAll} 
                        className={`text-[9px] font-bold uppercase border px-2 rounded transition-colors ${areAllSelected ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-500 hover:text-white border-slate-800'}`}
                    >
                        {areAllSelected ? 'Nessuno' : 'Tutti'}
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] uppercase font-bold text-slate-500">
                    <div className="flex flex-col">
                        <span>Raggruppa</span>
                        <select value={grouping} onChange={e => setGrouping(e.target.value as any)} className="bg-slate-800 border border-slate-700 rounded p-1 text-white">
                            <option value="none">Nessuno</option>
                            <option value="date">Per Data</option>
                            <option value="distance">Per Distanza</option>
                            <option value="folder">Per Cartella</option>
                            <option value="type">Per Tipo</option>
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <span>Ordina per</span>
                        <select value={sort} onChange={e => setSort(e.target.value as any)} className="bg-slate-800 border border-slate-700 rounded p-1 text-white">
                            <option value="date_desc">Più Recenti</option>
                            <option value="date_asc">Meno Recenti</option>
                            <option value="dist_desc">Più Lunghe</option>
                            <option value="name_asc">Nome (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={`flex-grow overflow-y-auto custom-scrollbar ${raceSelectionIds.size > 0 ? 'pb-20' : ''}`}>
                {(Object.entries(groupedData) as [string, Track[]][]).map(([groupName, groupTracks]) => (
                    <div key={groupName}>
                        <div className="bg-slate-800/40 px-3 py-1 text-[9px] font-black text-slate-500 uppercase border-b border-slate-800 sticky top-0 z-10 backdrop-blur flex justify-between items-center">
                            <span>{groupName}</span>
                            <span className="opacity-50">{groupTracks.length}</span>
                        </div>
                        {groupTracks.map(track => {
                            const isStrava = track.id.startsWith('strava-') || track.tags?.includes('Strava');
                            return (
                                <div key={track.id} className={`flex items-center p-2 hover:bg-slate-800 transition-all group ${focusedTrackId === track.id ? 'bg-slate-800/80 border-l-2 border-cyan-500' : ''} ${track.isFavorite ? 'ring-1 ring-amber-500/20 ring-inset' : ''}`}>
                                    <input type="checkbox" checked={raceSelectionIds.has(track.id)} onChange={() => onToggleRaceSelection(track.id)} className="mr-2 accent-cyan-500 cursor-pointer" />
                                    
                                    <div onClick={() => onViewDetails(track.id)} className="w-10 h-8 bg-slate-950 rounded border border-slate-700 overflow-hidden mr-2 shrink-0 cursor-pointer opacity-70 hover:opacity-100 transition-opacity relative group/prev">
                                        <TrackPreview points={track.points} color={track.color} className="w-full h-full" />
                                    </div>

                                    <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onFocusTrack(track.id)}>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="text-[11px] font-bold truncate group-hover:text-cyan-400">{track.name}</div>
                                            {isStrava && <StravaSmallIcon />}
                                            {track.isFavorite && <StarIcon filled={true} />}
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-mono">
                                            {track.distance.toFixed(1)}km • {new Date(track.points[0].time).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                        <Tooltip text={track.isArchived ? "Ripristina" : "Archivia"}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onToggleArchived(track.id); }} 
                                                className={`p-1 rounded-md ${track.isArchived ? 'bg-green-900/50 text-green-400 hover:bg-green-900' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                {track.isArchived ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5A.75.75 0 0 1 10 2Z" clipRule="evenodd" /><path fillRule="evenodd" d="M10 10a.75.75 0 0 1 .75.75v.27c2.302.204 4.25 1.543 4.25 4.98a.75.75 0 0 1-1.5 0c0-1.895-.87-2.92-2.583-3.238l-1.917 1.917a.75.75 0 0 1-1.06 0l-1.917-1.917c-1.713.318-2.583 1.343-2.583 3.238a.75.75 0 0 1-1.5 0c0-3.437 1.948-4.776 4.25-4.98v-.27A.75.75 0 0 1 10 10Z" clipRule="evenodd" /></svg> : <ArchiveBoxIcon />}
                                            </button>
                                        </Tooltip>
                                        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(track.id); }} className="p-1 text-slate-400 hover:text-amber-400"><StarIcon filled={track.isFavorite || false} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onEditTrack(track.id); }} className="p-1.5 bg-slate-700 text-slate-300 hover:bg-cyan-600 rounded-md"><PencilIcon /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* COMPACT TOOLBAR - ABSOLUTE POSITIONED FOR STABILITY */}
            {raceSelectionIds.size > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-50">
                    <div className="flex gap-1 items-center">
                        <Tooltip text="Gara Virtuale" position="top">
                            <button onClick={onStartRace} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase px-3 py-2 rounded-lg shadow active:scale-95 transition-all">
                                <FlagIcon /> <span className="hidden sm:inline">Gara</span>
                            </button>
                        </Tooltip>
                        <Tooltip text="Unisci Tracce" position="top">
                            <button onClick={() => setShowMergeConfirm(true)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow active:scale-95 transition-all">
                                <MergeIcon />
                            </button>
                        </Tooltip>
                        <div className="h-6 w-px bg-slate-800 mx-1"></div>
                        <div className="text-[9px] font-mono text-slate-500 font-bold">{raceSelectionIds.size} sel.</div>
                    </div>

                    <div className="flex gap-1">
                        <Tooltip text="Sposta in Cartella" position="top">
                            <button onClick={handleBulkGroupClick} className="p-2 bg-slate-800 hover:bg-purple-600 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all active:scale-95">
                                <FolderIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Archivia Selezionati" position="top">
                            <button onClick={onBulkArchive} className="p-2 bg-slate-800 hover:bg-amber-600 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all active:scale-95">
                                <ArchiveBoxIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Elimina Selezionati" position="top">
                            <button onClick={() => { if(confirm(`Eliminare ${raceSelectionIds.size} corse?`)) onDeleteSelected(); }} className="p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all active:scale-95">
                                <TrashIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Deseleziona Tutto" position="top">
                            <button onClick={onDeselectAll} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <CloseIcon />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}

            {showMergeConfirm && (
                <MergeConfirmationModal 
                    selectedTracks={selectedTracksForMerge}
                    onConfirm={(del) => { setShowMergeConfirm(false); onMergeSelected(del); }}
                    onCancel={() => setShowMergeConfirm(false)}
                />
            )}
        </div>
    );
};

export default Sidebar;
