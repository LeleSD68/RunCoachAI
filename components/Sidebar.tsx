
import React, { useState, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, ApiUsageStats, ActivityType } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';
import TrackPreview from './TrackPreview';

const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414Z" clipRule="evenodd" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);

type GroupingType = 'none' | 'date' | 'distance' | 'type';
type SortType = 'date_desc' | 'date_asc' | 'dist_desc';

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
    onDeleteTrack: (id: string) => void;
    onFileUpload: (files: File[] | null) => void;
    onDeleteSelected: () => void;
    onToggleArchived: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { tracks, focusedTrackId, onFocusTrack, raceSelectionIds, onToggleRaceSelection, onSelectAll, onDeselectAll, onStartRace, onViewDetails, onDeleteTrack } = props;
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTracks = useMemo(() => {
        return tracks.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => new Date(b.points[0].time).getTime() - new Date(a.points[0].time).getTime());
    }, [tracks, searchTerm]);

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h2 className="text-sm font-black text-cyan-400 uppercase italic">Le Mie Corse</h2>
                <div className="flex gap-1">
                    <button onClick={onSelectAll} className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-1 hover:text-white">Tutti</button>
                    <button onClick={onDeselectAll} className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-1 hover:text-white">Reset</button>
                </div>
            </div>

            <div className="p-2 border-b border-slate-800">
                <input type="text" placeholder="Filtra..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] outline-none focus:border-cyan-500" />
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {filteredTracks.map(track => {
                    const isSelected = raceSelectionIds.has(track.id);
                    return (
                        <div key={track.id} className={`flex items-center p-2 hover:bg-slate-800 transition-all group ${focusedTrackId === track.id ? 'bg-slate-800/80 border-l-2 border-cyan-500' : ''}`}>
                            <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => onToggleRaceSelection(track.id)} 
                                className="mr-2 accent-cyan-500 w-3.5 h-3.5 cursor-pointer" 
                            />
                            
                            <div 
                                onClick={() => onViewDetails(track.id)}
                                className="w-10 h-8 bg-slate-950 rounded border border-slate-700 overflow-hidden mr-2 shrink-0 cursor-pointer hover:border-cyan-500/50 transition-colors"
                                title="Vedi dettagli analisi"
                            >
                                <TrackPreview points={track.points} color={track.color} className="w-full h-full opacity-70 group-hover:opacity-100" />
                            </div>

                            <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onFocusTrack(track.id)}>
                                <div className="text-[11px] font-bold truncate group-hover:text-cyan-400">{track.name}</div>
                                <div className="text-[9px] text-slate-500 font-mono">{track.distance.toFixed(1)}k • {new Date(track.points[0].time).toLocaleDateString()}</div>
                            </div>

                            <button onClick={() => onDeleteTrack(track.id)} className="p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500"><TrashIcon /></button>
                        </div>
                    );
                })}
            </div>

            {raceSelectionIds.size > 0 && (
                <div className="p-2 border-t border-slate-800 bg-slate-950">
                    <button onClick={onStartRace} className="w-full bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase py-2 rounded shadow-lg">Avvia Gara ({raceSelectionIds.size})</button>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
