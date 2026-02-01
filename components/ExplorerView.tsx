
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

const ExplorerView: React.FC<ExplorerViewProps> = ({ tracks, onClose, onSelectTrack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const sortedTracks = useMemo(() => {
        return [...tracks].filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => new Date(b.points[0].time).getTime() - new Date(a.points[0].time).getTime());
    }, [tracks, searchTerm]);

    return (
        <div className="absolute inset-0 z-[3000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden pb-28">
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 bg-slate-700 rounded-full">◀</button>
                    <h2 className="text-xl font-black text-cyan-400 uppercase italic">Data Explorer</h2>
                </div>
                <input type="text" placeholder="Cerca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs outline-none" />
            </header>

            <div className="flex-grow overflow-auto custom-scrollbar p-2">
                <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-800 text-slate-500 uppercase font-black sticky top-0">
                        <tr>
                            <th className="p-2">Data</th>
                            <th className="p-2">Nome</th>
                            <th className="p-2">Dist.</th>
                            <th className="p-2">Ritmo</th>
                            <th className="p-2">FC (Intera)</th>
                            <th className="p-2">Disl.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sortedTracks.map(t => {
                            const s = calculateTrackStats(t);
                            return (
                                <tr key={t.id} onClick={() => onSelectTrack(t.id)} className="hover:bg-slate-800 cursor-pointer group">
                                    <td className="p-2 text-slate-500">{new Date(t.points[0].time).toLocaleDateString()}</td>
                                    <td className="p-2 font-bold group-hover:text-cyan-400">{t.name}</td>
                                    <td className="p-2 font-mono">{t.distance.toFixed(1)}k</td>
                                    <td className="p-2 font-mono">{formatPace(s.movingAvgPace)}</td>
                                    <td className="p-2 font-mono text-red-300">{s.avgHr ? Math.round(s.avgHr) : '-'}</td>
                                    <td className="p-2 font-mono text-amber-200">+{Math.round(s.elevationGain)}m</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExplorerView;
