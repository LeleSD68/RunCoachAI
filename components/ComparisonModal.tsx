
import React, { useMemo } from 'react';
import { Track, TrackStats } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';

interface ComparisonModalProps {
    tracks: Track[];
    onClose: () => void;
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
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const ComparisonModal: React.FC<ComparisonModalProps> = ({ tracks, onClose }) => {
    const data = useMemo(() => {
        return tracks.map(track => ({
            track,
            stats: calculateTrackStats(track)
        }));
    }, [tracks]);

    // Helpers to find best values for highlighting
    const bestPace = Math.min(...data.map(d => d.stats.movingAvgPace).filter(p => p > 0));
    const maxDist = Math.max(...data.map(d => d.stats.totalDistance));
    const maxEle = Math.max(...data.map(d => d.stats.elevationGain));
    const maxPower = Math.max(...data.map(d => d.stats.avgWatts || 0));

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[9000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <span className="text-2xl">📊</span> Confronto Prestazioni
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none">&times;</button>
                </header>
                
                <div className="flex-grow overflow-auto custom-scrollbar p-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="p-3 text-[10px] uppercase font-black text-slate-500 tracking-wider sticky left-0 bg-slate-800 z-10">Attività</th>
                                {data.map((d, i) => (
                                    <th key={d.track.id} className="p-3 min-w-[140px]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.track.color }}></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white truncate max-w-[120px]" title={d.track.name}>{d.track.name}</span>
                                                <span className="text-[9px] text-slate-400 font-mono">{new Date(d.track.points[0].time).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50 text-sm">
                            <tr className="hover:bg-slate-700/20">
                                <td className="p-3 font-bold text-slate-400 sticky left-0 bg-slate-800">Distanza</td>
                                {data.map(d => (
                                    <td key={d.track.id} className={`p-3 font-mono ${d.stats.totalDistance === maxDist ? 'text-green-400 font-bold' : 'text-slate-200'}`}>
                                        {d.stats.totalDistance.toFixed(2)} <span className="text-xs text-slate-500">km</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-700/20">
                                <td className="p-3 font-bold text-slate-400 sticky left-0 bg-slate-800">Tempo (Mov)</td>
                                {data.map(d => (
                                    <td key={d.track.id} className="p-3 font-mono text-slate-200">
                                        {formatDuration(d.stats.movingDuration)}
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-700/20">
                                <td className="p-3 font-bold text-slate-400 sticky left-0 bg-slate-800">Ritmo Medio</td>
                                {data.map(d => (
                                    <td key={d.track.id} className={`p-3 font-mono ${d.stats.movingAvgPace === bestPace ? 'text-green-400 font-bold' : 'text-slate-200'}`}>
                                        {formatPace(d.stats.movingAvgPace)} <span className="text-xs text-slate-500">/km</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-700/20">
                                <td className="p-3 font-bold text-slate-400 sticky left-0 bg-slate-800">Dislivello +</td>
                                {data.map(d => (
                                    <td key={d.track.id} className={`p-3 font-mono ${d.stats.elevationGain === maxEle && maxEle > 0 ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                                        +{Math.round(d.stats.elevationGain)} <span className="text-xs text-slate-500">m</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-700/20">
                                <td className="p-3 font-bold text-slate-400 sticky left-0 bg-slate-800">FC Media</td>
                                {data.map(d => (
                                    <td key={d.track.id} className="p-3 font-mono text-slate-200">
                                        {d.stats.avgHr ? Math.round(d.stats.avgHr) : '-'} <span className="text-xs text-slate-500">bpm</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-700/20">
                                <td className="p-3 font-bold text-slate-400 sticky left-0 bg-slate-800">Potenza (Stima)</td>
                                {data.map(d => (
                                    <td key={d.track.id} className={`p-3 font-mono ${d.stats.avgWatts === maxPower && maxPower > 0 ? 'text-purple-400 font-bold' : 'text-slate-200'}`}>
                                        {d.stats.avgWatts ? Math.round(d.stats.avgWatts) : '-'} <span className="text-xs text-slate-500">W</span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-700/20">
                                <td className="p-3 font-bold text-slate-400 sticky left-0 bg-slate-800">RPE</td>
                                {data.map(d => (
                                    <td key={d.track.id} className="p-3 font-mono text-slate-200">
                                        {d.track.rpe ? `${d.track.rpe}/10` : '-'}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ComparisonModal;
