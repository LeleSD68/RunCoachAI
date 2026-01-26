
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { UserProfile, Track, ChatMessage, PlannedWorkout, AiPersonality, ActivityType } from '../types';
import { loadChatFromDB, saveChatToDB, deleteChatFromDB } from '../services/dbService';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';
import FormattedAnalysis from './FormattedAnalysis';
import { getGenAI, retryWithPolicy, getFriendlyErrorMessage } from '../services/aiHelper';

interface ChatbotProps {
    tracksToAnalyze?: Track[];
    userProfile: UserProfile;
    onClose?: () => void;
    isStandalone?: boolean;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    plannedWorkouts?: PlannedWorkout[];
    onCheckAiAccess?: () => boolean; // New prop
}

const SparklesIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-cyan-400"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 hover:text-red-400"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);
const CalendarPlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75ZM10 9.75a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>);
const CheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>);
const DocumentPlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 18 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 16.5v-13Zm10 0v3.5a.5.5 0 0 0 .5.5h3.5l-4-4ZM7.75 10.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" /></svg>);
const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 11.06.02L10 11.168l3.71-3.938a.75.75 0 1 11.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>);

const LogoIcon = () => (
    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm border border-slate-700 mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M13.5 2c-5.621 0-10.212 4.43-10.475 10h-3.006l4.492 4.5 4.492-4.5h-2.975c.26-3.902 3.504-7 7.472-7 4.142 0 7.5 3.358 7.5 7.5s-3.358 7.5-7.5 7.5c-2.381 0-4.502-1.119-5.876-2.854l-1.847 2.449c1.919 2.088 4.664 3.405 7.723 3.405 5.799 0 10.5-4.701 10.5-10.5s-4.701-10.5-10.5-10.5z"/>
        </svg>
    </div>
);

const SUGGESTIONS = ["Come sto andando?", "Analizza ultima corsa", "Consigli recupero", "Genera tabella", "Prossima gara?"];

