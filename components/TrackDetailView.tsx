
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Track, TrackPoint, UserProfile, PlannedWorkout, PauseSegment, AiSegment, Split } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart from './TimelineChart';
import StatsPanel from './StatsPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import ResizablePanel from './ResizablePanel';
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

const LAYOUT_KEY = 'track_detail_layout_prefs';

const TrackDetailView: React.FC<{ 
    track: Track, 
    userProfile: UserProfile, 
    onExit: () => void, 
    allHistory?: Track[], 
    plannedWorkouts?: PlannedWorkout[], 
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void, 
    onAddPlannedWorkout?: any, 
    onCheckAiAccess?: any 
}> = ({ 
    track, userProfile, onExit, allHistory = [], plannedWorkouts = [], 
    onUpdateTrackMetadata, onAddPlannedWorkout, onCheckAiAccess 
}) => {
    const [progress, setProgress] = useState(track.distance);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animSpeed, setAnimSpeed] = useState(15);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [highlightedSegments, setHighlightedSegments] = useState<TrackPoint[] | TrackPoint[][] | null>(null);
    const [mapMetric, setMapMetric] = useState<string>('none');
    
    // Layout State Persistence
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

    const [sections, setSections] = useState<SectionState>({
        stats: true, records: true, zones: true, metadata: true, aiAnalysis: true, aiSegments: true
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    useEffect(() => {
        const timer = setTimeout(() => setFitTrigger(prev => prev + 1), 600);
        return () => clearTimeout(timer);
    }, []);

    // ANIMAZIONE
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

    const toggleSection = (key: keyof SectionState) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSplitSelect = (split: Split | PauseSegment | AiSegment | null) => {
        if (split && 'splitNumber' in split) {
            const start = (split.splitNumber - 1) * 1.0; 
            const end = start + split.distance;
            setSelectedRange({ startDistance: start, endDistance: end });
            setHighlightedSegments(null); 
            setFitTrigger(prev => prev + 1);
        } else if (split === null) {
            setSelectedRange(null);
        }
    };

    const sectionHeader = (title: string, key: keyof SectionState, icon?: string) => (
        <button onClick={() => toggleSection(key)} className="w-full flex items-center justify-between py-2 border-b border-slate-800 group hover:bg-slate-900/50 px-2 transition-colors">
            <div className="flex items-center gap-2">
                {icon && <span className="text-sm">{icon}</span>}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">{title}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-transform duration-300 ${sections[key] ? '' : '-rotate-90'}`}><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
        </button>
    );

    const SidebarContent = (
        <div className="h-full w-full bg-slate-950 overflow-y-auto custom-scrollbar p-2 space-y-2">
            <div className="bg-slate-900/20 rounded border border-slate-800/50">{sectionHeader("Sommario", "stats", "📊")}{sections.stats && <div className="p-2"><StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={handleSplitSelect} /></div>}</div>
            <div className="bg-slate-900/20 rounded border border-slate-800/50">{sectionHeader("Records", "records", "🏆")}{sections.records && <div className="p-2"><PersonalRecordsPanel track={track} /></div>}</div>
            <div className="bg-slate-900/20 rounded border border-slate-800/50">{sectionHeader("Zone", "zones", "❤️")}{sections.zones && <div className="p-2"><HeartRateZonePanel track={track} userProfile={userProfile} onZoneSelect={(segs) => { setHighlightedSegments(segs); setSelectedRange(null); if(segs) setFitTrigger(c=>c+1); }} /></div>}</div>
            <div className="bg-slate-900/20 rounded border border-slate-800/50">{sectionHeader("Note", "metadata", "📝")}{sections.metadata && (
                <div className="p-3 space-y-3 animate-fade-in"><div className="grid grid-cols-2 gap-2">
                <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">RPE (1-10)</label><select value={track.rpe || ''} onChange={(e) => onUpdateTrackMetadata?.(track.id, { rpe: parseInt(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-[10px] text-white"><option value="">-</option>{[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}</select></div>
                <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Scarpa</label><select value={track.shoe || ''} onChange={(e) => onUpdateTrackMetadata?.(track.id, { shoe: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-[10px] text-white"><option value="">-</option>{userProfile.shoes?.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div><div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Feedback</label><textarea value={track.notes || ''} onChange={(e) => onUpdateTrackMetadata?.(track.id, { notes: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white h-16 resize-none outline-none focus:border-cyan-500/50" /></div></div>
            )}</div>
            <div className="bg-slate-900/20 rounded border border-slate-800/50">{sectionHeader("Segmenti AI", "aiSegments", "🔍")}{sections.aiSegments && <div className="p-2"><GeminiSegmentsPanel track={track} stats={stats} userProfile={userProfile} onSegmentSelect={() => {}} selectedSegment={null} onCheckAiAccess={onCheckAiAccess} /></div>}</div>
            <div className="bg-slate-900/20 rounded border border-slate-800/50">{sectionHeader("Coach AI", "aiAnalysis", "🧠")}{sections.aiAnalysis && <div className="p-2"><GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onAddPlannedWorkout={onAddPlannedWorkout} onUpdateTrackMetadata={onUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} /></div>}</div>
        </div>
    );

    const AnimationControlsBar = (
        <div className="flex items-center gap-3 p-2 bg-slate-900 border-t border-slate-800 shrink-0">
            <button onClick={() => setIsAnimating(!isAnimating)} className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 rounded flex items-center justify-center transition-colors shadow-lg active:scale-95 text-white">
                {isAnimating ? '⏸' : '▶'}
            </button>
            <div className="flex-grow group relative h-4 flex items-center">
                <input type="range" min="0" max={track.distance} step="0.001" value={progress} onChange={e => setProgress(parseFloat(e.target.value))} className="w-full h-1 accent-cyan-500 bg-slate-800 rounded cursor-pointer" />
            </div>
            <select value={animSpeed} onChange={e => setAnimSpeed(parseInt(e.target.value))} className="bg-slate-800 text-[10px] font-black p-1 rounded uppercase border border-slate-700 outline-none text-slate-300">
                <option value="5">5x</option>
                <option value="15">15x</option>
                <option value="50">50x</option>
                <option value="100">100x</option>
            </select>
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

            <div className="flex-grow overflow-hidden relative flex">
                {isMobile ? (
                    // MOBILE LAYOUT (Stack)
                    <div className="flex flex-col w-full h-full">
                        {/* Map Section (Fixed Height) */}
                        <div className="h-[40%] relative border-b border-slate-800 shrink-0">
                            <MapDisplay 
                                tracks={[track]} 
                                visibleTrackIds={new Set([track.id])} 
                                animationTrack={track} 
                                animationProgress={progress} 
                                isAnimationPlaying={isAnimating} 
                                fitBoundsCounter={fitTrigger} 
                                raceRunners={null} 
                                hoveredTrackId={null} 
                                runnerSpeeds={new Map()} 
                                selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments} 
                                mapGradientMetric={mapMetric} 
                                onGradientChange={setMapMetric}
                            />
                        </div>
                        {SelectionStatsBar}
                        {/* Stats Section (Scrollable) */}
                        <div className="flex-grow overflow-y-auto bg-slate-950">
                            {SidebarContent}
                        </div>
                        {/* Chart + Controls (Fixed Bottom) */}
                        <div className="h-40 border-t border-slate-800 bg-slate-900 shrink-0 flex flex-col">
                            <div className="flex-grow relative">
                                <TimelineChart track={track} yAxisMetrics={['pace', 'hr']} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} userProfile={userProfile} highlightedRange={selectedRange} />
                            </div>
                            {AnimationControlsBar}
                        </div>
                    </div>
                ) : (
                    // DESKTOP LAYOUT (Resizable Panels)
                    <ResizablePanel 
                        direction="horizontal" 
                        initialSize={layoutSizes.sidebarWidth} 
                        minSize={250}
                        onResizeEnd={(s) => saveLayout({ sidebarWidth: s })}
                        className="w-full h-full"
                    >
                        {/* LEFT: Sidebar */}
                        <div className="h-full bg-slate-950 border-r border-slate-800">
                            {SidebarContent}
                        </div>

                        {/* RIGHT: Map & Chart */}
                        <div className="h-full flex flex-col">
                            <ResizablePanel 
                                direction="vertical"
                                initialSizeRatio={layoutSizes.mapHeightRatio}
                                minSize={200}
                                onResizeEnd={(s, r) => saveLayout({ mapHeightRatio: r })}
                                className="h-full"
                            >
                                {/* TOP RIGHT: Map */}
                                <div className="h-full relative bg-slate-900">
                                    <MapDisplay 
                                        tracks={[track]} 
                                        visibleTrackIds={new Set([track.id])} 
                                        animationTrack={track} 
                                        animationProgress={progress} 
                                        isAnimationPlaying={isAnimating} 
                                        fitBoundsCounter={fitTrigger} 
                                        raceRunners={null} 
                                        hoveredTrackId={null} 
                                        runnerSpeeds={new Map()} 
                                        selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments} 
                                        mapGradientMetric={mapMetric} 
                                        onGradientChange={setMapMetric}
                                    />
                                </div>

                                {/* BOTTOM RIGHT: Chart & Controls */}
                                <div className="h-full flex flex-col bg-slate-900 border-t border-slate-800">
                                    {SelectionStatsBar}
                                    <div className="flex-grow relative bg-slate-900/50 p-2">
                                        <TimelineChart track={track} yAxisMetrics={['pace', 'hr', 'elevation']} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} userProfile={userProfile} highlightedRange={selectedRange} />
                                    </div>
                                    {AnimationControlsBar}
                                </div>
                            </ResizablePanel>
                        </div>
                    </ResizablePanel>
                )}
            </div>
        </div>
    );
};

export default TrackDetailView;
