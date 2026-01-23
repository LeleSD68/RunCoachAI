
import React, { useState, useMemo } from 'react';
import { Track } from '../types';
import TrackPreview from './TrackPreview';
import RatingStars from './RatingStars';

interface ExplorerViewProps {
    tracks: Track[];
    onClose: () => void;
    onSelectTrack: (id: string) => void;
}

type GroupingMode = 'none' | 'folder' | 'distance' | 'date' | 'activity' | 'tag';
type SortOption = 'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc' | 'name_asc' | 'time_desc';

const ExplorerView: React.FC<ExplorerViewProps> = ({ tracks, onClose, onSelectTrack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [gridCols, setGridCols] = useState(4); // Default 4 cols
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');
    const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');

    // 1. Filter by Search Term
    const filteredTracks = useMemo(() => {
        return tracks.filter(t => 
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (t.activityType && t.activityType.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [tracks, searchTerm]);

    // 2. Sort Logic
    const sortTracks = (trackList: Track[]) => {
        return [...trackList].sort((a, b) => {
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

    // 3. Grouping Logic
    const groupedTracks = useMemo<Record<string, Track[]>>(() => {
        const groups: Record<string, Track[]> = {};
        const tracksToSort = filteredTracks; // Already filtered

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
        
        // Sort inside groups
        Object.keys(groups).forEach(key => {
            groups[key] = sortTracks(groups[key]);
        });

        // Sort Group Keys
        const sortedGroups: Record<string, Track[]> = {};
        let sortedKeys: string[] = [];

        if (groupingMode === 'date') {
            sortedKeys = Object.keys(groups).sort((a, b) => {
                const dateA = groups[a][0]?.points[0].time.getTime() || 0;
                const dateB = groups[b][0]?.points[0].time.getTime() || 0;
                return dateB - dateA; // Newest months first
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
    }, [filteredTracks, groupingMode, sortOption]);

    return (
        <div className="absolute inset-0 z-[3000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden">
            <header className="p-4 bg-slate-800 border-b border-slate-700 shadow-md z-10 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-4">
                        <h2 className="text-xl font-black text-cyan-400 uppercase tracking-tighter italic">Explorer</h2>
                        <button onClick={onClose} className="sm:hidden p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
                            &times;
                        </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <input 
                            type="text" 
                            placeholder="Cerca attività..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 w-full sm:w-64"
                        />
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                            <select 
                                value={groupingMode} 
                                onChange={e => setGroupingMode(e.target.value as GroupingMode)} 
                                className="bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold rounded px-2 py-1.5 outline-none cursor-pointer focus:border-cyan-500 flex-grow sm:flex-grow-0"
                            >
                                <option value="none">Raggruppa: Nessuno</option>
                                <option value="activity">Tipo</option>
                                <option value="date">Data (Mese)</option>
                                <option value="tag">Tag</option>
                                <option value="folder">Cartella</option>
                                <option value="distance">Distanza</option>
                            </select>

                            <select 
                                value={sortOption} 
                                onChange={e => setSortOption(e.target.value as SortOption)} 
                                className="bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold rounded px-2 py-1.5 outline-none cursor-pointer focus:border-cyan-500 flex-grow sm:flex-grow-0"
                            >
                                <option value="date_desc">Data (Recenti)</option>
                                <option value="date_asc">Data (Vecchi)</option>
                                <option value="distance_desc">Distanza (Max)</option>
                                <option value="distance_asc">Distanza (Min)</option>
                                <option value="time_desc">Durata (Max)</option>
                                <option value="name_asc">Nome (A-Z)</option>
                            </select>
                        </div>

                        <div className="flex items-center bg-slate-700 rounded-lg p-1 flex-shrink-0 overflow-x-auto no-scrollbar">
                            {[2, 3, 4, 5, 6].map(cols => (
                                <button 
                                    key={cols}
                                    onClick={() => setGridCols(cols)}
                                    className={`px-2 py-1 text-xs font-bold rounded transition-colors min-w-[24px] ${gridCols === cols ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {cols}
                                </button>
                            ))}
                        </div>

                        <button onClick={onClose} className="hidden sm:block p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors">
                            &times;
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-slate-900">
                {Object.entries(groupedTracks).map(([groupName, tracksInGroup]: [string, Track[]]) => (
                    <div key={groupName} className="mb-8">
                        {groupingMode !== 'none' && (
                            <h3 className="text-sm font-black text-cyan-500 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 py-2">
                                {groupName} <span className="text-slate-500 text-xs ml-2">({tracksInGroup.length})</span>
                            </h3>
                        )}
                        
                        <div 
                            className="grid gap-4" 
                            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(140, 300 / (gridCols/2))}px, 1fr))` }} 
                        >
                            {tracksInGroup.map(track => (
                                <div 
                                    key={track.id} 
                                    onClick={() => onSelectTrack(track.id)}
                                    className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:border-cyan-500/50 hover:shadow-lg transition-all group flex flex-col"
                                >
                                    <div className="relative aspect-video bg-slate-900 overflow-hidden">
                                        <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                                            <RatingStars rating={track.rating} size="xs" />
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-white font-bold border border-slate-700">
                                            {track.distance.toFixed(2)} km
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-bold text-slate-200 truncate mb-1 group-hover:text-cyan-400 transition-colors">{track.name}</h3>
                                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase">
                                            <span>{new Date(track.points[0].time).toLocaleDateString()}</span>
                                            <span>{track.activityType || 'Corsa'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {Object.keys(groupedTracks).length === 0 && (
                    <div className="text-center py-20 text-slate-500">
                        Nessuna attività trovata.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplorerView;
