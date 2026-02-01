


import React, { useState, useCallback } from 'react';
import { Type } from '@google/genai';
import { Track, TrackStats, AiSegment, UserProfile } from '../types';
import { calculateSegmentStats } from '../services/trackEditorUtils';
import { getGenAI, retryWithPolicy, samplePointsForAi } from '../services/aiHelper';

interface GeminiSegmentsPanelProps {
    track: Track;
    stats: TrackStats;
    userProfile: UserProfile;
    onSegmentSelect: (segment: AiSegment | null) => void;
    selectedSegment: AiSegment | null;
    onCheckAiAccess?: () => boolean; 
}

const formatDuration = (ms: number) => {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round((totalSeconds % 3600) / 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const GeminiSegmentsPanel: React.FC<GeminiSegmentsPanelProps> = ({ track, stats, userProfile, onSegmentSelect, selectedSegment, onCheckAiAccess }) => {
    const [segments, setSegments] = useState<AiSegment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [wasAnalyzed, setWasAnalyzed] = useState(false);

    const handleAnalyze = useCallback(async () => {
        if (onCheckAiAccess && !onCheckAiAccess()) return;

        setIsLoading(true);
        setError('');
        setSegments([]);
        setWasAnalyzed(true);

        // OPTIMIZATION: Sampling points to save tokens
        const sampledPoints = samplePointsForAi(track.points, userProfile.powerSaveMode);

        const prompt = `Sei un esperto allenatore di corsa. Identifica 3-5 segmenti interessanti dai dati forniti. Rispondi SOLO JSON array.
        
Dati traccia (${track.distance.toFixed(2)} km, +${Math.round(stats.elevationGain)}m):
Punti campionati (distanza, quota, fc): ${JSON.stringify(sampledPoints)}
`;

        try {
            const call = async () => {
                const ai = getGenAI();
                return await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    startDistance: { type: Type.NUMBER },
                                    endDistance: { type: Type.NUMBER },
                                },
                                required: ['title', 'description', 'startDistance', 'endDistance'],
                            }
                        },
                    },
                });
            };
            
            const response = await retryWithPolicy(call);
            // Fixed: Cast window to any when calling addTokens to resolve TypeScript error
            if (response.usageMetadata?.totalTokenCount) (window as any).gpxApp?.addTokens(response.usageMetadata.totalTokenCount);
            
            const jsonStr = (response.text || '').trim();
            const rawSegments = JSON.parse(jsonStr);

            const processedSegments: AiSegment[] = rawSegments.map((s: any) => {
                const segmentStats = calculateSegmentStats(track, s.startDistance, s.endDistance);
                /**
                 * Fix: Added explicit type cast to AiSegment. The updated interface now includes 
                 * properties from segmentStats (distance, duration, etc.) used in the component.
                 */
                return {
                    type: 'ai',
                    title: s.title,
                    description: s.description,
                    startDistance: s.startDistance,
                    endDistance: s.endDistance,
                    ...segmentStats
                } as AiSegment;
            }).filter((s: AiSegment) => s.distance > 0);

            setSegments(processedSegments);
        } catch (e) {
            setError('Impossibile analizzare i segmenti.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [track, stats, onCheckAiAccess, userProfile.powerSaveMode]);

    const handleSegmentClick = (segment: AiSegment) => {
        if (selectedSegment && selectedSegment.title === segment.title && selectedSegment.startDistance === segment.startDistance) {
            onSegmentSelect(null);
        } else {
            onSegmentSelect(segment);
        }
    };

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Segmenti Chiave (AI)</h3>
            
            {!wasAnalyzed && (
                 <button 
                    onClick={handleAnalyze} 
                    disabled={isLoading}
                    className="w-full flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                 >
                    <SparklesIcon />
                    Trova i miei segmenti migliori
                 </button>
            )}

            {isLoading && (
                <div className="flex items-center justify-center text-slate-400 py-4">
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Analisi in corso...
                </div>
            )}

            {error && <p className="text-sm text-red-400 text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
            
            {segments.length > 0 && (
                <div className="space-y-3 mt-3">
                    {segments.map((segment, index) => {
                        const isSelected = selectedSegment?.startDistance === segment.startDistance && selectedSegment?.endDistance === segment.endDistance;
                        return (
                            <div 
                                key={index} 
                                onClick={() => handleSegmentClick(segment)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected ? 'bg-sky-500/20 border-sky-500' : 'bg-slate-700/50 border-slate-600 hover:border-sky-600'}`}
                            >
                                <h4 className="font-bold text-slate-100">{segment.title}</h4>
                                <p className="text-xs text-slate-400 mt-1">{segment.description}</p>
                                <div className="mt-2 pt-2 border-t border-slate-600/50 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs font-mono">
                                    <div><span className="text-slate-500">Dist:</span> {segment.distance.toFixed(2)}km</div>
                                    <div><span className="text-slate-500">Pace:</span> {formatPace(segment.pace)}</div>
                                    <div><span className="text-slate-500">Time:</span> {formatDuration(segment.duration)}</div>
                                    <div><span className="text-slate-500">Gain:</span> +{segment.elevationGain.toFixed(0)}m</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GeminiSegmentsPanel;
