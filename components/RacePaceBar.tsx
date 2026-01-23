
import React from 'react';
import { Track } from '../types';

interface RaceLeaderboardProps {
  racers: Track[];
  ranks: Map<string, number>;
  gaps: Map<string, number | undefined>; // Gap to leader in meters
}

const RaceLeaderboard: React.FC<RaceLeaderboardProps> = ({ racers, ranks, gaps }) => {
    const rankedRacers = racers.map(racer => ({
        ...racer,
        rank: ranks.get(racer.id) ?? racers.length,
        gap: gaps.get(racer.id),
    })).sort((a, b) => a.rank - b.rank);

    if (racers.length === 0) {
        return null;
    }

    return (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl p-2 flex flex-col max-h-[40vh] sm:max-h-[60vh] overflow-hidden border border-slate-700/50 shadow-xl transition-all w-full sm:w-auto">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-center border-b border-white/5 pb-1">Classifica Live</h3>
            <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1">
                {rankedRacers.map((racer, index) => {
                    let gapDisplayText: string;
                    if (index === 0) {
                        gapDisplayText = 'Leader';
                    } else if (racer.gap !== undefined) {
                        const gapMeters = racer.gap;
                         if (gapMeters < 1000) {
                            gapDisplayText = `+${gapMeters.toFixed(0)}m`;
                        } else {
                            gapDisplayText = `+${(gapMeters / 1000).toFixed(2)}km`;
                        }
                    } else {
                        gapDisplayText = '--';
                    }
                    
                    return (
                        <div key={racer.id} className={`flex items-center gap-2 p-1.5 rounded-lg transition-all duration-300 ${racer.rank === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-black/20 border border-white/5'}`}>
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-black/40 text-[10px] font-bold shadow-inner border border-white/10">
                                <span className={racer.rank === 1 ? 'text-amber-400' : 'text-slate-400'}>
                                    {racer.rank}
                                </span>
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-bold text-xs text-white drop-shadow-md max-w-[80px] sm:max-w-[120px]" title={racer.name}>
                                        {racer.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                    <div className="flex items-center">
                                        <div className="w-1.5 h-1.5 rounded-full mr-1.5 shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{ backgroundColor: racer.color }}></div>
                                        <span className="text-[9px] text-white/70 font-mono">{racer.distance.toFixed(1)}k</span>
                                    </div>
                                    <span className={`font-mono text-[9px] font-bold ${index === 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                        {gapDisplayText}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RaceLeaderboard;