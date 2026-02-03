
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { UserProfile, DirectMessage, Track } from '../types';
import { sendDirectMessage, getDirectMessages, updateTrackSharing, getTrackById, markMessagesAsRead, deleteDirectMessage } from '../services/socialService';
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
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);

// New Ticks Component - Standard WhatsApp Style
const WhatsAppTicks = ({ read, sent }: { read: boolean; sent: boolean }) => (
    <div className="flex items-end pl-1">
        {/* Using a standard SVG for double check */}
        <svg viewBox="0 0 16 12" width="14" height="10" className={read ? 'text-[#53bdeb]' : 'text-[#8696a0]'} fill="currentColor">
            {/* First Tick */}
            <path d="M15.01 3.316l-7.833 7.752-5.468-5.468 1.414-1.414 4.054 4.054 6.419-6.338 1.414 1.414z" transform="translate(-4, 0)" />
            {/* Second Tick (Only if sent/delivered/read) - For now we assume double tick = delivered/read */}
            <path d="M15.01 3.316l-7.833 7.752-5.468-5.468 1.414-1.414 4.054 4.054 6.419-6.338 1.414 1.414z" />
        </svg>
    </div>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-[#8696a0] ml-1">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
    </svg>
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
    const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());
    
    // Scroll Refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const shouldScrollRef = useRef(true); // Default to true for initial load
    
    const intervalRef = useRef<number | null>(null);
    
    // Sharing UI
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareTracks, setShareTracks] = useState<Track[]>([]);
    const [fullAccessMode, setFullAccessMode] = useState(false);
    
    // Delete UI
    const [messageToDelete, setMessageToDelete] = useState<DirectMessage | null>(null);

    // Load hidden messages from local storage
    useEffect(() => {
        if(currentUser.id && friend.id) {
            const key = `hidden_msgs_${currentUser.id}_${friend.id}`;
            const stored = localStorage.getItem(key);
            if(stored) setHiddenMessageIds(new Set(JSON.parse(stored)));
        }
    }, [currentUser.id, friend.id]);

    const loadMessages = async () => {
        if (!currentUser.id || !friend.id) return;
        const msgs = await getDirectMessages(currentUser.id, friend.id);
        
        // Preserve scroll logic: check if we are at bottom BEFORE updating
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px tolerance
            shouldScrollRef.current = isAtBottom;
        }

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
        
        // Force scroll to bottom on initial mount
        shouldScrollRef.current = true;

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
                        // Check if user is looking at bottom
                        if (scrollContainerRef.current) {
                            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                            shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
                        }

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
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'direct_messages'
                },
                (payload) => {
                    const deletedId = payload.old.id;
                    setMessages(prev => prev.filter(m => m.id !== deletedId));
                }
            )
            .subscribe();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            supabase.removeChannel(channel);
        };
    }, [friend.id, currentUser.id]);

    // Handle Scrolling
    useLayoutEffect(() => {
        if (shouldScrollRef.current && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto' }); // Use auto for instant snap or smooth if preferred
            shouldScrollRef.current = false; // Reset
        }
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
            
            // Always scroll to bottom when sending
            shouldScrollRef.current = true;
            
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

    const handleDeleteMessage = async (type: 'me' | 'everyone') => {
        if (!messageToDelete) return;
        
        if (type === 'me') {
            const newHidden = new Set(hiddenMessageIds);
            newHidden.add(messageToDelete.id);
            setHiddenMessageIds(newHidden);
            if (currentUser.id && friend.id) {
                localStorage.setItem(`hidden_msgs_${currentUser.id}_${friend.id}`, JSON.stringify(Array.from(newHidden)));
            }
        } else if (type === 'everyone') {
            try {
                await deleteDirectMessage(messageToDelete.id);
                // Optimistic UI update
                setMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
            } catch (e) {
                alert("Errore durante l'eliminazione.");
            }
        }
        setMessageToDelete(null);
    };

    const groupedMessages = useMemo<Record<string, DirectMessage[]>>(() => {
        const groups: Record<string, DirectMessage[]> = {};
        messages.filter(m => !hiddenMessageIds.has(m.id)).forEach(msg => {
            const dateLabel = getMessageDateLabel(msg.createdAt);
            if (!groups[dateLabel]) groups[dateLabel] = [];
            groups[dateLabel].push(msg);
        });
        return groups;
    }, [messages, hiddenMessageIds]);

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
                <div 
                    ref={scrollContainerRef}
                    className="flex-grow overflow-y-auto p-4 bg-[#0b141a] space-y-4 custom-scrollbar bg-chat-pattern relative"
                >
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
                                const isTemp = msg.id.startsWith('temp-');
                                
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group relative`}>
                                        
                                        {/* Message Bubble */}
                                        <div 
                                            className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg text-[14px] shadow-sm relative ${
                                                isMe 
                                                ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                                                : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                            }`}
                                        >
                                            {/* Dropdown Trigger on Hover */}
                                            <button 
                                                onClick={() => setMessageToDelete(msg)}
                                                className={`absolute -top-2 ${isMe ? '-left-2' : '-right-2'} w-6 h-6 bg-slate-800 text-slate-400 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:text-white`}
                                            >
                                                <span className="text-xs mb-1">...</span>
                                            </button>

                                            {shareMatch ? (
                                                (() => {
                                                    try {
                                                        const data = JSON.parse(shareMatch[1]);
                                                        const isFull = data.access === 'full';
                                                        return (
                                                            <div className="cursor-pointer -mx-1 -mt-1" onClick={() => handleTrackClick(data)}>
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
                                            
                                            <div className="flex justify-end items-center gap-1 mt-0.5 -mb-1 ml-2 float-right h-4">
                                                <span className="text-[10px] text-[#8696a0] leading-none">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                                {isMe && (
                                                    isTemp ? <ClockIcon /> : <WhatsAppTicks read={isRead} sent={true} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                {/* Delete Modal */}
                {messageToDelete && (
                    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setMessageToDelete(null)}>
                        <div className="bg-[#202c33] w-full max-w-sm rounded-xl p-4 shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                            <h3 className="text-white font-bold mb-4 text-center">Elimina messaggio?</h3>
                            <div className="space-y-2">
                                {messageToDelete.senderId === currentUser.id && (
                                    <button 
                                        onClick={() => handleDeleteMessage('everyone')}
                                        className="w-full p-3 bg-slate-800 text-red-400 font-bold rounded-lg hover:bg-slate-700 text-sm flex items-center justify-center gap-2"
                                    >
                                        <TrashIcon /> Elimina per tutti
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDeleteMessage('me')}
                                    className="w-full p-3 bg-slate-800 text-slate-200 font-bold rounded-lg hover:bg-slate-700 text-sm"
                                >
                                    Elimina per me
                                </button>
                                <button 
                                    onClick={() => setMessageToDelete(null)}
                                    className="w-full p-3 border border-slate-600 text-slate-400 font-bold rounded-lg hover:text-white text-sm"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
