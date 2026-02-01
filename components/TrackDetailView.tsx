
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Track, TrackPoint, UserProfile, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart from './TimelineChart';
import StatsPanel from './StatsPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import ResizablePanel from './ResizablePanel';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance } from '../services/trackEditorUtils';

type DetailLayout = 'dashboard' | 'cinema' | 'focus-chart';

const TrackDetailView: React.FC<{ track: Track, userProfile: UserProfile, onExit: () => void, allHistory?: Track[], plannedWorkouts?: PlannedWorkout[], onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void, onAddPlannedWorkout?: any, onCheckAiAccess?: any }> = ({ 
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
    const [selectedAiSegment, setSelectedAiSegment] = useState<any>(null);

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
            <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-4 z-50 shrink-0 shadow-xl">
                <button onClick={onExit} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                </button>
                
                <div className="flex-grow flex items-center justify-center gap-3 px-4 border-l border-r border-slate-800 max-w-2xl">
                    <button onClick={() => setIsAnimating(!isAnimating)} className="w-9 h-9 bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center justify-center transition-colors">
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
                    <select value={animSpeed} onChange={e => setAnimSpeed(parseInt(e.target.value))} className="bg-slate-800 text-[9px] font-black p-1.5 rounded uppercase border border-slate-700 outline-none">
                        <option value="5">5x</option>
                        <option value="15">15x</option>
                        <option value="50">50x</option>
                        <option value="100">100x</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setLayout('dashboard')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${layout === 'dashboard' ? 'bg-cyan-600' : 'text-slate-500 hover:text-white'}`}>DASHBOARD</button>
                    <button onClick={() => setLayout('cinema')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${layout === 'cinema' ? 'bg-cyan-600' : 'text-slate-500 hover:text-white'}`}>CINEMA</button>
                </div>
            </header>

            <main className="flex-grow relative flex flex-col lg:flex-row overflow-hidden">
                {layout !== 'cinema' && (
                    <ResizablePanel direction="vertical" initialSizeRatio={0.3} minSize={300}>
                        <aside className="h-full w-full bg-slate-950 overflow-y-auto custom-scrollbar p-4 space-y-6">
                            {/* Metadata Editor: RPE, Scarpe, Note */}
                            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-4 shadow-inner">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Metadati & Feedback</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 block mb-1">RPE (1-10)</label>
                                        <select 
                                            value={track.rpe || ''} 
                                            onChange={(e) => onUpdateTrackMetadata?.(track.id, { rpe: parseInt(e.target.value) })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                                        >
                                            <option value="">Seleziona...</option>
                                            {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 block mb-1">Scarpa</label>
                                        <select 
                                            value={track.shoe || ''} 
                                            onChange={(e) => onUpdateTrackMetadata?.(track.id, { shoe: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                                        >
                                            <option value="">Seleziona...</option>
                                            {userProfile.shoes?.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 block mb-1">Note Attività</label>
                                    <textarea 
                                        value={track.notes || ''} 
                                        onChange={(e) => onUpdateTrackMetadata?.(track.id, { notes: e.target.value })}
                                        placeholder="Come ti sei sentito? Meteo? Dolori?"
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white h-20 resize-none outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                            </div>

                            <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={() => {}} />
                            <PersonalRecordsPanel track={track} />
                            <HeartRateZonePanel track={track} userProfile={userProfile} />
                            
                            {/* AI Training & Segments */}
                            <GeminiSegmentsPanel track={track} stats={stats} onSegmentSelect={setSelectedAiSegment} selectedSegment={selectedAiSegment} onCheckAiAccess={onCheckAiAccess} />
                            <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onAddPlannedWorkout={onAddPlannedWorkout} onUpdateTrackMetadata={onUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} />
                        </aside>
                        
                        <div className="h-full flex flex-col bg-slate-900 overflow-hidden">
                             <div className="h-2/3 relative">
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
                             <div className="h-1/3 border-t border-slate-800 p-2 bg-slate-900/50">
                                <TimelineChart 
                                    track={track} yAxisMetrics={['pace', 'hr', 'elevation']} 
                                    onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} 
                                    onSelectionChange={() => {}} showPauses={false} pauseSegments={[]} 
                                    animationProgress={progress} isAnimating={isAnimating} 
                                />
                             </div>
                        </div>
                    </ResizablePanel>
                )}
                {layout === 'cinema' && (
                    <div className="flex-grow relative h-full">
                        <MapDisplay 
                            tracks={[track]} visibleTrackIds={new Set([track.id])} 
                            animationTrack={track} animationProgress={progress} 
                            isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger}
                            raceRunners={null} hoveredTrackId={null} runnerSpeeds={new Map()}
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
