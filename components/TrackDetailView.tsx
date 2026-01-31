
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

// Fix: Removed local declaration of 'YAxisMetric' as it conflicts with the import from './TimelineChart'

const ReplayIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Z" clipRule="evenodd" /><path fillRule="evenodd" d="M13.485 1.431a.75.75 0 0 0-1.449.39 5.5 5.5 0 0 1 9.201 2.466l.312-.311h-2.433a.75.75 0 0 0 .75-.75V.484a.75.75 0 0 0-1.5 0v2.43l-.31-.31a7 7 0 0 0-11.712-3.138Z" clipRule="evenodd" /></svg>);
const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const ShoeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 text-slate-400">
        <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Zm6.94 3.7a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Zm-6.94 3.7a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Z" clipRule="evenodd" />
    </svg>
);

const TrackDetailView: React.FC<TrackDetailViewProps> = (props) => {
    const { track, userProfile, onExit, allHistory = [], plannedWorkouts = [], onUpdateTrackMetadata, onAddPlannedWorkout, onStartAnimation, onOpenReview, autoOpenAi, onCheckAiAccess, isGuest, onLimitReached, onOpenProfile } = props;
    
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [isStravaUploading, setIsStravaUploading] = useState(false);

    // Edit states for new fields
    const [localNotes, setLocalNotes] = useState(track.notes || '');
    const notesTimeoutRef = useRef<number | null>(null);

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

    const handleRpeChange = (val: number) => {
        onUpdateTrackMetadata?.(track.id, { rpe: val });
    };

    const handleShoeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdateTrackMetadata?.(track.id, { shoe: e.target.value });
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalNotes(val);
        
        if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
        notesTimeoutRef.current = window.setTimeout(() => {
            onUpdateTrackMetadata?.(track.id, { notes: val });
        }, 1000);
    };

    const getRpeColor = (val: number) => {
        if (val <= 2) return 'bg-cyan-500';
        if (val <= 4) return 'bg-green-500';
        if (val <= 6) return 'bg-yellow-500';
        if (val <= 8) return 'bg-orange-500';
        return 'bg-red-500';
    };

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
                        
                        {/* Nuova Sezione Feedback Post Corsa */}
                        <div className="mt-6 border-t border-slate-700 pt-6 space-y-6">
                            <div>
                                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-4">Diario Post-Corsa</h3>
                                
                                {/* RPE scale */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Sforzo Percepito (RPE)</label>
                                        {track.rpe && <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{track.rpe}/10</span>}
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => handleRpeChange(val)}
                                                className={`flex-1 h-8 rounded text-[10px] font-black transition-all ${
                                                    track.rpe === val 
                                                        ? `${getRpeColor(val)} text-white shadow-[0_0_10px_rgba(255,255,255,0.2)] scale-110 z-10 ring-2 ring-white/50` 
                                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                                }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-1 px-1">
                                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Molto Facile</span>
                                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Massimale</span>
                                    </div>
                                </div>

                                {/* Gear selection */}
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Scarpa Utilizzata</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <ShoeIcon />
                                        </div>
                                        <select 
                                            value={track.shoe || ''}
                                            onChange={handleShoeChange}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none appearance-none cursor-pointer hover:bg-slate-750 transition-colors"
                                        >
                                            <option value="">Nessuna scarpa selezionata</option>
                                            {(userProfile.shoes || []).map((shoe, idx) => (
                                                <option key={idx} value={shoe}>{shoe}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                            <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Note dell'Atleta (Lette dall'AI)</label>
                                    <textarea 
                                        value={localNotes}
                                        onChange={handleNotesChange}
                                        placeholder="Come ti sei sentito oggi? C'era vento? Dolori particolari?"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 outline-none resize-none h-24 transition-all"
                                    />
                                    <p className="text-[9px] text-slate-500 mt-1 italic">Il Coach AI userà queste note per calibrare l'analisi.</p>
                                </div>
                            </div>
                        </div>

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
