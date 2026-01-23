
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Track, TrackPoint, PauseSegment } from '../types';
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
    selectedPoint?: TrackPoint | null; // Point selected from map to highlight
    smoothingWindow?: number;
}

const metricInfo: Record<string, { label: string, color: string, formatter: (v: number) => string }> = {
    pace: {
        label: 'Ritmo',
        color: '#06b6d4', // cyan-500
        formatter: (pace) => {
            if (!isFinite(pace) || pace <= 0) return '--:--';
            const minutes = Math.floor(pace);
            const seconds = Math.round((pace - minutes) * 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },
    },
    elevation: {
        label: 'Altitudine',
        color: '#22c55e', // green-500
        formatter: (ele) => `${ele.toFixed(0)}m`,
    },
    speed: {
        label: 'Velocità',
        color: '#f97316', // orange-500
        formatter: (speed) => `${speed.toFixed(1)}km/h`,
    },
    hr: {
        label: 'FC',
        color: '#ef4444', // red-500
        formatter: (hr) => `${Math.round(hr)}`,
    },
    power: {
        label: 'Potenza',
        color: '#a855f7', // purple-500
        formatter: (w) => `${Math.round(w)}W`,
    },
    cad: {
        label: 'Passi',
        color: '#e879f9', // pink-500
        formatter: (cad) => `${Math.round(cad)}`,
    },
};

const formatTimeRelative = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const PauseClockIcon: React.FC<{ x: number, y: number }> = ({ x, y }) => (
    <g transform={`translate(${x - 8}, ${y})`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-amber-400 opacity-80 drop-shadow-md">
            <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75v-3.75Z" clipRule="evenodd" />
        </svg>
    </g>
);

const TimelineChart: React.FC<TimelineChartProps> = ({ track, onSelectionChange, yAxisMetrics, onChartHover, hoveredPoint, showPauses, pauseSegments, highlightedRange, selectedPoint, smoothingWindow = 30 }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, viewRange: { min: number, max: number } } | null>(null);
    const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
    const [viewRange, setViewRange] = useState({ min: 0, max: track.distance });
    const [isTouchActive, setIsTouchActive] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // Reset view when track changes
        setViewRange({ min: 0, max: track.distance });
        setSelection(null);
        if (onSelectionChange) onSelectionChange(null);
    }, [track, onSelectionChange]);

    useEffect(() => {
        if (!svgRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        observer.observe(svgRef.current);
        return () => observer.disconnect();
    }, []);

    const PADDING = { top: 10, right: 10, bottom: 25, left: 50 };

    const pointsWithAllData = useMemo(() => {
        if (!track || track.points.length < 2) return [];

        return track.points.map((p, i) => {
            const values: { [key: string]: number | null } = {};
            values.elevation = p.ele;
            values.hr = p.hr ?? null;
            values.cad = p.cad ?? null;
            values.power = p.power ?? null;
            
            const { speed, pace } = calculateSmoothedMetrics(track.points, i, smoothingWindow);
            values.speed = speed;
            values.pace = pace > 0 ? pace : null;
            
            return { ...p, values };
        });
    }, [track, smoothingWindow]);

    const metricDomains = useMemo(() => {
        const domains: any = {};
        if (pointsWithAllData.length < 2) return domains;

        for (const metric of Object.keys(metricInfo) as string[]) {
            const validValues = pointsWithAllData.map(p => p.values[metric]).filter((v): v is number => v !== null && v !== undefined && isFinite(v));
            if (validValues.length > 0) {
                let min = Math.min(...validValues);
                let max = Math.max(...validValues);
                if (metric === 'pace') max = Math.min(max, 20); 
                if (metric === 'speed') min = Math.max(min, 0); 
                
                const range = max - min;
                min = min - range * 0.05;
                max = max + range * 0.05;
                if (min === max) { min -= 1; max += 1; }

                domains[metric] = { min, max };
            }
        }
        return domains;
    }, [pointsWithAllData]);


    const { xScale, yScale, xAxisLabels, width, height, hoveredValues, hoveredX, selectedX, hoveredRelativeTime } = useMemo(() => {
        // Use dimensions state for width/height logic to ensure reactivity
        const svgWidth = dimensions.width;
        const svgHeight = dimensions.height;
        
        const emptyState = { xScale: () => 0, yScale: () => 0, xAxisLabels: [], width:0, height: 0, hoveredValues: null, hoveredX: null, selectedX: null, hoveredRelativeTime: null };
        if (!track || track.points.length < 2 || svgWidth === 0 || svgHeight === 0) return emptyState;
        
        const width = svgWidth - PADDING.left - PADDING.right;
        const height = svgHeight - PADDING.top - PADDING.bottom;
        
        const viewDistance = viewRange.max - viewRange.min;
        const xScale = (d: number) => ((d - viewRange.min) / viewDistance) * width;
        const yScale = (ratio: number) => height - (Math.max(0, Math.min(1, ratio)) * height);

        const numXLabels = 5;
        const xInterval = viewDistance / numXLabels;
        const xAxisLabels = [];
        for (let i = 0; i <= numXLabels; i++) {
            const dist = viewRange.min + i * xInterval;
            xAxisLabels.push({ value: `${dist.toFixed(dist < 1 ? 2 : 1)}km`, x: xScale(dist) });
        }

        const hoveredX = hoveredPoint ? xScale(hoveredPoint.cummulativeDistance) : null;
        const selectedX = selectedPoint ? xScale(selectedPoint.cummulativeDistance) : null;

        let hoveredValues: { [key: string]: number | null } | null = null;
        let hoveredRelativeTime: string | null = null;

        if (hoveredPoint) {
            const dataPoint = pointsWithAllData.find(p => p.time.getTime() === hoveredPoint.time.getTime());
            if (dataPoint) {
                hoveredValues = dataPoint.values;
                hoveredRelativeTime = formatTimeRelative(dataPoint.time.getTime() - track.points[0].time.getTime());
            }
        }

        return { xScale, yScale, xAxisLabels, width, height, hoveredValues, hoveredX, selectedX, hoveredRelativeTime };
    }, [track, PADDING, viewRange, pointsWithAllData, dimensions, hoveredPoint, selectedPoint]);

    const getDistanceAtX = useCallback((clientX: number) => {
        if (!svgRef.current) return 0;
        const svgX = clientX - svgRef.current.getBoundingClientRect().left - PADDING.left;
        const clampedX = Math.max(0, Math.min(svgX, width));
        const viewDistance = viewRange.max - viewRange.min;
        return (clampedX / width) * viewDistance + viewRange.min;
    }, [width, viewRange, PADDING.left]);

    // MOUSE EVENTS (Desktop)
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (e.shiftKey) {
            setIsPanning(true);
            setDragStart({ x: e.clientX, viewRange: { ...viewRange } });
        } else if (onSelectionChange) {
            setIsDragging(true);
            const startPos = e.clientX;
            setSelection({ start: startPos, end: startPos });
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isPanning && dragStart) {
            const dx = e.clientX - dragStart.x;
            const viewDistance = dragStart.viewRange.max - dragStart.viewRange.min;
            const distancePerPixel = viewDistance / width;
            const distanceDelta = dx * distancePerPixel;
            
            let newMin = dragStart.viewRange.min - distanceDelta;
            let newMax = dragStart.viewRange.max - distanceDelta;

            if (newMin < 0) {
                newMax -= newMin;
                newMin = 0;
            }
            if (newMax > track.distance) {
                newMin -= (newMax - track.distance);
                newMax = track.distance;
            }
            newMin = Math.max(0, newMin);
            
            setViewRange({ min: newMin, max: newMax });

        } else if (isDragging) {
            const currentX = e.clientX;
            setSelection(s => s ? { ...s, end: currentX } : null);
            
            if (selection && onSelectionChange) {
                const startDistance = getDistanceAtX(selection.start);
                const endDistance = getDistanceAtX(currentX);
                if (Math.abs(endDistance - startDistance) > 0.01) {
                    onSelectionChange({
                        startDistance: Math.min(startDistance, endDistance),
                        endDistance: Math.max(startDistance, endDistance)
                    });
                }
            }
            const distance = getDistanceAtX(e.clientX);
            const point = getTrackPointAtDistance(track, distance);
            onChartHover(point);
        } else {
            const distance = getDistanceAtX(e.clientX);
            const point = getTrackPointAtDistance(track, distance);
            onChartHover(point);
        }
    };

    const handleMouseUp = () => {
        if (isDragging && selection && onSelectionChange) {
             const startDistance = getDistanceAtX(selection.start);
             const endDistance = getDistanceAtX(selection.end);
             if (Math.abs(endDistance - startDistance) < 0.01) {
                 onSelectionChange(null);
             }
             setSelection(null);
        }
        setIsDragging(false);
        setIsPanning(false);
        setDragStart(null);
    };

    const handleMouseLeave = () => {
        if (isDragging) handleMouseUp();
        onChartHover(null);
    };

    // TOUCH EVENTS (Mobile)
    const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 2) {
            // Multi-touch for selection
            setIsTouchActive(true);
            onChartHover(null); // Clear hover when selecting
            e.preventDefault(); // Prevent scroll/zoom
            const t1 = e.touches[0].clientX;
            const t2 = e.touches[1].clientX;
            setSelection({ start: t1, end: t2 });
            
            const d1 = getDistanceAtX(t1);
            const d2 = getDistanceAtX(t2);
            onSelectionChange({ 
                startDistance: Math.min(d1, d2), 
                endDistance: Math.max(d1, d2) 
            });
        } else if (e.touches.length === 1) {
            // Single touch for hover/data inspection
            // Reset selection if we were selecting
            if (selection) {
                setSelection(null);
                onSelectionChange(null);
            }
            setIsTouchActive(false);
            const distance = getDistanceAtX(e.touches[0].clientX);
            const point = getTrackPointAtDistance(track, distance);
            onChartHover(point);
        }
    };

    const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 2) {
            // Update selection dynamically
            setIsTouchActive(true);
            e.preventDefault();
            const t1 = e.touches[0].clientX;
            const t2 = e.touches[1].clientX;
            setSelection({ start: t1, end: t2 });
            
            const d1 = getDistanceAtX(t1);
            const d2 = getDistanceAtX(t2);
            onSelectionChange({ 
                startDistance: Math.min(d1, d2), 
                endDistance: Math.max(d1, d2) 
            });
        } else if (e.touches.length === 1) {
            // Update hover
            // We allow scroll unless explicitly prevented by touch-action css
            const distance = getDistanceAtX(e.touches[0].clientX);
            const point = getTrackPointAtDistance(track, distance);
            onChartHover(point);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 0) {
            setIsTouchActive(false);
            // If we were just hovering (no selection rectangle active/persisted in parent), clear hover
            if (!selection) {
                onChartHover(null);
            }
            // Clear internal selection state (visual rect), but parent keeps the highlighted range if valid
            setSelection(null);
        }
    };

    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const zoomFactor = 1.15;
        const delta = e.deltaY > 0 ? zoomFactor : 1 / zoomFactor;
        
        const mouseDistance = getDistanceAtX(e.clientX);
        const currentRange = viewRange.max - viewRange.min;
        let newRange = currentRange * delta;

        if (newRange > track.distance) newRange = track.distance;
        if (newRange < 0.01) newRange = 0.01;

        const mouseRatio = (mouseDistance - viewRange.min) / currentRange;
        
        let newMin = mouseDistance - newRange * mouseRatio;
        let newMax = newMin + newRange;

        if (newMin < 0) {
            newMin = 0;
            newMax = newRange;
        }
        if (newMax > track.distance) {
            newMax = track.distance;
            newMin = newMax - newRange;
        }

        setViewRange({ min: newMin, max: newMax });
    };

    const resetZoom = () => {
        setViewRange({ min: 0, max: track.distance });
    };
    
    // Use selection if dragging, otherwise check highlightedRange
    const displaySelection = useMemo(() => {
        if (selection) {
            const startX = xScale(getDistanceAtX(selection.start));
            const endX = xScale(getDistanceAtX(selection.end));
            return {
                x: Math.min(startX, endX),
                width: Math.abs(endX - startX),
                color: 'rgba(255,255,255,0.2)',
                stroke: 'rgba(255,255,255,0.5)'
            };
        } else if (highlightedRange) {
            const startX = xScale(highlightedRange.startDistance);
            const endX = xScale(highlightedRange.endDistance);
            return {
                x: Math.min(startX, endX),
                width: Math.abs(endX - startX),
                color: 'rgba(14, 165, 233, 0.2)',
                stroke: 'rgba(14, 165, 233, 0.5)'
            }
        }
        return null;
    }, [selection, highlightedRange, xScale, getDistanceAtX]);
    
    const isZoomed = viewRange.min > 0 || viewRange.max < track.distance;

    return (
        <div className="w-full h-full relative group select-none">
            <svg
                ref={svgRef}
                className={`w-full h-full ${isPanning ? 'cursor-grabbing' : (onSelectionChange && isDragging ? 'cursor-ew-resize' : 'cursor-crosshair')}`}
                style={{ touchAction: 'none' }} // Prevents browser zoom/scroll on the chart area to handle custom touches
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
            >
                 <defs>
                    <linearGradient id="grad-pace" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity="0.6" />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="grad-speed" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity="0.6" />
                         <stop offset="95%" stopColor="#ef4444" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="grad-elevation" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity="0.6" />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="grad-hr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity="0.6" />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="grad-power" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d946ef" stopOpacity="0.6" />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity="0.4" />
                    </linearGradient>
                </defs>

                <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
                    {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                        <g key={`y-axis-${ratio}`}>
                            <text x={-5} y={yScale(ratio)} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize="10">{`${ratio * 100}%`}</text>
                            <line x1={0} y1={yScale(ratio)} x2={width} y2={yScale(ratio)} stroke="#334155" strokeWidth="0.5" />
                        </g>
                    ))}

                     {xAxisLabels.map(label => (
                        <g key={`${label.value}-${label.x}`}>
                            <text x={label.x} y={height + 15} textAnchor="middle" fill="#94a3b8" fontSize="10">{label.value}</text>
                        </g>
                    ))}
                    
                    {showPauses && pauseSegments.map((segment, i) => {
                        const x = xScale(segment.startPoint.cummulativeDistance);
                        const endX = xScale(segment.endPoint.cummulativeDistance);
                        const segmentWidth = endX - x;
                        if (segmentWidth <= 0 || x > width || endX < 0) return null;

                        return (
                            <rect
                                key={`pause-${i}`}
                                x={x}
                                y={0}
                                width={segmentWidth}
                                height={height}
                                fill="rgba(113, 113, 122, 0.3)"
                                className="pointer-events-none"
                            />
                        );
                    })}

                    {displaySelection && (
                        <rect
                            x={displaySelection.x}
                            y={0}
                            width={displaySelection.width}
                            height={height}
                            fill={displaySelection.color}
                            stroke={displaySelection.stroke}
                            strokeWidth="1"
                            className="pointer-events-none"
                        />
                    )}

                    {yAxisMetrics.map((metric, metricIndex) => {
                        const domain = metricDomains[metric];
                        if (!domain) return null;

                        const domainRange = domain.max - domain.min;

                        const linePoints = pointsWithAllData
                            .map(p => {
                                const value = p.values[metric];
                                if (value === null || value === undefined) return null;
                                let ratio = domainRange > 0 ? (value - domain.min) / domainRange : 0.5;
                                if (metric === 'pace') ratio = 1 - ratio; 
                                return { x: xScale(p.cummulativeDistance), y: yScale(ratio) };
                            })
                            .filter((pt): pt is {x: number, y: number} => pt !== null);

                        if (linePoints.length < 2) return null;
                        
                        const linePath = linePoints.map(pt => `${pt.x},${pt.y}`).join(' ');
                        const fillPath = `M${linePath} V${height} H${linePoints[0].x} Z`;
                        const isPrimaryMetric = metricIndex === 0;

                        return (
                            <g key={metric}>
                                {isPrimaryMetric && (
                                    <path d={fillPath} fill={`url(#grad-${metric})`} />
                                )}
                                <path d={`M${linePath}`} fill="none" stroke={metricInfo[metric].color} strokeWidth="2" />
                            </g>
                        );
                    })}

                    {showPauses && pauseSegments.map((segment, i) => {
                        const startX = xScale(segment.startPoint.cummulativeDistance);
                        const endX = xScale(segment.endPoint.cummulativeDistance);
                        const midX = (startX + endX) / 2;
                        if (midX >= 0 && midX <= width) {
                            return <PauseClockIcon key={`pause-icon-${i}`} x={midX} y={height - 18} />;
                        }
                        return null;
                    })}
                    
                    {selectedX !== null && selectedPoint && selectedX >= 0 && selectedX <= width && (
                         <line
                            x1={selectedX} y1={0}
                            x2={selectedX} y2={height}
                            stroke="#67e8f9"
                            strokeWidth="1.5"
                            pointerEvents="none"
                        />
                    )}

                    {/* Only show hover if not in multi-touch selection mode */}
                    {hoveredX !== null && hoveredValues && hoveredPoint && !isDragging && !isPanning && !isTouchActive && hoveredX >= 0 && hoveredX <= width && (
                        <g pointerEvents="none">
                            <line
                                x1={hoveredX} y1={0}
                                x2={hoveredX} y2={height}
                                stroke="#fde047"
                                strokeWidth="1"
                                strokeDasharray="3,3"
                            />
                            
                            {/* Dynamic floating tooltip that adjusts position to stay visible */}
                            <g transform={`translate(${hoveredX + 10 + 130 > width ? hoveredX - 140 : hoveredX + 10}, 5)`}>
                                <rect 
                                    x="0" y="0" width="130" height={36 + (['pace', 'elevation', 'speed', 'hr', 'power'].filter(m => yAxisMetrics.includes(m as any)).length * 14)} rx="6"
                                    fill="rgba(15, 23, 42, 0.9)"
                                    stroke="#475569"
                                    strokeWidth="1"
                                />
                                <text x="8" y="16" fill="#f1f5f9" fontSize="10" fontWeight="bold">
                                    {hoveredPoint.cummulativeDistance.toFixed(2)} km
                                </text>
                                <text x="8" y="28" fill="#94a3b8" fontSize="10" fontWeight="bold">
                                    {hoveredRelativeTime}
                                </text>
                                {['pace', 'elevation', 'speed', 'hr', 'power'].filter(m => yAxisMetrics.includes(m as any)).map((metric, i) => {
                                    const value = hoveredValues![metric];
                                    if (value === null || value === undefined) return null;
                                    const info = metricInfo[metric];
                                    return (
                                        <text key={metric} x="8" y={44 + i * 14} fill={info.color} fontSize="10" fontWeight="600">
                                           {info.label}: <tspan fill="#fff">{info.formatter(value)}</tspan>
                                        </text>
                                    )
                                })}
                            </g>

                             {yAxisMetrics.map(metric => {
                                const domain = metricDomains[metric];
                                if (!domain) return null;
                                const value = hoveredValues![metric];
                                if (value === null || value === undefined) return null;
                                
                                const domainRange = domain.max - domain.min;
                                let ratio = domainRange > 0 ? (value - domain.min) / domainRange : 0.5;
                                if (metric === 'pace') ratio = 1 - ratio;

                                return <circle key={metric} cx={hoveredX} cy={yScale(ratio)} r="4" fill={metricInfo[metric].color} stroke="white" strokeWidth="1.5" />
                             })}
                        </g>
                    )}
                </g>
            </svg>
            
            <div className="absolute bottom-0 right-2 text-[9px] text-slate-500 pointer-events-none uppercase font-bold tracking-widest flex items-center gap-2">
                <span className="hidden sm:inline">Shift+Drag: Pan | Drag: Selezione</span>
                <span className="sm:hidden">Usa 2 dita per selezionare</span>
            </div>

            {isZoomed && (
                <button 
                    onClick={resetZoom}
                    className="absolute top-1 right-2 bg-slate-700/80 hover:bg-cyan-600 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-slate-600"
                >
                    Reset Zoom
                </button>
            )}
        </div>
    );
};

export default TimelineChart;
