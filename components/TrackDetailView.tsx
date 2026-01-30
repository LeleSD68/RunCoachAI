
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
import ShareModal from './ShareModal';
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

type LayoutType = 'classic' | 'map-top' | 'data-right' | 'vertical' | 'focus-bottom' | 'columns';
type ContentType = 'data' | 'map' | 'chart';
type SlotId = 1 | 2 | 3;

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

// Icons
const ClockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 mr-1"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75v-3.75Z" clipRule="evenodd" /></svg>);
const ReplayIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Z" clipRule="evenodd" /><path fillRule="evenodd" d="M13.485 1.431a.75.75 0 0 0-1.449.39 5.5 5.5 0 0 1 9.201 2.466l.312-.311h-2.433a.75.75 0 0 0 .75-.75V.484a.75.75 0 0 0-1.5 0v2.43l-.31-.31a7 7 0 0 0-11.712-3.138Z" clipRule="evenodd" /></svg>);
const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.475l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" /></svg>);
const LayoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v11.5A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75V4.25ZM4.25 3.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75V4.25a.75.75 0 0 0-.75-.75H4.25Z" clipRule="evenodd" /><path d="M3.5 10h13v1.5h-13V10Z" /></svg>);
const SwapIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Zm6.94 3.7a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Zm-6.94 3.7a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Z" clipRule="evenodd" /></svg>);
const GlobeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-11-4.69v.447a3.5 3.5 0 0 0 1.025 2.475L8.293 10 8 10.293a1 1 0 0 0 0 1.414l1.06 1.06a1.5 1.5 0 0 1 .44 1.061v.363a6.5 6.5 0 0 1-5.5-2.259V10a6.5 6.5 0 0 1 12.5 0Z" clipRule="evenodd" /><path fillRule="evenodd" d="M9 2.5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM5.5 5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM14.5 13a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM12.5 16a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1Z" clipRule="evenodd" /></svg>);
const LockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>);

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

const TrackMetadataEditor = ({ track, userProfile, onUpdate }: { track: Track, userProfile: UserProfile, onUpdate?: (id: string, data: Partial<Track>) => void }) => {
    const [notes, setNotes] = useState(track.notes || '');
    
    useEffect(() => {
        setNotes(track.notes || '');
    }, [track.id, track.notes]);

    return (
        <div className="grid grid-cols-1 gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div>
               <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-orange-400">
                        <path fillRule="evenodd" d="M1 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V6Zm4 1.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2 3a4 4 0 0 0-3.665 2.395.75.75 0 0 0 .416 1.002l.464.132a.75.75 0 0 0 .943-.496A2.5 2.5 0 0 1 7 12h6a2.5 2.5 0 0 1 2.342 1.533.75.75 0 0 0 .944.496l.463-.132a.75.75 0 0 0 .416-1.002A4 4 0 0 0 13 10.5H7Z" clipRule="evenodd" />
                    </svg>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scarpa</label>
               </div>
               {userProfile.shoes && userProfile.shoes.length > 0 ? (
                   <select 
                        value={track.shoe || ''} 
                        onChange={(e) => onUpdate && onUpdate(track.id, { shoe: e.target.value })}
                        className="w-full bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1.5 focus:border-cyan-500 outline-none"
                   >
                        <option value="">Seleziona scarpa...</option>
                        {userProfile.shoes.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
               ) : (
                   <div className="text-[10px] text-slate-500 italic px-1">Nessuna scarpa nel profilo.</div>
               )}
            </div>

            <div>
                <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-cyan-400">
                        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.38 2H4.5Zm10 14.5h-9a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H11v3.5A1.5 1.5 0 0 0 12.5 7H16v9a.5.5 0 0 1-.5.5ZM16 5.5l-3.5-3.5V5.5H16Z" clipRule="evenodd" />
                    </svg>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note</label>
                </div>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => { if(notes !== track.notes && onUpdate) onUpdate(track.id, { notes }) }}
                    className="w-full bg-slate-900 text-white text-xs border border-slate-600 rounded px-2 py-1.5 focus:border-cyan-500 outline-none resize-none h-20 placeholder-slate-600"
                    placeholder="Sensazioni, meteo, dettagli..."
                />
            </div>
        </div>
    );
};

