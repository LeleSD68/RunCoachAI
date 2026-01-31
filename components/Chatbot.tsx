
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
}

const GLOBAL_CHAT_ID = 'global-coach';

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
                    text: `Ciao ${userProfile.name || 'Atleta'}! Sono il tuo Head Coach globale. Conosco il tuo storico, le tue note personali e il tuo programma futuro. Come posso aiutarti a migliorare oggi?`,
                    timestamp: Date.now(),
                    suggestedReplies: ["Analizza il mio stato", "Cosa corro domani?", "Consiglio per maratona"]
                }]);
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
    }, [messages]);

    const generateSystemInstruction = () => {
        const personality = userProfile.aiPersonality || 'pro_balanced';
        const userName = userProfile.name || 'Atleta';
        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const historyContext = tracksToAnalyze.slice(0, 10).map(t => {
            const stats = calculateTrackStats(t);
            return `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(1)}km, Passo ${stats.movingAvgPace.toFixed(2)}/km, Voto: ${t.rating || 'N/D'}. Note: "${t.notes || ''}"`;
        }).join('\n');

        const futureContext = plannedWorkouts
            .filter(w => !w.completedTrackId && new Date(w.date) >= new Date())
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(w => `- ${new Date(w.date).toLocaleDateString()}: ${w.title} (${w.activityType})`)
            .join('\n');

        return `Sei l'HEAD COACH AI di ${userName} (Personalità: ${personality}).
        Hai accesso a tutto: storico corse, giudizi AI passati, note dell'atleta e calendario futuro.
        
        DATA ODIERNA: ${today}.
        
        STORICO RECENTE (Ultime 10):
        ${historyContext || "Nessuna corsa registrata."}
        
        CALENDARIO FUTURO:
        ${futureContext || "Nessun allenamento pianificato."}

        OBIETTIVI: ${userProfile.goals?.join(', ') || 'Miglioramento generale'}.

        REGOLE:
        1. Sii proattivo. Se l'atleta chiede un consiglio, guarda cosa ha fatto negli ultimi giorni.
        2. Se proponi un nuovo allenamento, usa questo formato JSON speciale per permettere il salvataggio:
           :::WORKOUT_PROPOSAL={"title": "Titolo", "activityType": "Lento/Fartlek/Ripetute/Lungo/Gara/Altro", "date": "YYYY-MM-DD", "description": "Dettagli tecnici..."}:::
        3. Rispondi sempre in ITALIANO.
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

    const renderMessage = (msg: ChatMessage, index: number) => {
        const parts = msg.text.split(/:::WORKOUT_PROPOSAL=(.*?):::/g);
        
        return (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} mb-4 animate-fade-in`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-100 rounded-bl-none'}`}>
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

    return (
        <div className={`flex flex-col bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden ${isStandalone ? 'w-full md:w-[450px] h-[600px] md:rounded-3xl' : 'h-full'}`}>
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg"><WhistleIcon /></div>
                    <div>
                        <h3 className="font-black text-white uppercase text-sm tracking-tight">Head Coach AI</h3>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">In ascolto...</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </header>
            
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-slate-900/50">
                {messages.map((msg, idx) => renderMessage(msg, idx))}
                {isLoading && <div className="text-slate-500 text-xs italic animate-pulse p-2">Il coach sta elaborando i dati...</div>}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                <input 
                    type="text" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Chiedi un consiglio o un programma..."
                    className="flex-grow bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition-all shadow-lg"><SendIcon /></button>
            </form>
        </div>
    );
};

export default Chatbot;
