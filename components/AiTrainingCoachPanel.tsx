
import React, { useState, useEffect } from 'react';
import { Type } from '@google/genai';
import { Track, TrackStats, UserProfile, PlannedWorkout, ActivityType, WorkoutPhase } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';
import FormattedAnalysis from './FormattedAnalysis';
import { getGenAI, retryWithPolicy } from '../services/aiHelper';

interface AiTrainingCoachPanelProps {
    track?: Track;
    stats?: TrackStats;
    userProfile: UserProfile;
    allHistory: Track[];
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    onDeletePlannedWorkout?: (id: string) => void; 
    plannedWorkouts?: PlannedWorkout[]; 
    isCompact?: boolean;
    layoutMode?: 'vertical' | 'horizontal';
    targetDate?: Date; 
    onCheckAiAccess?: (feature: 'workout' | 'analysis' | 'chat') => boolean; 
    onStartWorkout?: (workout: PlannedWorkout | null) => void; 
}

type GenerationMode = 'today' | 'next2' | 'weekly' | 'specific';

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}'${s > 0 ? s + '"' : ''}`;
};

const getPhaseIcon = (type: string) => {
    switch (type) {
        case 'warmup': return '🔥';
        case 'work': return '⚡';
        case 'rest': return '💤';
        case 'cooldown': return '❄️';
        default: return '🏃';
    }
};

const formatPhaseText = (p: any) => {
    const target = p.targetType === 'time' ? formatTime(p.targetValue) : `${(p.targetValue < 1000 ? p.targetValue + 'm' : (p.targetValue/1000).toFixed(2) + 'km')}`;
    const pace = p.paceTarget ? `@ ${formatPace(p.paceTarget/60)}/km` : '';
    return `${getPhaseIcon(p.type)} ${p.description || p.type} (${target}) ${pace}`;
};

const HeadsetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75v5.25c0 .621.504 1.125 1.125 1.125h2.25c1.243 0 2.25-1.007 2.25-2.25v-4.5c0-1.243-1.007-2.25-2.25-2.25h-1.5v-2.625a7.5 7.5 0 0 1 15 0v2.625h-1.5c-1.243 0-2.25 1.007-2.25 2.25v4.5c0 1.243 1.007 2.25 2.25 2.25h2.25c.621 0 1.125-.504 1.125-1.125v-5.25c0-5.385-4.365-9.75-9.75-9.75Z" clipRule="evenodd" />
    </svg>
);

const HumanCoachCTA = () => (
    <div className="mt-4 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group cursor-pointer hover:border-amber-500/50 transition-all">
        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10 flex items-center gap-3">
            <div className="bg-amber-500/20 p-2 rounded-full text-amber-400 text-xl">🎓</div>
            <div>
                <h4 className="text-sm font-bold text-white leading-none mb-1">Vuoi di più?</h4>
                <p className="text-[10px] text-slate-400 leading-tight">Ottieni una scheda su misura da un<br/><strong>Coach Umano Certificato</strong>.</p>
            </div>
        </div>
        <button 
            onClick={() => alert("Funzionalità Premium: verrai reindirizzato al modulo di contatto dei nostri Coach Partner.")}
            className="relative z-10 bg-white text-slate-900 font-bold text-[10px] uppercase px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors shadow-md"
        >
            Richiedi Info
        </button>
    </div>
);

