
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, GenerateContentResponse } from '@google/genai';
import { TrackStats, UserProfile, Track, ChatMessage, AiPersonality, PlannedWorkout } from '../types';
import { getHeartRateZoneInfo } from './HeartRateZonePanel';
import FormattedAnalysis from './FormattedAnalysis';
import { calculateTrackStats } from '../services/trackStatsService';
import { loadChatFromDB, saveChatToDB } from '../services/dbService';
import { getGenAI, retryWithPolicy, isAuthError, ensureApiKey } from '../services/aiHelper';

const personalityPrompts: Record<AiPersonality, string> = {
    'pro_balanced': "Sei un analista delle prestazioni d'élite. Sii chirurgico, diretto e basati esclusivamente sui numeri. Rispondi rigorosamente in ITALIANO.",
    'analytic': "Sei un algoritmo di bio-metrica avanzato. Analizza l'efficienza meccanica e cardiaca. Sii freddo e schematico. Rispondi rigorosamente in ITALIANO.",
    'strict': "Sei un coach militare. Non tolleri debolezze. Analizza gli errori senza pietà. Rispondi rigorosamente in ITALIANO."
};

const formatDuration = (ms: number) => {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-white">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" />
    </svg>
);

const MinimizeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
);

const DEFAULT_WELCOME_MSG = "Analisi pronta. Verifica diario in corso...";

interface GeminiTrackAnalysisPanelProps {
    stats: TrackStats;
    userProfile: UserProfile;
    track: Track;
    allHistory?: Track[];
    plannedWorkouts?: PlannedWorkout[];
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    startOpen?: boolean;
    onCheckAiAccess?: () => boolean; 
}

