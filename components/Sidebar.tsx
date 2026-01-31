
import React, { useState, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, ApiUsageStats } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';
import TrackPreview from './TrackPreview';

const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414Z" clipRule="evenodd" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);
const MergeTracksIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.75 3a.75.75 0 0 0-1.5 0v4a6.5 6.5 0 0 0 6.5 6.5h4.19l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.75A5 5 0 0 1 3.75 7V3Z" clipRule="evenodd" /></svg>);
const ArchiveBoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" /><path fillRule="evenodd" d="M13 9a1 1 0 1 0 0 2h-6a1 1 0 1 0 0-2h6ZM2.75 7A.75.75 0 0 0 2 7.75v8.5c0 .69.56 1.25 1.25 1.25h13.5c.69 0 1.25-.56 1.25-1.25v-8.5A.75.75 0 0 0 17.25 7H2.75Z" clipRule="evenodd" /></svg>);
const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>);
const EyeSlashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.59 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" /><path d="M10.748 13.93 5.39 8.57a10.015 10.015 0 0 0-3.39 1.42 1.651 1.651 0 0 0 0 1.186A10.004 10.004 0 0 1 10 17c1.9 0 3.682-.534 5.194-1.465l-2.637-2.637a3.987 3.987 0 0 1-1.808.032Z" /></svg>);
const RectangleStackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.127 3.502c.2.019.4.038.598.058l.175.018a47.092 47.092 0 0 0 3.237.24c.718.036 1.439.057 2.163.064l.95.006c.65 0 1.302-.005 1.954-.015.65-.01 1.304-.025 1.957-.045.312-.01.625-.02.937-.033a1.5 1.5 0 0 1 1.55 1.433l.034.338c.026.26.046.52.062.782.03.52.046 1.04.046 1.562 0 .56-.018 1.119-.054 1.677l-.027.424a1.5 1.5 0 0 1-1.536 1.402l-1.356.027a47.457 47.457 0 0 1-3.264.025 47.472 47.472 0 0 1-3.265-.025l-1.356-.027a1.5 1.5 0 0 1-1.536-1.402l-.027-.424a47.382 47.382 0 0 1-.054-1.677c0-.522.016-1.042.046-1.562l.062-.782a1.5 1.5 0 0 1 1.535-1.393ZM2.872 7.72l.061.782a48.887 48.887 0 0 0 .047 1.562c.036.558.054 1.117.054 1.677 0 .522-.016 1.042-.046 1.562l-.062.782a1.5 1.5 0 0 1-1.535 1.393L1.216 15.46a47.094 47.094 0 0 1-3.237-.24 47.462 47.462 0 0 1-3.265-.417l-.175-.027a1.5 1.5 0 0 1-1.324-1.63l.027-.424c.036-.558.054-1.117.054-1.677 0-.522-.016 1.042-.046-1.562l-.062-.782a1.5 1.5 0 0 1 1.324-1.63l.175-.027a47.383 47.383 0 0 1 3.265-.417 47.09 47.09 0 0 1 3.237-.24l.175-.018a1.5 1.5 0 0 1 1.55 1.433Z" /></svg>);
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
        tracks, onFileUpload, visibleTrackIds, onToggleVisibility, 
        raceSelectionIds, onToggleRaceSelection, onSelectAll, onDeselectAll, 
        onStartRace, onDeleteSelected, onViewDetails, 
        hoveredTrackId, onTrackHoverStart, onTrackHoverEnd,
        onToggleArchived, onMergeSelected, onCompareSelected
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

    const filteredTracks = useMemo(() => {
        return tracks.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesArchive = showArchived ? t.isArchived : !t.isArchived;
            return matchesSearch && matchesArchive;
        });
    }, [tracks, searchTerm, showArchived]);

    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-white">
            <div className="p-4 border-b border-slate-800 shrink-0 flex items-center justify-between">
                <h2 className="text-lg font-bold text-cyan-400">{showArchived ? 'Archivio' : 'Attività'}</h2>
                <button onClick={() => fileInputRef.current?.click()} className="bg-slate-700 hover:bg-slate-600 p-2 rounded transition-colors"><UploadIcon /></button>
                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".gpx,.tcx" onChange={e => onFileUpload(e.target.files ? Array.from(e.target.files) : null)} />
            </div>

            <div className="p-3 border-b border-slate-800 bg-slate-900/50 space-y-3 shrink-0">
                <input type="text" placeholder="Cerca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm outline-none" />
                <div className="flex justify-between items-center text-xs">
                    <div className="flex gap-1">
                        <button onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')} className="p-1.5 rounded border border-slate-700 hover:bg-slate-700"><RectangleStackIcon /></button>
                        <button onClick={() => setShowArchived(!showArchived)} className={`p-1.5 rounded border transition-colors ${showArchived ? 'bg-amber-600 border-amber-500' : 'border-slate-700 hover:bg-slate-700'}`}><ArchiveBoxIcon /></button>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                        <button onClick={onSelectAll} className="text-cyan-400">Tutti</button>
                        <button onClick={onDeselectAll} className="text-slate-400">Nessuno</button>
                    </div>
                </div>

                {raceSelectionIds.size > 0 && (
                    <div className="flex flex-col gap-1 animate-fade-in">
                        <div className="flex gap-1">
                            <button onClick={onStartRace} className="flex-grow bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded">Gara ({raceSelectionIds.size})</button>
                            {raceSelectionIds.size >= 2 && onMergeSelected && (
                                <button onClick={onMergeSelected} className="bg-cyan-700 hover:bg-cyan-600 text-cyan-100 px-3 rounded flex items-center justify-center shadow-lg" title="Unisci Tracce"><MergeTracksIcon /></button>
                            )}
                            <button onClick={onCompareSelected} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 rounded" title="Confronta"><CompareIcon /></button>
                            <button onClick={onDeleteSelected} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-3 rounded" title="Elimina"><TrashIcon /></button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
                {filteredTracks.map(track => (
                    <div 
                        key={track.id} 
                        className={`flex p-2 rounded mb-1 hover:bg-slate-800 transition-colors group relative ${hoveredTrackId === track.id ? 'bg-slate-800' : ''}`}
                        onMouseEnter={() => onTrackHoverStart(track.id)}
                        onMouseLeave={onTrackHoverEnd}
                    >
                        <input type="checkbox" checked={raceSelectionIds.has(track.id)} onChange={() => onToggleRaceSelection(track.id)} className="mr-3 accent-cyan-500" />
                        <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onViewDetails(track.id)}>
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-sm font-medium truncate pr-2">{track.name}</span>
                                {track.rating && <RatingStars rating={track.rating} size="xs" />}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>{new Date(track.points[0].time).toLocaleDateString()}</span>
                                <span>{track.distance.toFixed(2)}km</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onToggleArchived(track.id)} className="p-1 text-slate-500 hover:text-white" title={track.isArchived ? "Ripristina" : "Archivia"}>
                                {track.isArchived ? <UploadIcon /> : <ArchiveBoxIcon />}
                            </button>
                            <button onClick={() => onToggleVisibility(track.id)} className={`p-1 ${visibleTrackIds.has(track.id) ? 'text-cyan-400' : 'text-slate-600'}`}>
                                {visibleTrackIds.has(track.id) ? <EyeIcon /> : <EyeSlashIcon />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
