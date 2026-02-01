
import React, { useState, useMemo, useEffect } from 'react';
import { Track } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';

interface ExplorerViewProps {
    tracks: Track[];
    onClose: () => void;
    onSelectTrack: (id: string) => void;
}

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

const StravaSmallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-[#fc4c02]">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const AdjustmentsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 4.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM5 3.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM4.25 17a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM17.25 17a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM9 10a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1 0-1.5h5.5A.75.75 0 0 1 9 10ZM17.25 10.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM10 16.25a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" />
    </svg>
);

const RotatePhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 animate-spin-slow">
        <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 12.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm9-3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75ZM2 12.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75ZM2 8.75a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8.75Z" clipRule="evenodd" />
    </svg>
);

// Definizione colonne disponibili
type ColumnKey = 'date' | 'name' | 'distance' | 'duration' | 'totalDuration' | 'pace' | 'hr' | 'elevation' | 'cadence' | 'steps' | 'calories';

interface ColumnConfig {
    key: ColumnKey;
    label: string;
    shortLabel?: string;
    align: 'left' | 'right' | 'center';
    minWidth?: string;
}

const COLUMNS: ColumnConfig[] = [
    { key: 'date', label: 'Data', align: 'left', minWidth: '80px' },
    { key: 'name', label: 'Nome Attività', align: 'left', minWidth: '180px' },
    { key: 'distance', label: 'Distanza', shortLabel: 'Dist.', align: 'right', minWidth: '60px' },
    { key: 'duration', label: 'Tempo (Mov)', shortLabel: 'Mov.', align: 'right', minWidth: '70px' },
    { key: 'totalDuration', label: 'Tempo Totale', shortLabel: 'Totale', align: 'right', minWidth: '70px' },
    { key: 'pace', label: 'Passo Medio', shortLabel: 'Passo', align: 'right', minWidth: '60px' },
    { key: 'hr', label: 'Freq. Cardiaca', shortLabel: 'FC', align: 'center', minWidth: '50px' },
    { key: 'elevation', label: 'Dislivello', shortLabel: 'Disl.', align: 'right', minWidth: '60px' },
    { key: 'cadence', label: 'Cadenza', shortLabel: 'Cad.', align: 'center', minWidth: '50px' },
    { key: 'steps', label: 'Passi Totali', shortLabel: 'Passi', align: 'right', minWidth: '70px' },
    { key: 'calories', label: 'Calorie (Stima)', shortLabel: 'Kcal', align: 'right', minWidth: '60px' },
];

