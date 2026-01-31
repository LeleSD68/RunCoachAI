
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Track, TrackPoint, Split, PauseSegment, AiSegment, UserProfile, TrackStats, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import RatingStars from './RatingStars';
import { calculateTrackStats } from '../services/trackStatsService';
import { getPointsInDistanceRange, calculateSegmentStats } from '../services/trackEditorUtils';
import { generateAiRating } from '../services/aiHelper';
import { uploadGpxToStrava, isStravaConnected } from '../services/stravaService';
import { generateGpxContent } from '../services/exportService';

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
}

const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

const formatPace = (p: number) => {
    if (!p) return '-:--';
    const m = Math.floor(p);
    return `${m}:${Math.round((p-m)*60).toString().padStart(2, '0')}`;
};

const TrackDetailView: React.FC<TrackDetailViewProps> = (props) => {
    const { track, userProfile, onExit, allHistory = [], plannedWorkouts = [], onUpdateTrackMetadata, onAddPlannedWorkout, onStartAnimation, onOpenReview, autoOpenAi, onCheckAiAccess } = props;
    
    const [selectedRange, setSelectedRange] = useState<{startDistance: number, endDistance: number} | null>(null);
    const [mapMetric, setMapMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power'>('none');
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [isRatingLoading, setIsRatingLoading] = useState(false);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    const segmentStats = useMemo(() => {
        if (!selectedRange) return null;
        return calculateSegmentStats(track, selectedRange.startDistance, selectedRange.endDistance);
    }, [selectedRange, track]);

    const selectionPoints = useMemo(() => {
        if (!selectedRange) return null;
        return getPointsInDistanceRange(track, selectedRange.startDistance, selectedRange.endDistance);
    }, [selectedRange, track]);

    const handleSplitSelect = (split: Split | null) => {
        if (!split) {
            setSelectedRange(null);
            return;
        }
        const start = split.splitNumber - 1;
        const end = Math.min(track.distance, split.splitNumber);
        setSelectedRange({ startDistance: start, endDistance: end });
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white font-sans overflow-hidden">
            <header className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onExit} className="p-2 hover:bg-slate-800 rounded-full transition-colors">&larr;</button>
                    <div>
                        <h2 className="text-lg font-black">{track.name}</h2>
                        <div className="flex items-center gap-2">
                             <select 
                                value={mapMetric} 
                                onChange={(e) => setMapMetric(e.target.value as any)}
                                className="bg-slate-800 border border-slate-700 rounded text-[10px] font-bold uppercase px-2 py-0.5 outline-none focus:border-cyan-500"
                             >
                                <option value="none">Colore Default</option>
                                <option value="pace">Gradiente Ritmo</option>
                                <option value="hr">Gradiente FC</option>
                                <option value="hr_zones">Zone Cardio (Z1-Z5)</option>
                                <option value="elevation">Gradiente Altitudine</option>
                             </select>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => onStartAnimation?.(track.id)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase shadow-lg transition-all">Replay 3D</button>
                </div>
            </header>

            <main className="flex-grow overflow-hidden relative flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 p-4 overflow-y-auto custom-scrollbar border-r border-slate-800">
                    <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={(s) => handleSplitSelect(s as Split)} />
                    
                    {segmentStats && (
                        <div className="mt-6 bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4 animate-fade-in-down">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest">Dettaglio Selezione</h3>
                                <button onClick={() => setSelectedRange(null)} className="text-slate-500 hover:text-white">&times;</button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase font-bold">Distanza</p>
                                    <p className="text-lg font-mono font-bold">{segmentStats.distance.toFixed(2)} km</p>
                                </div>
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase font-bold">Tempo</p>
                                    <p className="text-lg font-mono font-bold">{formatDuration(segmentStats.duration)}</p>
                                </div>
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase font-bold">Ritmo Medio</p>
                                    <p className="text-lg font-mono font-bold text-cyan-400">{formatPace(segmentStats.pace)}</p>
                                </div>
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase font-bold">Dislivello</p>
                                    <p className="text-lg font-mono font-bold text-amber-400">+{Math.round(segmentStats.elevationGain)} m</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <HeartRateZonePanel track={track} userProfile={userProfile} />
                    <PersonalRecordsPanel track={track} />
                    <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} plannedWorkouts={plannedWorkouts} allHistory={allHistory} onUpdateTrackMetadata={onUpdateTrackMetadata} onAddPlannedWorkout={onAddPlannedWorkout} startOpen={autoOpenAi} onCheckAiAccess={onCheckAiAccess} />
                </div>
                
                <div className="flex-grow flex flex-col overflow-hidden relative">
                    <div className="flex-grow relative">
                        <MapDisplay 
                            tracks={[track]} 
                            visibleTrackIds={new Set([track.id])} 
                            raceRunners={null} 
                            runnerSpeeds={new Map()} 
                            hoveredTrackId={null} 
                            mapGradientMetric={mapMetric}
                            selectionPoints={selectionPoints}
                            hoveredPoint={hoveredPoint}
                        />
                    </div>
                    <div className="h-64 border-t border-slate-800 bg-slate-900 p-2">
                        <TimelineChart 
                            track={track} 
                            yAxisMetrics={['pace', 'elevation', 'hr']} 
                            onChartHover={setHoveredPoint} 
                            hoveredPoint={hoveredPoint} 
                            onSelectionChange={setSelectedRange}
                            highlightedRange={selectedRange}
                            showPauses={false}
                            pauseSegments={[]}
                            userProfile={userProfile}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TrackDetailView;
