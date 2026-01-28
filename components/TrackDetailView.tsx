
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
import { getPointsInDistanceRange, getTrackStateAtTime, getTrackPointAtDistance } from '../services/trackEditorUtils';
import { smoothTrackPoints, calculateSmoothedMetrics, calculateRunningPower } from '../services/dataProcessingService';

interface TrackDetailViewProps {
    track: Track;
    userProfile: UserProfile;
    onExit: () => void;
    allHistory?: Track[];
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    onStartAnimation?: (id: string) => void;
    onOpenReview?: (trackId: string) => void;
    autoOpenAi?: boolean;
    onCheckAiAccess?: () => boolean; // New prop
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

const NoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.38 2H4.5Zm10 14.5h-9a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H11v3.5A1.5 1.5 0 0 0 12.5 7H16v9a.5.5 0 0 1-.5.5ZM16 5.5l-3.5-3.5V5.5H16Z" clipRule="evenodd" />
    </svg>
);

const ShoeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2 text-cyan-400">
        <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V12a3 3 0 0 0-3-3H5.25Z" />
    </svg>
);

const TagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-cyan-400">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.38 2H4.5Zm10 14.5h-9a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H11v3.5A1.5 1.5 0 0 0 12.5 7H16v9a.5.5 0 0 1-.5.5ZM16 5.5l-3.5-3.5V5.5H16Z" clipRule="evenodd" />
    </svg>
);

const ReplayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M13.485 1.431a.75.75 0 0 0-1.449.39 5.5 5.5 0 0 1 9.201 2.466l.312-.311h-2.433a.75.75 0 0 0 .75-.75V.484a.75.75 0 0 0-1.5 0v2.43l-.31-.31a7 7 0 0 0-11.712-3.138Z" clipRule="evenodd" />
    </svg>
);

const FireIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-red-500">
        <path fillRule="evenodd" d="M13.5 4.938a7 7 0 1 1-9.006 1.737c.202-.257.59-.218.793.039.036.044.11.127.19.238A6.862 6.862 0 0 0 10 13a6.862 6.862 0 0 0 4.519-6.048c.08-.111.154-.194.19-.238.202-.257.591-.296.793-.039.1.128.24.332.397.644.356.711.603 1.554.603 2.68a7 7 0 0 1-3.002 5.922 6.96 6.96 0 0 0 .502-1.928.75.75 0 0 0-1.378-.474 5.46 5.46 0 0 1-2.23 2.82 5.46 5.46 0 0 1-2.228-2.82.75.75 0 0 0-1.38.474c.264.768.656 1.407 1.123 1.916a7 7 0 0 1-4.009-5.83 8.35 8.35 0 0 1 .602-2.68c.158-.312.298-.516.398-.644Z" clipRule="evenodd" />
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

// RPE Scale Definitions
const RPE_SCALE: Record<number, { label: string, desc: string, color: string }> = {
    1: { label: "Molto Leggero", desc: "Sforzo minimo, recupero attivo o camminata.", color: "text-green-300" },
    2: { label: "Leggero", desc: "Riscaldamento, respirazione nasale facile.", color: "text-green-400" },
    3: { label: "Moderato", desc: "Corsa facile, si riesce a conversare (Talk Test).", color: "text-green-500" },
    4: { label: "Impegnativo", desc: "Ritmo maratona, respiro leggermente affannoso.", color: "text-yellow-300" },
    5: { label: "Duro", desc: "Ritmo mezza maratona, concentrazione necessaria.", color: "text-yellow-400" },
    6: { label: "Molto Duro", desc: "Soglia anaerobica, parlare è difficile.", color: "text-orange-400" },
    7: { label: "Intenso", desc: "Ritmo 10k, respiro pesante.", color: "text-orange-500" },
    8: { label: "Molto Intenso", desc: "Ritmo 5k, gambe pesanti, vicino al limite.", color: "text-red-400" },
    9: { label: "Estremo", desc: "Sprint finale o ripetute brevi massimali.", color: "text-red-500" },
    10: { label: "Esaurimento", desc: "Sforzo massimo assoluto, impossibile continuare.", color: "text-red-600" }
};

