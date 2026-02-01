
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { RaceGapSnapshot, Track, RaceRunner, LeaderStats } from '../types';

interface RaceGapChartProps {
    history: RaceGapSnapshot[];
    tracks: Track[];
    currentTime: number;
    currentGaps: Map<string, number | undefined>;
    runners?: RaceRunner[];
    leaderStats?: Record<string, LeaderStats>;
}

const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const RaceGapChart: React.FC<RaceGapChartProps> = ({ history, tracks, currentTime, currentGaps, runners, leaderStats }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const height = 140; 
    const padding = { top: 10, right: 60, bottom: 20, left: 50 };
    const chartW = Math.max(0, width - padding.left - padding.right);
    const chartH = height - padding.top - padding.bottom;

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0].contentRect.width > 0) {
                setWidth(entries[0].contentRect.width);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const { maxGap, activeTracks, sortedLeaderboard } = useMemo(() => {
        let maxG = 10;
        const active: Track[] = [];
        const trackIds = new Set<string>();
        
        history.forEach(h => Object.keys(h.gaps).forEach(k => trackIds.add(k)));
        tracks.forEach(t => { if(trackIds.has(t.id)) active.push(t); });

        history.forEach(snap => {
            Object.values(snap.gaps).forEach((gap: any) => { if ((gap as number) > maxG) maxG = gap as number; });
        });
        currentGaps.forEach(gap => { if (gap && gap > maxG) maxG = gap; });

        const leaderboard = active.map(t => {
            const gap = currentGaps.get(t.id) || 0;
            // Fix: runners array lookup to see if finished
            const runner = runners?.find(r => r.trackId === t.id);
            const finished = runner?.finished;
            const finishTime = runner?.finishTime;
            
            return { 
                ...t, 
                currentGap: gap, 
                finished, 
                finishTime,
                stats: leaderStats ? leaderStats[t.id] : undefined 
            };
        }).sort((a, b) => a.currentGap - b.currentGap);

        return { maxGap: maxG * 1.1, activeTracks: active, sortedLeaderboard: leaderboard };
    }, [history, tracks, currentGaps, runners, leaderStats]);

    const xScale = (time: number) => (time / Math.max(currentTime, 1000)) * chartW;
    const yScale = (gap: number) => (gap / maxGap) * chartH;

    if (width === 0) return <div ref={containerRef} className="w-full h-full" />;

    return (
        <div ref={containerRef} className="w-full h-full bg-slate-900 border-t border-slate-700 flex flex-col">
            <div className="relative h-[140px] w-full bg-slate-900/50">
                <div className="absolute top-1 left-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Distacco (m) vs Tempo
                </div>
                <svg width="100%" height={height} className="overflow-visible">
                    <defs>
                        <linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f172a" stopOpacity="0"/>
                            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8"/>
                        </linearGradient>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                        const y = padding.top + (chartH * pct);
                        const val = Math.round(maxGap * pct);
                        return (
                            <g key={pct}>
                                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                                <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="monospace">-{val}</text>
                            </g>
                        );
                    })}

                    <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#ffffff" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
                    <text x={width - padding.right + 5} y={padding.top + 3} fontSize="9" fill="#ffffff" opacity="0.5" fontWeight="bold">Leader</text>

                    <g transform={`translate(${padding.left}, ${padding.top})`}>
                        {sortedLeaderboard.map(track => {
                            let d = '';
                            
                            // Determine cutoff time for drawing: if finished, stop at finish time.
                            const drawLimitTime = (track.finished && track.finishTime) ? track.finishTime : currentTime;

                            history.forEach((snap, i) => {
                                if (snap.time > drawLimitTime) return; // Don't draw points after finish
                                const gap = snap.gaps[track.id];
                                if (gap !== undefined) {
                                    const x = xScale(snap.time);
                                    const y = yScale(gap);
                                    if (i === 0) d += `M ${x} ${y}`;
                                    else d += ` L ${x} ${y}`;
                                }
                            });

                            const liveGap = currentGaps.get(track.id);
                            let lastX = 0;
                            let lastY = 0;

                            if (liveGap !== undefined) {
                                // Clamp final point to finish time if applicable
                                const finalTime = Math.min(currentTime, drawLimitTime);
                                const xLive = xScale(finalTime);
                                const yLive = yScale(liveGap);
                                
                                if (d === '') d += `M ${xLive} ${yLive}`;
                                else d += ` L ${xLive} ${yLive}`;
                                lastX = xLive;
                                lastY = yLive;
                            }

                            return (
                                <g key={track.id}>
                                    <path d={d} fill="none" stroke={track.color} strokeWidth="2.5" strokeLinejoin="round" />
                                    <circle cx={lastX} cy={lastY} r="4" fill={track.color} stroke="white" strokeWidth="1.5" />
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            <div className="flex-grow bg-slate-950 flex items-center px-4 overflow-x-auto custom-scrollbar border-t border-slate-800 gap-6">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Classifica Live:</span>
                {sortedLeaderboard.map((track, idx) => {
                    const gap = track.currentGap || 0;
                    return (
                        <div key={track.id} className="flex items-center gap-2 shrink-0 py-2">
                            <span className="text-xs font-bold text-slate-500 w-4">{idx + 1}.</span>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: track.color }}></div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white leading-none">
                                    {track.name} {track.finished && '🏁'}
                                </span>
                                <div className="flex gap-3 text-[9px] font-mono text-slate-400 leading-none mt-1">
                                    <span>{gap === 0 ? 'Leader' : `+${gap < 1000 ? gap.toFixed(0) + 'm' : (gap/1000).toFixed(2) + 'km'}`}</span>
                                    {track.stats && (track.stats.timeInLead > 0 || track.stats.distanceInLead > 0) && (
                                        <span className="text-amber-500 font-bold border-l border-slate-700 pl-3">
                                            Lead: {(track.stats.distanceInLead/1000).toFixed(1)}km / {formatDuration(track.stats.timeInLead)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RaceGapChart;
