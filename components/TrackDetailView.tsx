
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Track, TrackPoint, UserProfile, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart from './TimelineChart';
import StatsPanel from './StatsPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import ResizablePanel from './ResizablePanel';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance } from '../services/trackEditorUtils';

type DetailLayout = 'dashboard' | 'cinema' | 'focus-chart';

const TrackDetailView: React.FC<{ track: Track, userProfile: UserProfile, onExit: () => void, allHistory?: Track[], plannedWorkouts?: PlannedWorkout[], onUpdateTrackMetadata?: any, onAddPlannedWorkout?: any, onCheckAiAccess?: any }> = ({ 
    track, userProfile, onExit, allHistory = [], plannedWorkouts = [], 
    onUpdateTrackMetadata, onAddPlannedWorkout, onCheckAiAccess 
}) => {
    const [layout, setLayout] = useState<DetailLayout>('dashboard');
    const [mapMetric, setMapMetric] = useState<any>('none');
    const [isAnimating, setIsAnimating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [animSpeed, setAnimSpeed] = useState(15);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    useEffect(() => {
        let frame: number;
        let last: number;
        const animate = (time: number) => {
            if (last) {
                const delta = time - last;
                const kmPerMs = (1 / 60000) * animSpeed;
                setProgress(prev => {
                    const next = prev + kmPerMs * delta;
                    if (next >= track.distance) { setIsAnimating(false); return track.distance; }
                    return next;
                });
            }
            last = time;
            if (isAnimating) frame = requestAnimationFrame(animate);
        };
        if (isAnimating) frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [isAnimating, animSpeed, track.distance]);

    const activePoint = isAnimating ? getTrackPointAtDistance(track, progress) : hoveredPoint;

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden">
            {/* Header Superiore con Controlli Replay */}
            <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-4 z-50 shrink-0 shadow-xl">
                <button onClick={onExit} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                </button>
                
                {/* Replay Controls in Header */}
                <div className="flex-grow flex items-center justify-center gap-3 px-4 border-l border-r border-slate-800 max-w-2xl">
                    <button onClick={() => setIsAnimating(!isAnimating)} className="w-9 h-9 bg-cyan-600 rounded-lg flex items-center justify-center">
                        {isAnimating ? '⏸' : '▶'}
                    </button>
                    <div className="flex-grow">
                        <input type="range" min="0" max={track.distance} step="0.01" value={progress} onChange={e => setProgress(parseFloat(e.target.value))} className="w-full h-1.5 accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer" />
                        <div className="flex justify-between text-[8px] font-mono mt-1 text-slate-500 uppercase">
                            <span>0.0 km</span>
                            <span className="text-cyan-400 font-bold">{progress.toFixed(2)} km</span>
                            <span>{track.distance.toFixed(1)} km</span>
                        </div>
                    </div>
                    <select value={animSpeed} onChange={e => setAnimSpeed(parseInt(e.target.value))} className="bg-slate-800 text-[9px] font-black p-1.5 rounded uppercase border border-slate-700">
                        <option value="5">5x</option>
                        <option value="15">15x</option>
                        <option value="50">50x</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setLayout('dashboard')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${layout === 'dashboard' ? 'bg-cyan-600' : 'text-slate-500'}`}>DASHBOARD</button>
                    <button onClick={() => setLayout('cinema')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${layout === 'cinema' ? 'bg-cyan-600' : 'text-slate-500'}`}>CINEMA</button>
                </div>
            </header>

            <main className="flex-grow relative flex flex-col lg:flex-row overflow-hidden">
                {layout !== 'cinema' && (
                    <ResizablePanel direction="vertical" initialSizeRatio={0.3} minSize={280}>
                        <aside className="h-full w-full bg-slate-950 overflow-y-auto custom-scrollbar p-4 space-y-6">
                            <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={() => {}} />
                            <HeartRateZonePanel track={track} userProfile={userProfile} />
                            <PersonalRecordsPanel track={track} />
                        </aside>
                        <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
                             <div className="h-2/3 relative">
                                {/* Fixed missing required props raceRunners, hoveredTrackId, runnerSpeeds */}
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
                                />
                             </div>
                             <div className="h-1/3 border-t border-slate-800 p-2">
                                <TimelineChart track={track} yAxisMetrics={['pace', 'hr']} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={() => {}} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} />
                             </div>
                        </div>
                    </ResizablePanel>
                )}
                {layout === 'cinema' && (
                    <div className="flex-grow relative h-full">
                        {/* Fixed missing required props raceRunners, hoveredTrackId, runnerSpeeds */}
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
                        />
                        <div className="absolute bottom-6 left-6 right-6 h-32 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-[4000]">
                            <TimelineChart track={track} yAxisMetrics={['pace', 'hr']} onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} onSelectionChange={() => {}} showPauses={false} pauseSegments={[]} animationProgress={progress} isAnimating={isAnimating} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TrackDetailView;
