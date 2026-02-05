
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Track, TrackPoint, UserProfile, PlannedWorkout, PauseSegment, AiSegment, Split } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import ResizablePanel from './ResizablePanel'
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Track, TrackPoint, UserProfile, PlannedWorkout, PauseSegment, AiSegment, Split } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import ResizablePanel from './ResizablePanel';
import ShareTrackModal from './ShareTrackModal'; 
import { calculateTrackStats } from '../services/trackStatsService';
import { calculateSegmentStats, getPointsInDistanceRange } from '../services/trackEditorUtils';

interface SectionState {
    stats: boolean;
    records: boolean;
    zones: boolean;
    metadata: boolean;
    aiAnalysis: boolean;
    aiSegments: boolean;
}

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDuration = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
};

const LAYOUT_KEY = 'track_detail_layout_prefs_v3';

const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 12a3 3 0 1 1-2.5 1.34l-3.15-1.92a3 3 0 1 1 0-2.83l3.15-1.92a3.001 3.001 0 0 1 5 1.33Z" /></svg>);

// Tab Icons
const ChartBarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>);
const HeartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.16-6.825v-.133L10 8.333l1.53 1.611v.133a20.758 20.758 0 0 1-1.16 6.825l-.019.01-.005.003h-.693Zm-7.147-6.25c-.794 3.967 2.056 6.661 6.969 6.952l.525-5.592-4.332-4.577a3.99 3.99 0 0 0-3.162 3.217ZM17.494 10.665c-.794-3.967-4.32-6.075-7.494-6.333v6.952l-2.73-2.872c.794-3.967 4.32-6.075 7.494-6.333a3.99 3.99 0 0 1 2.73 8.586Z" /><path d="M10 2a6 6 0 0 0-4.472 10.002L10 16.69l4.472-4.688A6 6 0 0 0 10 2Z" /></svg>);
const SparklesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>);
const PencilSquareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.155 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>);

type DetailTab = 'stats' | 'performance' | 'ai' | 'notes';

