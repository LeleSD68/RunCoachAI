
import React from 'react';
import { TrackStats, Split, PauseSegment, AiSegment } from '../types';

interface StatsPanelProps {
    stats: TrackStats;
    selectedSegment: Split | PauseSegment | AiSegment | null;
    onSegmentSelect: (segment: Split | PauseSegment | AiSegment | null) => void;
}

const formatDuration = (ms: number, showMs = false) => {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const result = `${hours > 0 ? hours+':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  if (showMs) {
      const milliseconds = Math.floor(ms % 1000);
      return `${result}.${milliseconds.toString().padStart(3, '0')}`
  }
  return result;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '-:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const StatCard: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string; className?: string }> = ({ title, value, subvalue, className }) => (
    <div className={`flex flex-col bg-slate-800 p-2 rounded border border-slate-700 ${className}`}>
        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{title}</span>
        <span className="text-lg font-bold text-white font-mono leading-none mt-0.5">{value}</span>
        {subvalue && <span className="text-[9px] text-slate-500 font-medium mt-0.5">{subvalue}</span>}
    </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, selectedSegment, onSegmentSelect }) => {
    const { minPace, maxPace, paceRange } = React.useMemo(() => {
        const fullSplits = stats.splits.filter(s => s.distance > 0.5 && s.pace > 0);
        if (fullSplits.length < 2) return { minPace: 0, maxPace: 0, paceRange: 0 };
        const paces = fullSplits.map(s => s.pace);
        const minPace = Math.min(...paces);
        const maxPace = Math.max(...paces);
        const paceRange = maxPace - minPace;
        return { minPace, maxPace, paceRange };
    }, [stats.splits]);

    return (
        <div className="text-white space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <StatCard title="Distanza" value={`${stats.totalDistance.toFixed(2)} km`} />
                <StatCard title="Tempo" value={formatDuration(stats.movingDuration)} subvalue={`Tot. ${formatDuration(stats.totalDuration)}`} />
                <StatCard title="Ritmo Medio" value={formatPace(stats.movingAvgPace)} subvalue={`/km`} />
                <StatCard title="Dislivello" value={`+${Math.round(stats.elevationGain)} m`} subvalue={`Perso: -${Math.round(stats.elevationLoss)} m`} />
                {stats.avgWatts && <StatCard title="Potenza Media" value={`${stats.avgWatts} W`} subvalue="(Stima)" />}
                {stats.avgHr && <StatCard title="Frequenza Card." value={`${Math.round(stats.avgHr)} bpm`} subvalue={`Max: ${stats.maxHr} bpm`} />}
            </div>

            {stats.splits.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                        Analisi Parziali
                    </h3>
                    <div className="grid grid-cols-[20px_1fr_40px_30px_30px_30px] gap-x-2 text-[9px] text-slate-500 font-bold uppercase px-1 mb-1 border-b border-slate-700 pb-1">
                        <div className="text-center">Km</div>
                        <span>Ritmo</span>
                        <span className="text-right">Tempo</span>
                        <span className="text-right">Disl.</span>
                        <span className="text-right">FC</span>
                        <span className="text-right text-purple-400">Watt</span>
                    </div>
                     <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {stats.splits.map(split => {
                            const isSelected = selectedSegment && 'splitNumber' in selectedSegment && selectedSegment.splitNumber === split.splitNumber;
                            let barWidthPercent = 0;
                            if (paceRange > 0 && split.pace > 0) {
                              const normalizedPace = (maxPace - split.pace) / paceRange;
                              barWidthPercent = Math.max(10, normalizedPace * 100);
                            } else if (stats.splits.some(s => s.pace > 0)) barWidthPercent = 50;

                            return (
                                <div 
                                    key={split.splitNumber}
                                    onClick={() => onSegmentSelect(split)}
                                    className={`grid grid-cols-[20px_1fr_40px_30px_30px_30px] gap-x-2 items-center text-[10px] px-1 py-0.5 rounded cursor-pointer transition-colors ${
                                        isSelected ? 'bg-cyan-900/40 text-cyan-100' : 'hover:bg-slate-700/50 text-slate-300'
                                    }`}
                                >
                                    <div className="text-center font-bold text-slate-400">{split.splitNumber}</div>
                                    <div className="flex items-center gap-1">
                                        <div className="flex-grow bg-slate-700/50 rounded-full h-1 overflow-hidden">
                                            <div className={`h-full ${split.isFastest ? 'bg-green-500' : split.isSlowest ? 'bg-red-500' : 'bg-cyan-600'}`} style={{ width: `${barWidthPercent}%` }}></div>
                                        </div>
                                        <div className="font-mono font-bold w-8 text-right">{formatPace(split.pace)}</div>
                                    </div>
                                    <div className="text-right font-mono">{formatDuration(split.duration)}</div>
                                    <div className="text-right text-[9px] opacity-70">+{Math.round(split.elevationGain)}</div>
                                    <div className="text-right text-[9px] opacity-70">{split.avgHr ? Math.round(split.avgHr) : '-'}</div>
                                    <div className="text-right text-[9px] font-bold text-purple-400/80">{split.avgWatts ? Math.round(split.avgWatts) : '-'}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsPanel;