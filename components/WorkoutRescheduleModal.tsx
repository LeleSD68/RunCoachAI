
import React, { useState } from 'react';
import { PlannedWorkout, UserProfile, Track } from '../types';
import { getGenAI, retryWithPolicy } from '../services/aiHelper';

interface WorkoutRescheduleModalProps {
    workout: PlannedWorkout;
    allWorkouts?: PlannedWorkout[];
    tracks?: Track[];
    userProfile: UserProfile;
    onConfirm: (updatedWorkouts: PlannedWorkout | PlannedWorkout[]) => void;
    onCancel: () => void;
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75ZM10 9.75a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-400">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
);

const WorkoutRescheduleModal: React.FC<WorkoutRescheduleModalProps> = ({ workout, allWorkouts = [], tracks = [], userProfile, onConfirm, onCancel }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [proposal, setProposal] = useState<{ newDate: string, reason: string, modifiedDescription: string, futureWorkoutsAffected: number, updatedFutureWorkouts: PlannedWorkout[] } | null>(null);
    
    const calculateDateShift = (targetDate: Date) => {
        const originalDate = new Date(workout.date);
        const start = new Date(originalDate.setHours(0,0,0,0));
        const end = new Date(targetDate.setHours(0,0,0,0));
        const diffTime = end.getTime() - start.getTime();
        return diffTime; 
    };

    const handleAskAi = async (daysShift: number | 'today') => {
        setIsLoading(true);
        
        try {
            const originalDate = new Date(workout.date).toLocaleDateString();
            
            let targetDate = new Date(workout.date);
            if (daysShift === 'today') {
                targetDate = new Date(); 
            } else {
                targetDate.setDate(targetDate.getDate() + daysShift);
            }
            
            const timeDiffMs = calculateDateShift(targetDate);
            const isAnticipating = timeDiffMs < 0;

            const futureWorkouts = allWorkouts
                .filter(w => !w.completedTrackId && w.id !== workout.id && new Date(w.date).getTime() > new Date(workout.date).getTime())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const adjacentWorkouts = allWorkouts.filter(w => {
                const d = new Date(w.date);
                const t = targetDate;
                const diff = Math.abs(d.getTime() - t.getTime());
                return diff < (1000 * 60 * 60 * 24 * 1.5) && w.id !== workout.id;
            }).map(w => `${w.activityType} il ${new Date(w.date).toLocaleDateString()}`);

            const sortedTracks = [...tracks].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
            const lastRun = sortedTracks[0];
            const daysSinceLastRun = lastRun 
                ? Math.floor((new Date().getTime() - lastRun.points[0].time.getTime()) / (1000 * 3600 * 24))
                : 'N/A';

            const prompt = `Sei un Running Coach AI. L'atleta vuole spostare l'allenamento "${workout.title}" (Tipologia: ${workout.activityType}, previsto il ${originalDate}) al ${targetDate.toLocaleDateString()}.
            
            CONTESTO FISICO:
            - Ultima corsa reale eseguita: ${daysSinceLastRun} giorni fa.
            - Obiettivi Atleta: ${userProfile.goals?.join(', ') || 'Generale'}.
            
            CONSEGUENZE E CONFLITTI:
            - Ci sono ${futureWorkouts.length} allenamenti futuri che verranno spostati di conseguenza.
            - Allenamenti adiacenti alla nuova data: ${adjacentWorkouts.length > 0 ? adjacentWorkouts.join(', ') : 'Nessuno'}.
            
            COMPITO CRITICO - GESTIONE INTERFERENZE:
            1. Analizza se la nuova data crea un conflitto di recupero (es. due sessioni intense consecutive).
            2. **SE RILEVI UN CONFLITTO (allenamenti troppo vicini):** 
               - Suggerisci esplicitamente nel campo "reason" di aver modificato l'intensità (es. da Ripetute a Lento).
               - Riscrivi la "modifiedDescription" per alleggerire l'allenamento spostato o suggerire modifiche a quelli futuri se necessario.
            
            Rispondi ESCLUSIVAMENTE con un oggetto JSON:
            {
                "reason": "Spiegazione del consiglio (es. 'Attenzione: troppo vicino al Lungo di ieri, ho ridotto l'intensità' oppure 'Spostamento ok'). Max 25 parole.",
                "modifiedDescription": "La descrizione tecnica dell'allenamento (uguale all'originale o modificata per ridurre carico).",
                "isSafe": boolean
            }`;

            const call = async () => {
                const ai = getGenAI();
                return await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });
            };

            const response = await retryWithPolicy(call);
            const result = JSON.parse(response.text || '{}');
            
            const updatedFutureWorkouts = futureWorkouts.map(fw => ({
                ...fw,
                date: new Date(new Date(fw.date).getTime() + timeDiffMs)
            }));

            setProposal({
                newDate: targetDate.toISOString(),
                reason: result.reason || (isAnticipating ? "Anticipo confermato." : "Spostamento confermato."),
                modifiedDescription: result.modifiedDescription || workout.description,
                futureWorkoutsAffected: updatedFutureWorkouts.length,
                updatedFutureWorkouts
            });

        } catch (error) {
            console.error(error);
            let targetDate = new Date(workout.date);
            if (daysShift === 'today') targetDate = new Date();
            else targetDate.setDate(targetDate.getDate() + daysShift);
            
            const timeDiffMs = calculateDateShift(targetDate);
            
            const futureWorkouts = allWorkouts
                .filter(w => !w.completedTrackId && w.id !== workout.id && new Date(w.date).getTime() > new Date(workout.date).getTime());
                
            const updatedFutureWorkouts = futureWorkouts.map(fw => ({
                ...fw,
                date: new Date(new Date(fw.date).getTime() + timeDiffMs)
            }));

            setProposal({
                newDate: targetDate.toISOString(),
                reason: "Spostamento manuale (AI offline). Il piano futuro slitta di conseguenza.",
                modifiedDescription: workout.description,
                futureWorkoutsAffected: updatedFutureWorkouts.length,
                updatedFutureWorkouts
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (proposal) {
            const mainUpdate = {
                ...workout,
                date: new Date(proposal.newDate),
                description: proposal.modifiedDescription
            };
            onConfirm([mainUpdate, ...proposal.updatedFutureWorkouts]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" onClick={onCancel}>
            <div 
                className="bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col mb-0 sm:mb-auto pb-[env(safe-area-inset-bottom)]" 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <CalendarIcon /> Gestione Calendario
                    </h3>
                    <button onClick={onCancel} className="text-slate-500 hover:text-white">&times;</button>
                </header>

                <div className="p-6">
                    {!proposal ? (
                        <>
                            <p className="text-sm text-slate-300 mb-6">
                                Spostare <strong>"{workout.title}"</strong>? L'AI verificherà interferenze e adatterà l'intensità se necessario.
                            </p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={() => handleAskAi('today')} 
                                    disabled={isLoading}
                                    className="w-full bg-green-900/30 hover:bg-green-900/50 border border-green-500/30 rounded-xl p-3 flex items-center justify-center gap-3 transition-all hover:border-green-500 group"
                                >
                                    <span className="text-xl">⚡</span>
                                    <div className="text-left">
                                        <div className="font-black text-green-400 group-hover:scale-105 transition-transform">Anticipa a OGGI</div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">Fallo subito</div>
                                    </div>
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => handleAskAi(1)} 
                                        disabled={isLoading}
                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-4 flex flex-col items-center gap-1 transition-all hover:border-cyan-500 group"
                                    >
                                        <span className="text-lg font-black text-cyan-400 group-hover:scale-110 transition-transform">+1 Giorno</span>
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">Domani</span>
                                    </button>
                                    <button 
                                        onClick={() => handleAskAi(2)} 
                                        disabled={isLoading}
                                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-4 flex flex-col items-center gap-1 transition-all hover:border-purple-500 group"
                                    >
                                        <span className="text-lg font-black text-purple-400 group-hover:scale-110 transition-transform">+2 Giorni</span>
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">Dopodomani</span>
                                    </button>
                                </div>
                            </div>

                            {isLoading && (
                                <div className="mt-6 text-center">
                                    <div className="inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-xs text-cyan-400 font-bold animate-pulse">Analisi recupero e conflitti...</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="animate-fade-in-up">
                            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 mb-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <SparklesIcon />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-bold text-purple-400 text-sm uppercase tracking-widest">Analisi Coach</h4>
                                </div>
                                <p className="text-sm text-slate-200 italic mb-3">"{proposal.reason}"</p>
                                
                                <div className="grid grid-cols-2 gap-4 border-t border-purple-500/20 pt-2 text-xs">
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Nuova Data</span>
                                        <span className="text-white font-bold font-mono text-sm">{new Date(proposal.newDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Impatto Futuro</span>
                                        <span className="text-white font-bold flex items-center gap-1">
                                            {proposal.futureWorkoutsAffected > 0 ? (
                                                <><ArrowRightIcon /> {proposal.futureWorkoutsAffected} Shift</>
                                            ) : (
                                                <span className="text-slate-400">Nessuno</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {proposal.modifiedDescription !== workout.description && (
                                <div className="mb-4">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Piano Modificato (per recupero):</p>
                                    <p className="text-xs text-slate-300 bg-slate-800 p-2 rounded border border-slate-700 max-h-24 overflow-y-auto">{proposal.modifiedDescription}</p>
                                </div>
                            )}

                            <button 
                                onClick={handleConfirm}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 border border-green-500"
                            >
                                Conferma Modifiche
                            </button>
                            <button 
                                onClick={() => setProposal(null)}
                                className="w-full mt-2 text-slate-400 hover:text-white text-xs font-bold py-2"
                            >
                                Indietro
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkoutRescheduleModal;
