

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Track, TrackPoint, Split, UserProfile, TrackStats, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance, calculateSegmentStats } from '../services/trackEditorUtils';

type DetailLayout = 'classic' | 'cinema' | 'analytics' | 'vertical';

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
    const [layout, setLayout] = useState<DetailLayout>('classic');
    const [mapMetric, setMapMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power'>('none');
    
    // Animation State
    const [isAnimating, setIsAnimating] = useState(false);
    const [progress, setProgress] = useState(0); // in km
    const [animSpeed, setAnimSpeed] = useState(10);
    const requestRef = useRef<number>(null);
    const lastTimestampRef = useRef<number>(null);

    // Interaction State
    const [selectedRange, setSelectedRange] = useState<{startDistance: number, endDistance: number} | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    // Animation Loop
    const animate = useCallback((time: number) => {
        if (lastTimestampRef.current !== undefined) {
            const deltaTime = time - lastTimestampRef.current;
            // Calcola incremento distanza basato sul tempo e velocità animazione
            // Assumiamo una velocità base di 1km ogni 30 secondi a 1x
            const kmPerMs = (1 / 30000) * animSpeed;
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

    const handleStop = () => {
        setIsAnimating(false);
        setProgress(0);
    };

    const segmentStats = useMemo(() => {
        if (!selectedRange) return null;
        return calculateSegmentStats(track, selectedRange.startDistance, selectedRange.endDistance);
    }, [selectedRange, track]);

    const activePoint = isAnimating ? getTrackPointAtDistance(track, progress) : hoveredPoint;

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden">
            {/* Header / Navbar */}
            <header className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="p-2 hover:bg-slate-800 rounded-full transition-colors">&larr;</button>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tighter text-slate-400">Dettagli Attività</h2>
                        <h1 className="text-lg font-bold leading-none">{track.name}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                    <button 
                        onClick={() => setLayout('classic')} 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${layout === 'classic' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >Classic</button>
                    <button 
                        onClick={() => setLayout('cinema')} 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${layout === 'cinema' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >Cinema</button>
                    <button 
                        onClick={() => setLayout('analytics')} 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${layout === 'analytics' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >Analytics</button>
                </div>

                <div className="flex items-center gap-2">
                    <select 
                        value={mapMetric} 
                        onChange={(e) => setMapMetric(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold uppercase px-3 py-2 outline-none focus:border-cyan-500"
                    >
                        <option value="none">Mappa: Default</option>
                        <option value="pace">Mappa: Ritmo</option>
                        <option value="hr">Mappa: FC</option>
                        <option value="elevation">Mappa: Altitudine</option>
                    </select>
                </div>
            </header>

            {/* Matrix Content Layout */}
            <main className={`flex-grow relative overflow-hidden ${
                layout === 'vertical' ? 'flex flex-col overflow-y-auto' : 
                layout === 'analytics' ? 'flex flex-col' : 
                'flex flex-col lg:flex-row'
            }`}>
                
                {/* Stats Panel Slot */}
                <div className={`${
                    layout === 'classic' ? 'w-full lg:w-[400px] border-r border-slate-800 overflow-y-auto' :
                    layout === 'cinema' ? 'absolute top-20 left-4 z-40 w-80 max-h-[70vh] overflow-y-auto pointer-events-auto' :
                    layout === 'analytics' ? 'order-3 h-64 border-t border-slate-800 overflow-y-auto' :
                    'w-full p-4'
                } bg-slate-950/80 backdrop-blur-md custom-scrollbar`}>
                    <div className="p-4 space-y-6">
                        <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={() => {}} />
                        
                        {segmentStats && (
                            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-2xl p-4 animate-fade-in-down">
                                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">Segmento Selezionato</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><p className="text-[9px] text-slate-500 font-bold uppercase">Dist</p><p className="font-mono font-bold">{segmentStats.distance.toFixed(2)} km</p></div>
                                    <div><p className="text-[9px] text-slate-500 font-bold uppercase">Passo</p><p className="font-mono font-bold text-cyan-400">{(segmentStats.pace).toFixed(2)}</p></div>
                                </div>
                                <button onClick={() => setSelectedRange(null)} className="w-full mt-3 py-1.5 text-[9px] font-bold uppercase bg-slate-800 rounded-lg hover:bg-slate-700">Cancella Selezione</button>
                            </div>
                        )}

                        <HeartRateZonePanel track={track} userProfile={userProfile} />
                        <PersonalRecordsPanel track={track} />
                        <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} startOpen={false} />
                    </div>
                </div>

                {/* Visual Area (Map & Chart) Slot */}
                <div className={`flex-grow flex flex-col min-w-0 ${layout === 'analytics' ? 'order-1' : ''}`}>
                    
                    {/* Map Slot */}
                    <div className={`flex-grow relative ${layout === 'analytics' ? 'h-64' : ''}`}>
                        <MapDisplay 
                            tracks={[track]} 
                            visibleTrackIds={new Set([track.id])} 
                            raceRunners={null} 
                            runnerSpeeds={new Map()} 
                            hoveredTrackId={null} 
                            mapGradientMetric={mapMetric}
                            hoveredPoint={activePoint}
                            animationTrack={track}
                            animationProgress={progress}
                            isAnimationPlaying={isAnimating}
                        />
                        
                        {/* Integrated Floating Animation Controls */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[4500] flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-3 shadow-2xl ring-1 ring-white/10">
                            <button onClick={handleTogglePlay} className="w-12 h-12 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg transition-all active:scale-90">
                                {isAnimating ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                                )}
                            </button>
                            
                            <div className="flex flex-col gap-1 min-w-[120px] sm:min-w-[200px]">
                                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Replay Live</span>
                                    <span className="text-cyan-400 font-mono">{progress.toFixed(2)} / {track.distance.toFixed(2)} km</span>
                                </div>
                                <input
                                    type="range" min="0" max={track.distance} step="0.01" value={progress}
                                    onChange={(e) => setProgress(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                            <div className="h-10 w-px bg-slate-800"></div>

                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Velocità: {animSpeed}x</span>
                                <input
                                    type="range" min="1" max="500" step="5" value={animSpeed}
                                    onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
                                    className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                            
                            <button onClick={handleStop} className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-700">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3h-9.5Z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Chart Slot */}
                    <div className={`${layout === 'analytics' ? 'order-first h-[400px]' : 'h-64'} bg-slate-900 border-t border-slate-800 p-2 relative shrink-0`}>
                        <TimelineChart 
                            track={track} 
                            yAxisMetrics={['pace', 'elevation', 'hr']} 
                            onChartHover={setHoveredPoint} 
                            hoveredPoint={hoveredPoint} 
                            onSelectionChange={setSelectedRange}
                            // Added missing mandatory props showPauses and pauseSegments
                            showPauses={false}
                            pauseSegments={stats.pauses}
                            highlightedRange={selectedRange}
                            animationProgress={progress}
                            isAnimating={isAnimating}
                            userProfile={userProfile}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TrackDetailView;