const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track, userProfile, onExit, allHistory = [], onUpdateTrackMetadata, onAddPlannedWorkout, onStartAnimation, onOpenReview, autoOpenAi = false, onCheckAiAccess, isGuest = false, onLimitReached }) => {
    const isMobile = useIsMobile();
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [showPauses, setShowPauses] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [chartSelection, setChartSelection] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [mapGradientMetric, setMapGradientMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power'>('none');
    const [notes, setNotes] = useState(track.notes || '');
    const [rpe, setRpe] = useState(track.rpe || 5);
    const [smoothingWindow, setSmoothingWindow] = useState(30);
    const [newTag, setNewTag] = useState('');
    const statsContainerRef = useRef<HTMLDivElement>(null);
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

    // Track ID tracking to handle scroll reset correctly and force map re-center
    useEffect(() => {
        if (track.id !== prevTrackIdRef.current) {
            if (statsContainerRef.current) {
                statsContainerRef.current.scrollTop = 0;
            }
            setChartSelection(null);
            setSelectedSegment(null);
            setNotes(track.notes || '');
            setIsAnimating(false);
            setIsAnimationMode(false);
            setAnimationProgress(0);
            setAnimationTime(0);
            prevTrackIdRef.current = track.id;
        }
        setRpe(track.rpe || 5);
        
        // Trigger fit bounds slightly after mount/change to ensure layout is ready
        const timer = setTimeout(() => {
            setFitBoundsTrigger(prev => prev + 1);
        }, 100);
        return () => clearTimeout(timer);
    }, [track]);

    const displayTrack = useMemo(() => {
        // Calculate power based on user weight or default 70kg
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
            
            // Calculate time limit for guest (timestamp at 1km mark)
            let guestTimeLimit = Infinity;
            if (isGuest) {
                const pAt1km = getTrackPointAtDistance(displayTrack, 1.0);
                if (pAt1km) {
                    guestTimeLimit = pAt1km.time.getTime() - displayTrack.points[0].time.getTime();
                } else {
                    // Track is shorter than 1km, limit is track duration
                    guestTimeLimit = displayTrack.duration;
                }
            }

            const animate = (time: number) => {
                const delta = time - lastFrameTimeRef.current;
                lastFrameTimeRef.current = time;
                
                setAnimationTime(prevTime => {
                    const nextTime = prevTime + delta * animationSpeed;
                    
                    // Guest Check: Stop exactly at calculated 1km time
                    if (isGuest && nextTime > guestTimeLimit) {
                        setIsAnimating(false);
                        if (onLimitReached) onLimitReached();
                        // Freeze exactly at limit
                        const limitPoint = getTrackStateAtTime(displayTrack, guestTimeLimit);
                        if (limitPoint) setAnimationProgress(limitPoint.point.cummulativeDistance);
                        return guestTimeLimit;
                    }

                    // Convert Time to Distance for MapDisplay
                    const state = getTrackStateAtTime(displayTrack, nextTime);
                    
                    if (!state || nextTime >= displayTrack.duration) {
                        setIsAnimating(false);
                        return displayTrack.duration; // Cap at end
                    }
                    
                    setAnimationProgress(state.point.cummulativeDistance);
                    return nextTime;
                });
                
                if (isAnimating) { // Double check inside loop closure isn't fully reliable without ref or clean state, but functional here due to react update
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

    // Handle manual scrubbing of animation slider
    const handleAnimationProgressChange = (newProgress: number) => {
        setAnimationProgress(newProgress);
        // Sync time to the dragged distance
        const point = getTrackPointAtDistance(displayTrack, newProgress);
        if (point) {
            const startTime = displayTrack.points[0].time.getTime();
            const newTime = point.time.getTime() - startTime;
            
            // Check if manual scrub exceeds 1km limit for guest
            if (isGuest && newProgress > 1.0) {
                if (onLimitReached) onLimitReached();
                // Clamp to 1km
                const pAt1km = getTrackPointAtDistance(displayTrack, 1.0);
                if (pAt1km) {
                    setAnimationProgress(1.0);
                    setAnimationTime(pAt1km.time.getTime() - startTime);
                } else {
                    // Track shorter than 1km
                    setAnimationProgress(displayTrack.distance);
                    setAnimationTime(displayTrack.duration);
                }
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
        if (!isAnimationMode) return 0; // Use animation mode check instead of isAnimating to keep pace display when paused
        const pointIndex = displayTrack.points.findIndex(p => p.cummulativeDistance >= animationProgress);
        if (pointIndex !== -1) {
            const { pace } = calculateSmoothedMetrics(displayTrack.points, pointIndex, smoothingWindow);
            return pace;
        }
        return 0;
    }, [isAnimationMode, animationProgress, displayTrack.points, smoothingWindow]);

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

    const handleNoteSave = () => onUpdateTrackMetadata?.(track.id, { notes });
    const handleShoeChange = (e: React.ChangeEvent<HTMLSelectElement>) => onUpdateTrackMetadata?.(track.id, { shoe: e.target.value });
    
    const handleRpeSelect = (e: React.MouseEvent, val: number) => {
        e.preventDefault(); // Prevent scroll/focus jump
        e.stopPropagation();
        setRpe(val);
        onUpdateTrackMetadata?.(track.id, { rpe: val });
    };
    
    const handleToggleFavorite = () => onUpdateTrackMetadata?.(track.id, { isFavorite: !track.isFavorite });
    const handleToggleArchive = () => {
        onUpdateTrackMetadata?.(track.id, { isArchived: !track.isArchived });
        onExit(); // Esci dalla vista se archiviata per dare feedback immediato
    };

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTag.trim()) return;
        const tags = Array.from(new Set([...(track.tags || []), newTag.trim().toLowerCase()]));
        onUpdateTrackMetadata?.(track.id, { tags });
        setNewTag('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const tags = (track.tags || []).filter(t => t !== tagToRemove);
        onUpdateTrackMetadata?.(track.id, { tags });
    };
    
    const statsContent = (
        <div className="space-y-4 p-3 sm:p-4 pb-12">
            <div className="flex items-center gap-2 mb-2">
                <button 
                    onClick={handleToggleFavorite} 
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-bold text-xs transition-all ${track.isFavorite ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-slate-200'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" /></svg>
                    {track.isFavorite ? 'Preferita' : 'Metti Preferita'}
                </button>
                <button 
                    onClick={handleToggleArchive} 
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-bold text-xs transition-all ${track.isArchived ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-slate-200'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" /><path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5ZM7 11a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Z" clipRule="evenodd" /></svg>
                    {track.isArchived ? 'Ripristina' : 'Archivia Corsa'}
                </button>
            </div>

            <StatsPanel stats={stats} selectedSegment={selectedSegment} onSegmentSelect={handleSegmentSelect} />

            {hasHrData && <HeartRateZonePanel track={displayTrack} userProfile={userProfile} />}
            <PersonalRecordsPanel track={displayTrack} />

            {/* TAGS */}
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center">
                    <TagIcon /> Tags & Categorie
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[20px]">
                    {track.tags?.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-900/40 text-cyan-100 rounded text-[10px] font-bold border border-cyan-500/30 group">
                            #{tag}
                            <button onClick={() => handleRemoveTag(tag)} className="text-cyan-500 hover:text-red-400 transition-colors">&times;</button>
                        </span>
                    ))}
                    {(!track.tags || track.tags.length === 0) && <span className="text-[10px] text-slate-600 italic">Nessun tag aggiunto (es. #maratona, #gara)</span>}
                </div>
                <form onSubmit={handleAddTag} className="flex gap-2">
                    <input 
                        type="text" 
                        value={newTag} 
                        onChange={e => setNewTag(e.target.value)} 
                        placeholder="Aggiungi tag..." 
                        className="flex-grow bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                    <button type="submit" className="px-3 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition-colors">+</button>
                </form>
            </div>

            {/* SHOES & RPE SECTION */}
            <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                    <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center"><ShoeIcon /> Scarpe Usate</label>
                    <select value={track.shoe || ''} onChange={handleShoeChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-bold focus:border-cyan-500 appearance-none cursor-pointer shadow-inner">
                        <option value="">-- Seleziona Scarpe --</option>
                        {userProfile.shoes?.map((shoe, idx) => <option key={idx} value={shoe}>{shoe}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center"><FireIcon /> Sforzo Percepito (RPE)</label>
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-inner">
                        <div className="flex justify-between items-center mb-3 px-1 sm:px-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                                const isSelected = rpe === val;
                                const baseColor = RPE_SCALE[val].color.replace('text-', 'bg-');
                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={(e) => handleRpeSelect(e, val)}
                                        className={`
                                            flex items-center justify-center
                                            w-5 h-5 sm:w-6 sm:h-6 
                                            rounded-full 
                                            font-black text-[9px] sm:text-[10px]
                                            transition-all border
                                            ${isSelected 
                                                ? `${baseColor} text-slate-900 border-white scale-110 shadow-lg ring-2 ring-white/20` 
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500'}
                                        `}
                                    >
                                        {val}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="bg-slate-800/50 rounded p-2 border border-slate-700/50">
                            <div className={`text-sm font-bold mb-0.5 ${RPE_SCALE[rpe || 5].color}`}>
                                {rpe || 5} - {RPE_SCALE[rpe || 5].label}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-snug">
                                {RPE_SCALE[rpe || 5].desc}
                            </div>
                        </div>
                    </div>
                    {estimatedRpe !== null && (
                        <div className="flex justify-end mt-1 px-1">
                            <span className="text-[8px] font-bold text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded border border-purple-500/30">
                                Stima da Dati: {estimatedRpe}/10 ({RPE_SCALE[estimatedRpe].label})
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* NOTES SECTION - Full Width */}
            <div className="mt-4">
                <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center"><NoteIcon /> Note Corsa</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNoteSave} placeholder="Sensazioni, meteo, dolori..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white h-24 focus:border-cyan-500 resize-none shadow-inner leading-relaxed" />
            </div>

            <GeminiTrackAnalysisPanel 
                stats={stats} 
                userProfile={userProfile} 
                track={displayTrack} 
                allHistory={allHistory} 
                onUpdateTrackMetadata={onUpdateTrackMetadata} 
                onAddPlannedWorkout={onAddPlannedWorkout}
                startOpen={autoOpenAi} 
                onCheckAiAccess={onCheckAiAccess}
            />
            
            <div className="grid grid-cols-1 gap-4">
                <GeminiSegmentsPanel 
                    track={displayTrack} 
                    stats={stats} 
                    onSegmentSelect={handleSegmentSelect} 
                    selectedSegment={selectedSegment as AiSegment} 
                    onCheckAiAccess={onCheckAiAccess}
                />
            </div>
            <WeatherPanel track={track} />
        </div>
    );

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
                    animationTrack={isAnimationMode ? displayTrack : null} // Changed to check isAnimationMode
                    animationProgress={animationProgress}
                    animationPace={animationPace} // Pass the calculated pace to map
                    isAnimationPlaying={isAnimating}
                    onToggleAnimationPlay={() => setIsAnimating(!isAnimating)}
                    onAnimationProgressChange={handleAnimationProgressChange}
                    animationSpeed={animationSpeed}
                    onAnimationSpeedChange={setAnimationSpeed}
                    onExitAnimation={() => { setIsAnimating(false); setIsAnimationMode(false); setAnimationProgress(0); setAnimationTime(0); }}
                    aiSegmentHighlight={selectedSegment && 'type' in selectedSegment && selectedSegment.type === 'ai' ? selectedSegment : null}
                    fitBoundsCounter={fitBoundsTrigger} // Pass trigger to map
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
                        <div className="flex items-center gap-2">
                             <RatingStars 
                                rating={track.rating} 
                                size="md" 
                                onDetailClick={(e) => { e.stopPropagation(); if(onCheckAiAccess?.() !== false) onOpenReview?.(track.id); }}
                                onRate={(newRating) => onUpdateTrackMetadata?.(track.id, { rating: newRating })}
                             />
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
                {/* DESKTOP VIEW */}
                <div className="hidden sm:block h-full">
                    {/* Left (Stats) vs Right (Map/Chart). Vertical direction = flex-row */}
                    <ResizablePanel direction="vertical" initialSize={400} minSize={300} className="h-full">
                        
                        {/* LEFT: Stats */}
                        <div ref={statsContainerRef} className="h-full overflow-y-auto bg-slate-800 custom-scrollbar border-r border-slate-700">
                            {statsContent}
                        </div>

                        {/* RIGHT: Map & Chart */}
                        {/* Horizontal direction = flex-col (Top/Bottom) */}
                        <ResizablePanel direction="horizontal" initialSizeRatio={0.75} minSize={200} minSizeSecondary={150}>
                             
                             {/* TOP: Map */}
                             <div className="h-full relative border-b border-slate-800 z-0">
                                {mapSection}
                             </div>

                             {/* BOTTOM: Chart + Controls + Overlay */}
                             <div className="h-full flex flex-col bg-slate-900 border-t border-slate-700 relative">
                                {selectionStats && <SelectionStatsOverlay data={selectionStats} onClose={() => setChartSelection(null)} />}
                                <div className="h-10 flex-shrink-0">{chartControls}</div>
                                <div className="flex-grow min-h-0">{chartSection}</div>
                             </div>

                        </ResizablePanel>
                    </ResizablePanel>
                </div>

                {/* MOBILE VIEW */}
                <div className="sm:hidden h-full w-full bg-slate-900 flex flex-col relative">
                    {isMobile && isAnimationMode ? (
                        // ANIMATION MODE: FULL MAP + CHART, NO STATS
                        <div className="h-full w-full flex flex-col">
                             <ResizablePanel 
                                direction="horizontal" // Vertical split on screen (library uses horizontal/vertical naming sometimes counter-intuitively based on flex direction)
                                initialSizeRatio={0.65} // Map gets 65% space
                                minSize={150} 
                                minSizeSecondary={100}
                             >
                                {/* Map Section */}
                                <div className="h-full w-full relative z-0 border-b border-slate-700">
                                    {mapSection}
                                </div>

                                {/* Chart Section */}
                                <div className="h-full flex flex-col bg-slate-900">
                                    {selectionStats && <SelectionStatsOverlay data={selectionStats} onClose={() => setChartSelection(null)} />}
                                    <div className="h-8 flex-shrink-0">{chartControls}</div>
                                    <div className="flex-grow min-h-0">{chartSection}</div>
                                </div>
                             </ResizablePanel>
                        </div>
                    ) : (
                        // STANDARD MODE: STATS + (MAP/CHART)
                        <ResizablePanel 
                            direction="horizontal" 
                            initialSizeRatio={0.50} // 50% Stats
                            minSize={150} 
                            minSizeSecondary={150}
                        >
                            {/* Top: Stats */}
                            <div ref={statsContainerRef} className="h-full w-full overflow-y-auto bg-slate-800 custom-scrollbar min-h-0 overscroll-y-contain">
                                {statsContent}
                            </div>

                            {/* Bottom: Map + Chart (Stacked) */}
                            <div className="h-full w-full relative">
                                 <ResizablePanel 
                                    direction="horizontal" 
                                    initialSizeRatio={0.60} // Map gets 60% of bottom space
                                    minSize={100} 
                                    minSizeSecondary={80}
                                 >
                                    {/* Map Section */}
                                    <div className="h-full w-full relative z-0 border-b border-slate-700">
                                        {mapSection}
                                    </div>

                                    {/* Chart Section */}
                                    <div className="h-full flex flex-col bg-slate-900">
                                        {selectionStats && <SelectionStatsOverlay data={selectionStats} onClose={() => setChartSelection(null)} />}
                                        <div className="h-8 flex-shrink-0">{chartControls}</div>
                                        <div className="flex-grow min-h-0">{chartSection}</div>
                                    </div>
                                 </ResizablePanel>
                            </div>
                        </ResizablePanel>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TrackDetailView;
