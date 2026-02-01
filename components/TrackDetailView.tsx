
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Track, TrackPoint, Split, UserProfile, TrackStats, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import ResizablePanel from './ResizablePanel';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance, calculateSegmentStats } from '../services/trackEditorUtils';

type DetailLayout = 'dashboard' | 'cinema' | 'focus-chart';

interface TrackDetailViewProps {
    track: Track;
    userProfile: UserProfile;
    onExit: () => void;
    allHistory?: Track[];
    plannedWorkouts?: PlannedWorkout[];
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    onCheckAiAccess?: () => boolean; 
}

const TrackDetailView: React.FC<TrackDetailViewProps> = ({ 
    track, userProfile, onExit, allHistory = [], plannedWorkouts = [], 
    onUpdateTrackMetadata, onAddPlannedWorkout, onCheckAiAccess 
}) => {
    // Layout State
    const [layout, setLayout] = useState<DetailLayout>('dashboard');
    const [mapMetric, setMapMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power'>('none');
    
    // Animation State
    const [isAnimating, setIsAnimating] = useState(false);
    const [progress, setProgress] = useState(0); // in km
    const [animSpeed, setAnimSpeed] = useState(15);
    const requestRef = useRef<number>(null);
    const lastTimestampRef = useRef<number>(null);

    // Interaction State
    const [selectedRange, setSelectedRange] = useState<{startDistance: number, endDistance: number} | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [fitTrigger, setFitTrigger] = useState(0);

    // Gestione Breakpoint
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    // Animation Loop (60fps synced)
    const animate = useCallback((time: number) => {
        if (lastTimestampRef.current !== undefined) {
            const deltaTime = time - lastTimestampRef.current;
            const kmPerMs = (1 / 60000) * animSpeed;
            setProgress(prev => {
                const next = prev + kmPerMs * deltaTime;
                if (next >= track.distance) {
                    setIsAnimating(false);
                    return track.distance;
                }
                return next;
            });
        }
        lastTimestampRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [track.distance, animSpeed]);

    useEffect(() => {
        if (isAnimating) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            lastTimestampRef.current = undefined;
        }
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [isAnimating, animate]);

    const handleTogglePlay = () => {
        if (progress >= track.distance) setProgress(0);
        setIsAnimating(!isAnimating);
    };

    const handleLayoutChange = (newLayout: DetailLayout) => {
        setLayout(newLayout);
        setFitTrigger(c => c + 1);
    };

    const activePoint = isAnimating ? getTrackPointAtDistance(track, progress) : hoveredPoint;

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden">
            {/* Header Superiore con Controlli Integrati */}
            <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-4 z-50 shrink-0 shadow-xl">
                <button onClick={onExit} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 active:scale-95 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                </button>
                
                <div className="min-w-0 hidden md:block">
                    <h1 className="text-sm font-bold truncate leading-tight">{track.name}</h1>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{track.distance.toFixed(1)} km</p>
                </div>

                {/* Playback Controls in Header */}
                <div className="flex-grow flex items-center justify-center gap-2 max-w-2xl px-4 border-l border-r border-slate-800">
                    <button onClick={handleTogglePlay} className="w-9 h-9 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-lg transition-all active:scale-90 flex-shrink-0">
                        {isAnimating ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                        )}
                    </button>
                    <div className="flex-grow min-w-0">
                        <input type="range" min="0" max={track.distance} step="0.01" value={progress} onChange={(e) => setProgress(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500" />
                        <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1 uppercase">
                            <span>0.00 km</span>
                            <span className="text-cyan-400 font-bold">{progress.toFixed(2)} km</span>
                            <span>{track.distance.toFixed(2)} km</span>
                        </div>
                    </div>
                    <button onClick={() => setProgress(0)} className="p-2 text-slate-500 hover:text-white" title="Reset"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Z" clipRule="evenodd" /></svg></button>
                </div>

                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl shrink-0">
                    <button onClick={() => handleLayoutChange('dashboard')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${layout === 'dashboard' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>DASHBOARD</button>
                    <button onClick={() => handleLayoutChange('cinema')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${layout === 'cinema' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>CINEMA</button>
                    <button onClick={() => handleLayoutChange('focus-chart')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${layout === 'focus-chart' ? 'bg-cyan-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>CHART</button>
                </div>

                <select 
                    value={mapMetric} 
                    onChange={(e) => setMapMetric(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold uppercase px-2 py-1.5 outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer hidden lg:block"
                >
                    <option value="none">Visuale Default</option>
                    <option value="pace">Heatmap: Passo</option>
                    <option value="hr">Heatmap: Cardio</option>
                    <option value="elevation">Heatmap: Altitudine</option>
                </select>
            </header>

            {/* Layout Dinamico */}
            <main className="flex-grow relative overflow-hidden flex flex-col lg:flex-row">
                {layout !== 'cinema' && (
                    <ResizablePanel 
                        direction={isDesktop ? 'vertical' : 'horizontal'}
                        initialSizeRatio={isDesktop ? 0.28 : 0.35}
                        minSize={280}
                        className="flex-grow-0"
                        onResizeEnd={() => setFitTrigger(c => c + 1)}
                    >
                        <aside className="h-full w-full border-r border-slate-800 bg-slate-950 overflow-y-auto custom-scrollbar flex-shrink-0">
                            <div className="p-4 space-y-4">
                                <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={() => {}} />
                                <HeartRateZonePanel track={track} userProfile={userProfile} />
                                <PersonalRecordsPanel track={track} />
                                <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onAddPlannedWorkout={onAddPlannedWorkout} startOpen={false} onCheckAiAccess={onCheckAiAccess} />
                            </div>
                        </aside>

                        <div className="h-full flex flex-col min-w-0 bg-slate-900 relative">
                            {/* Area Mappa/Grafico Split */}
                            <ResizablePanel 
                                direction="horizontal"
                                initialSizeRatio={layout === 'focus-chart' ? 0.3 : 0.65}
                                minSize={150}
                                onResizeEnd={() => setFitTrigger(c => c + 1)}
                            >
                                <div className="h-full relative overflow-hidden">
                                    <MapDisplay 
                                        tracks={[track]} 
                                        visibleTrackIds={new Set([track.id])} 
                                        raceRunners={null} runnerSpeeds={new Map()} 
                                        hoveredTrackId={null} mapGradientMetric={mapMetric}
                                        hoveredPoint={activePoint}
                                        animationTrack={track} animationProgress={progress}
                                        isAnimationPlaying={isAnimating}
                                        fitBoundsCounter={fitTrigger}
                                    />
                                </div>
                                <div className="h-full bg-slate-900 border-t border-slate-800 p-2 relative flex-shrink-0">
                                    <TimelineChart 
                                        track={track} yAxisMetrics={['pace', 'elevation', 'hr']} 
                                        onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} 
                                        onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={stats.pauses}
                                        highlightedRange={selectedRange} animationProgress={progress} isAnimating={isAnimating} userProfile={userProfile}
                                    />
                                </div>
                            </ResizablePanel>
                        </div>
                    </ResizablePanel>
                )}

                {layout === 'cinema' && (
                    <div className="flex-grow relative min-w-0 bg-slate-900">
                        <MapDisplay 
                            tracks={[track]} visibleTrackIds={new Set([track.id])} 
                            raceRunners={null} runnerSpeeds={new Map()} 
                            hoveredTrackId={null} mapGradientMetric={mapMetric}
                            hoveredPoint={activePoint}
                            animationTrack={track} animationProgress={progress}
                            isAnimationPlaying={isAnimating}
                            fitBoundsCounter={fitTrigger}
                        />
                        <div className="absolute bottom-4 left-4 right-4 h-32 bg-slate-900/60 backdrop-blur rounded-xl border border-white/10 p-2 z-[4000]">
                            <TimelineChart 
                                track={track} yAxisMetrics={['pace', 'hr']} 
                                onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} 
                                onSelectionChange={() => {}} showPauses={false} pauseSegments={stats.pauses}
                                animationProgress={progress} isAnimating={isAnimating}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TrackDetailView;
