
import React, { useState } from 'react';
import { TrackStats, Split, PauseSegment, AiSegment } from '../types';

interface StatsPanelProps {
    stats: TrackStats;
    selectedSegment: Split | PauseSegment | AiSegment | null;
    onSegmentSelect: (segment: Split | PauseSegment | AiSegment | null) => void;
}

const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${(m % 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '-:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Compact Inline Stat Row
const StatRow: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string }> = ({ title, value, subvalue }) => (
    <div className="flex justify-between items-center bg-slate-800/50 px-2 py-1.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800 transition-colors">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{title}</span>
        <div className="text-right">
            <span className="text-xs font-bold text-white font-mono">{value}</span>
            {subvalue && <span className="text-[8px] text-slate-500 ml-1.5 font-mono">{subvalue}</span>}
        </div>
    </div>
);

const SectionHeader: React.FC<{ title: string, isOpen: boolean, onToggle: () => void }> = ({ title, isOpen, onToggle }) => (
    <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1.5 px-1 bg-slate-900/50 border-b border-slate-800 group"
    >
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] group-hover:text-cyan-400 transition-colors">{title}</span>
        <span className={`text-[8px] text-slate-600 group-hover:text-cyan-400 transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`}>▼</span>
    </button>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, selectedSegment, onSegmentSelect }) => {
    const [sections, setSections] = useState({ summary: true, splits: true });

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
        <div className="text-white flex flex-col gap-1">
            <div className="rounded border border-slate-700 overflow-hidden">
                <SectionHeader 
                    title="Dati Totali" 
                    isOpen={sections.summary} 
                    onToggle={() => setSections(s => ({ ...s, summary: !s.summary }))} 
                />
                {sections.summary && (
                    <div className="flex flex-col animate-fade-in-down">
                        <StatRow title="Distanza" value={`${stats.totalDistance.toFixed(2)} km`} />
                        <StatRow title="Tempo" value={formatDuration(stats.movingDuration)} subvalue={`(Tot ${formatDuration(stats.totalDuration)})`} />
                        <StatRow title="Ritmo Avg" value={`${formatPace(stats.movingAvgPace)}/km`} />
                        <StatRow title="Velocità" value={`${stats.avgSpeed.toFixed(1)} km/h`} subvalue={`Max ${stats.maxSpeed.toFixed(1)}`} />
                        <StatRow title="Dislivello" value={`+${Math.round(stats.elevationGain)} m`} subvalue={`-${Math.round(stats.elevationLoss)}m`} />
                        {stats.avgHr && <StatRow title="Cardio" value={`${Math.round(stats.avgHr)} bpm`} subvalue={`Max ${stats.maxHr}`} />}
                        {stats.avgWatts && <StatRow title="Potenza" value={`${stats.avgWatts} W`} />}
                    </div>
                )}
            </div>

            {stats.splits.length > 0 && (
                <div className="rounded border border-slate-700 overflow-hidden flex flex-col flex-grow min-h-0">
                    <SectionHeader 
                        title="Splits" 
                        isOpen={sections.splits} 
                        onToggle={() => setSections(s => ({ ...s, splits: !s.splits }))} 
                    />
                    {sections.splits && (
                        <div className="bg-slate-900/30 overflow-y-auto custom-scrollbar flex-grow p-1 space-y-0.5">
                            {stats.splits.map(split => {
                                const isSelected = selectedSegment && 'splitNumber' in selectedSegment && selectedSegment.splitNumber === split.splitNumber;
                                let barWidthPercent = 0;
                                if (paceRange > 0 && split.pace > 0) {
                                    const normalized = (maxPace - split.pace) / paceRange;
                                    barWidthPercent = 20 + normalized * 80;
                                }

                                return (
                                    <div 
                                        key={split.splitNumber}
                                        onClick={() => onSegmentSelect(split)}
                                        className={`flex items-center gap-2 p-1 rounded-sm cursor-pointer transition-all h-6 ${isSelected ? 'bg-cyan-900/40 ring-1 ring-cyan-500/50' : 'hover:bg-slate-800'}`}
                                    >
                                        <div className="w-4 text-[9px] font-mono text-slate-500 text-right">{split.splitNumber}</div>
                                        <div className="flex-grow bg-slate-800/50 h-full rounded-sm overflow-hidden relative">
                                            <div 
                                                className={`h-full opacity-80 ${split.isFastest ? 'bg-green-600' : split.isSlowest ? 'bg-red-900' : 'bg-slate-600'}`} 
                                                style={{ width: `${barWidthPercent}%` }}
                                            ></div>
                                            <div className="absolute inset-0 flex items-center px-1.5 justify-between">
                                                <span className="text-[9px] font-mono font-bold text-white drop-shadow-md">{formatPace(split.pace)}</span>
                                                <div className="flex gap-2">
                                                    <span className="text-[8px] text-slate-300 font-mono drop-shadow-md">+{Math.round(split.elevationGain)}m</span>
                                                    {split.avgHr && <span className="text-[8px] text-slate-300 font-mono drop-shadow-md">{Math.round(split.avgHr)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StatsPanel;
