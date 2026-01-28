import React, { useState, useMemo, useCallback } from 'react';
import { Track, TrackPoint, Split, PauseSegment, AiSegment, UserProfile, TrackStats, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import StatsPanel from './StatsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import WeatherPanel from './WeatherPanel';
import RatingStars from './RatingStars';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import ResizablePanel from './ResizablePanel';
import { calculateTrackStats, estimateTrackRPE } from '../services/trackStatsService';
import { findPauses } from '../services/trackEditorUtils';
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
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

const TrackDetailView: React.FC<TrackDetailViewProps> = ({ 
    track, 
    userProfile, 
    onExit, 
    allHistory = [], 
    plannedWorkouts = [], 
    onUpdateTrackMetadata, 
    onAddPlannedWorkout, 
    onStartAnimation, 
    onOpenReview, 
    autoOpenAi = false, 
    onCheckAiAccess, 
    isGuest = false, 
    onLimitReached 
}) => {
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [highlightedRange, setHighlightedRange] = useState<{ startDistance: number; endDistance: number } | null>(null);
    
    // Memoize stats to avoid recalculating on every render
    const stats = useMemo(() => calculateTrackStats(track), [track]);
    const isMobile = useIsMobile();

    const pauseSegments = useMemo(() => findPauses(track), [track]);

    // Handle Segment Selection from panels
    const handleSegmentSelect = useCallback((segment: Split | PauseSegment | AiSegment | null) => {
        setSelectedSegment(segment);
        if (segment) {
            if ('splitNumber' in segment) { // Split
                // Split logic: approximate range
                const start = (segment.splitNumber - 1); 
                const end = start + segment.distance;
                setHighlightedRange({ startDistance: start, endDistance: end });
            } else if ('startPoint' in segment) { // PauseSegment
                setHighlightedRange({ 
                    startDistance: segment.startPoint.cummulativeDistance, 
                    endDistance: segment.endPoint.cummulativeDistance 
                });
            } else { // AiSegment
                setHighlightedRange({ 
                    startDistance: segment.startDistance, 
                    endDistance: segment.endDistance 
                });
            }
        } else {
            setHighlightedRange(null);
        }
    }, []);

    const handleRating = (r: number) => {
        if (onUpdateTrackMetadata) {
            onUpdateTrackMetadata(track.id, { rating: r });
        }
    };

    const handleGenerateAiRating = async () => {
        if (onCheckAiAccess && !onCheckAiAccess()) return;
        
        if (onUpdateTrackMetadata) {
            const result = await generateAiRating(track, allHistory, userProfile, track.linkedWorkout);
            if (result) {
                onUpdateTrackMetadata(track.id, { rating: result.rating, ratingReason: result.reason });
            } else {
                // Fallback or error handling
            }
        }
    };

    const visibleTrackIds = useMemo(() => new Set([track.id]), [track.id]);

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-700 bg-slate-800 shadow-md shrink-0 gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button onClick={onExit} className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold truncate">{track.name}</h1>
                        <p className="text-xs text-slate-400 font-mono">
                            {new Date(track.points[0].time).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    {onStartAnimation && (
                        <button 
                            onClick={() => onStartAnimation(track.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase rounded-lg transition-colors shadow-lg active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                            Replay
                        </button>
                    )}
                    <div className="flex flex-col items-end">
                        {track.rating ? (
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onOpenReview && onOpenReview(track.id)}>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Voto Coach</span>
                                <RatingStars rating={track.rating} reason={track.ratingReason} size="sm" />
                            </div>
                        ) : (
                            <button 
                                onClick={handleGenerateAiRating} 
                                className="text-[10px] font-bold text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-500/10 transition-colors uppercase tracking-wider"
                            >
                                Calcola Voto AI
                            </button>
                        )}
                        {track.rpe && (
                            <div className="text-[10px] font-mono text-slate-500">RPE: <span className="text-slate-300 font-bold">{track.rpe}/10</span></div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content with Resizable Panel */}
            <div className="flex-grow overflow-hidden relative">
                <ResizablePanel 
                    direction={isMobile ? 'vertical' : 'horizontal'} 
                    initialSizeRatio={isMobile ? 0.5 : 0.3}
                    minSize={200}
                >
                    {/* Left/Top Panel: Stats & Analysis */}
                    <div className="h-full overflow-y-auto bg-slate-900 p-4 custom-scrollbar">
                        <StatsPanel 
                            stats={stats} 
                            selectedSegment={selectedSegment} 
                            onSegmentSelect={handleSegmentSelect} 
                        />
                        
                        <div className="mt-6">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1 mb-3">Analisi & Insight</h3>
                            
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

                            <HeartRateZonePanel track={track} userProfile={userProfile} />
                            
                            <GeminiSegmentsPanel 
                                track={track} 
                                stats={stats} 
                                onSegmentSelect={handleSegmentSelect} 
                                selectedSegment={selectedSegment as AiSegment}
                                onCheckAiAccess={onCheckAiAccess}
                            />
                            
                            <WeatherPanel track={track} />
                        </div>
                    </div>

                    {/* Right/Bottom Panel: Map & Graph */}
                    <div className="h-full flex flex-col relative bg-slate-950">
                        <div className="flex-grow relative">
                            <MapDisplay 
                                tracks={[track]}
                                visibleTrackIds={visibleTrackIds}
                                raceRunners={null}
                                hoveredTrackId={null}
                                runnerSpeeds={new Map()}
                                aiSegmentHighlight={selectedSegment && 'type' in selectedSegment ? selectedSegment : null}
                                hoveredPoint={hoveredPoint}
                                pauseSegments={pauseSegments}
                                showPauses={true}
                                mapGradientMetric="pace"
                                onPointClick={() => {}} 
                            />
                        </div>
                        <div className="h-48 shrink-0 bg-slate-900 border-t border-slate-700 relative p-2">
                             <div className="absolute top-2 right-2 z-10 flex gap-1">
                                {(['pace', 'elevation', 'hr', 'power'] as const).map(m => (
                                    <button 
                                        key={m}
                                        onClick={() => setYAxisMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${yAxisMetrics.includes(m) ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                             </div>
                             <TimelineChart 
                                track={track} 
                                onSelectionChange={() => {}}
                                yAxisMetrics={yAxisMetrics}
                                onChartHover={setHoveredPoint}
                                hoveredPoint={hoveredPoint}
                                showPauses={true}
                                pauseSegments={pauseSegments}
                                highlightedRange={highlightedRange}
                                userProfile={userProfile}
                             />
                        </div>
                    </div>
                </ResizablePanel>
            </div>
        </div>
    );
};

export default TrackDetailView;