const TrackDetailView: React.FC<{ 
    track: Track, 
    userProfile: UserProfile, 
    onExit: () => void, 
    allHistory?: Track[], 
    plannedWorkouts?: PlannedWorkout[], 
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void, 
    onAddPlannedWorkout?: any, 
    onCheckAiAccess?: (feature: 'workout' | 'analysis' | 'chat') => boolean 
}> = ({ 
    track, userProfile, onExit, allHistory = [], plannedWorkouts = [], 
    onUpdateTrackMetadata, onAddPlannedWorkout, onCheckAiAccess 
}) => {
    if (!track || typeof track.distance !== 'number') {
        return <div className="text-white p-4">Errore caricamento traccia. Dati mancanti. <button onClick={onExit}>Indietro</button></div>;
    }

    const [progress, setProgress] = useState(track.distance);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animSpeed, setAnimSpeed] = useState(20);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [highlightedSegments, setHighlightedSegments] = useState<TrackPoint[] | TrackPoint[][] | null>(null);
    const [mapMetric, setMapMetric] = useState<string>('none');
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<DetailTab>('stats');
    
    // Local State for Metadata Inputs (Fixes input lag/locking)
    const [localNotes, setLocalNotes] = useState(track.notes || '');
    const [localRpe, setLocalRpe] = useState<number | ''>(track.rpe || '');
    const [localShoe, setLocalShoe] = useState(track.shoe || '');

    // Sync local state when track prop changes (e.g. navigation or external updates)
    useEffect(() => {
        setLocalNotes(track.notes || '');
        setLocalRpe(track.rpe || '');
        setLocalShoe(track.shoe || '');
    }, [track.id, track.notes, track.rpe, track.shoe]);

    const [layoutSizes, setLayoutSizes] = useState({ 
        sidebarWidth: 320, 
        mapHeightRatio: 0.6,
        mobileMapRatio: 0.35,
        mobileSidebarRatio: 0.6
    });

    useEffect(() => {
        const stored = localStorage.getItem(LAYOUT_KEY);
        if (stored) {
            try { setLayoutSizes(JSON.parse(stored)); } catch(e) {}
        }
    }, []);

    const saveLayout = (updates: Partial<typeof layoutSizes>) => {
        const newSizes = { ...layoutSizes, ...updates };
        setLayoutSizes(newSizes);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(newSizes));
    };

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    // Determine available metrics
    const hasPowerData = useMemo(() => {
        return track.points.some(p => p.power !== undefined && p.power > 0);
    }, [track]);

    // Default metrics to show
    const defaultMetrics: YAxisMetric[] = useMemo(() => {
        const m: YAxisMetric[] = ['pace', 'hr', 'elevation'];
        if (hasPowerData) m.push('power');
        return m;
    }, [hasPowerData]);

    useEffect(() => {
        const timer = setTimeout(() => setFitTrigger(prev => prev + 1), 600);
        return () => clearTimeout(timer);
    }, []);

    const lastTimeRef = useRef<number | null>(null);
    const progressRef = useRef(progress);
    useEffect(() => { progressRef.current = progress; }, [progress]);

    useEffect(() => {
        let frame: number;
        const animate = (time: number) => {
            if (lastTimeRef.current !== null) {
                const delta = time - lastTimeRef.current;
                const kmPerMs = (1 / 60000) * animSpeed; 
                const nextProgress = progressRef.current + (kmPerMs * delta);
                if (nextProgress >= track.distance) {
                    setProgress(track.distance);
                    setIsAnimating(false);
                    lastTimeRef.current = null;
                    return;
                }
                setProgress(nextProgress);
            }
            lastTimeRef.current = time;
            frame = requestAnimationFrame(animate);
        };
        if (isAnimating) {
            if (progressRef.current >= track.distance) {
                setProgress(0);
                progressRef.current = 0;
            }
            frame = requestAnimationFrame(animate);
        } else {
            lastTimeRef.current = null;
        }
        return () => cancelAnimationFrame(frame);
    }, [isAnimating, animSpeed, track.distance]);

    const selectionStats = useMemo(() => {
        if (!selectedRange) return null;
        return calculateSegmentStats(track, selectedRange.startDistance, selectedRange.endDistance);
    }, [track, selectedRange]);

    const handleSplitSelect = (split: Split | PauseSegment | AiSegment | null) => {
        if (split === null) {
            setSelectedRange(null);
            setHighlightedSegments(null);
            return;
        }

        let start = 0;
        let end = 0;

        if ('splitNumber' in split) {
            // Standard Split
            start = (split.splitNumber - 1) * 1.0; 
            end = start + split.distance;
        } else if ('startDistance' in split) {
            // AI Segment
            start = split.startDistance;
            end = split.endDistance;
        } else if ('startPoint' in split) {
            // Pause Segment
            start = split.startPoint.cummulativeDistance;
            end = split.endPoint.cummulativeDistance;
        }

        setSelectedRange({ startDistance: start, endDistance: end });
        setHighlightedSegments(null); 
        setFitTrigger(prev => prev + 1);
    };

    const SidebarContent = (
        <div className="h-full w-full bg-slate-950 flex flex-col overflow-hidden">
            {/* Main Tabs Header - Responsive Wrap */}
            <div className="flex flex-wrap border-b border-slate-700 bg-slate-900/80 shrink-0">
                <button 
                    onClick={() => setActiveTab('stats')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'stats' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <ChartBarIcon /> Analisi
                    {activeTab === 'stats' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('performance')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'performance' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <HeartIcon /> Zone
                    {activeTab === 'performance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'ai' ? 'text-purple-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <SparklesIcon /> Coach AI
                    {activeTab === 'ai' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('notes')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'notes' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <PencilSquareIcon /> Diario
                    {activeTab === 'notes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 bg-slate-900/20">
                
                {/* TAB: ANALISI (StatsPanel has its own internal tabs) */}
                {activeTab === 'stats' && (
                    <div className="h-full animate-fade-in">
                        <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={handleSplitSelect} />
                    </div>
                )}

                {/* TAB: PERFORMANCE (Records + Zones) */}
                {activeTab === 'performance' && (
                    <div className="space-y-4 animate-fade-in p-2">
                        <PersonalRecordsPanel track={track} />
                        <div className="border-t border-slate-700/50 my-2"></div>
                        <HeartRateZonePanel track={track} userProfile={userProfile} onZoneSelect={(segs) => { setHighlightedSegments(segs); setSelectedRange(null); if(segs) setFitTrigger(c=>c+1); }} />
                    </div>
                )}

                {/* TAB: COACH AI (Segments + Analysis) */}
                {activeTab === 'ai' && (
                    <div className="space-y-4 animate-fade-in p-2">
                        <GeminiSegmentsPanel 
                            track={track} 
                            stats={stats} 
                            userProfile={userProfile} 
                            onSegmentSelect={handleSplitSelect} 
                            selectedSegment={selectedRange ? { startDistance: selectedRange.startDistance, endDistance: selectedRange.endDistance } as AiSegment : null} 
                            onCheckAiAccess={() => onCheckAiAccess ? onCheckAiAccess('analysis') : true} 
                        />
                        <div className="border-t border-slate-700/50 my-2"></div>
                        <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onAddPlannedWorkout={onAddPlannedWorkout} onUpdateTrackMetadata={onUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} />
                    </div>
                )}

                {/* TAB: DIARIO (Metadata) */}
                {activeTab === 'notes' && (
                    <div className="p-4 space-y-6 animate-fade-in">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Note & Feedback</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Sforzo (RPE 1-10)</label>
                                <select 
                                    value={localRpe} 
                                    onChange={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value) : '';
                                        setLocalRpe(val);
                                        onUpdateTrackMetadata?.(track.id, { rpe: val === '' ? undefined : val });
                                    }} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                                >
                                    <option value="">-</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>
                            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Scarpa</label>
                                <select 
                                    value={localShoe} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setLocalShoe(val);
                                        onUpdateTrackMetadata?.(track.id, { shoe: val });
                                    }} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors truncate"
                                >
                                    <option value="">Seleziona...</option>
                                    {userProfile.shoes?.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Diario di Bordo</label>
                            <textarea 
                                value={localNotes} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalNotes(val);
                                    onUpdateTrackMetadata?.(track.id, { notes: val });
                                }} 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white h-32 resize-none outline-none focus:border-cyan-500 transition-colors placeholder-slate-600" 
                                placeholder="Sensazioni, meteo, dolori..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const AnimationControlsBar = (
        <div className="flex items-center gap-4 p-3 bg-slate-900 border-t border-slate-800 shrink-0 z-30 select-none">
            <button 
                onClick={() => setIsAnimating(!isAnimating)} 
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${isAnimating ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
            >
                {isAnimating ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                )}
            </button>
            
            <div className="flex-grow flex flex-col justify-center gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-1">Avanzamento</span>
                <div className="relative h-4 flex items-center w-full">
                    <input 
                        type="range" 
                        min="0" 
                        max={track.distance} 
                        step="0.001" 
                        value={progress} 
                        onChange={e => setProgress(parseFloat(e.target.value))} 
                        className="w-full h-1.5 accent-cyan-500 bg-slate-700 rounded-lg cursor-pointer" 
                    />
                </div>
            </div>

            <div className="flex flex-col justify-center gap-1 w-24 sm:w-32">
                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                    <span>Velocità</span>
                    <span className="text-cyan-400">{animSpeed}x</span>
                </div>
                <div className="relative h-4 flex items-center w-full">
                    <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        step="1" 
                        value={animSpeed} 
                        onChange={e => setAnimSpeed(parseInt(e.target.value))} 
                        className="w-full h-1.5 accent-purple-500 bg-slate-700 rounded-lg cursor-pointer" 
                    />
                </div>
            </div>

            <button 
                onClick={() => setShowShareModal(true)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white flex items-center justify-center transition-colors shadow-lg ml-2"
                title="Condividi Corsa"
            >
                <ShareIcon />
            </button>
        </div>
    );

    const SelectionStatsBar = (
        selectionStats && (
            <div className="bg-slate-900 border-t border-b border-cyan-500/30 p-1.5 overflow-x-auto no-scrollbar z-50 shadow-xl shrink-0">
                <div className="flex items-center gap-6 justify-center min-w-max px-4">
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Distanza</span><span className="text-xs font-black text-cyan-400 font-mono">{(selectedRange?.endDistance! - selectedRange?.startDistance!).toFixed(2)} km</span></div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Tempo</span><span className="text-xs font-bold text-white font-mono">{formatDuration(selectionStats.duration)}</span></div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Passo</span><span className="text-xs font-bold text-white font-mono">{formatPace(selectionStats.pace)}</span></div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Dislivello</span><span className="text-xs font-bold text-white font-mono">+{Math.round(selectionStats.elevationGain)}m</span></div>
                    <button onClick={() => setSelectedRange(null)} className="ml-4 bg-slate-800 hover:bg-slate-700 p-1 rounded-full text-slate-400 transition-colors text-xs">&times;</button>
                </div>
            </div>
        )
    );

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden z-[10000]">
            <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-[60] shrink-0">
                <button onClick={onExit} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest">
                    <span className="text-lg">←</span> Indietro
                </button>
                <div className="text-xs font-bold text-white truncate max-w-[200px]">{track.name}</div>
            </header>

            <div className="flex-grow overflow-hidden relative flex flex-col lg:flex-row h-full">
                {isMobile ? (
                    // MOBILE LAYOUT
                    <ResizablePanel
                        direction="vertical"
                        initialSizeRatio={layoutSizes.mobileMapRatio}
                        minSize={150}
                        onResizeEnd={(s, r) => saveLayout({ mobileMapRatio: r })}
                        className="w-full h-full"
                    >
                        {/* 1. MAP SECTION */}
                        <div className="h-full relative border-b border-slate-800 w-full">
                            <MapDisplay 
                                tracks={[track]} visibleTrackIds={new Set([track.id])} animationTrack={track} animationProgress={progress} 
                                isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger} raceRunners={null} hoveredTrackId={null} 
                                runnerSpeeds={new Map()} selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments} 
                                mapGradientMetric={mapMetric} onGradientChange={setMapMetric}
                            />
                        </div>

                        {/* 2. LOWER SECTION (Stats Bar + Sidebar + Chart) */}
                        <div className="flex flex-col h-full w-full overflow-hidden">
                            {SelectionStatsBar}
                            
                            <ResizablePanel
                                direction="vertical"
                                initialSizeRatio={layoutSizes.mobileSidebarRatio}
                                minSize={150}
                                onResizeEnd={(s, r) => saveLayout({ mobileSidebarRatio: r })}
                                className="flex-grow min-h-0"
                            >
                                {/* 2a. SIDEBAR TABS */}
                                <div className="h-full overflow-y-auto bg-slate-950 w-full">
                                    {SidebarContent}
                                </div>

                                {/* 2b. CHART & CONTROLS */}
                                <div className="h-full border-t border-slate-800 bg-slate-900 flex flex-col w-full">
                                    <div className="flex-grow relative min-h-0 w-full">
                                        <TimelineChart track={track} yAxisMetrics={defaultMetrics} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} userProfile={userProfile} highlightedRange={selectedRange} />
                                    </div>
                                    {AnimationControlsBar}
                                </div>
                            </ResizablePanel>
                        </div>
                    </ResizablePanel>
                ) : (
                    // DESKTOP LAYOUT
                    <ResizablePanel 
                        direction="vertical" 
                        initialSize={layoutSizes.sidebarWidth} 
                        minSize={250}
                        onResizeEnd={(s) => saveLayout({ sidebarWidth: s })}
                        className="w-full h-full"
                    >
                        <div className="h-full bg-slate-950 border-r border-slate-800 overflow-hidden">{SidebarContent}</div>
                        <div className="h-full flex flex-col w-full overflow-hidden relative">
                            <div className="flex-grow overflow-hidden min-h-0 relative">
                                <ResizablePanel 
                                    direction="horizontal"
                                    initialSizeRatio={layoutSizes.mapHeightRatio}
                                    minSize={200}
                                    onResizeEnd={(s, r) => saveLayout({ mapHeightRatio: r })}
                                    className="h-full"
                                >
                                    <div className="h-full relative bg-slate-900 overflow-hidden w-full flex flex-col">
                                        <div className="flex-grow relative">
                                            <MapDisplay 
                                                tracks={[track]} visibleTrackIds={new Set([track.id])} animationTrack={track} animationProgress={progress} 
                                                isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger} raceRunners={null} hoveredTrackId={null} 
                                                runnerSpeeds={new Map()} selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments} 
                                                mapGradientMetric={mapMetric} onGradientChange={setMapMetric}
                                            />
                                        </div>
                                    </div>
                                    <div className="h-full flex flex-col bg-slate-900 border-t border-slate-800 overflow-hidden w-full">
                                        {SelectionStatsBar}
                                        <div className="flex-grow relative bg-slate-900/50 p-2 min-h-0">
                                            <TimelineChart track={track} yAxisMetrics={defaultMetrics} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} userProfile={userProfile} highlightedRange={selectedRange} />
                                        </div>
                                    </div>
                                </ResizablePanel>
                            </div>
                            {AnimationControlsBar}
                        </div>
                    </ResizablePanel>
                )}
            </div>
            {showShareModal && <ShareTrackModal track={track} onClose={() => setShowShareModal(false)} />}
        </div>
    );
};

