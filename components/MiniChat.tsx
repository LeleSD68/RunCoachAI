
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, DirectMessage, Track } from '../types';
import { sendDirectMessage, getDirectMessages, updateTrackSharing, getTrackById } from '../services/socialService';
import { supabase } from '../services/supabaseClient';
import { loadTracksFromDB } from '../services/dbService'; // For local selection
import TrackPreview from './TrackPreview';

interface MiniChatProps {
    currentUser: UserProfile; // Full profile needed for ID
    friend: UserProfile;
    onClose: () => void;
    onMinimize?: () => void;
    onViewTrack?: (track: Track) => void;
}

const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>);
const PaperClipIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" /></svg>);

// Helper per formattare la data nei messaggi
const getMessageDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Normalize times to midnight
    date.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    yesterday.setHours(0,0,0,0);

    if (date.getTime() === today.getTime()) return 'Oggi';
    if (date.getTime() === yesterday.getTime()) return 'Ieri';
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); 
};

const MiniChat: React.FC<MiniChatProps> = ({ currentUser, friend, onClose, onViewTrack }) => {
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<number | null>(null);
    
    // Sharing UI
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareTracks, setShareTracks] = useState<Track[]>([]);
    const [fullAccessMode, setFullAccessMode] = useState(false);

    const loadMessages = async () => {
        if (!currentUser.id || !friend.id) return;
        const msgs = await getDirectMessages(currentUser.id, friend.id);
        setMessages(msgs);
    };

    const loadMyTracks = async () => {
        const tracks = await loadTracksFromDB();
        // Filter out external tracks (like ghost tracks)
        setShareTracks(tracks.filter(t => !t.isExternal).slice(0, 10)); // Show latest 10
    };

    // Load initial messages
    useEffect(() => {
        loadMessages();
        loadMyTracks();
        
        intervalRef.current = window.setInterval(loadMessages, 3000);
        
        const channel = supabase.channel(`chat:${currentUser.id}:${friend.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `receiver_id=eq.${currentUser.id}` 
                },
                (payload) => {
                    const newMsg = payload.new;
                    if (newMsg.sender_id === friend.id) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            const msgFormatted: DirectMessage = {
                                id: newMsg.id,
                                senderId: newMsg.sender_id,
                                receiverId: newMsg.receiver_id,
                                content: newMsg.content,
                                createdAt: newMsg.created_at
                            };
                            return [...prev, msgFormatted];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            supabase.removeChannel(channel);
        };
    }, [friend.id, currentUser.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e?: React.FormEvent, customContent?: string) => {
        if (e) e.preventDefault();
        const contentToSend = customContent || newMessage;
        if (!contentToSend.trim() || !currentUser.id || !friend.id) return;

        try {
            const tempMsg: DirectMessage = {
                id: 'temp-' + Date.now(),
                senderId: currentUser.id,
                receiverId: friend.id,
                content: contentToSend,
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMsg]);
            
            await sendDirectMessage(currentUser.id, friend.id, contentToSend);
            if (!customContent) setNewMessage('');
        } catch (e) {
            console.error("Failed to send", e);
        }
    };

    const handleShareTrack = async (track: Track) => {
        if (!currentUser.id || !friend.id) return;
        
        // If full access, update permissions on backend
        if (fullAccessMode) {
            try {
                // Fetch current sharing settings to append instead of overwrite if needed, 
                // but simpler for now: just ensure friend is in list.
                // Assuming we have track locally:
                const currentShared = track.sharedWithUsers || [];
                if (!currentShared.includes(friend.id)) {
                    await updateTrackSharing(
                        track.id, 
                        track.isPublic || false, 
                        [...currentShared, friend.id], 
                        track.sharedWithGroups || []
                    );
                }
            } catch (e) {
                console.error("Failed to update share permissions", e);
                alert("Impossibile concedere permessi. Condivisione annullata.");
                return;
            }
        }

        const payload = JSON.stringify({
            id: track.id,
            name: track.name,
            dist: track.distance.toFixed(1),
            access: fullAccessMode ? 'full' : 'preview'
        });
        
        const messageContent = `:::SHARE_TRACK:${payload}:::`;
        await handleSend(undefined, messageContent);
        setShowShareMenu(false);
    };

    const handleTrackClick = async (trackData: any) => {
        if (trackData.access === 'full') {
            if (onViewTrack) {
                // Fetch full track details
                try {
                    const fullTrack = await getTrackById(trackData.id);
                    if (fullTrack) onViewTrack(fullTrack);
                    else alert("Errore caricamento traccia.");
                } catch(e) { alert("Impossibile caricare traccia."); }
            }
        } else {
            // Preview only - maybe show a simple alert or toast for now
            // Or better, fetch and show in a read-only modal if implemented
            alert(`Anteprima: ${trackData.name} (${trackData.dist}km). Chiedi l'accesso completo per analizzarla!`);
        }
    };

    // Group Messages Logic
    const groupedMessages = useMemo<Record<string, DirectMessage[]>>(() => {
        const groups: Record<string, DirectMessage[]> = {};
        messages.forEach(msg => {
            const dateLabel = getMessageDateLabel(msg.createdAt);
            if (!groups[dateLabel]) groups[dateLabel] = [];
            groups[dateLabel].push(msg);
        });
        return groups;
    }, [messages]);

    return (
        <div 
            className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col h-[65vh] md:h-[550px] overflow-hidden animate-pop-in relative"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {friend.name?.substring(0,1)}
                            </div>
                            {friend.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-base leading-none">{friend.name}</h4>
                            <span className="text-xs text-slate-400">{friend.isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-grow overflow-y-auto p-4 bg-slate-900/50 space-y-4 custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                            <span className="text-4xl mb-2">👋</span>
                            Inizia a chattare con {friend.name}...
                        </div>
                    )}
                    
                    {(Object.entries(groupedMessages) as [string, DirectMessage[]][]).map(([dateLabel, groupMsgs]) => (
                         <div key={dateLabel} className="space-y-3">
                            <div className="flex justify-center py-2">
                                <span className="bg-slate-800 text-[10px] text-slate-400 px-3 py-1 rounded-full font-bold uppercase border border-slate-700 shadow-sm">
                                    {dateLabel}
                                </span>
                            </div>
                            {groupMsgs.map(msg => {
                                const isMe = msg.senderId === currentUser.id;
                                // Check for share tag
                                const shareMatch = msg.content.match(/:::SHARE_TRACK:(.*?):::/);
                                
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-md ${isMe ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                            {shareMatch ? (
                                                (() => {
                                                    try {
                                                        const data = JSON.parse(shareMatch[1]);
                                                        const isFull = data.access === 'full';
                                                        return (
                                                            <div 
                                                                className="cursor-pointer group"
                                                                onClick={() => handleTrackClick(data)}
                                                            >
                                                                <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-1">
                                                                    <span className="text-xl">🗺️</span>
                                                                    <span className="font-bold uppercase text-[10px] tracking-wider">{isFull ? 'Analisi Completa' : 'Anteprima Corsa'}</span>
                                                                </div>
                                                                <div className="font-bold text-base mb-1">{data.name}</div>
                                                                <div className="text-xs opacity-80 font-mono mb-2">{data.dist} km</div>
                                                                <button className={`w-full py-1.5 rounded text-[10px] font-black uppercase ${isMe ? 'bg-white/20' : 'bg-slate-700'} group-hover:bg-white group-hover:text-cyan-600 transition-colors`}>
                                                                    {isFull ? 'Apri Dati' : 'Vedi Info'}
                                                                </button>
                                                            </div>
                                                        );
                                                    } catch { return <span>{msg.content}</span> }
                                                })()
                                            ) : (
                                                <p>{msg.content}</p>
                                            )}
                                            <p className={`text-[9px] mt-1 text-right font-mono opacity-70`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                {/* Share Menu Overlay */}
                {showShareMenu && (
                    <div className="absolute bottom-16 left-4 right-4 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 z-20 animate-slide-up">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest">Condividi Corsa</h4>
                            <button onClick={() => setShowShareMenu(false)} className="text-slate-400 hover:text-white">&times;</button>
                        </div>
                        
                        <label className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg mb-3 cursor-pointer border border-slate-700 hover:border-purple-500 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={fullAccessMode} 
                                onChange={e => setFullAccessMode(e.target.checked)}
                                className="accent-purple-500 w-4 h-4"
                            />
                            <div className="flex-grow">
                                <span className={`text-xs font-bold ${fullAccessMode ? 'text-purple-400' : 'text-slate-300'}`}>Consenti Analisi (Ospite)</span>
                                <p className="text-[9px] text-slate-500">L'amico potrà vedere grafici e usare l'AI sui tuoi dati.</p>
                            </div>
                        </label>

                        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                            {shareTracks.map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => handleShareTrack(t)}
                                    className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors text-left"
                                >
                                    <span className="text-xs text-white truncate max-w-[180px]">{t.name}</span>
                                    <span className="text-[9px] font-mono text-slate-400">{t.distance.toFixed(1)}k</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <form onSubmit={(e) => handleSend(e)} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-3 shrink-0 relative z-10">
                    <button 
                        type="button"
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className={`p-3 rounded-xl transition-all ${showShareMenu ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}
                    >
                        <PaperClipIcon />
                    </button>
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Scrivi un messaggio..."
                        className="flex-grow bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()} 
                        className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        <SendIcon />
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes pop-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-pop-in { animation: pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default MiniChat;
