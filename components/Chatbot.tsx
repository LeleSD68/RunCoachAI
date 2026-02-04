
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Track, UserProfile, ChatMessage, PlannedWorkout, ActivityType } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';
import FormattedAnalysis from './FormattedAnalysis';
import { getGenAI, retryWithPolicy } from '../services/aiHelper';
import { saveChatToDB, loadChatFromDB } from '../services/dbService';

interface ChatbotProps {
    tracksToAnalyze?: Track[];
    userProfile: UserProfile;
    onClose: () => void;
    isStandalone?: boolean;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    plannedWorkouts?: PlannedWorkout[];
    onCheckAiAccess?: (feature: 'workout' | 'analysis' | 'chat') => boolean;
}

const GLOBAL_CHAT_ID = 'global-coach';

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
);

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3.25 3.25a.75.75 0 0 1 .75.75v3.25a.25.25 0 0 0 .25.25h3.25a.75.75 0 0 1 0 1.5H4.25A1.75 1.75 0 0 1 2.5 7.25V4a.75.75 0 0 1 .75-.75Zm13.5 0a.75.75 0 0 1 .75.75v3.25a1.75 1.75 0 0 1-1.75 1.75h-3.25a.75.75 0 0 1 0-1.5h3.25a.25.25 0 0 0 .25-.25V4a.75.75 0 0 1 .75-.75Zm-13.5 13.5a.75.75 0 0 1 .75-.75h3.25a.75.75 0 0 1 0 1.5H4.25a.25.25 0 0 0-.25.25v3.25a.75.75 0 0 1-1.5 0v-3.25a1.75 1.75 0 0 1 1.75-1.75Zm13.5 0a.75.75 0 0 1-.75.75h-3.25a.75.75 0 0 1 0-1.5h3.25a.25.25 0 0 0 .25.25v-3.25a.75.75 0 0 1 1.5 0v3.25a1.75 1.75 0 0 1-1.75 1.75Z" clipRule="evenodd" />
    </svg>
);

const CollapseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9.75 2.5a.75.75 0 0 1 .75.75v3.25a.25.25 0 0 0 .25.25h3.25a.75.75 0 0 1 0 1.5h-3.25a1.75 1.75 0 0 1-1.75-1.75V3.25a.75.75 0 0 1 .75-.75Zm-7 7.75a.75.75 0 0 1 .75-.75h3.25a.25.25 0 0 0 .25-.25V6a.75.75 0 0 1 1.5 0v3.25a1.75 1.75 0 0 1-1.75 1.75H3.5a.75.75 0 0 1-.75-.75Zm13.5 6.5a.75.75 0 0 1 .75-.75v-3.25a1.75 1.75 0 0 1-1.75-1.75h-3.25a.75.75 0 0 1 0-1.5h3.25a.25.25 0 0 0 .25.25v3.25a.75.75 0 0 1-.75.75Zm-7-7.75a.75.75 0 0 1-.75.75H5.25a.25.25 0 0 0-.25.25v3.25a.75.75 0 0 1-1.5 0v-3.25a1.75 1.75 0 0 1 1.75-1.75h3.25a.75.75 0 0 1 .75.75Z" clipRule="evenodd" />
    </svg>
);