const Chatbot: React.FC<ChatbotProps> = ({ tracksToAnalyze = [], userProfile, onClose, isStandalone = false, onAddPlannedWorkout, plannedWorkouts = [], onCheckAiAccess }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [savedNoteIndexes, setSavedNoteIndexes] = useState<Set<string>>(new Set());
    
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const chatSessionRef = useRef<Chat | null>(null);
    const hasInitializedRef = useRef(false);
    const lastUserMessageRef = useRef<HTMLDivElement>(null); 
    const isSendingRef = useRef(false); 
    
    const contextMode = 'global';
    const isSidebar = !isStandalone;
    const dims = { w: 400, h: 600 };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const initChat = async () => {
            if (hasInitializedRef.current) return;

            const saved = await loadChatFromDB('global-coach');
            const initialCollapsed: Record<string, boolean> = {};
            
            setMessages(prev => {
                const initialMsg: ChatMessage = {
                    role: 'model',
                    text: `Ciao ${userProfile.name || 'Atleta'}! Sono il tuo Running Coach AI. Posso analizzare il tuo storico, darti consigli su allenamenti e recupero o creare una tabella personalizzata. Come posso aiutarti oggi?`,
                    timestamp: Date.now()
                };

                let finalMessages: ChatMessage[] = prev;
                if (saved && saved.length > 0) {
                    if (prev.length === 0) finalMessages = saved;
                    else {
                        const lastSavedTime = saved![saved!.length - 1].timestamp || 0;
                        const newLocalMessages = prev.filter(m => (m.timestamp || 0) > lastSavedTime);
                        finalMessages = [...saved!, ...newLocalMessages];
                    }
                } else {
                    finalMessages = prev.length > 0 ? prev : [initialMsg];
                }

                const dates = new Set(finalMessages.map(m => new Date(m.timestamp || Date.now()).toLocaleDateString()));
                const sortedDates = Array.from(dates); 
                const latestDate = sortedDates[sortedDates.length - 1];
                
                sortedDates.forEach((d: string) => {
                    if (d !== latestDate) initialCollapsed[d] = true;
                });
                
                return finalMessages;
            });
            
            setCollapsedSections(prev => ({...prev, ...initialCollapsed}));
            hasInitializedRef.current = true;
            
            setTimeout(() => {
                if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
            }, 200);
        };
        initChat();
    }, [userProfile.name]);

    useEffect(() => {
        if (messages.length > 0) {
            saveChatToDB('global-coach', messages);
        }
    }, [messages]);

    useEffect(() => {
        if (isSendingRef.current && lastUserMessageRef.current) {
            lastUserMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            isSendingRef.current = false;
        }
    }, [messages]);

    const handleResetChat = async () => {
        if (window.confirm("Sei sicuro di voler cancellare tutta la cronologia della chat?")) {
            await deleteChatFromDB('global-coach');
            const initialMsg: ChatMessage = {
                role: 'model',
                text: `Ciao ${userProfile.name || 'Atleta'}! Chat resettata. Sono pronto per una nuova analisi. Come posso aiutarti?`,
                timestamp: Date.now()
            };
            setMessages([initialMsg]);
            chatSessionRef.current = null;
            initChatSession(true);
        }
    };

    const generateSystemInstruction = () => {
        const personality = userProfile.aiPersonality || 'pro_balanced';
        const userName = userProfile.name || 'Atleta';
        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoToday = new Date().toISOString().split('T')[0];
        
        const recentRuns = tracksToAnalyze
            .sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime())
            .slice(0, 10)
            .map(t => `- ${t.points[0].time.toLocaleDateString()} (${t.activityType || 'Generica'}): ${t.distance.toFixed(2)}km`)
            .join('\n');

        const upcomingWorkouts = plannedWorkouts
            .filter(w => !w.completedTrackId && new Date(w.date) >= new Date(new Date().setHours(0,0,0,0)))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 7)
            .map(w => `- ${new Date(w.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}: ${w.activityType} "${w.title}"`)
            .join('\n');

        return `Sei un Running Coach AI personale (Personalità: ${personality}).
        Data di oggi: ${today} (${isoToday}).
        Nome Atleta: ${userName}.
        
        CRITICO - GESTIONE DIARIO:
        Allenamenti pianificati:
        ${upcomingWorkouts || "Nessuno."}

        Se l'utente chiede cosa fare, consulta PRIMA il diario. Se c'è un piano, confermalo.
        
        STORICO RECENTE:
        ${recentRuns || "Nessuna corsa recente."}
        
        PROTOCOLLO SUGGERIMENTO NUOVI ALLENAMENTI:
        Se generi nuovi allenamenti, inserisci blocchi JSON:
        :::WORKOUT_PROPOSAL={"title": "...", "activityType": "...", "date": "YYYY-MM-DD", "description": "..."}:::
        
        STILE:
        - Rispondi in ITALIANO.
        - Sii SINTETICO.
        `;
    };

    const initChatSession = (force = false) => {
        if (!chatSessionRef.current || force) {
            const ai = getGenAI();
            const validHistory = messages.filter(m => m.text && (m.role === 'user' || m.role === 'model')).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            
            chatSessionRef.current = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: generateSystemInstruction() },
                history: validHistory
            });
        }
    };

    const handleSaveWorkout = (workoutData: any, messageIndex: number, workoutIndex: number) => {
        if (!onAddPlannedWorkout) return;
        const chatMessageText = messages[messageIndex].text.replace(/:::WORKOUT_PROPOSAL=.*?:::/g, '').split(':::SUGGESTIONS')[0].trim();
        const jsonDescription = workoutData.description || "";
        const fullDescription = `**Dettagli Tecnici:**\n${jsonDescription}\n\n**Contesto:**\n${chatMessageText}`;

        const workout: PlannedWorkout = {
            id: `chat-workout-${Date.now()}-${Math.random()}`,
            title: workoutData.title || "Allenamento Coach",
            description: fullDescription,
            date: new Date(workoutData.date),
            activityType: (workoutData.activityType as ActivityType) || 'Altro',
            isAiSuggested: true
        };
        onAddPlannedWorkout(workout);
        setSavedNoteIndexes(prev => new Set(prev).add(`${messageIndex}-${workoutIndex}`));
    };

    const handleSaveAsNote = (msg: ChatMessage, index: number) => {
        if (!onAddPlannedWorkout) return;
        const cleanText = msg.text.replace(/:::WORKOUT_PROPOSAL=.*?:::/g, '').split(':::SUGGESTIONS')[0].trim();
        const noteWorkout: PlannedWorkout = {
            id: `chat-note-${Date.now()}`,
            title: "Nota Coach AI",
            description: cleanText,
            date: new Date(),
            activityType: 'Nota',
            isAiSuggested: true
        };
        onAddPlannedWorkout(noteWorkout);
        setSavedNoteIndexes(prev => new Set(prev).add(`${index}-note`));
    };

    const performSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;
        
        // CHECK LIMIT HERE
        if (onCheckAiAccess && !onCheckAiAccess()) return;

        const userMsg = { role: 'user' as const, text, timestamp: Date.now() };
        isSendingRef.current = true;
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        window.gpxApp?.trackApiRequest();

        try {
            await retryWithPolicy(async () => {
                initChatSession();
                if (chatSessionRef.current) {
                    const result = await chatSessionRef.current.sendMessageStream({ message: text });
                    setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);
                    
                    let fullText = '';
                    let finalTokenCount = 0;

                    for await (const chunk of result) {
                        const c = chunk as GenerateContentResponse;
                        fullText += c.text || '';
                        if (c.usageMetadata?.totalTokenCount) finalTokenCount = c.usageMetadata.totalTokenCount;
                        
                        setMessages(prev => {
                            if (prev.length === 0) return prev;
                            const newMsgs = [...prev];
                            const lastIdx = newMsgs.length - 1;
                            if (newMsgs[lastIdx].role === 'model') newMsgs[lastIdx].text = fullText;
                            return newMsgs;
                        });
                    }
                    if (finalTokenCount > 0) window.gpxApp?.addTokens(finalTokenCount);

                    const workoutRegex = /:::WORKOUT_PROPOSAL=(.*?):::/g;
                    const workouts: any[] = [];
                    let cleanText = fullText.replace(workoutRegex, (match, jsonPart) => {
                        try {
                            const parsed = JSON.parse(jsonPart);
                            if (parsed.activityType === 'Running') parsed.activityType = 'Lento';
                            workouts.push(parsed);
                        } catch (e) { console.error(e); }
                        return '';
                    }).trim();

                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        lastMsg.text = cleanText;
                        lastMsg.suggestedWorkouts = workouts.length > 0 ? workouts : undefined;
                        return newMsgs;
                    });
                }
            });
        } catch (e: any) {
            const friendlyError = getFriendlyErrorMessage(e);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last.role === 'model' && !last.text) {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { role: 'model', text: friendlyError, timestamp: Date.now() };
                    return newMsgs;
                }
                return [...prev, { role: 'model', text: friendlyError, timestamp: Date.now() }];
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        performSendMessage(input);
    };

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const groupedMessages = useMemo(() => {
        const groups: Record<string, ChatMessage[]> = {};
        messages.forEach(m => {
            const dateKey = new Date(m.timestamp || Date.now()).toLocaleDateString();
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(m);
        });
        return Object.entries(groups);
    }, [messages]);

    const renderMessageContent = (msg: ChatMessage, index: number, isLastUserMessage: boolean) => (
        <div 
            ref={isLastUserMessage ? lastUserMessageRef : null} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full scroll-mt-20`}
        >
            <div className={`max-w-[95%] sm:max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-700 text-white rounded-tr-none' : 'bg-slate-700 text-slate-100 rounded-tl-none'} shadow-sm text-sm`}>
                <FormattedAnalysis text={msg.text} />
                
                {msg.suggestedWorkouts && msg.suggestedWorkouts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 animate-fade-in-up space-y-3">
                        {msg.suggestedWorkouts.map((workout, wIdx) => {
                            const isSaved = savedNoteIndexes.has(`${index}-${wIdx}`);
                            return (
                                <div key={wIdx} className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/30">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Proposta {wIdx + 1}</span>
                                        <span className="text-[10px] font-mono text-slate-400">{new Date(workout.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="font-bold text-white text-sm">{workout.title}</div>
                                    <div className="text-xs text-slate-300 mt-1 line-clamp-2 italic">{workout.activityType}</div>
                                    <div className="mt-2">
                                        {isSaved ? (
                                            <button disabled className="w-full bg-green-600/20 text-green-400 border border-green-500/50 font-bold py-1.5 rounded text-xs flex items-center justify-center gap-2 cursor-default"><CheckIcon /> Salvato</button>
                                        ) : (
                                            <button onClick={() => handleSaveWorkout(workout, index, wIdx)} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 rounded text-xs flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95"><CalendarPlusIcon /> Aggiungi</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {msg.role === 'model' && !msg.suggestedWorkout && (!msg.suggestedWorkouts || msg.suggestedWorkouts.length === 0) && onAddPlannedWorkout && msg.text.length > 50 && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
                        <button 
                            onClick={() => handleSaveAsNote(msg, index)}
                            disabled={savedNoteIndexes.has(`${index}-note`)}
                            className={`flex items-center gap-1 text-[10px] font-bold uppercase transition-colors px-2 py-1 rounded ${savedNoteIndexes.has(`${index}-note`) ? 'text-green-400 bg-green-900/20' : 'text-slate-400 hover:text-white bg-slate-800/30 hover:bg-slate-700'}`}
                        >
                            {savedNoteIndexes.has(`${index}-note`) ? <><CheckIcon /> Salvato</> : <><DocumentPlusIcon /> Salva come Nota</>}
                        </button>
                    </div>
                )}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );

    const windowStyle: React.CSSProperties = isMaximized 
        ? { position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, width: '100vw', height: '100vh', zIndex: 12000, borderRadius: 0 }
        : isSidebar 
            ? { width: '100%', height: '100%', position: 'relative' }
            : isMobile 
                ? { position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', height: '80vh', zIndex: 12000, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.4)' }
                : { width: `${dims.w}px`, height: `${dims.h}px`, position: 'relative', zIndex: 4000 };

    return (
        <div style={windowStyle} className={`flex flex-col bg-slate-800 text-white shadow-2xl overflow-hidden border border-slate-700 transition-all duration-300 ${!isMaximized && !isSidebar && !isMobile ? 'rounded-lg' : ''}`}>
            <header className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-900 flex-shrink-0 cursor-default select-none">
                <div className="flex items-center">
                    <LogoIcon />
                    <div className="flex items-center">
                        <SparklesIcon />
                        <div>
                            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-tighter">{contextMode === 'global' ? 'Coach AI' : 'Analisi'}</h2>
                            <p className="text-[10px] text-slate-500 leading-none">{userProfile.aiPersonality || 'Pro'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={handleResetChat} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors active:scale-90" title="Resetta Chat"><TrashIcon /></button>
                    {!isSidebar && (
                        <button onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors active:scale-90">
                            {isMaximized ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4.25 10a.75.75 0 0 0-1.78 0v4.25H7a.75.75 0 0 0 0-1.5H4.25V10ZM13 5.75a.75.75 0 0 0 0 1.5h2.75V10a.75.75 0 0 0 1.5 0V5.75H13Z" /><path d="M15.75 10a.75.75 0 0 1 1.5 0v4.25H13a.75.75 0 0 1 0-1.5h2.75V10ZM7 5.75a.75.75 0 0 1 0 1.5H4.25V10a.75.75 0 0 1-1.5 0V5.75H7Z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.25 3A.75.75 0 0 1 4 3.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 3.25 3Zm3.5 0A.75.75 0 0 1 7.5 3.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 6.75 3ZM13.25 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm3.5 0A.75.75 0 0 1 17.5 3.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM3.25 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM3.5 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM6.75 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM13.25 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM16.75 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    )}
                    {onClose && <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors text-xl leading-none" title="Chiudi">&times;</button>}
                </div>
            </header>
            <div ref={scrollAreaRef} className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-800/50">
                {messages.length <= 1 && contextMode === 'global' && (
                    <div className="mb-6 animate-fade-in-down">
                        <AiTrainingCoachPanel userProfile={userProfile} allHistory={tracksToAnalyze} onAddPlannedWorkout={onAddPlannedWorkout} plannedWorkouts={plannedWorkouts} isCompact={true} onCheckAiAccess={onCheckAiAccess} />
                    </div>
                )}
                
                {groupedMessages.map(([dateKey, msgs]) => {
                    const isCollapsed = collapsedSections[dateKey];
                    return (
                        <div key={dateKey} className="mb-4">
                            <button onClick={() => toggleSection(dateKey)} className="flex items-center w-full text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 hover:text-cyan-400 transition-colors group sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10 py-1">
                                <ChevronDownIcon className={`w-3 h-3 mr-1 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                                <span className="flex-grow border-b border-slate-700/50 pb-0.5 text-left group-hover:border-cyan-500/50">{dateKey}</span>
                            </button>
                            {!isCollapsed && (
                                <div className="space-y-4">
                                    {msgs.map((msg) => {
                                        const globalIndex = messages.indexOf(msg);
                                        const isLastUserMessage = msg.role === 'user' && globalIndex === messages.length - 2; 
                                        return <div key={globalIndex}>{renderMessageContent(msg, globalIndex, isLastUserMessage)}</div>;
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                {isLoading && <div className="flex space-x-1 p-3 bg-slate-700 rounded-xl w-12 animate-pulse"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full delay-75"></div><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full delay-150"></div></div>}
            </div>
            <div className="p-3 border-t border-slate-700 bg-slate-900/50 flex-shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar scroll-smooth">
                    {SUGGESTIONS.map((suggestion, i) => (<button key={i} onClick={() => performSendMessage(suggestion)} disabled={isLoading} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-[10px] sm:text-xs text-slate-300 hover:bg-slate-700 hover:border-cyan-500 transition-all disabled:opacity-50 active:scale-95">{suggestion}</button>))}
                </div>
                <form onSubmit={handleSend} className="flex items-center bg-slate-700 rounded-xl px-2 border border-slate-600 focus-within:border-cyan-500 shadow-inner">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={contextMode === 'global' ? "Chiedi al coach generale..." : "Chiedi su questa corsa..."} className="w-full bg-transparent p-3 focus:outline-none text-sm placeholder-slate-500" disabled={isLoading} />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-2 text-cyan-400 hover:text-cyan-300 transition-transform active:scale-90">🚀</button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
