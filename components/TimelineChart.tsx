
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Track, TrackPoint, PauseSegment, UserProfile } from '../types';
import { getTrackPointAtDistance } from '../services/trackEditorUtils';
import { calculateSmoothedMetrics } from '../services/dataProcessingService';

export type YAxisMetric = 'pace' | 'elevation' | 'speed' | 'hr' | 'power';

interface TimelineChartProps {
    track: Track;
    onSelectionChange: (selection: { startDistance: number; endDistance: number } | null) => void;
    yAxisMetrics: YAxisMetric[];
    onChartHover: (point: TrackPoint | null) => void;
    hoveredPoint: TrackPoint | null;
    showPauses: boolean;
    pauseSegments: PauseSegment[];
    highlightedRange?: { startDistance: number; endDistance: number } | null;
    selectedPoint?: TrackPoint | null;
    smoothingWindow?: number;
    animationProgress?: number;
    isAnimating?: boolean;
    userProfile?: UserProfile;
}

const metricInfo: Record<string, { label: string, color: string, formatter: (v: number) => string, unit: string }> = {
    pace: { label: 'Ritmo', color: '#06b6d4', unit: 'min/km', formatter: (v) => {
        if (!isFinite(v) || v <= 0) return '--:--';
        const m = Math.floor(v);
        const s = Math.round((v - m) * 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }},
    elevation: { label: 'Altitudine', color: '#10b981', unit: 'm', formatter: (v) => `${v.toFixed(0)}m` },
    speed: { label: 'Velocità', color: '#f97316', unit: 'km/h', formatter: (v) => `${v.toFixed(1)} km/h` },
    hr: { label: 'FC', color: '#ef4444', unit: 'bpm', formatter: (v) => `${Math.round(v)}` },
    power: { label: 'Potenza', color: '#a855f7', unit: 'W', formatter: (v) => `${Math.round(v)}W` },
};

const TimelineChart: React.FC<TimelineChartProps> = ({ 
    track, onSelectionChange, yAxisMetrics, onChartHover, hoveredPoint, 
    showPauses, pauseSegments, highlightedRange, selectedPoint, smoothingWindow = 15,
    animationProgress, isAnimating, userProfile
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragRange, setDragRange] = useState<{ start: number; end: number } | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!svgRef.current) return;
        const obs = new ResizeObserver(entries => {
            setDimensions({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
        });
        obs.observe(svgRef.current);
        return () => obs.disconnect();
    }, []);

    const PADDING = { top: 35, right: 20, bottom: 20, left: 45 };
    const width = Math.max(0, dimensions.width - PADDING.left - PADDING.right);
    const height = Math.max(0, dimensions.height - PADDING.top - PADDING.bottom);

    const xScale = useCallback((dist: number) => (dist / track.distance) * width, [track.distance, width]);
    const getDistAtX = useCallback((x: number) => {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return 0;
        const relativeX = x - svgRect.left - PADDING.left;
        return Math.max(0, Math.min(track.distance, (relativeX / width) * track.distance));
    }, [track.distance, width]);

    const activePoint = useMemo(() => {
        if (animationProgress !== undefined && (isAnimating || animationProgress > 0)) {
            return getTrackPointAtDistance(track, animationProgress);
        }
        return hoveredPoint;
    }, [hoveredPoint, animationProgress, isAnimating, track]);

    const currentValues = useMemo(() => {
        if (!activePoint) return null;
        const idx = track.points.findIndex(pt => pt.cummulativeDistance >= activePoint.cummulativeDistance);
        const { pace } = calculateSmoothedMetrics(track.points, idx === -1 ? 0 : idx, smoothingWindow);
        return { pace, elevation: activePoint.ele, hr: activePoint.hr, power: activePoint.power, dist: activePoint.cummulativeDistance };
    }, [activePoint, track, smoothingWindow]);

    const metricPaths = useMemo(() => {
        return yAxisMetrics.map(metric => {
            const points = track.points.map((p, i) => {
                let val = 0;
                if (metric === 'elevation') val = p.ele;
                else if (metric === 'hr') val = p.hr || 0;
                else if (metric === 'power') val = p.power || 0;
                else {
                    const m = calculateSmoothedMetrics(track.points, i, smoothingWindow);
                    val = metric === 'speed' ? m.speed : m.pace;
                }
                return { x: xScale(p.cummulativeDistance), y: val };
            });
            const vals = points.map(p => p.y).filter(v => v > 0);
            const minV = Math.min(...vals), maxV = Math.max(...vals), vRange = maxV - minV || 1;
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${height - ((p.y - minV) / vRange) * height}`).join(' ');
            return { metric, pathData, color: metricInfo[metric].color };
        });
    }, [track, yAxisMetrics, xScale, height, smoothingWindow]);

    const effectiveRange = dragRange || (highlightedRange ? { start: highlightedRange.startDistance, end: highlightedRange.endDistance } : null);

    return (
        <div className="w-full h-full relative select-none bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/50 shadow-inner group/chart">
            {currentValues && (
                <div className="absolute top-1 left-12 right-2 flex flex-wrap gap-1 z-20 pointer-events-none">
                    {yAxisMetrics.map(m => {
                        const val = (currentValues as any)[m];
                        if (val === undefined || val === null || val === 0) return null;
                        return (
                            <div key={m} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded shadow-lg ring-1 ring-white/5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: metricInfo[m].color }}></div>
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{metricInfo[m].label}:</span>
                                <span className="text-[10px] font-mono font-bold text-white">{metricInfo[m].formatter(val)}</span>
                            </div>
                        );
                    })}
                    <div className="ml-auto px-1.5 py-0.5 bg-cyan-950/40 rounded border border-cyan-500/30 font-mono text-[8px] text-cyan-200">{currentValues.dist.toFixed(2)} km</div>
                </div>
            )}
            <svg
                ref={svgRef}
                className="w-full h-full cursor-crosshair touch-none"
                onMouseDown={(e) => { const d = getDistAtX(e.clientX); setDragRange({start:d, end:d}); setIsDragging(true); onSelectionChange(null); }}
                onMouseMove={(e) => { const d = getDistAtX(e.clientX); if(isDragging && dragRange) { setDragRange(p=>({...p!, end:d})); onSelectionChange({startDistance:Math.min(dragRange.start, d), endDistance:Math.max(dragRange.start, d)}); } onChartHover(getTrackPointAtDistance(track, d)); }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => { setIsDragging(false); onChartHover(null); }}
                onTouchStart={(e) => { if(e.touches.length===1){ const d = getDistAtX(e.touches[0].clientX); setDragRange({start:d, end:d}); setIsDragging(true); } }}
                onTouchMove={(e) => { const d = getDistAtX(e.touches[0].clientX); if(isDragging && dragRange) { setDragRange(p=>({...p!, end:d})); onSelectionChange({startDistance:Math.min(dragRange.start, d), endDistance:Math.max(dragRange.start, d)}); } onChartHover(getTrackPointAtDistance(track, d)); }}
                onTouchEnd={() => setIsDragging(false)}
            >
                <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
                    {[0, 0.25, 0.5, 0.75, 1].map(r => (<line key={r} x1={0} y1={r * height} x2={width} y2={r * height} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />))}
                    {effectiveRange && (<rect x={xScale(Math.min(effectiveRange.start, effectiveRange.end))} y={0} width={Math.abs(xScale(effectiveRange.end) - xScale(effectiveRange.start))} height={height} fill="rgba(34, 211, 238, 0.2)" stroke="rgba(34, 211, 238, 0.5)" strokeWidth="1" />)}
                    {metricPaths.map(p => (<path key={p.metric} d={p.pathData} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" className="opacity-80" />))}
                    {activePoint && (<line x1={xScale(activePoint.cummulativeDistance)} y1={0} x2={xScale(activePoint.cummulativeDistance)} y2={height} stroke="#fde047" strokeWidth="1.5" strokeDasharray="4" />)}
                </g>
            </svg>
        </div>
    );
};

export default TimelineChart;