const Chatbot: React.FC<ChatbotProps> = ({ tracksToAnalyze = [], userProfile, onClose, isStandalone = false, onAddPlannedWorkout, plannedWorkouts = [], onCheckAiAccess }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatSessionRef = useRef<Chat | null>(null);
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        loadChatFromDB(GLOBAL_CHAT_ID).then(saved => {
            if (saved && saved.length > 0) {
                setMessages(saved);
                // Open only the latest date by default
                const dates = new Set(saved.map(m => new Date(m.timestamp).toLocaleDateString()));
                setExpandedDates(dates);
            } else {
                setMessages([{
                    role: 'model',
                    text: `Ciao ${userProfile.name || 'Atleta'}! Sono il tuo Head Coach globale. Conosco il tuo storico, le tue note personali e il tuo programma futuro. Come posso aiutarti a migliorare oggi?`,
                    timestamp: Date.now(),
                    suggestedReplies: ["Analizza il mio stato", "Cosa corro domani?", "Consiglio per maratona"]
                }]);
                setExpandedDates(new Set([new Date().toLocaleDateString()]));
            }
        });
    }, [userProfile.name]);

    useEffect(() => {
        if (messages.length > 0) {
            saveChatToDB(GLOBAL_CHAT_ID, messages).catch(console.error);
        }
    }, [messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, expandedDates, isExpanded]); 

    const generateSystemInstruction = () => {
        const personality = userProfile.aiPersonality || 'pro_balanced';
        const userName = userProfile.name || 'Atleta';
        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const historyContext = tracksToAnalyze.slice(0, 10).map(t => {
            const stats = calculateTrackStats(t);
            return `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(1)}km, Passo ${stats.movingAvgPace.toFixed(2)}/km, Voto: ${t.rating || 'N/D'}. Note: "${t.notes || 'Nessuna nota'}"`;
        }).join('\n');

        const futureContext = plannedWorkouts
            .filter(w => !w.completedTrackId && new Date(w.date) >= new Date())
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(w => `- ${new Date(w.date).toLocaleDateString()}: ${w.title} (${w.activityType}) [${w.entryType}]`)
            .join('\n');

        if (personality === 'friend_coach') {
            return `Agisci come il mio Coach Personale di Corsa e il mio miglior amico. Il tuo nome è COACH AI, hai un tono empatico, sei un supporto costante e mi conosci a fondo. Il tuo obiettivo è portarmi al raggiungimento dei miei obiettivi stagionali (${userProfile.goals?.join(', ')}), adattando costantemente il programma al mio stile di vita reale.

            DATA ODIERNA: ${today}.
            
            PROFILO UTENTE:
            - Nome: ${userName}
            - Età: ${userProfile.age || 'N/D'} anni
            - Peso: ${userProfile.weight || 'N/D'} kg
            - Impara a prevedere le mie reazioni e i miei limiti.

            STORICO RECENTE (LEGGI ATTENTAMENTE LE NOTE PERSONALI!):
            ${historyContext || "Nessuna corsa registrata."}
            
            DIARIO DI BORDO (Note, Impegni, Programma):
            ${futureContext || "Nessun impegno futuro."}

            REGOLE DI INTERFACCIA E STILE:
            1. Integrazione Dati: Analizza costantemente dati tecnici, diario di bordo e storico chat per una visione a 360°.
            2. Flessibilità Totale: Se noto che una settimana sono libero solo nel weekend o se preferisco correre 2 o 4 volte, adatta il piano istantaneamente senza farmi sentire in colpa, ma motivandomi.
            3. Sintonia Psicologica: Analizza il mio stile. Se uso ironia, rispondi con ironia. Se sono giù, sii il mio pilastro. Anticipa le mie necessità.
            4. Evoluzione: Affina il modello su di me man mano che parliamo.
            5. CONTESTO NOTE: Se nello storico recente vedo note come "stanco", "male al piede", ecc., DEVI tenerne conto.
            6. Se proponi un nuovo allenamento, usa questo formato JSON speciale:
               :::WORKOUT_PROPOSAL={"title": "Titolo", "activityType": "Lento/Fartlek/Ripetute/Lungo/Gara/Altro", "date": "YYYY-MM-DD", "description": "Dettagli tecnici..."}:::
            7. Rispondi sempre in ITALIANO.
            `;
        }

        // Fallback for other personalities
        return `Sei l'HEAD COACH AI di ${userName} (Personalità: ${personality}).
        DATA ODIERNA: ${today}.
        STORICO RECENTE (CON FOCUS SU NOTE PERSONALI):
        ${historyContext || "Nessuna corsa registrata."}
        CALENDARIO FUTURO:
        ${futureContext || "Nessun allenamento pianificato."}
        OBIETTIVI: ${userProfile.goals?.join(', ') || 'Miglioramento generale'}.
        REGOLE:
        1. Sii proattivo.
        2. Se le note indicano problemi fisici o stanchezza, adatta il consiglio.
        3. Formato JSON per allenamenti: :::WORKOUT_PROPOSAL={"title": "Titolo", "activityType": "Type", "date": "YYYY-MM-DD", "description": "Desc"}:::
        4. Rispondi sempre in ITALIANO.
        `;
    };

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
                console.warn("AI Init failed", e);
            }
        }
    };

    const handleSend = async (text: string) => {
        if (!text.trim() || isLoading) return;
        
        if (onCheckAiAccess && !onCheckAiAccess('chat')) return;

        (window as any).gpxApp?.trackApiRequest();
        const userMsg = { role: 'user' as const, text, timestamp: Date.now() };
        
        // Optimistic update
        setMessages(prev => {
            const next = [...prev, userMsg];
            // Ensure today is expanded
            setExpandedDates(d => new Set(d).add(new Date().toLocaleDateString()));
            return next;
        });
        
        setInput('');
        setIsLoading(true);

        try {
            await retryWithPolicy(async () => {
                initChat();
                if (chatSessionRef.current) {
                    const result = await chatSessionRef.current.sendMessageStream({ message: text });
                    // Placeholder for AI message
                    setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);
                    
                    let fullText = '';
                    for await (const chunk of result) {
                        const c = chunk as GenerateContentResponse;
                        fullText += c.text || '';
                        setMessages((prev) => {
                            const next = [...prev];
                            if (next.length > 0) next[next.length - 1].text = fullText;
                            return next;
                        });
                    }
                }
            });
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "⚠️ Connessione interrotta. Riprova.", timestamp: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteMessage = (indexToDelete: number) => {
        setMessages(prev => {
            const next = prev.filter((_, i) => i !== indexToDelete);
            // We need to re-initialize chat history context next time user sends message
            // Ideally we should do it immediately or on next send
            chatSessionRef.current = null; 
            return next;
        });
    };

    const handleAddProposal = (jsonStr: string) => {
        try {
            const data = JSON.parse(jsonStr);
            if (onAddPlannedWorkout) {
                onAddPlannedWorkout({
                    id: `ai-gen-${Date.now()}`,
                    title: data.title,
                    description: data.description,
                    date: new Date(data.date),
                    activityType: data.activityType as ActivityType,
                    isAiSuggested: true
                });
            }
        } catch (e) {
            console.error("JSON Error", e);
        }
    };

    const toggleDateGroup = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const groupedMessages = useMemo(() => {
        const groups: Record<string, { msg: ChatMessage, index: number }[]> = {};
        messages.forEach((msg, index) => {
            const date = new Date(msg.timestamp).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push({ msg, index });
        });
        return groups;
    }, [messages]);

    const renderMessage = (msg: ChatMessage, index: number) => {
        const parts = msg.text.split(/:::WORKOUT_PROPOSAL=(.*?):::/g);
        
        return (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4 animate-fade-in group relative`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm relative ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-100 rounded-bl-none'}`}>
                    
                    {/* Delete Button (Visible on Hover) */}
                    <button 
                        onClick={() => handleDeleteMessage(index)}
                        className={`absolute -top-2 ${msg.role === 'user' ? '-left-2' : '-right-2'} bg-slate-800 text-slate-400 hover:text-red-400 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-slate-600`}
                        title="Elimina messaggio"
                    >
                        <TrashIcon />
                    </button>

                    {parts.map((part, i) => {
                        if (i % 2 === 1) { // It's a JSON block
                            try {
                                const w = JSON.parse(part);
                                return (
                                    <div key={i} className="my-3 bg-slate-800 p-3 rounded-lg border border-purple-500/50 shadow-inner">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{w.activityType}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{w.date}</span>
                                        </div>
                                        <div className="font-bold text-white mb-2">{w.title}</div>
                                        <p className="text-xs text-slate-400 mb-3 italic">"{w.description.substring(0, 100)}..."</p>
                                        <button 
                                            onClick={() => handleAddProposal(part)}
                                            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            + Aggiungi al Diario
                                        </button>
                                    </div>
                                );
                            } catch { return null; }
                        }
                        return <FormattedAnalysis key={i} text={part} />;
                    })}
                </div>
            </div>
        );
    };

    const containerClasses = isExpanded 
        ? "fixed inset-0 z-[13000] w-full h-full rounded-none" 
        : `relative ${isStandalone ? 'w-full md:w-[450px] h-[600px] md:rounded-3xl' : 'h-full'}`;

    return (
        <div className={`flex flex-col bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${containerClasses}`}>
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg border border-purple-400/50 p-1">
                        <img src="/icona.png" alt="AI Coach" className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase text-sm tracking-tight">Coach AI</h3>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">
                                {userProfile.aiPersonality === 'friend_coach' ? 'Best Friend Mode' : 'Online'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)} 
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                        title={isExpanded ? "Comprimi" : "Espandi a tutto schermo"}
                    >
                        {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                    </button>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl p-2 rounded-lg hover:bg-slate-700 transition-colors leading-none">&times;</button>
                </div>
            </header>
            
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-slate-900/50">
                {Object.entries(groupedMessages).map(([date, items]) => (
                    <div key={date} className="mb-6">
                        <div 
                            onClick={() => toggleDateGroup(date)}
                            className="flex items-center justify-center mb-4 cursor-pointer group"
                        >
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-700 group-hover:border-slate-500 transition-colors">
                                {date} {expandedDates.has(date) ? '▼' : '▶'}
                            </span>
                        </div>
                        
                        {expandedDates.has(date) && (
                            <div className="space-y-2">
                                {(items as { msg: ChatMessage, index: number }[]).map(({ msg, index }) => renderMessage(msg, index))}
                            </div>
                        )}
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex items-center gap-2 text-slate-500 text-xs italic p-2 animate-pulse">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Il coach sta scrivendo...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                <input 
                    type="text" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Chiedi un consiglio o aggiorna il coach..."
                    className="flex-grow bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition-all shadow-lg"><SendIcon /></button>
            </form>
        </div>
    );
};

export default Chatbot;
