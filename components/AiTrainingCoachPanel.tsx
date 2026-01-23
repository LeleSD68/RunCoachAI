
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
}

type GenerationMode = 'today' | 'next2' | 'weekly' | 'specific';

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const JS_DAY_TO_UI_INDEX = [6, 0, 1, 2, 3, 4, 5]; 

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

const GoogleCalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1 text-red-400">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/>
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
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 11.06.02L10 11.168l3.71-3.938a.75.75 0 1 11.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
);

const AiTrainingCoachPanel: React.FC<AiTrainingCoachPanelProps> = ({ 
    track, stats, userProfile, allHistory, onAddPlannedWorkout, onDeletePlannedWorkout, plannedWorkouts = [], isCompact, layoutMode = 'vertical', targetDate
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

    // Force specific mode if targetDate is present
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

    const toggleDay = (dayIndex: number) => {
        setSelectedDays(prev => {
            const next = new Set(prev);
            if (next.has(dayIndex)) next.delete(dayIndex);
            else next.add(dayIndex);
            return next;
        });
    };

    const handleGenerateProgram = async () => {
        setIsGenerating(true);
        setError('');
        setSuggestions([]);
        setCollapsedCards(new Set());
        setShowConfig(false);
        
        window.gpxApp?.trackApiRequest();

        try {
            const call = async () => {
                const ai = getGenAI();
                const userName = userProfile.name || 'Atleta';
                
                const referenceDate = targetDate || new Date();
                const referenceDateStr = referenceDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                const refISO = referenceDate.getFullYear() + '-' + String(referenceDate.getMonth() + 1).padStart(2, '0') + '-' + String(referenceDate.getDate()).padStart(2, '0');

                const goalsStr = userProfile.goals?.length ? userProfile.goals.join(', ') : 'Salute Generale';
                
                const sortedHistory = [...allHistory].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
                const lastRun = sortedHistory[0];
                
                let daysSinceLastRun = 100;
                let lastRunInfo = "Nessuna corsa recente rilevata.";
                
                if (lastRun) {
                    const lastRunTime = lastRun.points[0].time.getTime();
                    const nowTime = new Date().getTime(); 
                    const diffTime = Math.abs(nowTime - lastRunTime);
                    daysSinceLastRun = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
                    lastRunInfo = `Ultima corsa: ${daysSinceLastRun} giorni fa (${lastRun.distance.toFixed(1)} km).`;
                }

                const futurePlans = plannedWorkouts
                    .filter(p => !p.completedTrackId && new Date(p.date) >= new Date(referenceDate.setHours(0,0,0,0)))
                    .map(p => `- ${new Date(p.date).toISOString().split('T')[0]}: ${p.activityType} "${p.title}"`)
                    .join('\n');

                const last3Runs = sortedHistory.slice(0, 3).map(t => {
                    const s = calculateTrackStats(t);
                    const type = t.activityType || 'Generico';
                    return `- ${t.points[0].time.toLocaleDateString()} (${type}): ${t.distance.toFixed(1)}km a ${formatPace(s.movingAvgPace)}/km.`;
                }).join('\n');

                let contextPrompt = "";
                if (track && stats) {
                    contextPrompt = `Analizza specificamente la corsa appena conclusa (${track.distance.toFixed(2)}km) per determinare il recupero necessario.`;
                } else {
                    contextPrompt = `Basati sullo stato di riposo attuale (${daysSinceLastRun} giorni fermo).`;
                }

                let taskDescription = "";
                if (targetDate || genMode === 'today' || genMode === 'specific') {
                    taskDescription = `Proponi 1 allenamento specifico per la data: ${referenceDateStr} (${refISO}).`;
                } else if (genMode === 'next2') {
                    taskDescription = "Proponi 2 allenamenti per i prossimi giorni ideali, bilanciando sforzo e recupero.";
                } else if (genMode === 'weekly') {
                    const dayNames = (Array.from(selectedDays) as number[]).sort((a, b) => a - b).map(d => DAYS_SHORT[d]).join(', ');
                    taskDescription = `Proponi un piano settimanale per questi giorni specifici: ${dayNames}. 
                    Ignora la data di oggi se non è uno dei giorni selezionati. 
                    Pianifica allenamenti per la settimana corrente o la prossima a seconda dei giorni rimasti.`;
                }

                const prompt = `Sei un Istruttore Tecnico Professionista di Running.
                
                STILE:
                - Rispondi SEMPRE E SOLO in ITALIANO.
                - Sii tecnico, meticoloso ed esaustivo, ma SINTETICO.
                - Limite parole: Massimo 450 parole totali. Non divagare.
                
                ${contextPrompt}
                
                PROFILO ATLETA: 
                - Nome: ${userName}
                - Età: ${userProfile.age ?? 'N/D'}
                - Obiettivi: ${goalsStr}
                - FC Max: ${userProfile.maxHr ?? 'N/D'} bpm
                
                CONTESTO TEMPORALE:
                - RIFERIMENTO: ${referenceDateStr} (${refISO}).
                - STATO ATTUALE: ${lastRunInfo}
                - STORICO RECENTE:
                ${last3Runs}
                
                DIARIO FUTURO:
                ${futurePlans || "Nessun allenamento pianificato a breve."}

                COMPITO:
                ${taskDescription}
                
                REGOLE CRITICHE:
                1. Rispetta RIGOROSAMENTE i giorni richiesti.
                2. Se c'è un conflitto con il diario, valuta se sostituire e spiegalo in "conflictReasoning".
                3. Varia l'intensità per evitare infortuni.

                FORMATO DETTAGLIATO PER OGNI ALLENAMENTO:
                1. **Struttura Sintetica**: "10' Risc + 5km Medio + 5' Def".
                2. **Descrizione Istruttiva**: Dettagli tecnici passo passo (ritmi, FC, meccanica).
                3. **Dati Tecnici**: Stime precise.

                Rispondi esclusivamente con un array JSON.`;

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
                                    activityType: { type: Type.STRING, enum: ['Lento', 'Fartlek', 'Gara', 'Ripetute', 'Lungo', 'Altro', 'Recupero'] },
                                    date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
                                    structure: { type: Type.STRING },
                                    description: { type: Type.STRING, description: "Istruzioni tecniche dettagliate." },
                                    estimatedDuration: { type: Type.STRING },
                                    estimatedDistance: { type: Type.STRING },
                                    targetHeartRate: { type: Type.STRING },
                                    conflictReasoning: { type: Type.STRING, description: "Motivo sostituzione se conflitto esistente, altrimenti stringa vuota." }
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
            window.gpxApp?.addTokens(response.usageMetadata?.totalTokenCount ?? 0);
        } catch (e) {
            console.error(e);
            setError("Impossibile contattare il Coach AI. Riprova più tardi.");
        } finally {
            setIsGenerating(false);
        }
    };

    const generateFullDescription = (s: any) => {
        return `**STRUTTURA:** ${s.structure}\n\n**INDICAZIONI COACH:**\n${s.description}\n\n**SCHEDA TECNICA:**\n- ⏱️ Durata: ${s.estimatedDuration}\n- 📏 Distanza: ${s.estimatedDistance}\n- ❤️ FC Target: ${s.targetHeartRate}`;
    };

    const handleAddToGoogleCalendar = (suggestion: any) => {
        const title = encodeURIComponent(`Corsa: ${suggestion.title}`);
        const fullDescription = generateFullDescription(suggestion);
        const details = encodeURIComponent(fullDescription);
        
        const dateStr = suggestion.date.replace(/-/g, '');
        const start = `${dateStr}T090000`; 
        const end = `${dateStr}T100000`;   
        
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${start}/${end}`;
        window.open(url, '_blank');
    };

    const handleImport = (suggestion: any, index: number) => {
        if (!onAddPlannedWorkout) return;
        
        const suggestionDate = new Date(suggestion.date);
        
        const conflict = plannedWorkouts?.find(p => 
            !p.completedTrackId && 
            new Date(p.date).toDateString() === suggestionDate.toDateString()
        );

        if (conflict && onDeletePlannedWorkout) {
            onDeletePlannedWorkout(conflict.id);
        }
        
        const enrichedDescription = generateFullDescription(suggestion);

        const workout: PlannedWorkout = {
            id: `planned-coach-${Date.now()}-${Math.random()}`,
            title: suggestion.title,
            description: enrichedDescription,
            date: suggestionDate,
            activityType: suggestion.activityType as ActivityType,
            isAiSuggested: true
        };
        onAddPlannedWorkout(workout);
        
        setSavedIndex(index);
        setTimeout(() => setSavedIndex(null), 2000);
    };

    const showTargetDateUI = !!targetDate && suggestions.length === 0 && !isGenerating;

    if (isCompact && suggestions.length === 0 && !isGenerating && !targetDate) {
        return (
            <button 
                onClick={() => setShowConfig(!showConfig)}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95 border border-cyan-400/30"
            >
                <SparklesIcon />
                Fai scheda Allenamento
            </button>
        );
    }

    const isHorizontal = layoutMode === 'horizontal';

    return (
        <div className={`${track ? 'mt-6 border-t border-slate-700 pt-6' : 'mt-2'} ${isHorizontal ? 'pb-2' : 'pb-24'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 px-2">
                <h3 className="text-lg sm:text-xl font-bold text-cyan-400 flex items-center">
                    <SparklesIcon /> Coach AI Training
                </h3>
                {!showConfig && suggestions.length === 0 && !targetDate && (
                    <button 
                        onClick={() => setShowConfig(true)}
                        className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center justify-center transition-all active:scale-95 whitespace-nowrap text-sm"
                    >
                        <SparklesIcon />
                        Genera Scheda
                    </button>
                )}
            </div>

            {showTargetDateUI && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center mx-2 mb-4 shadow-lg animate-fade-in-down">
                    <p className="text-slate-300 text-sm mb-4">
                        Ciao {userProfile.name || 'Atleta'}, vuoi creare un allenamento su misura per <br/>
                        <span className="text-white font-bold text-lg">{targetDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>?
                    </p>
                    <button 
                        onClick={handleGenerateProgram}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <SparklesIcon />
                        Genera Scheda con AI
                    </button>
                </div>
            )}

            {showConfig && !isGenerating && suggestions.length === 0 && !targetDate && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 mx-2 animate-fade-in-down">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Configura il tuo Piano</h4>
                    
                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'today', label: 'Solo Oggi' },
                            { id: 'next2', label: 'Prossime 2' },
                            { id: 'weekly', label: 'Settimana' }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setGenMode(m.id as GenerationMode)}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                                    genMode === m.id 
                                    ? 'bg-cyan-600 border-cyan-500 text-white' 
                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {genMode === 'weekly' && (
                        <div className="mb-4">
                            <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase">Seleziona i giorni di allenamento:</p>
                            <div className="flex justify-between gap-1">
                                {DAYS_SHORT.map((day, index) => {
                                    const isSelected = selectedDays.has(index);
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => toggleDay(index)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                                isSelected 
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 transform scale-110' 
                                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                            }`}
                                        >
                                            {day.charAt(0)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                        <button 
                            onClick={() => setShowConfig(false)}
                            className="flex-1 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-700 transition-colors"
                        >
                            Annulla
                        </button>
                        <button 
                            onClick={handleGenerateProgram}
                            className="flex-[2] bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                        >
                            <SparklesIcon />
                            Crea Programma
                        </button>
                    </div>
                </div>
            )}

            {isGenerating && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center mx-2 mb-4">
                    <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-bold text-white animate-pulse">Il Coach AI sta elaborando il piano...</p>
                    <p className="text-xs text-slate-400 mt-1">Analisi del recupero e del calendario in corso.</p>
                </div>
            )}

            {error && (
                <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm mb-4 mx-2">
                    {error}
                </div>
            )}

            <div className={isHorizontal ? "flex flex-row items-start overflow-x-auto gap-4 pb-4 px-2" : "flex flex-col gap-4"}>
                {suggestions.map((s, i) => {
                    const suggDate = new Date(s.date);
                    const isToday = suggDate.toDateString() === new Date().toDateString();
                    const isCollapsed = collapsedCards.has(i);
                    const isSaved = savedIndex === i;
                    
                    const conflict = plannedWorkouts?.find(p => !p.completedTrackId && new Date(p.date).toDateString() === suggDate.toDateString());

                    return (
                        <div key={i} className={`bg-slate-700/40 border flex-shrink-0 ${isToday ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-slate-600'} rounded-xl overflow-hidden animate-fade-in-down flex flex-col transition-all ${isHorizontal ? 'w-full sm:w-[320px] md:w-[350px] min-w-[300px]' : 'w-full'}`}>
                            {/* Header Section */}
                            <div 
                                className="p-4 border-b border-slate-600 bg-slate-800/30 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                onClick={() => toggleCollapse(i)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-grow">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border inline-block ${isToday ? 'bg-green-900/50 text-green-400 border-green-500/30' : 'bg-cyan-900/50 text-cyan-400 border-cyan-500/30'}`}>
                                                {isToday ? 'PER OGGI' : `Opzione ${i + 1}`}
                                            </span>
                                            <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                                {s.activityType}
                                            </span>
                                            {conflict && (
                                                <span className="bg-amber-600/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1">
                                                    ⚠️ Sostituzione
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-base font-bold text-white leading-tight truncate">{s.title}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase mt-1 flex items-center gap-1">
                                            <CalendarIcon />
                                            {suggDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>
                                    <div className="p-1 text-slate-400">
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Structure Summary */}
                            <div 
                                className="bg-slate-900/40 px-4 py-3 border-b border-slate-700/50 flex items-start gap-2 cursor-pointer"
                                onClick={() => toggleCollapse(i)}
                            >
                                <ListIcon />
                                <p className="text-xs font-mono font-bold text-amber-100 leading-snug">
                                    {s.structure}
                                </p>
                            </div>
                            
                            {/* Technical Specs Grid */}
                            <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-800/20" onClick={() => toggleCollapse(i)}>
                                <div className="flex flex-col items-center justify-center p-1 rounded bg-slate-700/30">
                                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                                        <ClockIcon /> Tempo
                                    </div>
                                    <span className="text-xs font-mono font-bold text-white">{s.estimatedDuration}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1 rounded bg-slate-700/30">
                                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                                        <RulerIcon /> Dist.
                                    </div>
                                    <span className="text-xs font-mono font-bold text-white">{s.estimatedDistance}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-1 rounded bg-slate-700/30">
                                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                                        <HeartIcon /> FC
                                    </div>
                                    <span className="text-xs font-mono font-bold text-red-300 truncate w-full text-center" title={s.targetHeartRate}>{s.targetHeartRate}</span>
                                </div>
                            </div>

                            {/* Collapsible Body */}
                            {!isCollapsed && (
                                <div className="p-4 flex-grow flex flex-col bg-slate-800/10">
                                    {/* Conflict Warning */}
                                    {s.conflictReasoning && (
                                        <div className="mb-4 bg-amber-900/20 border-l-2 border-amber-500 p-3 rounded-r text-xs">
                                            <p className="font-bold text-amber-400 uppercase mb-1">Motivo Sostituzione:</p>
                                            <p className="text-slate-300 italic">{s.conflictReasoning}</p>
                                            {conflict && <p className="mt-1 text-amber-500/70 font-mono text-[9px]">Sostituisce: "{conflict.title}"</p>}
                                        </div>
                                    )}

                                    <div className="prose prose-invert prose-sm mb-4 max-w-none flex-grow text-sm leading-relaxed">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Dettagli Tecnici Coach:</div>
                                        <FormattedAnalysis text={s.description} />
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAddToGoogleCalendar(s); }}
                                            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold py-3 px-3 rounded-lg flex items-center justify-center transition-all"
                                            title="Esporta su Google Calendar"
                                        >
                                            <GoogleCalendarIcon />
                                        </button>
                                        
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleImport(s, i); }}
                                            disabled={isSaved}
                                            className={`flex-grow font-bold py-3 rounded-lg border flex items-center justify-center transition-all duration-300 text-xs uppercase tracking-widest shadow-md ${
                                                isSaved 
                                                ? 'bg-green-600 text-white border-green-500 scale-95' 
                                                : conflict 
                                                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 active:scale-95'
                                                    : isToday 
                                                        ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 active:scale-95' 
                                                        : 'bg-slate-700 hover:bg-slate-600 text-cyan-400 border-cyan-500/30 active:scale-95'
                                            }`}
                                        >
                                            {isSaved ? (
                                                <>✅ Registrato</>
                                            ) : (
                                                <>
                                                    <CalendarIcon /> {conflict ? 'Sostituisci nel Diario' : 'Aggiungi a Diario'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {suggestions.length > 0 && !isGenerating && !targetDate && (
                <div className="text-center mt-4">
                    <button 
                        onClick={() => { setShowConfig(true); setSuggestions([]); }}
                        className="text-xs text-slate-400 hover:text-cyan-400 underline"
                    >
                        Cambia Parametri / Rigenera
                    </button>
                </div>
            )}
        </div>
    );
};

export default AiTrainingCoachPanel;
