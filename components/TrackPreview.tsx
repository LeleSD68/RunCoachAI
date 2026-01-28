
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Track, TrackPoint, Split, PauseSegment, AiSegment, UserProfile, TrackStats, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import WeatherPanel from './WeatherPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import ResizablePanel from './ResizablePanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import RatingStars from './RatingStars';
import { calculateTrackStats, estimateTrackRPE } from '../services/trackStatsService';
import { getPointsInDistanceRange, getTrackStateAtTime, getTrackPointAtDistance, getSmoothedPace } from '../services/trackEditorUtils';
import { smoothTrackPoints, calculateSmoothedMetrics, calculateRunningPower } from '../services/dataProcessingService';
import { generateAiRating } from '../services/aiHelper';

interface TrackDetailViewProps {
    track: Track;
    userProfile: UserProfile;
    onExit: () => void;
    allHistory?: Track[];
    plannedWorkouts?: PlannedWorkout[];
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    onStartAnimation?: (id: string) => void;
    onOpenReview?: (trackId: string) => void;
    autoOpenAi?: boolean;
    onCheckAiAccess?: () => boolean; 
    isGuest?: boolean;
    onLimitReached?: () => void;
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

const metricLabels: Record<YAxisMetric, string> = {
    pace: 'Ritmo',
    elevation: 'Alt.',
    speed: 'Vel.',
    hr: 'FC',
    power: 'Watt'
};

const metricFormatters: Record<YAxisMetric, (v: number) => string> = {
    pace: (p) => {
        if (!isFinite(p) || p <= 0) return '--:--';
        const m = Math.floor(p);
        const s = Math.round((p - m) * 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },
    elevation: (v) => `${v.toFixed(0)}m`,
    speed: (v) => `${v.toFixed(1)}`,
    hr: (v) => `${Math.round(v)}`,
    power: (v) => `${Math.round(v)}W`
};

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 mr-1">
        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75v-3.75Z" clipRule="evenodd" />
    </svg>
);

const ReplayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M13.485 1.431a.75.75 0 0 0-1.449.39 5.5 5.5 0 0 1 9.201 2.466l.312-.311h-2.433a.75.75 0 0 0 .75-.75V.484a.75.75 0 0 0-1.5 0v2.43l-.31-.31a7 7 0 0 0-11.712-3.138Z" clipRule="evenodd" />
    </svg>
);

const formatDuration = (ms: number, compact = false) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(totalSeconds / 3600);
    if (compact) return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '-:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface ExtendedStats {
    stats: TrackStats;
    range: {
        startDist: number;
        endDist: number;
        startTime: number;
        endTime: number;
    }
}

// Memoized Left Panel to avoid re-renders during animation
const LeftDataPanel = React.memo(({ 
    stats, 
    track, 
    userProfile, 
    allHistory, 
    plannedWorkouts, 
    onUpdateTrackMetadata, 
    onAddPlannedWorkout, 
    autoOpenAi, 
    onCheckAiAccess, 
    selectedSegment, 
    handleSegmentSelect, 
    hasHrData 
}: any) => {
    return (
        <div className="h-full overflow-y-auto bg-slate-900 p-4 custom-scrollbar border-r border-slate-800 flex flex-col space-y-6">
            <StatsPanel stats={stats} selectedSegment={selectedSegment} onSegmentSelect={handleSegmentSelect} />

            {hasHrData && <HeartRateZonePanel track={track} userProfile={userProfile} />}
            <PersonalRecordsPanel track={track} />

            <GeminiTrackAnalysisPanel 
                stats={stats} 
                userProfile={userProfile} 
                track={track} 
                allHistory={allHistory} 
                plannedWorkouts={plannedWorkouts}
                onUpdateTrackMetadata={onUpdateTrackMetadata} 
                onAddPlannedWorkout={onAddPlannedWorkout}
                startOpen={autoOpenAi} 
                onCheckAiAccess={onCheckAiAccess}
            />
            
            <GeminiSegmentsPanel 
                track={track} 
                stats={stats} 
                onSegmentSelect={handleSegmentSelect} 
                selectedSegment={selectedSegment} 
                onCheckAiAccess={onCheckAiAccess}
            />
            
            <WeatherPanel track={track} />
        </div>
    );
});

