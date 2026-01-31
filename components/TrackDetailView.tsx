
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
import { getPointsInDistanceRange } from '../services/trackEditorUtils';
import { generateAiRating } from '../services/aiHelper';
import { uploadGpxToStrava, isStravaConnected } from '../services/stravaService';
import { generateGpxContent } from '../services/exportService';

interface TrackDetailViewProps {
    track: Track;
    userProfile: UserProfile;
    onExit: () => void;
    onEdit?: () => void; 
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
    onOpenProfile?: () => void; 
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <768);
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

const ReplayIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Z" clipRule="evenodd" /><path fillRule="evenodd" d="M13.485 1.431a.75.75 0 0 0-1.449.39 5.5 5.5 0 0 1 9.201 2.466l.312-.311h-2.433a.75.75 0 0 0 .75-.75V.484a.75.75 0 0 0-1.5 0v2.43l-.31-.31a7 7 0 0 0-11.712-3.138Z" clipRule="evenodd" /></svg>);
const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const TrackDetailView: React.FC<TrackDetailViewProps> = (props) => {
    const { track, userProfile, onExit, allHistory = [], plannedWorkouts = [], onUpdateTrackMetadata, onAddPlannedWorkout, onStartAnimation, onOpenReview, autoOpenAi, onCheckAiAccess, isGuest, onLimitReached, onOpenProfile } = props;
    
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [mapGradientMetric, setMapGradientMetric] = useState<string>('none');
    const [layout, setLayout] = useState<LayoutType>(() => (localStorage.getItem('runcoach-layout') as LayoutType) || 'classic');
    const [isSharing, setIsSharing] = useState(false);
    const [isStravaUploading, setIsStravaUploading] = useState(false);

    const isMobile = useIsMobile();
    const stats = useMemo(() => calculateTrackStats(track), [track]);

    const handleUploadToStrava = async () => {
        if (!isStravaConnected()) {
            alert("Collega prima il tuo account Strava dalle impostazioni (Dati -> Sincronizza Strava).");
            return;
        }

        setIsStravaUploading(true);
        try {
            const gpx = generateGpxContent(track);
            await uploadGpxToStrava(gpx, track.name, track.activityType || 'run');
            alert("Attività inviata a Strava! Sarà visibile sul tuo profilo tra pochi istanti.");
        } catch (e: any) {
            alert("Errore durante l'invio: " + e.message);
        } finally {
            setIsStravaUploading(false);
        }
    };

    const handleSegmentSelect = (segment: Split | PauseSegment | AiSegment | null) => {
        setSelectedSegment(segment);
        if (!segment) setHoveredPoint(null);
    };

    const toggleYMetric = (m: YAxisMetric) => {
        setYAxisMetrics(prev => prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m]);
    };

    const hasHr = useMemo(() => track.points.some(p => p.hr && p.hr > 0), [track]);

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden">
            {/* Header */}
            <header className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onExit} className="p-2 hover:bg-slate-800 rounded-full transition-colors">&larr;</button>
                    <div>
                        <h2 className="text-sm sm:text-lg font-black truncate max-w-[150px] sm:max-w-md">{track.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">{new Date(track.points[0].time).toLocaleDateString()}</span>
                            <RatingStars rating={track.rating} reason={track.ratingReason} size="xs" onDetailClick={() => track.id && onOpenReview?.(track.id)} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isStravaConnected() && (
                        <button 
                            onClick={handleUploadToStrava}
                            disabled={isStravaUploading}
                            className="bg-[#fc4c02]/10 hover:bg-[#fc4c02]/20 text-[#fc4c02] px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center transition-all border border-[#fc4c02]/30 disabled:opacity-50"
                        >
                            <StravaIcon />
                            {isStravaUploading ? 'Invio...' : 'Invia a Strava'}
                        </button>
                    )}
                    <button 
                        onClick={() => onStartAnimation?.(track.id)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center shadow-lg transition-all"
                    >
                        <ReplayIcon /> Replay
                    </button>
                </div>
            </header>

            <main className="flex-grow overflow-hidden relative">
                <div className="h-full w-full flex flex-col md:flex-row">
                    <div className="w-full md:w-1/3 p-4 overflow-y-auto custom-scrollbar border-r border-slate-800">
                        <StatsPanel stats={stats} selectedSegment={selectedSegment} onSegmentSelect={handleSegmentSelect} />
                        <HeartRateZonePanel track={track} userProfile={userProfile} />
                        <PersonalRecordsPanel track={track} />
                        <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onUpdateTrackMetadata={onUpdateTrackMetadata} onAddPlannedWorkout={onAddPlannedWorkout} startOpen={autoOpenAi} onCheckAiAccess={onCheckAiAccess} />
                        <GeminiSegmentsPanel track={track} stats={stats} onSegmentSelect={setSelectedSegment} selectedSegment={selectedSegment as AiSegment} onCheckAiAccess={onCheckAiAccess} />
                    </div>
                    
                    <div className="flex-grow flex flex-col overflow-hidden">
                        <div className="flex-grow relative">
                            <MapDisplay 
                                tracks={[track]} 
                                visibleTrackIds={new Set([track.id])} 
                                raceRunners={null} 
                                runnerSpeeds={new Map()} 
                                hoveredTrackId={null} 
                                aiSegmentHighlight={selectedSegment as AiSegment}
                            />
                        </div>
                        <div className="h-48 sm:h-64 border-t border-slate-800 bg-slate-900 p-2">
                             <TimelineChart 
                                track={track} 
                                yAxisMetrics={yAxisMetrics} 
                                onChartHover={setHoveredPoint} 
                                hoveredPoint={hoveredPoint} 
                                onSelectionChange={() => {}} 
                                pauseSegments={stats.pauses} 
                                showPauses={true}
                                userProfile={userProfile}
                             />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TrackDetailView;
