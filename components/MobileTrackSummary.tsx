
import React from 'react';
import { Track } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';

interface MobileTrackSummaryProps {
    track: Track;
    onClick: () => void;
    onClose: () => void;
}

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const MobileTrackSummary: React.FC<MobileTrackSummaryProps> = ({ track, onClick, onClose }) => {
    const stats = calculateTrackStats(track);

    return (
        <div className="absolute top-4 left-4 right-4 z-[4000] animate-fade-in-down pointer-events-auto">
            <div 
                className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={onClick}
            >
                <div className="flex p-3 gap-3">
                    {/* Color Stripe */}
                    <div className="w-1.5 rounded-full" style={{ backgroundColor: track.color }}></div>
                    
                    <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h3 className="text-sm font-bold text-white truncate leading-tight">{track.name}</h3>
                                <p className="text-[10px] text-slate-400 font-mono uppercase">
                                    {new Date(track.points[0].time).toLocaleDateString()} • {track.activityType || 'Corsa'}
                                </p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="text-slate-500 hover:text-white p-1 -mr-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-700/50">
                            <div className="text-center">
                                <div className="text-[8px] text-slate-500 font-bold uppercase">Dist</div>
                                <div className="text-xs font-mono font-bold text-white">{track.distance.toFixed(1)}k</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[8px] text-slate-500 font-bold uppercase">Tempo</div>
                                <div className="text-xs font-mono font-bold text-white">{formatDuration(stats.movingDuration)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[8px] text-slate-500 font-bold uppercase">Passo</div>
                                <div className="text-xs font-mono font-bold text-white">{formatPace(stats.movingAvgPace)}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[8px] text-slate-500 font-bold uppercase">Disl</div>
                                <div className="text-xs font-mono font-bold text-white">+{Math.round(stats.elevationGain)}m</div>
                            </div>
                        </div>
                        
                        <div className="mt-2 text-center">
                            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest animate-pulse">Tocca per dettagli</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileTrackSummary;
