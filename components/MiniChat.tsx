
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, DirectMessage, Track } from '../types';
import { sendDirectMessage, getDirectMessages, updateTrackSharing, getTrackById, markMessagesAsRead } from '../services/socialService';
import { supabase } from '../services/supabaseClient';
import { loadTracksFromDB } from '../services/dbService'; // For local selection
import TrackPreview from './TrackPreview';

interface MiniChatProps {
    currentUser: UserProfile; // Full profile needed for ID
    friend: UserProfile;
    onClose: () => void;
    onMinimize?: () => void;
    onViewTrack?: (track: Track) => void;
    onMessagesRead?: () => void; // Callback to parent to update badges
}

const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>);
const PaperClipIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" /></svg>);

const DoubleCheckIcon = ({ read }: { read: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 ${read ? 'text-[#53bdeb]' : 'text-gray-400'}`}>
        <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
        <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
        {/* Simulating ticks geometry */}
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        <path d="M12.5 5.5l-4 5 1.5 1.5 4-5-1.5-1.5z" opacity="0"/> 
        {/* Adjusted simplistic check marks for visual similarity */}
        <path d="M13.25 5.5l-3.5 4.5 1 1 3.5-4.5-1-1z" opacity="0"/>
    </svg>
);

const WhatsAppTicks = ({ read }: { read: boolean }) => (
    <div className="flex -space-x-1">
        <svg viewBox="0 0 16 11" width="16" height="11" className={`w-3 h-3 ${read ? 'text-[#53bdeb]' : 'text-[#8696a0]'}`} fill="currentColor"><path d="M11.5 0L16 0L8.5 10.5L3 5.5L4.5 3.5L8.5 7L11.5 0Z" /></svg>
        <svg viewBox="0 0 16 11" width="16" height="11" className={`w-3 h-3 ${read ? 'text-[#53bdeb]' : 'text-[#8696a0]'}`} fill="currentColor"><path d="M11.5 0L16 0L8.5 10.5L3 5.5L4.5 3.5L8.5 7L11.5 0Z" /></svg>
    </div>
);

// Helper per formattare la data nei messaggi
const getMessageDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    date.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    yesterday.setHours(0,0,0,0);

    if (date.getTime() === today.getTime()) return 'OGGI';
    if (date.getTime() === yesterday.getTime()) return 'IERI';
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(); 
};

const MiniChat: React.FC<MiniChatProps> = ({ currentUser, friend, onClose, onViewTrack, onMessagesRead }) => {
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
        
        // Mark as read immediately on load
        await markMessagesAsRead(currentUser.id, friend.id);
        onMessagesRead?.();
    };

    const loadMyTracks = async () => {
        const tracks = await loadTracksFromDB();
        setShareTracks(tracks.filter(t => !t.isExternal).slice(0, 10)); 
    };

    // Load initial messages
    useEffect(() => {
        loadMessages();
        loadMyTracks();
        
        // Polling fallback
        intervalRef.current = window.setInterval(loadMessages, 4000);
        
        const channel = supabase.channel(`chat:${currentUser.id}:${friend.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `receiver_id=eq.${currentUser.id}` 
                },
                async (payload) => {
                    const newMsg = payload.new;
                    if (newMsg.sender_id === friend.id) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            return [...prev, {
                                id: newMsg.id,
                                senderId: newMsg.sender_id,
                                receiverId: newMsg.receiver_id,
                                content: newMsg.content,
                                createdAt: newMsg.created_at,
                                readAt: null 
                            }];
                        });
                        // Mark as read instantly when open
                        await markMessagesAsRead(currentUser.id, friend.id);
                        onMessagesRead?.();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `sender_id=eq.${currentUser.id}` // Listen for MY messages being read by friend
                },
                (payload) => {
                    const updatedMsg = payload.new;
                    setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, readAt: updatedMsg.read_at } : m));
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
            setNewMessage('');
            
            await sendDirectMessage(currentUser.id, friend.id, contentToSend);
        } catch (e) {
            console.error("Failed to send", e);
        }
    };

    const handleShareTrack = async (track: Track) => {
        if (!currentUser.id || !friend.id) return;
        
        if (fullAccessMode) {
            try {
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
                try {
                    const fullTrack = await getTrackById(trackData.id);
                    if (fullTrack) onViewTrack(fullTrack);
                    else alert("Errore caricamento traccia.");
                } catch(e) { alert("Impossibile caricare traccia."); }
            }
        } else {
            alert(`Anteprima: ${trackData.name} (${trackData.dist}km). Chiedi l'accesso completo per analizzarla!`);
        }
    };

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
            className="fixed inset-0 z-[12000] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full md:max-w-md bg-[#0b141a] md:border md:border-slate-700 md:rounded-2xl shadow-2xl flex flex-col h-full md:h-[600px] overflow-hidden animate-pop-in relative"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Header WhatsApp Style */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#202c33] border-b border-[#202c33] shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="text-[#aebac1] md:hidden mr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                        </button>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
                                {friend.name ? <span className="text-white font-bold text-lg">{friend.name[0]}</span> : '?'}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h4 className="font-bold text-[#e9edef] text-base leading-none">{friend.name}</h4>
                            {friend.isOnline && <span className="text-xs text-green-500 font-medium">online</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#aebac1] hover:text-white p-2 rounded-full hidden md:block">
                        <CloseIcon />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-grow overflow-y-auto p-4 bg-[#0b141a] space-y-4 custom-scrollbar bg-chat-pattern relative">
                    <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"></div>
                    
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-[#8696a0] text-sm relative z-10">
                            <div className="bg-[#1f2c34] p-4 rounded-xl text-center shadow-sm">
                                <p className="text-[#ffd279] text-xs uppercase font-bold mb-1">Messaggi Crittografati</p>
                                <p>Invia un messaggio a {friend.name}.</p>
                            </div>
                        </div>
                    )}
                    
                    {(Object.entries(groupedMessages) as [string, DirectMessage[]][]).map(([dateLabel, groupMsgs]) => (
                         <div key={dateLabel} className="space-y-1 relative z-10">
                            <div className="flex justify-center py-2 sticky top-0 z-10">
                                <span className="bg-[#1f2c34] text-[11px] text-[#8696a0] px-3 py-1.5 rounded-lg font-medium shadow-sm uppercase tracking-wide">
                                    {dateLabel}
                                </span>
                            </div>
                            {groupMsgs.map(msg => {
                                const isMe = msg.senderId === currentUser.id;
                                const shareMatch = msg.content.match(/:::SHARE_TRACK:(.*?):::/);
                                const isRead = !!msg.readAt;
                                
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                                        <div 
                                            className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg text-[14px] shadow-sm relative ${
                                                isMe 
                                                ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                                                : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                            }`}
                                        >
                                            {shareMatch ? (
                                                (() => {
                                                    try {
                                                        const data = JSON.parse(shareMatch[1]);
                                                        const isFull = data.access === 'full';
                                                        return (
                                                            <div className="cursor-pointer group -mx-1 -mt-1" onClick={() => handleTrackClick(data)}>
                                                                <div className="bg-black/20 rounded-t-lg p-2 mb-1 flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xl">🗺️</div>
                                                                    <div className="flex-grow">
                                                                        <div className="font-bold text-sm text-[#e9edef]">{data.name}</div>
                                                                        <div className="text-[10px] text-[#8696a0]">{data.dist} km • {isFull ? 'Accesso Completo' : 'Anteprima'}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="px-1 pb-1">
                                                                    <button className="w-full bg-[#2a3942] hover:bg-[#374248] text-[#00a884] font-bold text-xs py-2 rounded uppercase tracking-wide">
                                                                        Vedi Attività
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    } catch { return <span>{msg.content}</span> }
                                                })()
                                            ) : (
                                                <p className="leading-snug break-words pr-2">{msg.content}</p>
                                            )}
                                            
                                            <div className="flex justify-end items-center gap-1 mt-0.5 -mb-1 ml-2 float-right">
                                                <span className="text-[10px] text-[#8696a0]">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                                {isMe && <WhatsAppTicks read={isRead} />}
                                            </div>
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
                    <div className="absolute bottom-16 left-4 right-4 bg-[#202c33] rounded-xl shadow-2xl p-4 z-30 animate-slide-up border border-[#2a3942]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-[#8696a0] uppercase tracking-widest">Invia Corsa</h4>
                            <button onClick={() => setShowShareMenu(false)} className="text-[#8696a0] hover:text-white">&times;</button>
                        </div>
                        
                        <label className="flex items-center gap-3 p-3 bg-[#111b21] rounded-lg mb-4 cursor-pointer border border-transparent hover:border-[#00a884] transition-colors">
                            <input 
                                type="checkbox" 
                                checked={fullAccessMode} 
                                onChange={e => setFullAccessMode(e.target.checked)}
                                className="accent-[#00a884] w-5 h-5 rounded"
                            />
                            <div className="flex-grow">
                                <span className={`text-sm font-bold ${fullAccessMode ? 'text-[#00a884]' : 'text-[#e9edef]'}`}>Analisi Ospite</span>
                                <p className="text-[11px] text-[#8696a0]">Permetti all'amico di vedere i grafici.</p>
                            </div>
                        </label>

                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                            {shareTracks.map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => handleShareTrack(t)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-[#2a3942] rounded-lg transition-colors text-left"
                                >
                                    <span className="text-sm text-[#e9edef] truncate max-w-[180px]">{t.name}</span>
                                    <span className="text-xs font-mono text-[#8696a0]">{t.distance.toFixed(1)}km</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <form onSubmit={(e) => handleSend(e)} className="p-2 md:p-3 bg-[#202c33] flex gap-2 shrink-0 items-center z-20">
                    <button 
                        type="button"
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className={`p-3 rounded-full transition-all ${showShareMenu ? 'text-[#00a884] bg-[#2a3942]' : 'text-[#8696a0] hover:bg-[#2a3942]'}`}
                    >
                        <PaperClipIcon />
                    </button>
                    <div className="flex-grow bg-[#2a3942] rounded-lg px-4 py-2 flex items-center">
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Scrivi un messaggio"
                            className="w-full bg-transparent text-[#e9edef] text-sm focus:outline-none placeholder-[#8696a0]"
                            autoFocus
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()} 
                        className={`p-3 rounded-full transition-all flex items-center justify-center ${newMessage.trim() ? 'bg-[#00a884] text-white hover:bg-[#008f6f]' : 'bg-transparent text-[#8696a0]'}`}
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