const GeminiTrackAnalysisPanel: React.FC<GeminiTrackAnalysisPanelProps> = ({ stats, userProfile, track, allHistory = [], plannedWorkouts = [], onUpdateTrackMetadata, onAddPlannedWorkout, startOpen = false, onCheckAiAccess }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([] as ChatMessage[]);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(startOpen);
    const [isMinimized, setIsMinimized] = useState(false);
    const [latestSummary, setLatestSummary] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasAutoStartedRef = useRef(false);
    
    const CHAT_ID = `track-chat-${track.id}`;

    // Calculate Planned Workout Context
    const matchedWorkout = React.useMemo(() => {
        if (!plannedWorkouts) return null;
        // Check strict date match
        const trackDate = new Date(track.points[0].time).toDateString();
        return plannedWorkouts.find(w => new Date(w.date).toDateString() === trackDate && !w.completedTrackId);
    }, [plannedWorkouts, track]);

    const generateSystemInstruction = useCallback(() => {
        const personalityKey = userProfile.aiPersonality || 'pro_balanced';
        const personality = personalityPrompts[personalityKey] || personalityPrompts['pro_balanced'];
        const userName = userProfile.name || 'Atleta';
        
        // Calcolo variabilità per capire se è ripetute/fartlek
        const validSplits = stats.splits.filter(s => s.distance > 0.5);
        const paces = validSplits.map(s => s.pace);
        const avgPaceCalc = paces.reduce((a,b)=>a+b,0) / (paces.length || 1);
        const variance = paces.reduce((a,b) => a + Math.pow(b - avgPaceCalc, 2), 0) / (paces.length || 1);
        const stdDev = Math.sqrt(variance);
        
        const isVariable = stdDev > 0.25; 
        const splitsHeader = "Km | Passo | FC | Watt | Disl.\n---|---|---|---|---";
        const splitsRows = stats.splits.map(s => {
            return `${s.splitNumber} | ${formatPace(s.pace)} | ${s.avgHr ? Math.round(s.avgHr) : 'N/D'} | ${s.avgWatts ? Math.round(s.avgWatts) : 'N/D'} | +${Math.round(s.elevationGain)}`;
        }).join('\n');
        
        const splitTable = `\nTABELLA PARZIALI:\n${splitsHeader}\n${splitsRows}\n`;
        const hrZoneInfo = getHeartRateZoneInfo(track, userProfile);
        const hrDistribution = hrZoneInfo.zones.map(z => `- ${z.name}: ${z.percent.toFixed(0)}%`).join(', ');
        
        let workoutContext = "";
        if (matchedWorkout || track.linkedWorkout) {
            const w = track.linkedWorkout || matchedWorkout;
            workoutContext = `
            ALLENAMENTO PIANIFICATO NEL DIARIO:
            - Titolo: "${w?.title}"
            - Tipo: ${w?.activityType}
            - Descrizione: "${w?.description}"
            `;
        } else {
            workoutContext = "Nessun allenamento specifico trovato nel diario per questa data.";
        }

        return `${personality}
        
        PROTOCOLLO DI ANALISI RIGIDO:
        1. **CHECK DIARIO**:
           ${workoutContext}
           
           SE c'è un allenamento pianificato E l'utente NON ha ancora confermato:
           - LA TUA PRIMA RISPOSTA DEVE ESSERE SOLO UNA DOMANDA: "Ciao ${userName}, per oggi era previsto '${matchedWorkout?.title || track.linkedWorkout?.title}'. Questa corsa corrisponde a quel programma?"
           - NON ANALIZZARE NULLA FINCHÉ L'UTENTE NON RISPONDE SÌ O NO.
        
        2. **SE L'UTENTE CONFERMA (SÌ) o SE IL PROGRAMMA È GIÀ LINKATO**:
           - Esegui un'analisi comparativa: "Hai rispettato i ritmi previsti?", "L'intensità è coerente col piano?".
           - Se doveva essere un Lento ed è stato veloce -> Segnala errore.
           - Se dovevano essere Ripetute -> Analizza i picchi nella Tabella Parziali.

        3. **SE NON C'È PROGRAMMA o L'UTENTE DICE NO**:
           - DEVI DEDURRE IL TIPO DI CORSA DAI DATI.
           - Variabilità Passo (StdDev): ${stdDev.toFixed(2)}.
           - SE > 0.25 -> Probabile FARTLEK o RIPETUTE o SCALATA. Cerca pattern ON/OFF nella tabella.
           - SE < 0.25 -> Probabile CORSA CONTINUA (Lento, Medio, Lungo).
           - Analizza in base alla tipologia dedotta.

        DATI MACRO:
        Dist: ${stats.totalDistance.toFixed(2)} km, Tempo: ${formatDuration(stats.movingDuration)}.
        Medie: Passo ${formatPace(stats.movingAvgPace)}/km, HR ${Math.round(stats.avgHr || 0)} bpm.
        Zone Cardio: ${hrDistribution}.

        ${splitTable}

        STILE: Rispondi in ITALIANO. Sii tecnico ma sintetico (max 450 parole).
        `;
    }, [stats, userProfile, track, matchedWorkout]);

    // Load messages and update summary
    useEffect(() => {
        const initOrRestoreChat = async () => {
            const savedMessages = await loadChatFromDB(CHAT_ID);
            if (savedMessages && savedMessages.length > 0) {
                setMessages(savedMessages);
                const lastModelMsg = [...savedMessages].reverse().find(m => m.role === 'model');
                if (lastModelMsg && lastModelMsg.text && !lastModelMsg.text.includes(DEFAULT_WELCOME_MSG)) {
                    setLatestSummary(lastModelMsg.text.split(':::SUGGESTIONS')[0]);
                }
            } else {
                // Initial welcome message depends on workout context
                let initText = DEFAULT_WELCOME_MSG;
                if (matchedWorkout && !track.linkedWorkout) {
                    initText = `Ciao ${userProfile.name || 'Atleta'}, ho visto che per oggi era previsto "${matchedWorkout.title}". Questa attività corrisponde al programma?`;
                } else {
                    initText = `Ciao ${userProfile.name || 'Atleta'}, analizzo subito questa corsa.`;
                }

                const initialMsg: ChatMessage = {
                    role: 'model',
                    text: initText,
                    timestamp: Date.now(),
                    suggestedReplies: matchedWorkout && !track.linkedWorkout ? ["Sì, è questo", "No, corsa diversa"] : ["Analisi Generale", "Focus Cardio", "Efficienza"]
                };
                setMessages([initialMsg]);
            }
        };
        initOrRestoreChat();
    }, [CHAT_ID, matchedWorkout, track.linkedWorkout, userProfile.name]);

    // Sync state to DB
    useEffect(() => {
        if (messages.length > 0) {
            saveChatToDB(CHAT_ID, messages).catch(console.error);
            const lastModelMsg = [...messages].reverse().find(m => m.role === 'model');
            if (lastModelMsg && lastModelMsg.text && !lastModelMsg.text.includes(DEFAULT_WELCOME_MSG)) {
                setLatestSummary(lastModelMsg.text.split(':::SUGGESTIONS')[0]);
            }
        }
        if (isOpen && !isMinimized) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [messages, CHAT_ID, isOpen, isMinimized]);

    const initChat = (forceRecreation = false) => {
        if (!chatSessionRef.current || forceRecreation) {
            try {
                const ai = getGenAI();
                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-3-flash-preview',
                    config: { systemInstruction: generateSystemInstruction() },
                    history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
                });
            } catch (e: any) {
                if (e.message === 'API_KEY_MISSING') console.warn("AI Init skipped");
                else throw e;
            }
        }
    };

    const runWithRetry = async (action: () => Promise<void>) => {
        try {
            await action();
        } catch (e: any) {
            if (isAuthError(e) || e.message === 'API_KEY_MISSING') {
                await ensureApiKey();
                if (process.env.API_KEY) {
                    initChat(true);
                    await action();
                }
            } else {
                throw e;
            }
        }
    };

    const performSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;
        if (onCheckAiAccess && !onCheckAiAccess()) return;

        window.gpxApp?.trackApiRequest();
        onUpdateTrackMetadata?.(track.id, { hasChat: true });

        // Logic hook: If confirming workout
        if (matchedWorkout && !track.linkedWorkout && (text.toLowerCase().includes('si') || text.toLowerCase().includes('sì') || text.toLowerCase().includes('certo'))) {
             // Link the workout in local state/DB implicitly for next loads
             onUpdateTrackMetadata?.(track.id, { linkedWorkout: matchedWorkout });
        }

        const userMsg = text;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);
        setIsLoading(true);

        await runWithRetry(async () => {
            initChat();
            if (chatSessionRef.current) {
                const result = await chatSessionRef.current.sendMessageStream({ message: userMsg });
                setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);
                let fullText = '';
                let finalTokenCount = 0;

                for await (const chunk of result) {
                    const c = chunk as GenerateContentResponse;
                    fullText += c.text || '';
                    if (c.usageMetadata?.totalTokenCount) finalTokenCount = c.usageMetadata.totalTokenCount;
                    
                    setMessages((prev) => {
                        const next = [...prev];
                        if (next.length > 0) next[next.length - 1].text = fullText;
                        return next;
                    });
                }
                if (finalTokenCount > 0) window.gpxApp?.addTokens(finalTokenCount);
            }
        }).catch(e => {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: "⚠️ Errore connessione AI. Riprova.", timestamp: Date.now() }]);
        }).finally(() => setIsLoading(false));
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        performSendMessage(input);
    };

    const handleStartAnalysis = () => {
        if (onCheckAiAccess && !onCheckAiAccess()) return;

        // If we haven't started chatting yet (length <= 1 means only initial prompt or empty)
        if (messages.length <= 1) { 
             // If there's a workout, we just trigger the user to answer the initial question if they haven't
             if (matchedWorkout && !track.linkedWorkout) {
                 // Do nothing, let user answer the greeting question
             } else {
                 // No workout or already linked, force detailed analysis
                 performSendMessage("Analizza questa sessione nel dettaglio.");
             }
        }
    };

    // ... (rest of the component: Auto-start effect, Render functions, UI)
    const handleSaveToDiary = (content: string) => {
        if (!onAddPlannedWorkout) return;
        const cleanContent = content.split(':::SUGGESTIONS')[0].trim();
        const note: PlannedWorkout = {
            id: `ai-analysis-${Date.now()}`,
            title: `Analisi AI: ${track.name}`,
            description: cleanContent,
            date: track.points[0].time,
            activityType: 'Altro',
            isAiSuggested: true,
            completedTrackId: track.id
        };
        onAddPlannedWorkout(note);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    useEffect(() => {
        if (startOpen && !isOpen) {
            setTimeout(() => setIsOpen(true), 100);
        }
        // Only auto-start analysis if we are NOT waiting for a workout confirmation
        if (startOpen && !hasAutoStartedRef.current && messages.length <= 1 && (!matchedWorkout || track.linkedWorkout)) {
            hasAutoStartedRef.current = true;
            setTimeout(() => handleStartAnalysis(), 600);
        }
    }, [startOpen, messages.length, matchedWorkout, track.linkedWorkout]);

    const renderMessage = (msg: ChatMessage, index: number) => {
        const displayText = msg.text.split(':::SUGGESTIONS')[0];
        return (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}>
                <div className={`max-w-[95%] sm:max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${msg.role === 'user' ? 'bg-cyan-700 text-white rounded-tr-none' : 'bg-slate-700 text-slate-100 rounded-tl-none'}`}>
                    <FormattedAnalysis text={displayText} />
                    {msg.role === 'model' && onAddPlannedWorkout && displayText.length > 50 && (
                        <div className="mt-2 pt-2 border-t border-slate-600/50 flex justify-end">
                            <button onClick={() => handleSaveToDiary(displayText)} className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-slate-800/50 px-2 py-1 rounded">
                                {isSaved ? <>✓ Salvato</> : <><SaveIcon /> Salva nel Diario</>}
                            </button>
                        </div>
                    )}
                </div>
                {msg.role === 'model' && msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 animate-fade-in-up">
                        {msg.suggestedReplies.map((reply, i) => (
                            <button key={i} onClick={() => performSendMessage(reply)} disabled={isLoading} className="bg-slate-800 border border-purple-500/30 text-purple-300 text-[10px] px-3 py-1.5 rounded-full hover:bg-purple-600 hover:text-white transition-all active:scale-95 shadow-sm font-semibold">{reply}</button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-4 border-t border-slate-700 pt-4">
            {!isOpen ? (
                <>
                    <button 
                        onClick={() => { 
                            if(onCheckAiAccess && !onCheckAiAccess()) return;
                            setIsOpen(true); 
                            setIsMinimized(false);
                            handleStartAnalysis(); 
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-purple-400/30"
                    >
                        <SparklesIcon />
                        {messages.length > 1 ? 'Apri Chat Coach AI' : 'Avvia Analisi Coach AI'}
                    </button>
                    {latestSummary && (
                        <div className="mt-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors group relative overflow-hidden" onClick={() => { setIsOpen(true); setIsMinimized(false); }}>
                            <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-purple-400">
                                <span>Verdetto Coach</span>
                                <div className="h-px bg-purple-500/30 flex-grow"></div>
                            </div>
                            <div className="text-sm text-slate-300 line-clamp-3 italic opacity-90 leading-relaxed group-hover:text-slate-200 transition-colors">
                                <FormattedAnalysis text={latestSummary} />
                            </div>
                        </div>
                    )}
                </>
            ) : isMinimized ? (
                // Minimized State - A Floating Bubble in Sidebar
                <div className="bg-slate-800 border border-purple-500/50 rounded-xl p-3 shadow-xl animate-fade-in cursor-pointer hover:bg-slate-750 transition-colors" onClick={() => setIsMinimized(false)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-600 p-1.5 rounded-lg animate-pulse"><SparklesIcon /></div>
                            <div>
                                <h3 className="font-bold text-white text-xs">Coach AI (Attivo)</h3>
                                <p className="text-[9px] text-slate-400">Clicca per espandere</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-slate-500 hover:text-white">&times;</button>
                    </div>
                </div>
            ) : (
                // Full Screen Modal State
                <div className="fixed inset-0 z-[10000] bg-slate-900 flex flex-col animate-fade-in">
                    <header className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 shadow-md flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-600 p-1.5 rounded-lg"><SparklesIcon /></div>
                            <div>
                                <h3 className="font-black text-white uppercase tracking-tight text-sm">Analisi Corsa AI</h3>
                                <p className="text-[10px] text-purple-400 font-bold">{userProfile.aiPersonality || 'Coach'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsMinimized(true)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white p-2 rounded-lg transition-colors" title="Riduci a icona"><MinimizeIcon /></button>
                            <button onClick={() => setIsOpen(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CloseIcon /> Chiudi</button>
                        </div>
                    </header>
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
                        {messages.map((msg, index) => renderMessage(msg, index))}
                        {isLoading && <div className="flex items-center gap-2 text-slate-500 italic text-xs animate-pulse p-2"><div className="w-2 h-2 bg-purple-500 rounded-full"></div>AI sta analizzando i dati...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-slate-700 bg-slate-800 flex-shrink-0 safe-area-pb">
                        <form onSubmit={handleSend} className="flex gap-2 items-center bg-slate-900 p-1.5 rounded-xl border border-slate-700 focus-within:border-purple-500 transition-colors">
                            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Rispondi al coach..." className="flex-grow bg-transparent p-2 text-sm text-white focus:outline-none placeholder-slate-500" disabled={isLoading} />
                            <button type="submit" disabled={isLoading || !input.trim()} className="bg-purple-600 p-2 rounded-lg text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><SendIcon /></button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeminiTrackAnalysisPanel;
