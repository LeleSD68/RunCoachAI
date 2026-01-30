
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Track, UserProfile, ChatMessage, PlannedWorkout } from '../types';
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
}

const GLOBAL_CHAT_ID = 'global-coach';

// ICONE PROFESSIONALI
const WhistleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
);

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

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3.25 3.25a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0V4.75H6.5a.75.75 0 0 0 0-1.5H3.25Zm13.5 0a.75.75 0 0 0 0 1.5H20v3.5a.75.75 0 0 0 1.5 0v-5a.75.75 0 0 0-1.5 0H16.75Zm-13.5 13.5a.75.75 0 0 0 0-1.5H1.75v-3.5a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0h3.25Zm13.5 0a.75.75 0 0 0 0-1.5H18.25v-3.5a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0h3.5Z" clipRule="evenodd" />
    </svg>
);

const MinimizeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3.25 7.5a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 .75-.75v-5a.75.75 0 0 0-1.5 0V6.5H3.25Zm13.5 0a.75.75 0 0 0 0 1.5H12.5a.75.75 0 0 0-.75-.75v-5a.75.75 0 0 0 1.5 0V6.5h4.25Zm-13.5 5a.75.75 0 0 0 0-1.5H7.5V7.75a.75.75 0 0 0 1.5 0v5a.75.75 0 0 0-.75.75h-5Zm13.5 0a.75.75 0 0 0 0-1.5h-4.25V7.75a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 .75.75h5Z" clipRule="evenodd" />
    </svg>
);