const SelectionStatsOverlay: React.FC<{ data: ExtendedStats, onClose: () => void }> = ({ data, onClose }) => {
    const { stats, range } = data;
    return (
        <div className="w-full bg-slate-900 border-b border-cyan-500/30 px-3 py-2 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar whitespace-nowrap shrink-0 shadow-lg z-20">
            <div className="flex items-center gap-3 text-[10px] sm:text-xs text-white font-mono">
                <span className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    <span className="text-cyan-400 font-black">KM:</span> {range.startDist.toFixed(1)}-{range.endDist.toFixed(1)}
                </span>
                <span className="w-px h-3 bg-slate-600"></span>
                <span className="flex items-center gap-1"><span className="text-cyan-400 font-black">DIST:</span> {stats.totalDistance.toFixed(2)}</span>
                <span className="w-px h-3 bg-slate-600"></span>
                <span className="flex items-center gap-1"><span className="text-cyan-400 font-black">TIME:</span> {formatDuration(stats.movingDuration, true)}</span>
                <span className="w-px h-3 bg-slate-600"></span>
                <span className="flex items-center gap-1"><span className="text-cyan-400 font-black">PACE:</span> {formatPace(stats.movingAvgPace)}</span>
                <span className="w-px h-3 bg-slate-600"></span>
                <span className="flex items-center gap-1"><span className="text-cyan-400 font-black">ELE:</span> +{Math.round(stats.elevationGain)}</span>
                {stats.avgWatts && (
                    <>
                        <span className="w-px h-3 bg-slate-600"></span>
                        <span className="flex items-center gap-1"><span className="text-purple-400 font-black">PWR:</span> {Math.round(stats.avgWatts)}W</span>
                    </>
                )}
            </div>
            <button onClick={onClose} className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-1 rounded-full transition-colors flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
            </button>
        </div>
    );
};

