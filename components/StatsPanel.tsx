
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

// Icons
const ChartBarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>);
const ListBulletIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1h.01a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 15.25a1 1 0 0 1 1-1h.01a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 10a1 1 0 0 1 1-1h.01a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01Z" clipRule="evenodd" /></svg>);

// Compact Inline Stat Row
const StatRow: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string }> = ({ title, value, subvalue }) => (
    <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 border-b border-slate-700/50 last:border-0 hover:bg-slate-800 transition-colors rounded-lg">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{title}</span>
        <div className="text-right">
            <span className="text-sm font-bold text-white font-mono">{value}</span>
            {subvalue && <span className="text-[9px] text-slate-500 ml-1.5 font-mono">{subvalue}</span>}
        </div>
    </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, selectedSegment, onSegmentSelect }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'splits'>('summary');

    // Safety check for stats object
    if (!stats) return null;

    const { minPace, maxPace, paceRange } = React.useMemo(() => {
        const fullSplits = stats.splits ? stats.splits.filter(s => s && s.distance > 0.5 && s.pace > 0) : [];
        if (fullSplits.length < 2) return { minPace: 0, maxPace: 0, paceRange: 0 };
        const paces = fullSplits.map(s => s.pace);
        const minPace = Math.min(...paces);
        const maxPace = Math.max(...paces);
        const paceRange = maxPace - minPace;
        return { minPace, maxPace, paceRange };
    }, [stats.splits]);

    return (
        <div className="text-white flex flex-col h-full bg-slate-900/30 rounded-xl border border-slate-700/50 overflow-hidden">
            
            {/* TABS HEADER */}
            <div className="flex border-b border-slate-700 bg-slate-800/80 shrink-0">
                <button 
                    onClick={() => setActiveTab('summary')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${activeTab === 'summary' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <ChartBarIcon /> Dati Totali
                    {activeTab === 'summary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('splits')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${activeTab === 'splits' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <ListBulletIcon /> Parziali ({stats.splits?.length || 0})
                    {activeTab === 'splits' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 bg-slate-900/20">
                
                {activeTab === 'summary' && (
                    <div className="flex flex-col gap-1 animate-fade-in space-y-1">
                        <StatRow title="Distanza" value={`${(stats.totalDistance || 0).toFixed(2)} km`} />
                        <StatRow title="Tempo Mov." value={formatDuration(stats.movingDuration)} subvalue={`(Tot ${formatDuration(stats.totalDuration)})`} />
                        <StatRow title="Ritmo Medio" value={`${formatPace(stats.movingAvgPace)}/km`} />
                        <StatRow title="Velocità Media" value={`${(stats.avgSpeed || 0).toFixed(1)} km/h`} subvalue={`Max ${(stats.maxSpeed || 0).toFixed(1)}`} />
                        <StatRow title="Dislivello" value={`+${Math.round(stats.elevationGain || 0)} m`} subvalue={`-${Math.round(stats.elevationLoss || 0)}m`} />
                        {stats.avgHr && <StatRow title="Cardio Medio" value={`${Math.round(stats.avgHr)} bpm`} subvalue={`Max ${stats.maxHr}`} />}
                        {stats.avgWatts && <StatRow title="Potenza Media" value={`${stats.avgWatts} W`} />}
                        {stats.avgCadence && <StatRow title="Cadenza Media" value={`${stats.avgCadence} spm`} />}
                    </div>
                )}

                {activeTab === 'splits' && (
                    <div className="flex flex-col space-y-1 animate-fade-in">
                        {!stats.splits || stats.splits.length === 0 ? (
                            <p className="text-center text-xs text-slate-500 py-4 italic">Nessun parziale disponibile.</p>
                        ) : (
                            stats.splits.map(split => {
                                if (!split) return null;
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
                                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all h-8 border ${isSelected ? 'bg-cyan-900/30 border-cyan-500/50 shadow-md transform scale-[1.02]' : 'bg-slate-800/40 border-transparent hover:bg-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="w-5 text-[10px] font-mono text-slate-500 text-center font-bold">{split.splitNumber}</div>
                                        <div className="flex-grow h-full bg-slate-900/50 rounded overflow-hidden relative">
                                            {/* Bar Background */}
                                            <div 
                                                className={`h-full opacity-60 transition-all duration-500 ${split.isFastest ? 'bg-green-600' : split.isSlowest ? 'bg-red-900' : 'bg-slate-600'}`} 
                                                style={{ width: `${barWidthPercent}%` }}
                                            ></div>
                                            
                                            {/* Labels Overlay */}
                                            <div className="absolute inset-0 flex items-center px-2 justify-between pointer-events-none">
                                                <span className="text-[10px] font-mono font-bold text-white drop-shadow-md">{formatPace(split.pace)}</span>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[9px] text-slate-300 font-mono drop-shadow-md">+{Math.round(split.elevationGain)}m</span>
                                                    {split.avgHr && <span className={`text-[9px] font-mono font-bold drop-shadow-md ${split.avgHr > 170 ? 'text-red-300' : 'text-slate-300'}`}>{Math.round(split.avgHr)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsPanel;
