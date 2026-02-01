
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

const StatCard: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string; className?: string }> = ({ title, value, subvalue, className }) => (
    <div className={`flex flex-col bg-slate-800 p-2 rounded border border-slate-700 ${className}`}>
        <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider">{title}</span>
        <span className="text-base font-bold text-white font-mono leading-none mt-0.5">{value}</span>
        {subvalue && <span className="text-[8px] text-slate-500 font-bold mt-0.5">{subvalue}</span>}
    </div>
);

const SectionHeader: React.FC<{ title: string, isOpen: boolean, onToggle: () => void }> = ({ title, isOpen, onToggle }) => (
    <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 border-b border-slate-800 group"
    >
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">{title}</span>
        <span className={`text-slate-600 group-hover:text-cyan-400 transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`}>▼</span>
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
        <div className="text-white space-y-4">
            <div className="space-y-2">
                <SectionHeader 
                    title="Sommario Sessione" 
                    isOpen={sections.summary} 
                    onToggle={() => setSections(s => ({ ...s, summary: !s.summary }))} 
                />
                {sections.summary && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in-down">
                        <StatCard title="Distanza" value={`${stats.totalDistance.toFixed(2)} km`} />
                        <StatCard title="Tempo" value={formatDuration(stats.movingDuration)} subvalue={`Totale: ${formatDuration(stats.totalDuration)}`} />
                        <StatCard title="Ritmo Medio" value={formatPace(stats.movingAvgPace)} subvalue={`/km`} />
                        <StatCard title="Dislivello" value={`+${Math.round(stats.elevationGain)} m`} subvalue={`Perso: -${Math.round(stats.elevationLoss)} m`} />
                    </div>
                )}
            </div>

            {stats.splits.length > 0 && (
                <div className="space-y-2">
                    <SectionHeader 
                        title="Analisi Chilometrica" 
                        isOpen={sections.splits} 
                        onToggle={() => setSections(s => ({ ...s, splits: !s.splits }))} 
                    />
                    {sections.splits && (
                        <div className="bg-slate-900/50 rounded-lg p-1 space-y-1 max-h-56 overflow-y-auto custom-scrollbar animate-fade-in-down">
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
                                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all ${isSelected ? 'bg-cyan-900/40 border border-cyan-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                                    >
                                        <div className="w-4 text-[9px] font-bold text-slate-600">{split.splitNumber}</div>
                                        <div className="flex-grow bg-slate-800 h-5 rounded overflow-hidden relative border border-white/5">
                                            <div 
                                                className={`h-full transition-all ${split.isFastest ? 'bg-green-500' : split.isSlowest ? 'bg-red-500' : 'bg-cyan-600'}`} 
                                                style={{ width: `${barWidthPercent}%` }}
                                            ></div>
                                            <div className="absolute inset-0 flex items-center px-2 justify-between">
                                                <span className="text-[10px] font-mono font-bold text-white shadow-sm">{formatPace(split.pace)}</span>
                                                <span className="text-[9px] text-white/50 font-mono">{formatDuration(split.duration)}</span>
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