const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track, userProfile, onExit, allHistory = [], plannedWorkouts = [], onUpdateTrackMetadata, onAddPlannedWorkout, onStartAnimation, onOpenReview, autoOpenAi = false, onCheckAiAccess, isGuest = false, onLimitReached }) => {
    const isMobile = useIsMobile();
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [showPauses, setShowPauses] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [chartSelection, setChartSelection] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [mapGradientMetric, setMapGradientMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power'>('none');
    const [rpe, setRpe] = useState(track.rpe || 5);
    const [smoothingWindow, setSmoothingWindow] = useState(30);
    const prevTrackIdRef = useRef<string>(track.id);
    const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

    // Animation State (Local)
    const [isAnimating, setIsAnimating] = useState(false);
    const [isAnimationMode, setIsAnimationMode] = useState(false); // Track if we are in animation view mode even if paused
    const [animationProgress, setAnimationProgress] = useState(0); // in km
    const [animationSpeed, setAnimationSpeed] = useState(20);
    const [animationTime, setAnimationTime] = useState(0); // track time in ms
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);

    const dateStr = useMemo(() => {
        const d = track.points[0].time;
        return (d instanceof Date ? d : new Date(d)).toLocaleDateString('it-IT', { 
            weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' 
        });
    }, [track]);

    // Track ID tracking to handle scroll reset correctly and force map re-center
    useEffect(() => {
        if (track.id !== prevTrackIdRef.current) {
            setChartSelection(null);
            setSelectedSegment(null);
            setIsAnimating(false);
            setIsAnimationMode(false);
            setAnimationProgress(0);
            setAnimationTime(0);
            prevTrackIdRef.current = track.id;
        }
        setRpe(track.rpe || 5);
        
        const timer = setTimeout(() => {
            setFitBoundsTrigger(prev => prev + 1);
        }, 100);
        return () => clearTimeout(timer);
    }, [track]);

    const displayTrack = useMemo(() => {
        const pointsWithPower = calculateRunningPower(track.points, userProfile.weight || 70);
        const trackWithPower = { ...track, points: pointsWithPower };
        if (smoothingWindow <= 1) return trackWithPower;
        return { ...trackWithPower, points: smoothTrackPoints(trackWithPower.points, smoothingWindow) };
    }, [track, smoothingWindow, userProfile.weight]);

    const stats = useMemo(() => calculateTrackStats(displayTrack, 0), [displayTrack]); 

    // Animation Loop
    useEffect(() => {
        if (isAnimating) {
            lastFrameTimeRef.current = performance.now();
            
            let guestTimeLimit = Infinity;
            if (isGuest) {
                const pAt1km = getTrackPointAtDistance(displayTrack, 1.0);
                if (pAt1km) {
                    guestTimeLimit = pAt1km.time.getTime() - displayTrack.points[0].time.getTime();
                } else {
                    guestTimeLimit = displayTrack.duration;
                }
            }

            const animate = (time: number) => {
                const delta = time - lastFrameTimeRef.current;
                lastFrameTimeRef.current = time;
                
                setAnimationTime(prevTime => {
                    const nextTime = prevTime + delta * animationSpeed;
                    
                    if (isGuest && nextTime > guestTimeLimit) {
                        setIsAnimating(false);
                        if (onLimitReached) onLimitReached();
                        const limitPoint = getTrackStateAtTime(displayTrack, guestTimeLimit);
                        if (limitPoint) setAnimationProgress(limitPoint.point.cummulativeDistance);
                        return guestTimeLimit;
                    }

                    const state = getTrackStateAtTime(displayTrack, nextTime);
                    if (!state || nextTime >= displayTrack.duration) {
                        setIsAnimating(false);
                        return displayTrack.duration;
                    }
                    
                    setAnimationProgress(state.point.cummulativeDistance);
                    return nextTime;
                });
                
                if (isAnimating) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            };
            
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isAnimating, animationSpeed, displayTrack, isGuest, onLimitReached]);

    const handleAnimationProgressChange = (newProgress: number) => {
        setAnimationProgress(newProgress);
        const point = getTrackPointAtDistance(displayTrack, newProgress);
        if (point) {
            const startTime = displayTrack.points[0].time.getTime();
            const newTime = point.time.getTime() - startTime;
            if (isGuest && newProgress > 1.0) {
                if (onLimitReached) onLimitReached();
                setAnimationProgress(1.0);
                // Clamp
            } else {
                setAnimationTime(newTime);
            }
        }
    };

    const hasHrData = useMemo(() => track.points.some(p => p.hr !== undefined && p.hr > 0), [track]);
    const estimatedRpe = useMemo(() => estimateTrackRPE(stats, userProfile), [stats, userProfile]);
    
    const selectionStats = useMemo((): ExtendedStats | null => {
        if (!chartSelection) return null;
        const points = getPointsInDistanceRange(displayTrack, chartSelection.startDistance, chartSelection.endDistance);
        if (points.length < 2) return null;
        
        const tempTrack: Track = { 
            ...displayTrack, 
            id: 'temp-selection', 
            name: 'Selection', 
            points: points, 
            distance: chartSelection.endDistance - chartSelection.startDistance, 
            duration: points[points.length - 1].time.getTime() - points[0].time.getTime() 
        };

        const calculated = calculateTrackStats(tempTrack, 0);
        return {
            stats: calculated,
            range: {
                startDist: chartSelection.startDistance,
                endDist: chartSelection.endDistance,
                startTime: points[0].time.getTime() - displayTrack.points[0].time.getTime(),
                endTime: points[points.length - 1].time.getTime() - displayTrack.points[0].time.getTime()
            }
        };
    }, [chartSelection, displayTrack]);

    const hoveredDataForMap = useMemo((): Record<string, string> | null => {
        if (!hoveredPoint) return null;
        const data: Record<string, string> = {};
        const pointIndex = displayTrack.points.findIndex(p => p.time.getTime() === hoveredPoint.time.getTime());
        if (pointIndex === -1) return null;

        const { speed, pace } = calculateSmoothedMetrics(displayTrack.points, pointIndex, smoothingWindow);
        const point = displayTrack.points[pointIndex];
        
        yAxisMetrics.forEach(m => {
            if (m === 'pace') data[metricLabels[m]] = metricFormatters[m](pace);
            else if (m === 'speed') data[metricLabels[m]] = metricFormatters[m](speed);
            else if (m === 'elevation') data[metricLabels[m]] = metricFormatters[m](point.ele);
            else if (m === 'hr' && point.hr) data[metricLabels[m]] = metricFormatters[m](point.hr);
            else if (m === 'power' && point.power) data[metricLabels[m]] = metricFormatters[m](point.power);
        });
        return data;
    }, [hoveredPoint, displayTrack.points, yAxisMetrics, smoothingWindow]);

    const animationPace = useMemo(() => {
        if (!isAnimationMode) return 0;
        const lookback = animationSpeed > 20 ? 0.1 : 0.05;
        return getSmoothedPace(displayTrack, animationProgress, lookback * 1000);
    }, [isAnimationMode, animationProgress, displayTrack, animationSpeed]);

    const handleHoverChange = useCallback((point: TrackPoint | null) => setHoveredPoint(point), []);
    
    const toggleYAxisMetric = useCallback((metric: YAxisMetric) => {
        setYAxisMetrics(prev => {
            const next = new Set(prev);
            if (next.has(metric)) { if (next.size > 1) next.delete(metric); }
            else next.add(metric);
            return Array.from(next);
        });
    }, []);

    const handleSegmentSelect = useCallback((segment: Split | PauseSegment | AiSegment | null) => {
        setSelectedSegment(segment);
        if (segment) setChartSelection(null);
    }, []);

    const handleChartSelection = useCallback((selection: { startDistance: number; endDistance: number } | null) => {
        setChartSelection(selection);
        if (selection) setSelectedSegment(null);
    }, []);

    const selectionPoints = useMemo(() => {
        if (chartSelection) return getPointsInDistanceRange(displayTrack, chartSelection.startDistance, chartSelection.endDistance);
        if (!selectedSegment) return null;
        if ('splitNumber' in selectedSegment) {
            let startDist = (selectedSegment.splitNumber - 1);
            return getPointsInDistanceRange(displayTrack, startDist, startDist + selectedSegment.distance);
        }
        if ('startPoint' in selectedSegment) return getPointsInDistanceRange(displayTrack, selectedSegment.startPoint.cummulativeDistance, selectedSegment.endPoint.cummulativeDistance);
        if ('type' in selectedSegment && selectedSegment.type === 'ai') return getPointsInDistanceRange(displayTrack, selectedSegment.startDistance, selectedSegment.endDistance);
        return null;
    }, [selectedSegment, chartSelection, displayTrack]);

    const highlightedChartRange = useMemo(() => {
        if (chartSelection) return chartSelection;
        if (!selectedSegment) return null;
        if ('splitNumber' in selectedSegment) {
            let startDist = (selectedSegment.splitNumber - 1);
            return { startDistance: startDist, endDistance: startDist + selectedSegment.distance };
        }
        if ('startPoint' in selectedSegment) return { startDistance: selectedSegment.startPoint.cummulativeDistance, endDistance: selectedSegment.endPoint.cummulativeDistance };
        if ('type' in selectedSegment && selectedSegment.type === 'ai') return { startDistance: selectedSegment.startDistance, endDistance: selectedSegment.endDistance };
        return null;
    }, [selectedSegment, chartSelection]);

    const handleGenerateAiRating = async () => {
        if (onCheckAiAccess && !onCheckAiAccess()) return;
        if (onUpdateTrackMetadata) {
            const result = await generateAiRating(track, allHistory, userProfile, track.linkedWorkout);
            if (result) {
                onUpdateTrackMetadata(track.id, { rating: result.rating, ratingReason: result.reason });
            }
        }
    };

    const chartControls = (
        <div className="w-full h-full flex items-center justify-between px-2 bg-slate-800/90 border-b border-slate-700">
            <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="flex space-x-0.5">
                    {(['pace', 'elevation', 'speed', 'hr', 'power'] as const).map(metric => {
                        const isDisabled = metric === 'hr' && !hasHrData;
                        const isActive = yAxisMetrics.includes(metric);
                        return (
                            <button key={metric} onClick={() => toggleYAxisMetric(metric)} disabled={isDisabled} className={`px-1.5 py-0.5 text-[7px] sm:text-[10px] uppercase tracking-widest rounded transition-all font-black border ${isActive ? 'bg-cyan-600 border-cyan-400 text-white shadow-md' : 'bg-slate-700 border-slate-600 text-slate-300'} ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}>
                                {metricLabels[metric]}
                            </button>
                        );
                    })}
                </div>
                <div className="h-4 w-px bg-slate-700 mx-1"></div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[7px] sm:text-[9px] text-slate-400 uppercase font-black whitespace-nowrap">Smooth: {smoothingWindow}s</span>
                    <input type="range" min="1" max="120" value={smoothingWindow} onChange={(e) => setSmoothingWindow(parseInt(e.target.value))} className="w-12 sm:w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                </div>
            </div>
            <button onClick={() => setShowPauses(p => !p)} className={`flex items-center px-1.5 py-0.5 text-[8px] sm:text-[10px] uppercase tracking-widest rounded transition-all font-black border ${showPauses ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                <ClockIcon /> Pause
            </button>
        </div>
    );

    const chartSection = (
        <div className="w-full h-full relative group bg-slate-900 overflow-hidden">
            <TimelineChart 
                track={displayTrack} 
                onSelectionChange={handleChartSelection}
                yAxisMetrics={yAxisMetrics}
                onChartHover={handleHoverChange}
                hoveredPoint={hoveredPoint}
                pauseSegments={stats.pauses}
                showPauses={showPauses}
                highlightedRange={highlightedChartRange}
                smoothingWindow={smoothingWindow}
                animationProgress={animationProgress}
                isAnimating={isAnimating}
                userProfile={userProfile}
            />
        </div>
    );

    const mapSection = (
        <div className="w-full h-full relative bg-slate-900 flex flex-col">
             <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                 <select value={mapGradientMetric} onChange={(e) => setMapGradientMetric(e.target.value as any)} className="bg-slate-800/95 border border-slate-700 text-white text-[8px] font-black uppercase py-1 px-1.5 rounded focus:border-cyan-500 appearance-none cursor-pointer shadow-lg">
                    <option value="none">Mappa: Standard</option>
                    <option value="elevation">Mappa: Altitudine</option>
                    <option value="pace">Mappa: Ritmo</option>
                    <option value="speed">Mappa: Velocità</option>
                    <option value="power">Mappa: Watt</option>
                    {hasHrData && <option value="hr">Mappa: FC</option>}
                </select>
             </div>
             <div className="flex-grow relative">
                <MapDisplay
                    tracks={[track]}
                    visibleTrackIds={new Set([track.id])}
                    raceRunners={null}
                    hoveredTrackId={null}
                    runnerSpeeds={new Map()}
                    hoveredPoint={hoveredPoint}
                    hoveredData={hoveredDataForMap}
                    onMapHover={handleHoverChange}
                    coloredPauseSegments={showPauses ? stats.pauses : undefined}
                    selectionPoints={selectionPoints}
                    mapGradientMetric={mapGradientMetric}
                    animationTrack={isAnimationMode ? displayTrack : null} 
                    animationProgress={animationProgress}
                    animationPace={animationPace} 
                    isAnimationPlaying={isAnimating}
                    onToggleAnimationPlay={() => setIsAnimating(!isAnimating)}
                    onAnimationProgressChange={handleAnimationProgressChange}
                    animationSpeed={animationSpeed}
                    onAnimationSpeedChange={setAnimationSpeed}
                    onExitAnimation={() => { setIsAnimating(false); setIsAnimationMode(false); setAnimationProgress(0); setAnimationTime(0); }}
                    aiSegmentHighlight={selectedSegment && 'type' in selectedSegment && selectedSegment.type === 'ai' ? selectedSegment : null}
                    fitBoundsCounter={fitBoundsTrigger} 
                />
             </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full font-sans text-white overflow-hidden bg-slate-900">
             <header className="flex items-center justify-between p-2 sm:p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0 z-30 shadow-lg">
                <button onClick={onExit} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-black py-1.5 px-3 sm:py-2 sm:px-5 rounded-lg transition-all shadow-sm text-[10px] sm:text-sm">&larr; {isMobile ? 'INDIETRO' : 'CHIUDI'}</button>
                <div className="text-center px-2 flex-grow min-w-0">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                             {track.isFavorite && <span className="text-amber-400 text-xs">★</span>}
                             <h1 className="text-xs sm:text-xl font-black text-cyan-400 uppercase tracking-tighter truncate">Analisi Attività</h1>
                             {track.isArchived && <span className="text-slate-500 text-[8px] font-bold border border-slate-700 px-1 rounded uppercase tracking-tighter">Archiviata</span>}
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-mono uppercase tracking-wider mb-1">{dateStr}</p>
                        
                        <div className="flex items-center gap-2">
                             {track.rating ? (
                                <div className="flex items-center gap-2 cursor-pointer bg-slate-700/50 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors" onClick={() => onOpenReview && onOpenReview(track.id)}>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Voto Coach</span>
                                    <RatingStars rating={track.rating} reason={track.ratingReason} size="xs" />
                                </div>
                            ) : (
                                <button 
                                    onClick={handleGenerateAiRating} 
                                    className="text-[9px] font-bold text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-500/10 transition-colors uppercase tracking-wider"
                                >
                                    Calcola Voto AI
                                </button>
                            )}
                             {!isMobile && <p className="text-xs text-slate-100 font-bold truncate max-w-md">{track.name}</p>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                    <button 
                        onClick={() => { setIsAnimationMode(true); setIsAnimating(true); setAnimationProgress(0); setAnimationTime(0); }}
                        className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white font-black py-1.5 px-3 sm:py-2 sm:px-5 rounded-lg transition-all shadow-md flex items-center gap-1 text-[10px] sm:text-sm whitespace-nowrap active:scale-95"
                    >
                        <ReplayIcon /> REPLAY
                    </button>
                </div>
            </header>

            <main className="flex-grow overflow-hidden relative">
                {/* RIGID SPLIT LAYOUT: Left (Data) vs Right (Map/Chart) */}
                <ResizablePanel direction={isMobile ? 'vertical' : 'horizontal'} initialSizeRatio={isMobile ? 0.5 : 0.35} minSize={250} className="h-full">
                    
                    {/* LEFT PANEL: DATA & AI (Full Height Scrollable) - Memoized to prevent re-renders on animation frame */}
                    <LeftDataPanel 
                        stats={stats} 
                        track={displayTrack}
                        userProfile={userProfile}
                        allHistory={allHistory}
                        plannedWorkouts={plannedWorkouts}
                        onUpdateTrackMetadata={onUpdateTrackMetadata}
                        onAddPlannedWorkout={onAddPlannedWorkout}
                        autoOpenAi={autoOpenAi}
                        onCheckAiAccess={onCheckAiAccess}
                        selectedSegment={selectedSegment}
                        handleSegmentSelect={handleSegmentSelect}
                        hasHrData={hasHrData}
                    />

                    {/* RIGHT PANEL: MAP & CHART (Split Vertically) */}
                    <div className="h-full relative bg-slate-900 w-full">
                        <ResizablePanel
                            direction="vertical"
                            initialSizeRatio={0.75} // Map 75%, Chart 25%
                            minSize={150}
                            minSizeSecondary={100}
                        >
                            {/* Top: Map */}
                            <div className="h-full w-full relative z-0">
                                {mapSection}
                            </div>

                            {/* Bottom: Chart */}
                            <div className="h-full w-full bg-slate-900 border-t border-slate-700 relative flex flex-col">
                                {selectionStats && <SelectionStatsOverlay data={selectionStats} onClose={() => setChartSelection(null)} />}
                                <div className="h-8 flex-shrink-0">{chartControls}</div>
                                <div className="flex-grow min-h-0">{chartSection}</div>
                            </div>
                        </ResizablePanel>
                    </div>
                </ResizablePanel>
            </main>
        </div>
    );
};

export default TrackDetailView;