const ExplorerView: React.FC<ExplorerViewProps> = ({ tracks, onClose, onSelectTrack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(['date', 'name', 'distance', 'duration', 'pace', 'elevation']));
    const [sortConfig, setSortConfig] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    // Pre-calculate derived data for sorting
    const enrichedTracks = useMemo(() => {
        return tracks.map(t => {
            const s = calculateTrackStats(t);
            const steps = s.avgCadence ? Math.round(s.avgCadence * (s.movingDuration / 60000)) : 0;
            const calories = Math.round(t.distance * 70); // Rough estimate 1kcal/kg/km assuming 70kg
            return {
                id: t.id,
                track: t,
                stats: s,
                date: new Date(t.points[0].time).getTime(),
                name: t.name,
                distance: t.distance,
                duration: s.movingDuration,
                totalDuration: s.totalDuration,
                pace: s.movingAvgPace,
                hr: s.avgHr || 0,
                elevation: s.elevationGain,
                cadence: s.avgCadence || 0,
                steps: steps,
                calories: calories
            };
        });
    }, [tracks]);

    // Sorting Logic
    const sortedTracks = useMemo(() => {
        let data = [...enrichedTracks];
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            data = data.filter(d => d.name.toLowerCase().includes(lowerSearch));
        }

        data.sort((a, b) => {
            let valA = a[sortConfig.key] as any;
            let valB = b[sortConfig.key] as any;

            // Handle strings
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [enrichedTracks, sortConfig, searchTerm]);

    const handleSort = (key: ColumnKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const toggleColumn = (key: ColumnKey) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="absolute inset-0 z-[3000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden pb-24 lg:pb-0">
            {/* Header */}
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap gap-4 justify-between items-center shrink-0 z-20 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors">◀</button>
                    <h2 className="text-xl font-black text-cyan-400 uppercase italic flex items-center gap-2">
                        Data Explorer
                        <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full not-italic font-mono border border-slate-700">{tracks.length}</span>
                    </h2>
                </div>
                
                <div className="flex gap-2 flex-grow sm:flex-grow-0 justify-end">
                    <div className="relative flex-grow sm:w-64">
                        <input 
                            type="text" 
                            placeholder="Cerca nome..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-500 transition-all" 
                        />
                    </div>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setShowColumnMenu(!showColumnMenu)} 
                            className={`p-2 rounded-lg border transition-all ${showColumnMenu ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white'}`}
                            title="Scegli Colonne"
                        >
                            <AdjustmentsIcon />
                        </button>
                        
                        {/* Column Selector Dropdown */}
                        {showColumnMenu && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowColumnMenu(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-40 overflow-hidden animate-fade-in-up">
                                    <div className="p-2 border-b border-slate-700 bg-slate-900/50">
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Colonne Visibili</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {COLUMNS.map(col => (
                                            <button 
                                                key={col.key}
                                                onClick={() => toggleColumn(col.key)}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition-colors ${visibleColumns.has(col.key) ? 'bg-cyan-900/30 text-cyan-400' : 'text-slate-400 hover:bg-slate-700'}`}
                                            >
                                                <span>{col.label}</span>
                                                {visibleColumns.has(col.key) && <span className="text-cyan-500">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Landscape Hint for Mobile */}
            <div className="bg-amber-900/20 text-amber-200 text-[10px] font-bold text-center py-1 border-b border-amber-900/30 flex items-center justify-center gap-2 lg:hidden">
                <RotatePhoneIcon /> Ruota il dispositivo per vedere più colonne
            </div>

            {/* Table Container */}
            <div className="flex-grow overflow-auto custom-scrollbar bg-slate-900 relative">
                <table className="w-full text-left text-[11px] border-collapse relative min-w-full">
                    <thead className="bg-slate-800 text-slate-400 uppercase font-black sticky top-0 z-10 shadow-sm">
                        <tr>
                            {COLUMNS.map(col => {
                                if (!visibleColumns.has(col.key)) return null;
                                return (
                                    <th 
                                        key={col.key} 
                                        onClick={() => handleSort(col.key)}
                                        className={`p-3 cursor-pointer hover:text-white hover:bg-slate-700 transition-colors select-none whitespace-nowrap text-${col.align}`}
                                        style={{ minWidth: col.minWidth }}
                                    >
                                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                                            {col.shortLabel || col.label}
                                            {sortConfig.key === col.key && (
                                                <span className="text-cyan-400">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sortedTracks.map(row => {
                            const isStrava = row.id.startsWith('strava-') || row.track.tags?.includes('Strava');
                            return (
                                <tr key={row.id} onClick={() => onSelectTrack(row.id)} className="hover:bg-slate-800/50 cursor-pointer group transition-colors">
                                    {COLUMNS.map(col => {
                                        if (!visibleColumns.has(col.key)) return null;
                                        
                                        let content: React.ReactNode = '-';
                                        let className = `p-3 whitespace-nowrap text-${col.align} `;

                                        switch(col.key) {
                                            case 'date': 
                                                content = new Date(row.date).toLocaleDateString(); 
                                                className += 'text-slate-500 font-mono';
                                                break;
                                            case 'name': 
                                                content = (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white group-hover:text-cyan-400 truncate max-w-[200px] sm:max-w-[300px]" title={row.name}>{row.name}</span>
                                                        {isStrava && <StravaSmallIcon />}
                                                    </div>
                                                );
                                                break;
                                            case 'distance': 
                                                content = `${row.distance.toFixed(2)} km`; 
                                                className += 'font-mono text-white font-bold';
                                                break;
                                            case 'duration': 
                                                content = formatDuration(row.duration); 
                                                className += 'font-mono text-slate-300';
                                                break;
                                            case 'totalDuration': 
                                                content = formatDuration(row.totalDuration); 
                                                className += 'font-mono text-slate-400';
                                                break;
                                            case 'pace': 
                                                content = formatPace(row.pace); 
                                                className += 'font-mono text-cyan-200 font-bold';
                                                break;
                                            case 'hr': 
                                                content = row.hr > 0 ? Math.round(row.hr) : '-'; 
                                                className += row.hr > 0 ? 'font-mono text-red-300 font-bold' : 'text-slate-600';
                                                break;
                                            case 'elevation': 
                                                content = `+${Math.round(row.elevation)} m`; 
                                                className += 'font-mono text-amber-200';
                                                break;
                                            case 'cadence': 
                                                content = row.cadence > 0 ? Math.round(row.cadence) : '-'; 
                                                className += 'font-mono text-purple-300';
                                                break;
                                            case 'steps':
                                                content = row.steps > 0 ? row.steps.toLocaleString() : '-';
                                                className += 'font-mono text-slate-300';
                                                break;
                                            case 'calories':
                                                content = row.calories > 0 ? `~${row.calories}` : '-';
                                                className += 'font-mono text-slate-400';
                                                break;
                                        }

                                        return (
                                            <td key={col.key} className={className}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {sortedTracks.length === 0 && (
                            <tr>
                                <td colSpan={visibleColumns.size} className="p-8 text-center text-slate-500 italic">
                                    Nessuna attività trovata.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <style>{`
                .animate-spin-slow { animation: spin 4s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ExplorerView;
