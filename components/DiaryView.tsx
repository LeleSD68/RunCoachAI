
import React, { useState, useEffect } from 'react';
import { Type } from '@google/genai';
import { Track, TrackStats, UserProfile, PlannedWorkout, ActivityType } from '../types';
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
}

type GenerationMode = 'today' | 'next2' | 'weekly' | 'specific';

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-cyan-400">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75ZM10 9.75a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400 mr-1">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
    </svg>
);

const RulerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400 mr-1">
        <path fillRule="evenodd" d="M10 1c3.866 0 7 1.79 7 4s-3.134 4-7 4-7-1.79-7-4 3.134-4 7-4Zm5.694 8.13c.464-.264.91-.583 1.306-.952V10a6.996 6.996 0 0 1-6 6.92l.008-.007a.75.75 0 0 1-1.016 0l-.007.007A6.996 6.996 0 0 1 3 10V8.178c.396.37.842.688 1.306.953C5.838 10.006 7.854 10.5 10 10.5s4.162-.494 5.694-1.37Z" clipRule="evenodd" />
    </svg>
);

const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-red-400 mr-1">
        <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.16-6.825v-.133L10 8.333l1.53 1.611v.133a20.758 20.758 0 0 1-1.16 6.825l-.019.01-.005.003h-.693Zm-7.147-6.25c-.794 3.967 2.056 6.661 6.969 6.952l.525-5.592-4.332-4.577a3.99 3.99 0 0 0-3.162 3.217ZM17.494 10.665c-.794-3.967-4.32-6.075-7.494-6.333v6.952l-2.73-2.872c.794-3.967 4.32-6.075 7.494-6.333a3.99 3.99 0 0 1 2.73 8.586Z" />
        <path d="M10 2a6 6 0 0 0-4.472 10.002L10 16.69l4.472-4.688A6 6 0 0 0 10 2Z" />
    </svg>
);

const ListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-400 mr-1">
        <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
    </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
);

const AiTrainingCoachPanel: React.FC<AiTrainingCoachPanelProps> = ({ 
    track, stats, userProfile, allHistory, onAddPlannedWorkout, onDeletePlannedWorkout, plannedWorkouts = [], isCompact, layoutMode = 'vertical', targetDate, onCheckAiAccess
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [collapsedCards, setCollapsedCards] = useState<Set<number>>(new Set());
    const [savedIndex, setSavedIndex] = useState<number | null>(null);
    
    // Configuration State
    const [showConfig, setShowConfig] = useState(false);
    const [genMode, setGenMode] = useState<GenerationMode>('today');
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([1, 3, 5]));

    useEffect(() => {
        if (targetDate) {
            setGenMode('specific');
            setShowConfig(false);
        }
    }, [targetDate]);

    const toggleCollapse = (index: number) => {
        setCollapsedCards(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleGenerateProgram = async () => {
        if (onCheckAiAccess && !onCheckAiAccess('workout')) return;

        setIsGenerating(true);
        setError('');
        setSuggestions([]);
        setCollapsedCards(new Set());
        setShowConfig(false);
        
        (window as any).gpxApp?.trackApiRequest();

        try {
            const call = async () => {
                const ai = getGenAI();
                const userName = userProfile.name || 'Atleta';
                
                const referenceDate = targetDate || new Date();
                const referenceDateStr = referenceDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                const refISO = referenceDate.getFullYear() + '-' + String(referenceDate.getMonth() + 1).padStart(2, '0') + '-' + String(referenceDate.getDate()).padStart(2, '0');

                // CONTESTO IMPEGNI E NOTE
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
                    // Typed the map callback parameter and casted the index to fix 'unknown' index type error on line 156
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
                
                REGOLE CRITICHE:
                1. Analizza gli IMPEGNI: se un atleta è occupato tutto il giorno o ha un impegno lungo, NON pianificare sessioni dure o suggerisci il riposo.
                2. Leggi le NOTE: se l'atleta segnala stanchezza o dolori, adatta il carico.
                3. Se c'è un conflitto con un impegno, proponi una soluzione (es. "Visto l'impegno mattutino, corri la sera").

                Rispondi esclusivamente con un array JSON:
                [{
                    "title": string,
                    "activityType": "Lento"|"Fartlek"|"Ripetute"|"Lungo"|"Gara"|"Recupero",
                    "date": "YYYY-MM-DD",
                    "structure": "Sintesi (es. 5km Lento)",
                    "description": "Istruzioni dettagliate includendo adattamenti basati su impegni/note.",
                    "estimatedDuration": string,
                    "estimatedDistance": string,
                    "targetHeartRate": string,
                    "conflictReasoning": "Perché hai scelto questo in base agli impegni esistenti?"
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
                                    conflictReasoning: { type: Type.STRING }
                                },
                                required: ['title', 'activityType', 'date', 'structure', 'description', 'estimatedDuration', 'estimatedDistance', 'targetHeartRate']
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
            setError("Il Coach AI non è riuscito ad analizzare il tuo diario.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImport = (suggestion: any, index: number) => {
        if (!onAddPlannedWorkout) return;
        const entry: PlannedWorkout = {
            id: `ai-gen-${Date.now()}`,
            title: suggestion.title,
            description: `**COACH AI:** ${suggestion.description}\n\n**INFO:** ${suggestion.structure}\n**OBIETTIVO:** ${suggestion.targetHeartRate}`,
            date: new Date(suggestion.date),
            activityType: suggestion.activityType as ActivityType,
            isAiSuggested: true,
            entryType: 'workout'
        };
        onAddPlannedWorkout(entry);
        setSavedIndex(index);
        setTimeout(() => setSavedIndex(null), 2000);
    };

    return (
        <div className={`p-2 ${layoutMode === 'horizontal' ? 'flex flex-row overflow-x-auto gap-4' : 'space-y-4'}`}>
            {!suggestions.length && !isGenerating && (
                <div className="text-center p-4 bg-slate-800/40 rounded-2xl border border-slate-700">
                    <p className="text-sm text-slate-300 mb-4">Ottieni una scheda basata sui tuoi impegni e note.</p>
                    <button onClick={handleGenerateProgram} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95">Genera Scheda Intelligente</button>
                </div>
            )}

            {isGenerating && (
                <div className="w-full text-center py-10 animate-pulse">
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
                        <p className="text-xs text-slate-300 line-clamp-4 italic">"{s.description}"</p>
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
    );
};

export default AiTrainingCoachPanel;
