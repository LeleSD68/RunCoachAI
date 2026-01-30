
import React, { useState, useMemo, useEffect } from 'react';
import { Track } from '../types';
import TrackPreview from './TrackPreview';
import RatingStars from './RatingStars';
import { calculateTrackStats } from '../services/trackStatsService';

interface ExplorerViewProps {
    tracks: Track[];
    onClose: () => void;
    onSelectTrack: (id: string) => void;
}

type GroupingMode = 'none' | 'folder' | 'distance' | 'date' | 'activity' | 'tag';
type SortOption = 'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc' | 'name_asc' | 'time_desc';
type ViewMode = 'grid' | 'table';

// Helper per formattazione
const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '-:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#fc4c02]">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const ExplorerView: React.FC<ExplorerViewProps> = ({ tracks, onClose, onSelectTrack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('table'); // Default to table for Runalize feel
    const [gridCols, setGridCols] = useState(4);
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');
    const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');
    
    // Table Config - Persisted in localStorage
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('explorer_visible_columns');
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load columns preference", e);
        }
        return new Set(['date', 'name', 'activity', 'distance', 'time', 'pace', 'hr', 'elevation']);
    });

    const [showColMenu, setShowColMenu] = useState(false);

    // Effect to save columns preference whenever it changes
    useEffect(() => {
        localStorage.setItem('explorer_visible_columns', JSON.stringify(Array.from(visibleColumns)));
    }, [visibleColumns]);

    const availableColumns = [
        { id: 'date', label: 'Data' },
        { id: 'name', label: 'Nome' },
        { id: 'activity', label: 'Tipo' },
        { id: 'distance', label: 'Distanza' },
        { id: 'time', label: 'Durata' },
        { id: 'pace', label: 'Passo' },
        { id: 'hr', label: 'FC Media' },
        { id: 'power', label: 'Power (W)' },
        { id: 'elevation', label: 'Dislivello' },
        { id: 'rpe', label: 'RPE' },
        { id: 'rating', label: 'Voto' },
        { id: 'efficiency', label: 'Efficienza' } // Custom metric: Speed / HR
    ];

    const toggleColumn = (id: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Pre-calculate stats for sorting/table to avoid recalc on render
    const tracksWithStats = useMemo(() => {
        return tracks.map(t => {
            const stats = calculateTrackStats(t);
            // Efficiency Index: (Speed km/h * 10) / (HR / 150 normalized) -> Rough approximation
            const efficiency = stats.avgHr && stats.avgHr > 0 ? (stats.avgSpeed * 100) / stats.avgHr : 0;
            const isStrava = t.id.startsWith('strava-') || t.tags?.includes('Strava');
            return {
                ...t,
                stats,
                efficiency,
                isStrava
            };
        });
    }, [tracks]);

    // 1. Filter
    const filteredTracks = useMemo(() => {
        return tracksWithStats.filter(t => 
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (t.activityType && t.activityType.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [tracksWithStats, searchTerm]);

    // 2. Sort
    const sortedTracks = useMemo(() => {
        return [...filteredTracks].sort((a, b) => {
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
    }, [filteredTracks, sortOption]);

    // 3. Grouping (Only for Grid Mode usually, but applied to data)
    const groupedTracks = useMemo<Record<string, typeof tracksWithStats>>(() => {
        const groups: Record<string, typeof tracksWithStats> = {};
        
        if (groupingMode === 'none') {
            groups['Tutte'] = sortedTracks;
            return groups;
        }

        sortedTracks.forEach(t => {
            let groupName = 'Altro';
            if (groupingMode === 'folder') groupName = t.folder || 'Senza Cartella';
            else if (groupingMode === 'distance') {
                 const d = t.distance;
                 if (d < 5) groupName = '< 5 km';
                 else if (d < 10) groupName = '5 - 10 km';
                 else if (d < 21) groupName = '10 - 21 km';
                 else if (d <= 42) groupName = '21 - 42 km';
                 else groupName = '> 42 km';
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
        
        return groups;
    }, [sortedTracks, groupingMode]);

    return (
        <div className="absolute inset-0 z-[3000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden">
            <header className="p-4 bg-slate-800 border-b border-slate-700 shadow-md z-10 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onClose} 
                            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors active:scale-95"
                            title="Chiudi Explorer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <h2 className="text-xl font-black text-cyan-400 uppercase tracking-tighter italic">Data Explorer</h2>
                        <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full font-bold">{sortedTracks.length}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <input 
                            type="text" 
                            placeholder="Cerca attività..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 w-48"
                        />
                        
                        {/* View Switcher */}
                        <div className="bg-slate-700 p-1 rounded-lg flex items-center">
                            <button 
                                onClick={() => setViewMode('table')} 
                                className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'table' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
                                Tabella
                            </button>
                            <button 
                                onClick={() => setViewMode('grid')} 
                                className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'grid' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" /></svg>
                                Griglia
                            </button>
                        </div>

                        {viewMode === 'table' ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setShowColMenu(!showColMenu)}
                                    className="bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold rounded px-3 py-1.5 hover:text-white flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" /></svg>
                                    Colonne
                                </button>
                                {showColMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)}></div>
                                        <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-20 w-48 max-h-64 overflow-y-auto">
                                            {availableColumns.map(col => (
                                                <button
                                                    key={col.id}
                                                    onClick={() => toggleColumn(col.id)}
                                                    className="flex items-center w-full px-3 py-2 text-xs font-bold text-left hover:bg-slate-700 rounded transition-colors"
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${visibleColumns.has(col.id) ? 'bg-cyan-600 border-cyan-600' : 'border-slate-500'}`}>
                                                        {visibleColumns.has(col.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                    </div>
                                                    <span className={visibleColumns.has(col.id) ? 'text-white' : 'text-slate-400'}>{col.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <select 
                                    value={groupingMode} 
                                    onChange={e => setGroupingMode(e.target.value as GroupingMode)} 
                                    className="bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold rounded px-2 py-1.5 outline-none cursor-pointer focus:border-cyan-500"
                                >
                                    <option value="none">Raggruppa: No</option>
                                    <option value="date">Data</option>
                                    <option value="distance">Distanza</option>
                                    <option value="activity">Tipo</option>
                                </select>
                                <select 
                                    value={sortOption} 
                                    onChange={e => setSortOption(e.target.value as SortOption)} 
                                    className="bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold rounded px-2 py-1.5 outline-none cursor-pointer focus:border-cyan-500"
                                >
                                    <option value="date_desc">Recenti</option>
                                    <option value="date_asc">Vecchi</option>
                                    <option value="distance_desc">Lunghi</option>
                                    <option value="time_desc">Durata</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-grow overflow-hidden bg-slate-900">
                {viewMode === 'table' ? (
                    <div className="h-full w-full overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-800 sticky top-0 z-10 text-xs uppercase font-black text-slate-400">
                                <tr>
                                    {availableColumns.filter(c => visibleColumns.has(c.id)).map(col => (
                                        <th key={col.id} className="p-3 border-b border-slate-700 whitespace-nowrap">{col.label}</th>
                                    ))}
                                    <th className="p-3 border-b border-slate-700 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-800/50">
                                {sortedTracks.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => onSelectTrack(t.id)}>
                                        {visibleColumns.has('date') && (
                                            <td className="p-3 font-mono text-slate-300">{new Date(t.points[0].time).toLocaleDateString()}</td>
                                        )}
                                        {visibleColumns.has('name') && (
                                            <td className="p-3 font-bold text-white max-w-[200px] truncate group-hover:text-cyan-400 flex items-center gap-2">
                                                {t.name}
                                                {t.isStrava && <StravaIcon />}
                                            </td>
                                        )}
                                        {visibleColumns.has('activity') && (
                                            <td className="p-3"><span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-400">{t.activityType || 'Run'}</span></td>
                                        )}
                                        {visibleColumns.has('distance') && (
                                            <td className="p-3 font-mono text-cyan-100">{t.distance.toFixed(2)} km</td>
                                        )}
                                        {visibleColumns.has('time') && (
                                            <td className="p-3 font-mono text-slate-300">{formatDuration(t.duration)}</td>
                                        )}
                                        {visibleColumns.has('pace') && (
                                            <td className="p-3 font-mono font-bold text-white">{formatPace(t.stats.movingAvgPace)}</td>
                                        )}
                                        {visibleColumns.has('hr') && (
                                            <td className="p-3 font-mono text-red-300">{t.stats.avgHr ? Math.round(t.stats.avgHr) : '-'}</td>
                                        )}
                                        {visibleColumns.has('power') && (
                                            <td className="p-3 font-mono text-purple-300">{t.stats.avgWatts ? Math.round(t.stats.avgWatts) : '-'}</td>
                                        )}
                                        {visibleColumns.has('elevation') && (
                                            <td className="p-3 font-mono text-amber-200">+{Math.round(t.stats.elevationGain)}m</td>
                                        )}
                                        {visibleColumns.has('rpe') && (
                                            <td className="p-3 text-slate-400">{t.rpe ? `${t.rpe}/10` : '-'}</td>
                                        )}
                                        {visibleColumns.has('rating') && (
                                            <td className="p-3"><RatingStars rating={t.rating} size="xs" /></td>
                                        )}
                                        {visibleColumns.has('efficiency') && (
                                            <td className="p-3 font-mono text-emerald-400">{t.efficiency > 0 ? t.efficiency.toFixed(1) : '-'}</td>
                                        )}
                                        <td className="p-3 text-right">
                                            <button className="text-cyan-500 hover:text-white text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Apri</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {sortedTracks.length === 0 && <div className="p-8 text-center text-slate-500">Nessuna attività trovata.</div>}
                    </div>
                ) : (
                    // GRID MODE
                    <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                        {(Object.entries(groupedTracks) as [string, any[]][]).map(([groupName, tracksInGroup]) => (
                            <div key={groupName} className="mb-8">
                                {groupingMode !== 'none' && (
                                    <h3 className="text-sm font-black text-cyan-500 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 py-2">
                                        {groupName} <span className="text-slate-500 text-xs ml-2">({tracksInGroup.length})</span>
                                    </h3>
                                )}
                                
                                <div 
                                    className="grid gap-4" 
                                    style={{ gridTemplateColumns: `repeat(${gridCols === 1 ? 1 : 'auto-fill'}, minmax(${gridCols === 1 ? '100%' : Math.max(140, 300 / (gridCols/2)) + 'px'}, 1fr))` }} 
                                >
                                    {tracksInGroup.map(track => (
                                        <div 
                                            key={track.id} 
                                            onClick={() => onSelectTrack(track.id)}
                                            className={`bg-slate-800 border border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:border-cyan-500/50 hover:shadow-lg transition-all group flex ${gridCols === 1 ? 'flex-row items-center p-2' : 'flex-col'}`}
                                        >
                                            <div className={`relative bg-slate-900 overflow-hidden ${gridCols === 1 ? 'w-16 h-12 rounded mr-4' : 'aspect-video w-full'}`}>
                                                <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                {gridCols > 1 && (
                                                    <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-white font-bold border border-slate-700">
                                                        {track.distance.toFixed(2)} km
                                                    </div>
                                                )}
                                                {track.isStrava && <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"><StravaIcon /></div>}
                                            </div>
                                            <div className={gridCols === 1 ? 'flex-grow flex items-center justify-between' : 'p-3'}>
                                                <div>
                                                    <h3 className={`font-bold text-slate-200 truncate mb-1 group-hover:text-cyan-400 transition-colors ${gridCols === 1 ? 'text-sm' : 'text-sm'}`}>{track.name}</h3>
                                                    <div className="flex items-center text-[10px] text-slate-500 font-mono uppercase gap-3">
                                                        <span>{new Date(track.points[0].time).toLocaleDateString()}</span>
                                                        <span>{formatPace(track.stats.movingAvgPace)}/km</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplorerView;
