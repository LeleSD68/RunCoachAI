
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { getTrackPointAtDistance, calculateSegmentStats, getPointsInDistanceRange } from '../services/trackEditorUtils';

type DetailLayout = 'dashboard' | 'cinema';

interface SectionState {
    stats: boolean;
    records: boolean;
    zones: boolean;
    metadata: boolean;
    aiAnalysis: boolean;
    aiSegments: boolean;
}

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
    const [layout, setLayout] = useState<DetailLayout>('dashboard');
    const [progress, setProgress] = useState(track.distance);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animSpeed, setAnimSpeed] = useState(15);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [highlightedSegments, setHighlightedSegments] = useState<TrackPoint[] | null>(null);
    const [mapMetric, setMapMetric] = useState<string>('none');
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

    // Gestione animazione con ripresa dal punto corrente
    useEffect(() => {
        let frame: number;
        let last: number;
        const animate = (time: number) => {
            if (last) {
                const delta = time - last;
                const kmPerMs = (1 / 60000) * animSpeed;
                setProgress(prev => {
                    const next = prev + kmPerMs * delta;
                    if (next >= track.distance) { 
                        setIsAnimating(false); 
                        return track.distance; 
                    }
                    return next;
                });
            }
            last = time;
            if (isAnimating) frame = requestAnimationFrame(animate);
        };
        if (isAnimating) {
            // Se l'animazione parte ed eravamo alla fine, ricomincia da 0
            if (progress >= track.distance) setProgress(0);
            frame = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(frame);
    }, [isAnimating, animSpeed, track.distance]);

    const selectionStats = useMemo(() => {
        if (!selectedRange) return null;
        return calculateSegmentStats(track, selectedRange.startDistance, selectedRange.endDistance);
    }, [track, selectedRange]);

    const toggleSection = (key: keyof SectionState) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleZoneHighlight = (rangePoints: TrackPoint[] | null) => {
        setHighlightedSegments(rangePoints);
        if (rangePoints && rangePoints.length > 0) {
            setFitTrigger(prev => prev + 1);
        }
    };

    const sectionHeader = (title: string, key: keyof SectionState, icon?: string) => (
        <button 
            onClick={() => toggleSection(key)}
            className="w-full flex items-center justify-between py-3 border-b border-slate-800 group hover:bg-slate-900/50 px-2 transition-colors"
        >
            <div className="flex items-center gap-2">
                {icon && <span className="text-sm">{icon}</span>}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">{title}</span>
            </div>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                className={`w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-transform duration-300 ${sections[key] ? '' : '-rotate-90'}`}
            >
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
        </button>
    );

    const SidebarContent = (
        <div className="h-full w-full bg-slate-950 overflow-y-auto custom-scrollbar p-3 space-y-2">
            <div className="bg-slate-900/30 rounded-xl overflow-hidden">
                {sectionHeader("Sommario Sessione", "stats", "📊")}
                {sections.stats && <div className="p-3"><StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={() => {}} /></div>}
            </div>
            <div className="bg-slate-900/30 rounded-xl overflow-hidden">
                {sectionHeader("Record Personali", "records", "🏆")}
                {sections.records && <div className="p-3"><PersonalRecordsPanel track={track} /></div>}
            </div>
            <div className="bg-slate-900/30 rounded-xl overflow-hidden">
                {sectionHeader("Zone Cardio", "zones", "❤️")}
                {sections.zones && <div className="p-3"><HeartRateZonePanel track={track} userProfile={userProfile} onZoneSelect={handleZoneHighlight} /></div>}
            </div>
            <div className="bg-slate-900/30 rounded-xl overflow-hidden border border-slate-800/50">
                {sectionHeader("Metadati & Feedback", "metadata", "📝")}
                {sections.metadata && (
                    <div className="p-4 space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 block mb-1 uppercase">Sforzo (RPE 1-10)</label>
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
                                <label className="text-[9px] font-black text-slate-500 block mb-1 uppercase">Scarpa usata</label>
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
                            <label className="text-[9px] font-black text-slate-500 block mb-1 uppercase">Note Attività</label>
                            <textarea 
                                value={track.notes || ''} 
                                onChange={(e) => onUpdateTrackMetadata?.(track.id, { notes: e.target.value })}
                                placeholder="Come ti sei sentito? Meteo? Dolori?"
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white h-20 resize-none outline-none focus:border-cyan-500/50 font-medium"
                            />
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-slate-900/30 rounded-xl overflow-hidden">
                {sectionHeader("Analisi Segmenti AI", "aiSegments", "🔍")}
                {sections.aiSegments && <div className="p-3"><GeminiSegmentsPanel track={track} stats={stats} userProfile={userProfile} onSegmentSelect={() => {}} selectedSegment={null} onCheckAiAccess={onCheckAiAccess} /></div>}
            </div>
            <div className="bg-slate-900/30 rounded-xl overflow-hidden">
                {sectionHeader("Coach AI Deep Dive", "aiAnalysis", "🧠")}
                {sections.aiAnalysis && <div className="p-3"><GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onAddPlannedWorkout={onAddPlannedWorkout} onUpdateTrackMetadata={onUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} /></div>}
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden ${layout === 'cinema' ? 'z-[20000]' : 'z-[10000]'}`}>
            <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center gap-2 sm:gap-4 z-[60] shrink-0 shadow-xl">
                <button onClick={onExit} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl active:scale-95 transition-all shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-300"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                </button>
                
                <div className="flex-grow flex items-center justify-center gap-2 sm:gap-3 px-2 border-l border-r border-slate-800 max-w-2xl">
                    <button 
                        onClick={() => setIsAnimating(!isAnimating)} 
                        className="w-8 h-8 sm:w-9 sm:h-9 bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center justify-center transition-colors shadow-lg active:scale-90"
                        title={isAnimating ? "Pausa" : "Riproduci"}
                    >
                        {isAnimating ? '⏸' : '▶'}
                    </button>
                    <div className="flex-grow group relative h-6 flex items-center">
                        <input 
                            type="range" min="0" max={track.distance} step="0.01" value={progress} 
                            onChange={e => setProgress(parseFloat(e.target.value))} 
                            className="w-full h-1.5 accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer" 
                        />
                    </div>
                    <select value={animSpeed} onChange={e => setAnimSpeed(parseInt(e.target.value))} className="bg-slate-800 text-[9px] font-black p-1 rounded uppercase border border-slate-700 outline-none">
                        <option value="5">5x</option>
                        <option value="15">15x</option>
                        <option value="50">50x</option>
                    </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl shadow-inner shrink-0">
                    <button onClick={() => setLayout('dashboard')} className={`px-2 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase transition-all ${layout === 'dashboard' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>Pannello</button>
                    <button onClick={() => setLayout('cinema')} className={`px-2 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase transition-all ${layout === 'cinema' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>Cinema</button>
                </div>
            </header>

            {/* Toolbar Gradienti (Novità) */}
            <div className="bg-slate-900 border-b border-slate-800 flex justify-center p-1 gap-1">
                {[
                    {id: 'none', label: 'Base'},
                    {id: 'elevation', label: 'Altitudine'},
                    {id: 'pace', label: 'Passo'},
                    {id: 'hr', label: 'Cardio'}
                ].map(m => (
                    <button 
                        key={m.id} onClick={() => setMapMetric(m.id)}
                        className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all border ${mapMetric === m.id ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'}`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {selectionStats && (
                <div className="bg-cyan-600 text-white py-1 px-4 flex items-center justify-between animate-fade-in-down z-[55] shadow-lg shrink-0">
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter">
                        <span className="bg-cyan-700 px-2 py-0.5 rounded">{(selectedRange?.endDistance! - selectedRange?.startDistance!).toFixed(2)} km</span>
                        <span>⏱️ {Math.floor(selectionStats.duration / 60000)}m</span>
                        <span>⚡ {((selectionStats.duration / 60000) / selectionStats.distance).toFixed(2)} /km</span>
                    </div>
                    <button onClick={() => setSelectedRange(null)} className="text-white hover:bg-cyan-500 px-2 rounded">&times;</button>
                </div>
            )}

            <main className="flex-grow relative overflow-hidden">
                {layout !== 'cinema' ? (
                    isMobile ? (
                        <div className="flex flex-col h-full w-full overflow-hidden">
                            <div className="flex-[0.45] overflow-y-auto bg-slate-950 border-b border-slate-800">
                                {SidebarContent}
                            </div>
                            
                            <div className="flex-[0.35] relative border-b border-slate-800">
                                <MapDisplay 
                                    tracks={[track]} visibleTrackIds={new Set([track.id])} 
                                    animationTrack={track} animationProgress={progress} 
                                    isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger}
                                    raceRunners={null} hoveredTrackId={null} runnerSpeeds={new Map()}
                                    selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments}
                                    mapGradientMetric={mapMetric}
                                />
                            </div>

                            <div className="flex-[0.2] bg-slate-900/40 p-2">
                                <TimelineChart 
                                    track={track} yAxisMetrics={['pace', 'hr']} 
                                    onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} 
                                    onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} 
                                    animationProgress={progress} isAnimating={isAnimating} 
                                    userProfile={userProfile}
                                />
                            </div>
                        </div>
                    ) : (
                        <ResizablePanel direction="vertical" initialSizeRatio={0.3} minSize={320}>
                            {SidebarContent}
                            <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
                                 <div className="flex-grow relative min-h-[300px]">
                                    <MapDisplay 
                                        tracks={[track]} visibleTrackIds={new Set([track.id])} 
                                        animationTrack={track} animationProgress={progress} 
                                        isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger}
                                        raceRunners={null} hoveredTrackId={null} runnerSpeeds={new Map()}
                                        selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments}
                                        mapGradientMetric={mapMetric}
                                    />
                                 </div>
                                 <div className="h-[180px] shrink-0 border-t border-slate-800/80 p-2 bg-slate-900/40 backdrop-blur-sm z-10">
                                    <TimelineChart 
                                        track={track} yAxisMetrics={['pace', 'hr', 'elevation']} 
                                        onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} 
                                        onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} 
                                        animationProgress={progress} isAnimating={isAnimating} 
                                        userProfile={userProfile}
                                    />
                                 </div>
                            </div>
                        </ResizablePanel>
                    )
                ) : (
                    <div className="flex-grow relative h-full">
                        <MapDisplay 
                            tracks={[track]} visibleTrackIds={new Set([track.id])} 
                            animationTrack={track} animationProgress={progress} 
                            isAnimationPlaying={isAnimating} fitBoundsCounter={fitTrigger}
                            raceRunners={null} hoveredTrackId={null} runnerSpeeds={new Map()}
                            selectionPoints={selectedRange ? getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance) : highlightedSegments}
                            mapGradientMetric={mapMetric}
                        />
                        <div className="absolute bottom-6 left-2 right-2 sm:left-6 sm:right-6 h-28 sm:h-32 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 sm:p-4 z-[4000] shadow-2xl">
                            <TimelineChart 
                                track={track} yAxisMetrics={['pace', 'hr']} 
                                onChartHover={setHoveredPoint} hoveredPoint={hoveredPoint} 
                                onSelectionChange={setSelectedRange} showPauses={false} pauseSegments={[]} 
                                animationProgress={progress} isAnimating={isAnimating} 
                                userProfile={userProfile}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TrackDetailView;