const AiTrainingCoachPanel: React.FC<AiTrainingCoachPanelProps> = ({ 
    track, stats, userProfile, allHistory, onAddPlannedWorkout, onDeletePlannedWorkout, plannedWorkouts = [], isCompact, layoutMode = 'vertical', targetDate, onCheckAiAccess, onStartWorkout
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [savedIndex, setSavedIndex] = useState<number | null>(null);
    
    const [genMode, setGenMode] = useState<GenerationMode>('today');
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([1, 3, 5]));

    useEffect(() => {
        if (targetDate) {
            setGenMode('specific');
        }
    }, [targetDate]);

    const handleGenerateProgram = async () => {
        if (onCheckAiAccess && !onCheckAiAccess('workout')) return;

        setIsGenerating(true);
        setError('');
        setSuggestions([]);
        
        (window as any).gpxApp?.trackApiRequest();

        try {
            const call = async () => {
                const ai = getGenAI();
                const userName = userProfile.name || 'Atleta';
                
                const referenceDate = targetDate || new Date();
                const referenceDateStr = referenceDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                const contextEntries = plannedWorkouts
                    .filter(w => new Date(w.date) >= new Date(new Date().setHours(0,0,0,0)))
                    .map(w => {
                        const date = new Date(w.date).toISOString().split('T')[0];
                        if (w.entryType === 'note') return `[NOTA ${date}]: ${w.description}`;
                        if (w.entryType === 'commitment') return `[IMPEGNO ${date}]: dalle ${w.startTime} alle ${w.endTime} - ${w.title}`;
                        return `[PIANO ${date}]: ${w.activityType} "${w.title}"`;
                    }).join('\n');

                const goalsStr = userProfile.goals?.length ? userProfile.goals.join(', ') : 'Salute Generale';
                
                const sortedHistory = [...allHistory].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
                const lastRun = sortedHistory[0];
                
                let lastRunInfo = lastRun ? `Ultima corsa: ${lastRun.distance.toFixed(1)} km il ${lastRun.points[0].time.toLocaleDateString()}.` : "Nessuna corsa recente.";

                const last3Runs = sortedHistory.slice(0, 3).map(t => {
                    const s = calculateTrackStats(t);
                    return `- ${t.points[0].time.toLocaleDateString()} (${t.activityType || 'Corsa'}): ${t.distance.toFixed(1)}km a ${formatPace(s.movingAvgPace)}/km.`;
                }).join('\n');

                let taskDescription = "";
                if (targetDate || genMode === 'today' || genMode === 'specific') {
                    taskDescription = `Proponi 1 allenamento specifico per il giorno: ${referenceDateStr}.`;
                } else if (genMode === 'next2') {
                    taskDescription = "Proponi 2 allenamenti per i prossimi giorni disponibili.";
                } else if (genMode === 'weekly') {
                    taskDescription = `Pianifica la settimana per i giorni: ${Array.from(selectedDays).map((d: number) => DAYS_SHORT[d as number]).join(', ')}.`;
                }

                const prompt = `Sei un Running Coach Professionale.
                
                STILE: Italiano tecnico, sintetico.
                PROFILO: Nome ${userName}, Obiettivi: ${goalsStr}.
                
                STORICO RECENTE:
                ${lastRunInfo}
                ${last3Runs}
                
                CONTESTO DIARIO (IMPEGNI/NOTE/PIANI):
                ${contextEntries || "Nessun impegno o nota."}

                COMPITO:
                ${taskDescription}
                
                IMPORTANTE: DEVI fornire una "structuredMenu" (array di fasi) che il Virtual Coach userà per guidare vocalmente l'atleta.
                Esempio logica: Se l'allenamento è "5km a 6:20/km" -> targetType: "distance", targetValue: 5000, paceTarget: 380 (secondi/km).
                
                Struttura JSON richiesta per ogni allenamento:
                [{
                    "title": string,
                    "activityType": "Lento"|"Fartlek"|"Ripetute"|"Lungo"|"Gara"|"Recupero",
                    "date": "YYYY-MM-DD",
                    "structure": "Sintesi testuale molto breve (es. '10k Progressivo')",
                    "description": "Descrizione motivazionale/tecnica discorsiva.",
                    "estimatedDuration": string,
                    "estimatedDistance": string,
                    "targetHeartRate": string,
                    "conflictReasoning": "Motivazione scelta",
                    "workoutPhases": [ 
                       { "type": "warmup"|"work"|"rest"|"cooldown", "targetType": "time"|"distance", "targetValue": number (sec o metri), "paceTarget": number (sec/km, opzionale), "description": string (es. '1km a 5:00') }
                    ]
                }]`;

                return await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    activityType: { type: Type.STRING },
                                    date: { type: Type.STRING },
                                    structure: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    estimatedDuration: { type: Type.STRING },
                                    estimatedDistance: { type: Type.STRING },
                                    targetHeartRate: { type: Type.STRING },
                                    conflictReasoning: { type: Type.STRING },
                                    workoutPhases: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                type: { type: Type.STRING, enum: ['warmup', 'work', 'rest', 'cooldown'] },
                                                targetType: { type: Type.STRING, enum: ['time', 'distance'] },
                                                targetValue: { type: Type.NUMBER, description: "Seconds for time, Meters for distance" },
                                                paceTarget: { type: Type.NUMBER, description: "Target Pace in seconds per km (e.g. 300 for 5:00/km)" },
                                                description: { type: Type.STRING }
                                            },
                                            required: ['type', 'targetType', 'targetValue', 'description']
                                        }
                                    }
                                },
                                required: ['title', 'activityType', 'date', 'structure', 'description', 'estimatedDuration', 'estimatedDistance', 'targetHeartRate', 'workoutPhases']
                            }
                        }
                    }
                });
            };

            const response = await retryWithPolicy(call);
            const data = JSON.parse(response.text || '[]');
            setSuggestions(data);
            (window as any).gpxApp?.addTokens(response.usageMetadata?.totalTokenCount ?? 0);
        } catch (e) {
            console.error(e);
            setError("Il Coach AI non è riuscito ad analizzare il tuo diario.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImport = (suggestion: any, index: number) => {
        if (!onAddPlannedWorkout) return;
        
        // Convert structured phases back to readable text for the Description field
        // This ensures Calendar Exports and the Diary View show useful info even without the structured player
        let textualProgram = "";
        if (suggestion.workoutPhases && suggestion.workoutPhases.length > 0) {
            textualProgram = "\n\n**PROGRAMMA DETTAGLIATO:**\n" + suggestion.workoutPhases.map((p: any) => `- ${formatPhaseText(p)}`).join('\n');
        }

        const fullDescription = `${suggestion.description}\n\n**INFO:** ${suggestion.structure}\n**OBIETTIVO:** ${suggestion.targetHeartRate}${textualProgram}`;

        const entry: PlannedWorkout = {
            id: `ai-gen-${Date.now()}`,
            title: suggestion.title,
            description: fullDescription,
            date: new Date(suggestion.date),
            activityType: suggestion.activityType as ActivityType,
            isAiSuggested: true,
            entryType: 'workout',
            structure: suggestion.workoutPhases as WorkoutPhase[]
        };
        onAddPlannedWorkout(entry);
        setSavedIndex(index);
        setTimeout(() => setSavedIndex(null), 2000);
    };

    return (
        <div className="flex flex-col h-full">
            <div className={`p-2 flex-grow ${layoutMode === 'horizontal' ? 'flex flex-row overflow-x-auto gap-4' : 'space-y-4'}`}>
                {!suggestions.length && !isGenerating && (
                    <div className="text-center p-4 bg-slate-800/40 rounded-2xl border border-slate-700 min-w-[200px] flex flex-col justify-center">
                        <p className="text-sm text-slate-300 mb-4">Ottieni una scheda basata sui tuoi impegni e note.</p>
                        
                        <div className="space-y-3">
                            <button onClick={handleGenerateProgram} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95">
                                Genera Scheda Intelligente
                            </button>
                            
                            {onStartWorkout && (
                                <button 
                                    onClick={() => {
                                        if (onCheckAiAccess && !onCheckAiAccess('chat')) return;
                                        onStartWorkout(null); // Null triggers Free Run
                                    }}
                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <HeadsetIcon />
                                    Avvia Corsa Libera (Coach Live)
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {isGenerating && (
                    <div className="w-full text-center py-10 animate-pulse min-w-[200px]">
                        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-xs font-black text-slate-500 uppercase">Analisi impegni e note in corso...</p>
                    </div>
                )}

                {suggestions.map((s, i) => (
                    <div key={i} className="min-w-[280px] bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl animate-fade-in-up">
                        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-black bg-purple-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">{s.activityType}</span>
                                <span className="text-[10px] font-mono text-slate-400">{new Date(s.date).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">{s.title}</h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {s.conflictReasoning && (
                                <div className="p-2 bg-amber-900/20 border-l-2 border-amber-500 text-[10px] text-amber-200 italic">
                                    "{s.conflictReasoning}"
                                </div>
                            )}
                            <p className="text-xs text-slate-300 line-clamp-3 italic">"{s.description}"</p>
                            
                            {/* Visual Phase List - Explicitly showing what to do */}
                            {s.workoutPhases && s.workoutPhases.length > 0 && (
                                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
                                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Dettaglio:</p>
                                    <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                        {s.workoutPhases.map((p: any, idx: number) => (
                                            <div key={idx} className="text-[10px] text-slate-300 flex items-center gap-1.5">
                                                <span className="font-mono">{formatPhaseText(p)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-500">
                                <div className="bg-slate-900/50 p-2 rounded">📏 {s.estimatedDistance}</div>
                                <div className="bg-slate-900/50 p-2 rounded">❤️ {s.targetHeartRate}</div>
                            </div>
                            <button 
                                onClick={() => handleImport(s, i)}
                                className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${savedIndex === i ? 'bg-green-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                            >
                                {savedIndex === i ? 'Salvato ✓' : 'Aggiungi al Diario'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* HUMAN COACH UPSOLD */}
            <div className="px-4 pb-4">
                <HumanCoachCTA />
            </div>
        </div>
    );
};

export default AiTrainingCoachPanel;