export default TrackDetailView;
;
import ShareTrackModal from './ShareTrackModal'; 
import { calculateTrackStats } from '../services/trackStatsService';
import { calculateSegmentStats, getPointsInDistanceRange } from '../services/trackEditorUtils';

interface SectionState {
    stats: boolean;
    records: boolean;
    zones: boolean;
    metadata: boolean;
    aiAnalysis: boolean;
    aiSegments: boolean;
}

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDuration = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
};

const LAYOUT_KEY = 'track_detail_layout_prefs_v3';

const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 12a3 3 0 1 1-2.5 1.34l-3.15-1.92a3 3 0 1 1 0-2.83l3.15-1.92a3.001 3.001 0 0 1 5 1.33Z" /></svg>);

// Tab Icons
const ChartBarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>);
const HeartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.16-6.825v-.133L10 8.333l1.53 1.611v.133a20.758 20.758 0 0 1-1.16 6.825l-.019.01-.005.003h-.693Zm-7.147-6.25c-.794 3.967 2.056 6.661 6.969 6.952l.525-5.592-4.332-4.577a3.99 3.99 0 0 0-3.162 3.217ZM17.494 10.665c-.794-3.967-4.32-6.075-7.494-6.333v6.952l-2.73-2.872c.794-3.967 4.32-6.075 7.494-6.333a3.99 3.99 0 0 1 2.73 8.586Z" /><path d="M10 2a6 6 0 0 0-4.472 10.002L10 16.69l4.472-4.688A6 6 0 0 0 10 2Z" /></svg>);
const SparklesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>);
const PencilSquareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.155 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>);

