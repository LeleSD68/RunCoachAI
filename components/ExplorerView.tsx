
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
type SortOption = 'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc' | 'name_asc' | 'time_desc' | 'pace_asc' | 'pace_desc' | 'hr_asc' | 'hr_desc';
type ViewMode = 'grid' | 'table';

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

const RotateDeviceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 animate-pulse">
        <path d="M10.5 18.75a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
        <path fillRule="evenodd" d="M8.625.75A3.375 3.375 0 0 0 5.25 4.125v15.75a3.375 3.375 0 0 0 3.375 3.375h6.75a3.375 3.375 0 0 0 3.375-3.375V4.125A3.375 3.375 0 0 0 15.375.75h-6.75ZM7.5 4.125C7.5 3.504 8.004 3 8.625 3h6.75c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 0 1 7.5 19.875V4.125Z" clipRule="evenodd" />
    </svg>
);

const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#fc4c02]">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const SortArrow = ({ active, direction }: { active: boolean, direction: 'asc' | 'desc' }) => {
    if (!active) return <span className="opacity-20 ml-1">⇅</span>;
    return <span className="ml-1 text-cyan-400">{direction === 'asc' ? '▲' : '▼'}</span>;
};

const ExplorerView: React.FC<ExplorerViewProps> = ({ tracks, onClose, onSelectTrack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('table'); 
    const [gridCols, setGridCols] = useState(4);
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');
    const [groupingMode, setGroupingMode] = useState<GroupingMode>('none');
    const [showRotateHint, setShowRotateHint] = useState(false);
    
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('runcoach-explorer-columns');
            if (saved) return new Set(JSON.parse(saved));
        } catch (e) {}
        return new Set(['date', 'name', 'activity', 'distance', 'time', 'pace', 'hr', 'elevation']);
    });
    
    const [showColMenu, setShowColMenu] = useState(false);

    useEffect(() => {
        localStorage.setItem('runcoach-explorer-columns', JSON.stringify(Array.from(visibleColumns)));
    }, [visibleColumns]);

    useEffect(() => {
        const checkOrientation = () => {
            if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) setShowRotateHint(true);
            else setShowRotateHint(false);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    const tracksWithStats = useMemo(() => {
        return tracks.map(t => {
            const stats = calculateTrackStats(t);
            const efficiency = stats.avgHr && stats.avgHr > 0 ? (stats.avgSpeed * 100) / stats.avgHr : 0;
            return { ...t, stats, efficiency };
        });
    }, [tracks]);

    const handleSortClick = (key: string) => {
        setSortOption(prev => {
            const [currentKey, currentDir] = prev.split('_');
            if (currentKey === key) {
                return (currentDir === 'desc' ? `${key}_asc` : `${key}_desc`) as SortOption;
            }
            return `${key}_desc` as SortOption;
        });
    };

    const sortedTracks = useMemo(() => {
        return [...tracksWithStats].filter(t => 
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (t.activityType && t.activityType.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a, b) => {
            const [key, dir] = sortOption.split('_');
            const factor = dir === 'asc' ? 1 : -1;

            switch (key) {
                case 'date': return (a.points[0].time.getTime() - b.points[0].time.getTime()) * factor;
                case 'distance': return (a.distance - b.distance) * factor;
                case 'time': return (a.duration - b.duration) * factor;
                case 'pace': return (a.stats.movingAvgPace - b.stats.movingAvgPace) * factor;
                case 'hr': return ((a.stats.avgHr || 0) - (b.stats.avgHr || 0)) * factor;
                case 'name': return a.name.localeCompare(b.name) * factor;
                case 'elevation': return (a.stats.elevationGain - b.stats.elevationGain) * factor;
                default: return 0;
            }
        });
    }, [tracksWithStats, searchTerm, sortOption]);

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
                 else groupName = '> 21 km';
            } else if (groupingMode === 'date') {
                groupName = t.points[0].time.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
            } else if (groupingMode === 'activity') groupName = t.activityType || 'Altro';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(t);
        });
        return groups;
    }, [sortedTracks, groupingMode]);

    const availableColumns = [
        { id: 'date', label: 'Data', sortKey: 'date' },
        { id: 'name', label: 'Nome', sortKey: 'name' },
        { id: 'activity', label: 'Tipo', sortKey: null },
        { id: 'distance', label: 'Dist.', sortKey: 'distance' },
        { id: 'time', label: 'Durata', sortKey: 'time' },
        { id: 'pace', label: 'Passo', sortKey: 'pace' },
        { id: 'hr', label: 'FC', sortKey: 'hr' },
        { id: 'elevation', label: 'D+', sortKey: 'elevation' },
        { id: 'rpe', label: 'RPE', sortKey: null },
        { id: 'rating', label: 'Voto', sortKey: null },
    ];

    return (
        <div className="absolute inset-0 z-[3000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden">
            <header className="p-3 bg-slate-800 border-b border-slate-700 shadow-md z-10 flex flex-col gap-3 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full active:scale-95"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg></button>
                        <h2 className="text-xl font-black text-cyan-400 uppercase tracking-tighter italic">Data Explorer</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <input type="text" placeholder="Filtra..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 w-32 md:w-48" />
                        <div className="bg-slate-700 p-1 rounded-lg flex items-center">
                            <button onClick={() => setViewMode('table')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>TABELLA</button>
                            <button onClick={() => setViewMode('grid')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>GRID</button>
                        </div>
                    </div>
                </div>
            </header>

            {showRotateHint && viewMode === 'table' && (
                <div className="bg-amber-600/90 backdrop-blur text-white text-[10px] font-bold py-1.5 px-4 text-center border-b border-amber-500/50 flex items-center justify-center gap-2 animate-fade-in z-20 shrink-0">
                    <RotateDeviceIcon /> RUOTA PER PIÙ DETTAGLI
                </div>
            )}

            <div className="flex-grow overflow-hidden bg-slate-900">
                {viewMode === 'table' ? (
                    <div className="h-full w-full overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse table-fixed md:table-auto min-w-full">
                            <thead className="bg-slate-800 sticky top-0 z-10 text-[10px] uppercase font-black text-slate-500 border-b border-slate-700">
                                <tr>
                                    {availableColumns.filter(c => visibleColumns.has(c.id)).map(col => (
                                        <th 
                                            key={col.id} 
                                            onClick={() => col.sortKey && handleSortClick(col.sortKey)}
                                            className={`px-1.5 py-2 whitespace-nowrap overflow-hidden text-ellipsis ${col.sortKey ? 'cursor-pointer hover:text-cyan-400 hover:bg-slate-700/50 transition-colors' : ''}`}
                                            style={{ width: col.id === 'name' ? '120px' : col.id === 'date' ? '70px' : '55px' }}
                                        >
                                            {col.label}
                                            {col.sortKey && <SortArrow active={sortOption.startsWith(col.sortKey)} direction={sortOption.endsWith('asc') ? 'asc' : 'desc'} />}
                                        </th>
                                    ))}
                                    <th className="p-1.5 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="text-[11px] divide-y divide-slate-800/50 font-medium">
                                {sortedTracks.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => onSelectTrack(t.id)}>
                                        {visibleColumns.has('date') && <td className="px-1.5 py-2 font-mono text-slate-400 whitespace-nowrap">{new Date(t.points[0].time).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit', year:'2-digit'})}</td>}
                                        {visibleColumns.has('name') && <td className="px-1.5 py-2 font-bold text-slate-100 truncate group-hover:text-cyan-400">{t.name}</td>}
                                        {visibleColumns.has('activity') && <td className="px-1.5 py-2"><span className="bg-slate-800 px-1 py-0.5 rounded text-[8px] font-black text-slate-500 uppercase">{t.activityType?.substring(0,4) || 'RUN'}</span></td>}
                                        {visibleColumns.has('distance') && <td className="px-1.5 py-2 font-mono text-cyan-200">{t.distance.toFixed(1)}</td>}
                                        {visibleColumns.has('time') && <td className="px-1.5 py-2 font-mono text-slate-400">{formatDuration(t.duration)}</td>}
                                        {visibleColumns.has('pace') && <td className="px-1.5 py-2 font-mono font-bold text-white">{formatPace(t.stats.movingAvgPace)}</td>}
                                        {visibleColumns.has('hr') && <td className="px-1.5 py-2 font-mono text-red-300">{t.stats.avgHr || '-'}</td>}
                                        {visibleColumns.has('elevation') && <td className="px-1.5 py-2 font-mono text-amber-200">+{Math.round(t.stats.elevationGain)}</td>}
                                        {visibleColumns.has('rpe') && <td className="px-1.5 py-2 text-slate-500 text-center">{t.rpe || '-'}</td>}
                                        {visibleColumns.has('rating') && <td className="px-1.5 py-2"><RatingStars rating={t.rating} size="xs" /></td>}
                                        <td className="px-1.5 py-2 text-right"><span className="text-cyan-600 group-hover:text-white">&rarr;</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                        {Object.entries(groupedTracks).map(([groupName, tracksInGroup]) => (
                            <div key={groupName} className="mb-6">
                                {groupingMode !== 'none' && <h3 className="text-xs font-black text-cyan-500 uppercase tracking-widest border-b border-slate-700 pb-1 mb-3">{groupName}</h3>}
                                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))` }}>
                                    {tracksInGroup.map(track => (
                                        <div key={track.id} onClick={() => onSelectTrack(track.id)} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all group">
                                            <div className="aspect-video w-full bg-slate-900 relative">
                                                <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[9px] font-mono text-white">{track.distance.toFixed(1)}k</div>
                                            </div>
                                            <div className="p-2">
                                                <h4 className="text-[10px] font-bold text-slate-200 truncate group-hover:text-cyan-400">{track.name}</h4>
                                                <p className="text-[8px] text-slate-500 uppercase font-bold">{new Date(track.points[0].time).toLocaleDateString()}</p>
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
