import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Track, UserProfile, ChatMessage, PlannedWorkout } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';
import FormattedAnalysis from './FormattedAnalysis';
import { getGenAI, retryWithPolicy, isAuthError, ensureApiKey } from '../services/aiHelper';
import { saveChatToDB, loadChatFromDB } from '../services/dbService';

interface ChatbotProps {
    tracksToAnalyze?: Track[];
    userProfile: UserProfile;
    onClose: () => void;
    isStandalone?: boolean;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    plannedWorkouts?: PlannedWorkout[];
}

const GLOBAL_CHAT_ID = 'global-coach';

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
);

const Chatbot: React.FC<ChatbotProps> = ({ tracksToAnalyze = [], userProfile, onClose, isStandalone = false, onAddPlannedWorkout, plannedWorkouts = [] }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatSessionRef = useRef<Chat | null>(null);

    useEffect(() => {
        loadChatFromDB(GLOBAL_CHAT_ID).then(saved => {
            if (saved && saved.length > 0) {
                setMessages(saved);
            } else {
                setMessages([{
                    role: 'model',
                    text: `Ciao ${userProfile.name || 'Atleta'}! Sono il tuo Running Coach AI. Conosco tutto il tuo storico. Come posso aiutarti oggi?`,
                    timestamp: Date.now(),
                    suggestedReplies: ["Analizza il mio stato", "Dammi un consiglio", "Prossima gara?"]
                }]);
            }
        });
    }, [userProfile.name]);

    useEffect(() => {
        if (messages.length > 0) {
            saveChatToDB(GLOBAL_CHAT_ID, messages).catch(console.error);
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const generateSystemInstruction = () => {
        const personality = userProfile.aiPersonality || 'pro_balanced';
        const userName = userProfile.name || 'Atleta';
        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoToday = new Date().toISOString().split('T')[0];
        
        const recentRuns = tracksToAnalyze.slice(0, 5).map(t => {
            const stats = calculateTrackStats(t);
            return `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(1)}km @ ${stats.avgPace.toFixed(2)} min/km (HR: ${stats.avgHr ? Math.round(stats.avgHr) : 'N/A'})`;
        }).join('\n');

        const upcomingWorkouts = plannedWorkouts
            .filter(w => !w.completedTrackId) 
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(w => `- ${new Date(w.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}: ${w.activityType} "${w.title}"`)
            .join('\n');

        return `Sei un Running Coach AI personale (Personalità: ${personality}).
        Data di oggi: ${today} (${isoToday}).
        Nome Atleta: ${userName}.
        
        DIARIO ALLENAMENTI (PIANO):
        ${upcomingWorkouts || "Nessuno."}

        PROTOCOLLO DI ANALISI UNIFICATO:
        1. Se l'utente chiede di analizzare una corsa specifica o passata:
           - CONTROLLA SEMPRE IL DIARIO per quella data.
           - Se c'era un allenamento previsto, CHIEDI CONFERMA: "Era l'allenamento [Titolo] previsto?".
           - Se confermato, confronta i dati con il piano.
           - Se non confermato o non previsto, deduci il tipo di corsa dai dati (Lento, Ripetute, etc).
        
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
                if (e.message === 'API_KEY_MISSING') console.warn("API Key missing");
                else throw e;
            }
        }
    };

    const handleSend = async (text: string) => {
        if (!text.trim() || isLoading) return;
        
        window.gpxApp?.trackApiRequest();
        
        const userMsg = { role: 'user' as const, text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            await retryWithPolicy(async () => {
                initChat();
                if (chatSessionRef.current) {
                    const result = await chatSessionRef.current.sendMessageStream({ message: text });
                    
                    setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);
                    let fullText = '';
                    let finalTokenCount = 0;

                    for await (const chunk of result) {
                        const c = chunk as GenerateContentResponse;
                        const chunkText = c.text || '';
                        fullText += chunkText;
                        if (c.usageMetadata?.totalTokenCount) finalTokenCount = c.usageMetadata.totalTokenCount;
                        
                        setMessages((prev) => {
                            const next = [...prev];
                            if (next.length > 0) next[next.length - 1].text = fullText;
                            return next;
                        });
                    }
                    if (finalTokenCount > 0) window.gpxApp?.addTokens(finalTokenCount);
                }
            });
        } catch (e: any) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: "⚠️ Errore connessione AI. Riprova più tardi.", timestamp: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        if (confirm("Cancellare tutta la cronologia chat?")) {
            setMessages([]);
            chatSessionRef.current = null;
            saveChatToDB(GLOBAL_CHAT_ID, []);
        }
    };

    const handleAddToDiary = (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            if (onAddPlannedWorkout) {
                onAddPlannedWorkout({
                    id: `ai-prop-${Date.now()}`,
                    title: data.title,
                    description: data.description,
                    date: new Date(data.date),
                    activityType: data.activityType,
                    isAiSuggested: true
                });
            }
        } catch (e) { console.error("Invalid JSON workout", e); }
    };

    const renderMessage = (msg: ChatMessage, index: number) => {
        // Parse for workout proposals
        const parts = msg.text.split(/:::WORKOUT_PROPOSAL=(.*?):::/g);
        
        return (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4`}>
                <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-100 rounded-bl-none'}`}>
                    {parts.map((part, i) => {
                        if (i % 2 === 1) { // It's a JSON block
                            try {
                                const w = JSON.parse(part);
                                return (
                                    <div key={i} className="my-2 bg-slate-800 p-2 rounded border border-purple-500/50 text-xs">
                                        <div className="font-bold text-purple-400 uppercase mb-1">{w.title}</div>
                                        <div className="text-slate-300 mb-2">{w.date} - {w.activityType}</div>
                                        {onAddPlannedWorkout && (
                                            <button 
                                                onClick={() => handleAddToDiary(part)}
                                                className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded w-full font-bold transition-colors"
                                            >
                                                Aggiungi a Calendario
                                            </button>
                                        )}
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

    return (
        <div className={`flex flex-col bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden ${isStandalone ? 'w-full md:w-[400px] h-[500px] md:rounded-2xl' : 'h-full'}`}>
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-xl">🤖</div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Coach AI</h3>
                        <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleClearChat} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Cancella chat"><TrashIcon /></button>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors text-xl">&times;</button>
                </div>
            </header>
            
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-slate-900/50">
                {messages.map((msg, idx) => renderMessage(msg, idx))}
                {isLoading && <div className="text-slate-500 text-xs italic animate-pulse">Il coach sta scrivendo...</div>}
                <div ref={messagesEndRef} />
            </div>

            <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2 shrink-0"
            >
                <input 
                    type="text" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Scrivi un messaggio..."
                    className="flex-grow bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={!input.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SendIcon />
                </button>
            </form>
        </div>
    );
};

export default Chatbot;