type DetailTab = 'stats' | 'performance' | 'ai' | 'notes';

const TrackDetailView: React.FC<{ 
    track: Track, 
    userProfile: UserProfile, 
    onExit: () => void, 
    allHistory?: Track[], 
    plannedWorkouts?: PlannedWorkout[], 
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void, 
    onAddPlannedWorkout?: any, 
    onCheckAiAccess?: (feature: 'workout' | 'analysis' | 'chat') => boolean 
}> = ({ 
    track, userProfile, onExit, allHistory = [], plannedWorkouts = [], 
    onUpdateTrackMetadata, onAddPlannedWorkout, onCheckAiAccess 
}) => {
    if (!track || typeof track.distance !== 'number') {
        return <div className="text-white p-4">Errore caricamento traccia. Dati mancanti. <button onClick={onExit}>Indietro</button></div>;
    }

    const [progress, setProgress] = useState(track.distance);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animSpeed, setAnimSpeed] = useState(20);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [highlightedSegments, setHighlightedSegments] = useState<TrackPoint[] | TrackPoint[][] | null>(null);
    const [mapMetric, setMapMetric] = useState<string>('none');
    const [showShareModal, setShowShareModal] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<DetailTab>('stats');
    
    // Local State for Metadata Inputs (Fixes input lag/locking)
    const [localNotes, setLocalNotes] = useState(track.notes || '');
    const [localRpe, setLocalRpe] = useState<number | ''>(track.rpe || '');
    const [localShoe, setLocalShoe] = useState(track.shoe || '');

    // Sync local state when track prop changes (e.g. navigation or external updates)
    useEffect(() => {
        setLocalNotes(track.notes || '');
        setLocalRpe(track.rpe || '');
        setLocalShoe(track.shoe || '');
    }, [track.id, track.notes, track.rpe, track.shoe]);

    const [layoutSizes, setLayoutSizes] = useState({ sidebarWidth: 320, mapHeightRatio: 0.6 });

    useEffect(() => {
        const stored = localStorage.getItem(LAYOUT_KEY);
        if (stored) {
            try { setLayoutSizes(JSON.parse(stored)); } catch(e) {}
        }
    }, []);

    const saveLayout = (updates: Partial<typeof layoutSizes>) => {
        const newSizes = { ...layoutSizes, ...updates };
        setLayoutSizes(newSizes);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(newSizes));
    };

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    // Determine available metrics
    const hasPowerData = useMemo(() => {
        return track.points.some(p => p.power !== undefined && p.power > 0);
    }, [track]);

    // Default metrics to show
    const defaultMetrics: YAxisMetric[] = useMemo(() => {
        const m: YAxisMetric[] = ['pace', 'hr', 'elevation'];
        if (hasPowerData) m.push('power');
        return m;
    }, [hasPowerData]);

    useEffect(() => {
        const timer = setTimeout(() => setFitTrigger(prev => prev + 1), 600);
        return () => clearTimeout(timer);
    }, []);

    const lastTimeRef = useRef<number | null>(null);
    const progressRef = useRef(progress);
    useEffect(() => { progressRef.current = progress; }, [progress]);

    useEffect(() => {
        let frame: number;
        const animate = (time: number) => {
            if (lastTimeRef.current !== null) {
                const delta = time - lastTimeRef.current;
                const kmPerMs = (1 / 60000) * animSpeed; 
                const nextProgress = progressRef.current + (kmPerMs * delta);
                if (nextProgress >= track.distance) {
                    setProgress(track.distance);
                    setIsAnimating(false);
                    lastTimeRef.current = null;
                    return;
                }
                setProgress(nextProgress);
            }
            lastTimeRef.current = time;
            frame = requestAnimationFrame(animate);
        };
        if (isAnimating) {
            if (progressRef.current >= track.distance) {
                setProgress(0);
                progressRef.current = 0;
            }
            frame = requestAnimationFrame(animate);
        } else {
            lastTimeRef.current = null;
        }
        return () => cancelAnimationFrame(frame);
    }, [isAnimating, animSpeed, track.distance]);

    const selectionStats = useMemo(() => {
        if (!selectedRange) return null;
        return calculateSegmentStats(track, selectedRange.startDistance, selectedRange.endDistance);
    }, [track, selectedRange]);

    const handleSplitSelect = (split: Split | PauseSegment | AiSegment | null) => {
        if (split === null) {
            setSelectedRange(null);
            setHighlightedSegments(null);
            return;
        }

        let start = 0;
        let end = 0;

        if ('splitNumber' in split) {
            // Standard Split
            start = (split.splitNumber - 1) * 1.0; 
            end = start + split.distance;
        } else if ('startDistance' in split) {
            // AI Segment
            start = split.startDistance;
            end = split.endDistance;
        } else if ('startPoint' in split) {
            // Pause Segment
            start = split.startPoint.cummulativeDistance;
            end = split.endPoint.cummulativeDistance;
        }

        setSelectedRange({ startDistance: start, endDistance: end });
        setHighlightedSegments(null); 
        setFitTrigger(prev => prev + 1);
    };

    const SidebarContent = (
        <div className="h-full w-full bg-slate-950 flex flex-col overflow-hidden">
            {/* Main Tabs Header - Responsive Wrap */}
            <div className="flex flex-wrap border-b border-slate-700 bg-slate-900/80 shrink-0">
                <button 
                    onClick={() => setActiveTab('stats')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'stats' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <ChartBarIcon /> Analisi
                    {activeTab === 'stats' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('performance')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'performance' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <HeartIcon /> Zone
                    {activeTab === 'performance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'ai' ? 'text-purple-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <SparklesIcon /> Coach AI
                    {activeTab === 'ai' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('notes')}
                    className={`flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all relative ${activeTab === 'notes' ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                    <PencilSquareIcon /> Diario
                    {activeTab === 'notes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"></div>}
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 bg-slate-900/20">
                
                {/* TAB: ANALISI (StatsPanel has its own internal tabs) */}
                {activeTab === 'stats' && (
                    <div className="h-full animate-fade-in">
                        <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={handleSplitSelect} />
                    </div>
                )}

                {/* TAB: PERFORMANCE (Records + Zones) */}
                {activeTab === 'performance' && (
                    <div className="space-y-4 animate-fade-in p-2">
                        <PersonalRecordsPanel track={track} />
                        <div className="border-t border-slate-700/50 my-2"></div>
                        <HeartRateZonePanel track={track} userProfile={userProfile} onZoneSelect={(segs) => { setHighlightedSegments(segs); setSelectedRange(null); if(segs) setFitTrigger(c=>c+1); }} />
                    </div>
                )}

                {/* TAB: COACH AI (Segments + Analysis) */}
                {activeTab === 'ai' && (
                    <div className="space-y-4 animate-fade-in p-2">
                        <GeminiSegmentsPanel 
                            track={track} 
                            stats={stats} 
                            userProfile={userProfile} 
                            onSegmentSelect={handleSplitSelect} 
                            selectedSegment={selectedRange ? { startDistance: selectedRange.startDistance, endDistance: selectedRange.endDistance } as AiSegment : null} 
                            onCheckAiAccess={() => onCheckAiAccess ? onCheckAiAccess('analysis') : true} 
                        />
                        <div className="border-t border-slate-700/50 my-2"></div>
                        <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onAddPlannedWorkout={onAddPlannedWorkout} onUpdateTrackMetadata={onUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} />
                    </div>
                )}

                {/* TAB: DIARIO (Metadata) */}
                {activeTab === 'notes' && (
                    <div className="p-4 space-y-6 animate-fade-in">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Note & Feedback</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Sforzo (RPE 1-10)</label>
                                <select 
                                    value={localRpe} 
                                    onChange={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value) : '';
                                        setLocalRpe(val);
                                        onUpdateTrackMetadata?.(track.id, { rpe: val === '' ? undefined : val });
                                    }} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                                >
                                    <option value="">-</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>
                            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Scarpa</label>
                                <select 
                                    value={localShoe} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setLocalShoe(val);
                                        onUpdateTrackMetadata?.(track.id, { shoe: val });
                                    }} 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500 transition-colors truncate"
                                >
                                    <option value="">Seleziona...</option>
                                    {userProfile.shoes?.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Diario di Bordo</label>
                            <textarea 
                                value={localNotes} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalNotes(val);
                                    onUpdateTrackMetadata?.(track.id, { notes: val });
                                }} 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white h-32 resize-none outline-none focus:border-cyan-500 transition-colors placeholder-slate-600" 
                                placeholder="Sensazioni, meteo, dolori..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const AnimationControlsBar = (
        <div className="flex items-center gap-4 p-3 bg-slate-900 border-t border-slate-800 shrink-0 z-30 select-none">
            <button 
                onClick={() => setIsAnimating(!isAnimating)} 
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${isAnimating ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
            >
                {isAnimating ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                )}
            </button>
            
            <div className="flex-grow flex flex-col justify-center gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-1">Avanzamento</span>
                <div className="relative h-4 flex items-center w-full">
                    <input 
                        type="range" 
                        min="0" 
                        max={track.distance} 
                        step="0.001" 
                        value={progress} 
                        onChange={e => setProgress(parseFloat(e.target.value))} 
                        className="w-full h-1.5 accent-cyan-500 bg-slate-700 rounded-lg cursor-pointer" 
                    />
                </div>
            </div>

            <div className="flex flex-col justify-center gap-1 w-24 sm:w-32">
                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-widest pl-1">
                    <span>Velocità</span>
                    <span className="text-cyan-400">{animSpeed}x</span>
                </div>
                <div className="relative h-4 flex items-center w-full">
                    <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        step="1" 
                        value={animSpeed} 
                        onChange={e => setAnimSpeed(parseInt(e.target.value))} 
                        className="w-full h-1.5 accent-purple-500 bg-slate-700 rounded-lg cursor-pointer" 
                    />
                </div>
            </div>

            <button 
                onClick={() => setShowShareModal(true)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white flex items-center justify-center transition-colors shadow-lg ml-2"
                title="Condividi Corsa"
            >
                <ShareIcon />
            </button>
        </div>
    );

    const SelectionStatsBar = (
        selectionStats && (
            <div className="bg-slate-900 border-t border-b border-cyan-500/30 p-1.5 overflow-x-auto no-scrollbar z-50 shadow-xl shrink-0">
                <div className="flex items-center gap-6 justify-center min-w-max px-4">
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Distanza</span><span className="text-xs font-black text-cyan-400 font-mono">{(selectedRange?.endDistance! - selectedRange?.startDistance!).toFixed(2)} km</span></div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Tempo</span><span className="text-xs font-bold text-white font-mono">{formatDuration(selectionStats.duration)}</span></div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Passo</span><span className="text-xs font-bold text-white font-mono">{formatPace(selectionStats.pace)}</span></div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="text-center"><span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Dislivello</span><span className="text-xs font-bold text-white font-mono">+{Math.round(selectionStats.elevationGain)}m</span></div>
                    <button onClick={() => setSelectedRange(null)} className="ml-4 bg-slate-800 hover:bg-slate-700 p-1 rounded-full text-slate-400 transition-colors text-xs">&times;</button>
                </div>
            </div>
        )
    );

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden z-[10000]">
            <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-[60] shrink-0">
                <button onClick={onExit} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest">
                    <span className="text-lg">←</span> Indietro
                </button>
                <div className="text-xs font-bold text-white truncate max-w-[200px]">{track.name}</div>
            </header>

            <div className="flex-grow overflow-hidden relative flex flex-col lg:flex-row h-full">
                {isMobile ? (
                    // MOBILE LAYOUT
                    <div className="flex flex-col w-full h-full overflow-hidden">
                        <div className="h-[35%] relative border-b border-slate-800 shrink-0">
                            <MapDisplay 
                                tracks={[track]} visibleTrackIds={new Set([track.id])} animationTrack={track} animationProgress={progress} 
                                isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger} raceRunners={null} hoveredTrackId={null} 
                                runnerSpeeds={new Map()} selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments} 
                                mapGradientMetric={mapMetric} onGradientChange={setMapMetric}
                            />
                        </div>
                        {SelectionStatsBar}
                        <div className="flex-grow overflow-y-auto bg-slate-950 min-h-0">{SidebarContent}</div>
                        <div className="h-60 border-t border-slate-800 bg-slate-900 shrink-0 flex flex-col w-full">
                            <div className="flex-grow relative min-h-0 w-full">
                                <TimelineChart track={track} yAxisMetrics={defaultMetrics} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} userProfile={userProfile} highlightedRange={selectedRange} />
                            </div>
                            {AnimationControlsBar}
                        </div>
                    </div>
                ) : (
                    // DESKTOP LAYOUT
                    <ResizablePanel 
                        direction="vertical" 
                        initialSize={layoutSizes.sidebarWidth} 
                        minSize={250}
                        onResizeEnd={(s) => saveLayout({ sidebarWidth: s })}
                        className="w-full h-full"
                    >
                        <div className="h-full bg-slate-950 border-r border-slate-800 overflow-hidden">{SidebarContent}</div>
                        <div className="h-full flex flex-col w-full overflow-hidden relative">
                            <div className="flex-grow overflow-hidden min-h-0 relative">
                                <ResizablePanel 
                                    direction="horizontal"
                                    initialSizeRatio={layoutSizes.mapHeightRatio}
                                    minSize={200}
                                    onResizeEnd={(s, r) => saveLayout({ mapHeightRatio: r })}
                                    className="h-full"
                                >
                                    <div className="h-full relative bg-slate-900 overflow-hidden w-full flex flex-col">
                                        <div className="flex-grow relative">
                                            <MapDisplay 
                                                tracks={[track]} visibleTrackIds={new Set([track.id])} animationTrack={track} animationProgress={progress} 
                                                isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger} raceRunners={null} hoveredTrackId={null} 
                                                runnerSpeeds={new Map()} selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments} 
                                                mapGradientMetric={mapMetric} onGradientChange={setMapMetric}
                                            />
                                        </div>
                                    </div>
                                    <div className="h-full flex flex-col bg-slate-900 border-t border-slate-800 overflow-hidden w-full">
                                        {SelectionStatsBar}
                                        <div className="flex-grow relative bg-slate-900/50 p-2 min-h-0">
                                            <TimelineChart track={track} yAxisMetrics={defaultMetrics} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} userProfile={userProfile} highlightedRange={selectedRange} />
                                        </div>
                                    </div>
                                </ResizablePanel>
                            </div>
                            {AnimationControlsBar}
                        </div>
                    </ResizablePanel>
                )}
            </div>
            {showShareModal && <ShareTrackModal track={track} onClose={() => setShowShareModal(false)} />}
        </div>
    );
};

export default TrackDetailView;
