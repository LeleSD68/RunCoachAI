
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
    onOpenUpgrade?: () => void; // New Prop
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

const HumanCoachCTA: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
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
            onClick={onClick}
            className="relative z-10 bg-white text-slate-900 font-bold text-[10px] uppercase px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors shadow-md"
        >
            Richiedi Info
        </button>
    </div>
);

const AiTrainingCoachPanel: React.FC<AiTrainingCoachPanelProps> = ({ 
    track, stats, userProfile, allHistory, onAddPlannedWorkout, onDeletePlannedWorkout, plannedWorkouts = [], isCompact, layoutMode = 'vertical', targetDate, onCheckAiAccess, onOpenUpgrade
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [savedIndex, setSavedIndex] = useState<number | null>(null);
    
    // Configuration State
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
        <div className="flex flex-col h-full">
            <div className={`p-2 flex-grow ${layoutMode === 'horizontal' ? 'flex flex-row overflow-x-auto gap-4' : 'space-y-4'}`}>
                {!suggestions.length && !isGenerating && (
                    <div className="text-center p-4 bg-slate-800/40 rounded-2xl border border-slate-700 min-w-[200px]">
                        <p className="text-sm text-slate-300 mb-4">Ottieni una scheda basata sui tuoi impegni e note.</p>
                        <button onClick={handleGenerateProgram} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95">Genera Scheda Intelligente</button>
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
            
            {/* HUMAN COACH UPSOLD */}
            <div className="px-4 pb-4">
                <HumanCoachCTA onClick={onOpenUpgrade} />
            </div>
        </div>
    );
};

export default AiTrainingCoachPanel;