const Chatbot: React.FC<ChatbotProps> = ({ tracksToAnalyze = [], userProfile, onClose, isStandalone = false, onAddPlannedWorkout, plannedWorkouts = [] }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatSessionRef = useRef<Chat | null>(null);

    useEffect(() => {
        loadChatFromDB(GLOBAL_CHAT_ID).then(saved => {
            if (saved && saved.length > 0) {
                setMessages(saved);
            } else {
                setMessages([{
                    role: 'model',
                    text: `Ciao ${userProfile.name || 'Atleta'}! Sono il tuo Head Coach. Ho accesso completo al tuo storico, alle tue analisi passate e al tuo diario futuro. Lavoriamo insieme sui tuoi obiettivi!`,
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
    }, [messages, isFullscreen]);

    const generateSystemInstruction = () => {
        const personality = userProfile.aiPersonality || 'pro_balanced';
        const userName = userProfile.name || 'Atleta';
        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        // Costruiamo un contesto ultra-dettagliato che include "Pensieri precedenti" (note/rating)
        const detailedHistory = tracksToAnalyze.slice(0, 10).map(t => {
            const stats = calculateTrackStats(t);
            const notes = t.notes ? `Note Atleta: "${t.notes}"` : '';
            const aiReason = t.ratingReason ? `Tuo Giudizio Passato: "${t.ratingReason}" (${t.rating}★)` : '';
            const workoutLink = t.linkedWorkout ? `Piano Originale: ${t.linkedWorkout.title}` : '';
            
            return `
            - DATA: ${t.points[0].time.toLocaleDateString()}
              Tipo: ${t.activityType || 'Generico'} | Dist: ${t.distance.toFixed(1)}km | Passo: ${stats.avgPace.toFixed(2)} min/km | FC: ${stats.avgHr ? Math.round(stats.avgHr) : 'N/A'}
              ${notes}
              ${aiReason}
              ${workoutLink}
            `;
        }).join('\n');

        const upcomingWorkouts = plannedWorkouts
            .filter(w => !w.completedTrackId) 
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(w => `- ${new Date(w.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}: ${w.activityType} "${w.title}" (Desc: ${w.description.substring(0, 50)}...)`)
            .join('\n');

        return `Sei l'HEAD COACH AI di ${userName} (Personalità: ${personality}).
        Sei il "Cervello Unico": conosci tutto il passato, il futuro (diario) e i giudizi che tu stesso hai dato alle singole corse (tramite rating e note).
        
        DATA OGGI: ${today}.
        
        IL TUO CERVELLO (DATI):
        1. STORICO & MEMORIA ANALISI (Ultime 10):
        ${detailedHistory || "Nessuno storico disponibile."}
        
        2. IL FUTURO (DIARIO):
        ${upcomingWorkouts || "Nessun piano futuro."}
        
        OBIETTIVI ATLETA: ${userProfile.goals?.join(', ') || 'Miglioramento generale'}.

        REGOLE FONDAMENTALI:
        - Devi avere una visione d'insieme. Collega i puntini tra le corse passate e il piano futuro.
        - Se l'utente chiede "Come è andata l'ultima corsa?", leggi i dati nell'elenco sopra (inclusi i tuoi giudizi passati in "Tuo Giudizio Passato").
        - Se l'utente chiede "Cosa faccio domani?", guarda il Diario. Se è vuoto, proponi qualcosa di sensato basandoti sul recupero (calcolato dall'ultima corsa).
        
        PROTOCOLLO SUGGERIMENTO NUOVI ALLENAMENTI:
        Se generi nuovi allenamenti, inserisci blocchi JSON:
        :::WORKOUT_PROPOSAL={"title": "...", "activityType": "...", "date": "YYYY-MM-DD", "description": "..."}:::
        
        STILE:
        - Rispondi in ITALIANO.
        - Sii PROFESSIONALE, TECNICO ma EMPATICO.
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
                <div className={`max-w-[90%] p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-100 rounded-bl-none'}`}>
                    {parts.map((part, i) => {
                        if (i % 2 === 1) { // It's a JSON block
                            try {
                                const w = JSON.parse(part);
                                return (
                                    <div key={i} className="my-3 bg-slate-800 p-3 rounded-lg border border-purple-500/50 text-xs shadow-lg">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-purple-400 uppercase tracking-wider">{w.activityType}</span>
                                            <span className="text-slate-400">{w.date}</span>
                                        </div>
                                        <div className="font-bold text-white text-sm mb-2">{w.title}</div>
                                        <div className="text-slate-300 mb-3 italic">"{w.description}"</div>
                                        {onAddPlannedWorkout && (
                                            <button 
                                                onClick={() => handleAddToDiary(part)}
                                                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded w-full font-bold transition-colors uppercase text-[10px] tracking-widest shadow-md"
                                            >
                                                + Aggiungi al Diario
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

    const containerClasses = isFullscreen 
        ? 'fixed inset-0 z-[10000] rounded-none' 
        : `flex flex-col bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden ${isStandalone ? 'w-full md:w-[400px] h-[500px] md:rounded-2xl' : 'h-full'}`;

    return (
        <div className={`${containerClasses} bg-slate-900 flex flex-col transition-all duration-300`}>
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0 shadow-md relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/50">
                        <WhistleIcon />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-base uppercase tracking-tight">Head Coach AI</h3>
                        <p className="text-[10px] text-purple-400 uppercase font-bold tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Live Analysis
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Toggle Fullscreen */}
                    {isStandalone && (
                        <button 
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" 
                            title={isFullscreen ? "Riduci" : "Espandi a tutto schermo"}
                        >
                            {isFullscreen ? <MinimizeIcon /> : <ExpandIcon />}
                        </button>
                    )}
                    <button onClick={handleClearChat} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors" title="Cancella chat"><TrashIcon /></button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-bold text-lg">&times;</button>
                </div>
            </header>
            
            <div className="flex-grow overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-900/50 relative">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-slate-900"></div>
                
                <div className="relative z-10 space-y-4 max-w-4xl mx-auto w-full">
                    {messages.map((msg, idx) => renderMessage(msg, idx))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-slate-500 text-xs italic animate-pulse p-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Il coach sta elaborando il piano...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2 shrink-0 z-10"
            >
                <div className="max-w-4xl mx-auto w-full flex gap-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder="Chiedi un consiglio, un'analisi o un piano..."
                        className="flex-grow bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-colors shadow-inner"
                        disabled={isLoading}
                        autoFocus={isFullscreen}
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim() || isLoading}
                        className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
                    >
                        <SendIcon />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot;