// Memoized Data Panel (Generic)
const DataSection = React.memo(({ 
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
    hasHrData,
    className,
    disableScroll 
}: any) => {
    return (
        <div className={`bg-slate-900 p-4 space-y-6 h-full ${disableScroll ? '' : 'overflow-y-auto custom-scrollbar'} ${className}`}>
            <StatsPanel stats={stats} selectedSegment={selectedSegment} onSegmentSelect={handleSegmentSelect} />

            <TrackMetadataEditor track={track} userProfile={userProfile} onUpdate={onUpdateTrackMetadata} />

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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0-1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
            </button>
        </div>
    );
};

const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track, userProfile, onExit, allHistory = [], plannedWorkouts = [], onUpdateTrackMetadata, onAddPlannedWorkout, onStartAnimation, onOpenReview, autoOpenAi = false, onCheckAiAccess, isGuest = false, onLimitReached }) => {
    if (!track) return null;

    const isMobile = useIsMobile();
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [showPauses, setShowPauses] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [chartSelection, setChartSelection] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [mapGradientMetric, setMapGradientMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power'>('none');
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Layout State Persistence
    const [currentLayout, setCurrentLayout] = useState<LayoutType>(() => {
        const savedLayout = localStorage.getItem('runcoach-detail-layout');
        if (savedLayout && ['classic', 'map-top', 'data-right', 'vertical', 'focus-bottom', 'columns'].includes(savedLayout)) {
            return savedLayout as LayoutType;
        }
        return isMobile ? 'vertical' : 'classic';
    });

    const [showLayoutMenu, setShowLayoutMenu] = useState(false);
    
    // Panel Resize Persistence
    const [layoutSizes, setLayoutSizes] = useState<Record<string, Record<string, number>>>(() => {
        try {
            return JSON.parse(localStorage.getItem('runcoach-layout-sizes') || '{}');
        } catch (e) { return {}; }
    });

    const handlePanelResize = (layout: string, panelId: string, ratio: number) => {
        setLayoutSizes(prev => {
            const next = {
                ...prev,
                [layout]: {
                    ...prev[layout],
                    [panelId]: ratio
                }
            };
            localStorage.setItem('runcoach-layout-sizes', JSON.stringify(next));
            return next;
        });
    };
    
    // Helper to get default slots for a given layout
    const getDefaultSlots = useCallback((layout: LayoutType): Record<SlotId, ContentType> => {
        switch(layout) {
            case 'classic': return { 1: 'data', 2: 'map', 3: 'chart' };
            case 'map-top': return { 1: 'map', 2: 'data', 3: 'chart' };
            case 'data-right': return { 1: 'map', 2: 'chart', 3: 'data' };
            case 'vertical': return { 1: 'map', 2: 'data', 3: 'chart' }; // Optimized defaults for vertical
            case 'focus-bottom': return { 1: 'data', 2: 'map', 3: 'chart' };
            case 'columns': return { 1: 'data', 2: 'map', 3: 'chart' };
            default: return { 1: 'data', 2: 'map', 3: 'chart' };
        }
    }, []);

    // Slot Contents (initialized based on loaded layout and persistent storage)
    const [slotContent, setSlotContent] = useState<Record<SlotId, ContentType>>(() => {
        const savedSlots = localStorage.getItem('runcoach-detail-slots');
        if (savedSlots) {
            try {
                const parsed = JSON.parse(savedSlots);
                // Simple validation
                if (parsed && typeof parsed === 'object' && parsed[1] && parsed[2] && parsed[3]) {
                    return parsed;
                }
            } catch (e) { console.error("Error loading slots config", e); }
        }
        return getDefaultSlots(currentLayout);
    });

    const handleContentChange = (slotId: SlotId, newContent: ContentType) => {
        setSlotContent(prev => {
            const next = { ...prev };
            // Check if content is already elsewhere and swap
            const existingSlot = (Object.keys(next) as unknown as SlotId[]).find(key => next[key] === newContent);
            if (existingSlot && existingSlot !== slotId) {
                next[existingSlot] = next[slotId]; // Swap contents
            }
            next[slotId] = newContent;
            
            // Save to localStorage
            localStorage.setItem('runcoach-detail-slots', JSON.stringify(next));
            return next;
        });
    };

    const applyLayoutPreset = (type: LayoutType) => {
        setCurrentLayout(type);
        setShowLayoutMenu(false);
        
        // Reset slots to default for this new layout type
        const defaults = getDefaultSlots(type);
        setSlotContent(defaults);
        
        // Persist both
        localStorage.setItem('runcoach-detail-layout', type);
        localStorage.setItem('runcoach-detail-slots', JSON.stringify(defaults));
    };
    
    // Safe access to rpe with fallback
    const [rpe, setRpe] = useState(track.rpe || 5);
    
    const [smoothingWindow, setSmoothingWindow] = useState(30);
    const prevTrackIdRef = useRef<string>(track.id);
    const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

    // Animation State (Local)
    const [isAnimating, setIsAnimating] = useState(false);
    const [isAnimationMode, setIsAnimationMode] = useState(false); 
    const [animationProgress, setAnimationProgress] = useState(0); // in km
    const [animationSpeed, setAnimationSpeed] = useState(20);
    const [animationTime, setAnimationTime] = useState(0); 
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

    const handleTogglePublic = () => {
        if (onUpdateTrackMetadata) {
            onUpdateTrackMetadata(track.id, { isPublic: !track.isPublic });
        }
    };

    // --- Component Sections ---

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

    const ChartSection = (
        <div className="w-full h-full relative flex flex-col bg-slate-900">
            {selectionStats && <SelectionStatsOverlay data={selectionStats} onClose={() => setChartSelection(null)} />}
            <div className="h-8 flex-shrink-0 border-b border-slate-700">{chartControls}</div>
            <div className="flex-grow min-h-0 relative group">
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
        </div>
    );

    const MapSection = (
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

    const DataSectionComponent = (props: { disableScroll?: boolean }) => (
        <DataSection 
            className="h-full w-full"
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
            disableScroll={props.disableScroll}
        />
    );

    // Dynamic Render Function
    const renderPane = (slotId: SlotId, mobileStackMode = false) => {
        const type = slotContent[slotId];
        let content;
        
        switch(type) {
            case 'data': content = <DataSectionComponent disableScroll={mobileStackMode} />; break;
            case 'map': content = MapSection; break;
            case 'chart': content = ChartSection; break;
        }

        // On mobile stack, visuals (map/chart) get fixed height, data gets auto
        const containerStyle = mobileStackMode
            ? (type === 'data' ? { height: 'auto', minHeight: 'fit-content' } : { height: '450px', flexShrink: 0 })
            : { height: '100%', flexGrow: 1 };

        return (
            <div style={containerStyle} className="w-full relative overflow-hidden group/pane border-b border-slate-700/50 last:border-b-0">
                {/* Touch-Friendly Swap Menu - Always visible on mobile, visible on hover on desktop */}
                <div className={`absolute top-3 left-3 z-[1000] transition-opacity bg-slate-900/90 rounded-xl p-2 border border-slate-600 shadow-xl flex gap-2 backdrop-blur-md touch-manipulation ${isMobile ? 'opacity-100' : 'opacity-0 group-hover/pane:opacity-100'}`}>
                    <div className="text-slate-400"><SwapIcon /></div>
                    <select 
                        value={type}
                        onChange={(e) => handleContentChange(slotId, e.target.value as ContentType)}
                        className="bg-transparent text-sm text-white font-bold uppercase outline-none cursor-pointer pr-4 appearance-none"
                    >
                        <option value="data">Dati</option>
                        <option value="map">Mappa</option>
                        <option value="chart">Grafico</option>
                    </select>
                </div>
                {content}
            </div>
        );
    };

    // --- Render Logic based on Layout ---

    const renderLayout = () => {
        const getRatio = (panelId: string, defaultR: number) => {
            return layoutSizes[currentLayout]?.[panelId] || defaultR;
        };

        const keyPrefix = currentLayout;

        // Optimized Vertical Layout for Mobile
        if (currentLayout === 'vertical') {
            return (
                <ResizablePanel
                    key={`${keyPrefix}-mobile-stack`}
                    direction="vertical"
                    initialSizeRatio={getRatio('main', 0.45)}
                    minSize={200}
                    className="h-full"
                    onResizeEnd={(_, r) => handlePanelResize('vertical', 'main', r)}
                >
                    {/* Top Slot: Always fixed height, resizable */}
                    <div className="h-full w-full relative">
                        {renderPane(1)}
                    </div>

                    {/* Bottom Slot: Scrollable Container for Slot 2 and 3 */}
                    <div className="h-full w-full overflow-y-auto bg-slate-900 custom-scrollbar flex flex-col pb-20">
                        {/* We render Slot 2 and 3 stacked. If they are maps/charts, renderPane enforces minHeight */}
                        {renderPane(2, true)}
                        {renderPane(3, true)}
                    </div>
                </ResizablePanel>
            );
        }

        switch (currentLayout) {
            case 'classic': // Classic: Left (Slot 1) | Right-Top (Slot 2) / Right-Bottom (Slot 3)
                return (
                    <ResizablePanel 
                        key={`${keyPrefix}-main`}
                        direction="horizontal" 
                        initialSizeRatio={getRatio('main', 0.35)} 
                        minSize={250} 
                        className="h-full"
                        onResizeEnd={(_, r) => handlePanelResize('classic', 'main', r)}
                    >
                        {renderPane(1)}
                        <div className="h-full relative bg-slate-900 w-full border-l border-slate-700">
                            <ResizablePanel 
                                key={`${keyPrefix}-sub`}
                                direction="vertical" 
                                initialSizeRatio={getRatio('sub', 0.75)} 
                                minSize={150} 
                                minSizeSecondary={100}
                                onResizeEnd={(_, r) => handlePanelResize('classic', 'sub', r)}
                            >
                                {renderPane(2)}
                                {renderPane(3)}
                            </ResizablePanel>
                        </div>
                    </ResizablePanel>
                );
            
            case 'map-top': // Map Top: Top (Slot 1) | Bottom-Left (Slot 2) / Bottom-Right (Slot 3)
                return (
                    <ResizablePanel 
                        key={`${keyPrefix}-main`}
                        direction="vertical" 
                        initialSizeRatio={getRatio('main', 0.5)} 
                        minSize={150} 
                        className="h-full"
                        onResizeEnd={(_, r) => handlePanelResize('map-top', 'main', r)}
                    >
                        {renderPane(1)}
                        <div className="h-full relative bg-slate-900 w-full border-t border-slate-700">
                            <ResizablePanel 
                                key={`${keyPrefix}-sub`}
                                direction="horizontal" 
                                initialSizeRatio={getRatio('sub', 0.4)} 
                                minSize={250}
                                onResizeEnd={(_, r) => handlePanelResize('map-top', 'sub', r)}
                            >
                                {renderPane(2)}
                                {renderPane(3)}
                            </ResizablePanel>
                        </div>
                    </ResizablePanel>
                );

            case 'data-right': // Data Right: Left-Top (Slot 1) / Left-Bottom (Slot 2) | Right (Slot 3)
                return (
                    <ResizablePanel 
                        key={`${keyPrefix}-main`}
                        direction="horizontal" 
                        initialSizeRatio={getRatio('main', 0.7)} 
                        minSize={300} 
                        className="h-full"
                        onResizeEnd={(_, r) => handlePanelResize('data-right', 'main', r)}
                    >
                        <div className="h-full relative bg-slate-900 w-full border-r border-slate-700">
                            <ResizablePanel 
                                key={`${keyPrefix}-sub`}
                                direction="vertical" 
                                initialSizeRatio={getRatio('sub', 0.70)} 
                                minSize={150}
                                onResizeEnd={(_, r) => handlePanelResize('data-right', 'sub', r)}
                            >
                                {renderPane(1)}
                                {renderPane(2)}
                            </ResizablePanel>
                        </div>
                        {renderPane(3)}
                    </ResizablePanel>
                );

            case 'focus-bottom': // Focus Bottom: Top-Left (Slot 1) / Top-Right (Slot 2) | Bottom Wide (Slot 3)
                return (
                    <ResizablePanel 
                        key={`${keyPrefix}-main`}
                        direction="vertical" 
                        initialSizeRatio={getRatio('main', 0.6)} 
                        minSize={150} 
                        className="h-full"
                        onResizeEnd={(_, r) => handlePanelResize('focus-bottom', 'main', r)}
                    >
                        <div className="h-full relative bg-slate-900 w-full border-b border-slate-700">
                            <ResizablePanel 
                                key={`${keyPrefix}-sub`}
                                direction="horizontal" 
                                initialSizeRatio={getRatio('sub', 0.5)} 
                                minSize={200}
                                onResizeEnd={(_, r) => handlePanelResize('focus-bottom', 'sub', r)}
                            >
                                {renderPane(1)}
                                {renderPane(2)}
                            </ResizablePanel>
                        </div>
                        {renderPane(3)}
                    </ResizablePanel>
                );

            case 'columns': // 3 Columns: Slot 1 | Slot 2 | Slot 3
                return (
                    <ResizablePanel 
                        key={`${keyPrefix}-main`}
                        direction="horizontal" 
                        initialSizeRatio={getRatio('main', 0.33)} 
                        minSize={200} 
                        className="h-full"
                        onResizeEnd={(_, r) => handlePanelResize('columns', 'main', r)}
                    >
                        {renderPane(1)}
                        <div className="h-full relative bg-slate-900 w-full border-l border-slate-700">
                            <ResizablePanel 
                                key={`${keyPrefix}-sub`}
                                direction="horizontal" 
                                initialSizeRatio={getRatio('sub', 0.5)} 
                                minSize={200}
                                onResizeEnd={(_, r) => handlePanelResize('columns', 'sub', r)}
                            >
                                {renderPane(2)}
                                <div className="h-full w-full border-l border-slate-700">
                                    {renderPane(3)}
                                </div>
                            </ResizablePanel>
                        </div>
                    </ResizablePanel>
                );

            default: return null;
        }
    };

    return (
        <div className="flex flex-col w-full font-sans text-white overflow-hidden bg-slate-900 h-[100dvh]" style={{ overscrollBehavior: 'none' }}>
             <header className="flex items-center justify-between p-2 sm:p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0 z-30 shadow-lg">
                <div className="flex items-center gap-2">
                    <button onClick={onExit} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-black py-1.5 px-3 sm:py-2 sm:px-5 rounded-lg transition-all shadow-sm text-[10px] sm:text-sm">&times; {isMobile ? 'INDIETRO' : 'CHIUDI'}</button>
                    <button onClick={() => setShowShareModal(true)} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-1.5 px-3 rounded-lg transition-all shadow-sm">
                        <ShareIcon />
                    </button>
                    
                    {/* Share Toggle */}
                    <button 
                        onClick={handleTogglePublic} 
                        className={`py-1.5 px-3 rounded-lg transition-all shadow-sm flex items-center gap-1 border ${track.isPublic ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-white'}`}
                        title={track.isPublic ? "Pubblico: Visibile agli amici" : "Privato: Visibile solo a te"}
                    >
                        {track.isPublic ? <GlobeIcon /> : <LockIcon />}
                    </button>

                    {/* Layout Selector */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-1.5 px-3 rounded-lg transition-all shadow-sm flex items-center gap-1"
                            title="Cambia Layout"
                        >
                            <LayoutIcon />
                        </button>
                        {showLayoutMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowLayoutMenu(false)}></div>
                                <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 z-20 flex flex-col gap-1 w-48 animate-fade-in-down">
                                    <button onClick={() => applyLayoutPreset('classic')} className={`text-left px-3 py-2 rounded text-xs font-bold ${currentLayout === 'classic' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Classico (Default)</button>
                                    <button onClick={() => applyLayoutPreset('map-top')} className={`text-left px-3 py-2 rounded text-xs font-bold ${currentLayout === 'map-top' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Mappa Estesa</button>
                                    <button onClick={() => applyLayoutPreset('data-right')} className={`text-left px-3 py-2 rounded text-xs font-bold ${currentLayout === 'data-right' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Dati a Destra</button>
                                    <button onClick={() => applyLayoutPreset('vertical')} className={`text-left px-3 py-2 rounded text-xs font-bold ${currentLayout === 'vertical' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Verticale (Mobile)</button>
                                    <button onClick={() => applyLayoutPreset('focus-bottom')} className={`text-left px-3 py-2 rounded text-xs font-bold ${currentLayout === 'focus-bottom' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Focus Basso (Footer)</button>
                                    <button onClick={() => applyLayoutPreset('columns')} className={`text-left px-3 py-2 rounded text-xs font-bold ${currentLayout === 'columns' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>3 Colonne</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
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
                {renderLayout()}
            </main>

            {showShareModal && (
                <ShareModal 
                    track={track} 
                    stats={stats} 
                    userProfile={userProfile} 
                    onClose={() => setShowShareModal(false)} 
                />
            )}
        </div>
    );
};

export default TrackDetailView;
