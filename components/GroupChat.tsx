
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, GroupMessage, Track } from '../types';
import { sendGroupMessage, getGroupMessages, updateTrackSharing, getTrackById } from '../services/socialService';
import { supabase } from '../services/supabaseClient';
import { loadTracksFromDB } from '../services/dbService';
import TrackPreview from './TrackPreview';

interface GroupChatProps {
    currentUser: UserProfile;
    groupId: string;
    groupName: string;
    onClose: () => void;
    onViewTrack?: (track: Track) => void;
}

const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72-3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>);
const PaperClipIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" /></svg>);

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

const GroupChat: React.FC<GroupChatProps> = ({ currentUser, groupId, groupName, onClose, onViewTrack }) => {
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const shouldScrollRef = useRef(true);
    
    // Sharing UI
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareTracks, setShareTracks] = useState<Track[]>([]);
    const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

    const loadMessages = async () => {
        if (!currentUser.id || !groupId) return;
        const msgs = await getGroupMessages(groupId);
        setMessages(msgs);
        shouldScrollRef.current = true;
    };

    const loadMyTracks = async () => {
        const tracks = await loadTracksFromDB();
        setShareTracks(tracks.filter(t => !t.isExternal).slice(0, 15)); 
    };

    useEffect(() => {
        loadMessages();
        loadMyTracks();
        
        const channel = supabase.channel(`group:${groupId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'group_messages',
                    filter: `group_id=eq.${groupId}` 
                },
                async (payload) => {
                    const newMsg = payload.new;
                    // Skip if I sent it (optimistic update handles it)
                    if (newMsg.sender_id === currentUser.id) return;

                    // Fetch sender name if missing
                    let senderName = 'Utente';
                    const { data } = await supabase.from('profiles').select('name').eq('id', newMsg.sender_id).single();
                    if (data) senderName = data.name;

                    setMessages(prev => [...prev, {
                        id: newMsg.id,
                        senderId: newMsg.sender_id,
                        groupId: newMsg.group_id,
                        content: newMsg.content,
                        createdAt: newMsg.created_at,
                        senderName: senderName
                    }]);
                    shouldScrollRef.current = true;
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId, currentUser.id]);

    useLayoutEffect(() => {
        if (shouldScrollRef.current && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto' });
            shouldScrollRef.current = false;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent, customContent?: string) => {
        if (e) e.preventDefault();
        const contentToSend = customContent || newMessage;
        if (!contentToSend.trim() || !currentUser.id) return;

        try {
            const tempMsg: GroupMessage = {
                id: 'temp-' + Date.now(),
                senderId: currentUser.id,
                senderName: currentUser.name || 'Io',
                groupId: groupId,
                content: contentToSend,
                createdAt: new Date().toISOString()
            };
            
            shouldScrollRef.current = true;
            setMessages(prev => [...prev, tempMsg]);
            setNewMessage('');
            
            await sendGroupMessage(currentUser.id, groupId, contentToSend);
        } catch (e) {
            console.error("Failed to send", e);
            alert("Errore invio.");
        }
    };

    const handleShareTrack = async (track: Track) => {
        if (!currentUser.id) return;
        
        try {
            const currentGroups = track.sharedWithGroups || [];
            if (!currentGroups.includes(groupId)) {
                await updateTrackSharing(
                    track.id, 
                    track.isPublic || false, 
                    track.sharedWithUsers || [], 
                    [...currentGroups, groupId]
                );
            }
        } catch (e) {
            setFeedbackMsg("Errore permessi.");
            setTimeout(() => setFeedbackMsg(null), 2000);
            return;
        }

        const payload = JSON.stringify({
            id: track.id,
            name: track.name,
            dist: track.distance.toFixed(1)
        });
        
        const messageContent = `:::SHARE_TRACK:${payload}:::`;
        await handleSend(undefined, messageContent);
        setShowShareMenu(false);
    };

    const handleTrackClick = async (trackData: any) => {
        if (!onViewTrack) return;
        setFeedbackMsg("Caricamento...");
        
        try {
            const fullTrack = await getTrackById(trackData.id);
            if (fullTrack) {
                onViewTrack(fullTrack);
                setFeedbackMsg(null);
            } else {
                setFeedbackMsg("Accesso negato o traccia rimossa.");
                setTimeout(() => setFeedbackMsg(null), 3000);
            }
        } catch(e) { 
            setFeedbackMsg("Errore recupero dati.");
            setTimeout(() => setFeedbackMsg(null), 3000);
        }
    };

    const groupedMessages = useMemo(() => {
        const groups: Record<string, GroupMessage[]> = {};
        messages.forEach((msg) => {
            const dateLabel = getMessageDateLabel(msg.createdAt);
            if (!groups[dateLabel]) groups[dateLabel] = [];
            groups[dateLabel].push(msg);
        });
        return groups;
    }, [messages]);

    return createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="w-full md:max-w-md bg-[#0b141a] md:border md:border-slate-700 md:rounded-2xl shadow-2xl flex flex-col h-[100dvh] md:h-[600px] overflow-hidden animate-pop-in relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#202c33] border-b border-[#202c33] shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="text-[#aebac1] md:hidden mr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                        </button>
                        <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-lg border border-purple-500/30">
                            {groupName.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <h4 className="font-bold text-[#e9edef] text-base leading-none truncate max-w-[200px]">{groupName}</h4>
                            <span className="text-xs text-[#8696a0]">Gruppo</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#aebac1] hover:text-white p-2 rounded-full hidden md:block">
                        <CloseIcon />
                    </button>
                </div>

                {/* Feedback Toast */}
                {feedbackMsg && (
                    <div className="absolute top-20 left-0 right-0 z-50 flex justify-center animate-fade-in-down pointer-events-none">
                        <div className="bg-slate-800/95 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-slate-600">
                            {feedbackMsg}
                        </div>
                    </div>
                )}

                {/* Chat Body */}
                <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-4 bg-[#0b141a] space-y-4 custom-scrollbar bg-chat-pattern relative">
                    <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"></div>
                    
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-[#8696a0] text-sm relative z-10">
                            <p>Inizia a scrivere nel gruppo.</p>
                        </div>
                    )}

                    {(Object.entries(groupedMessages) as [string, GroupMessage[]][]).map(([dateLabel, groupMsgs]) => (
                        <div key={dateLabel} className="space-y-1 relative z-10">
                            <div className="flex justify-center py-2 sticky top-0 z-10">
                                <span className="bg-[#1f2c34] text-[11px] text-[#8696a0] px-3 py-1.5 rounded-lg font-medium shadow-sm uppercase tracking-wide">
                                    {dateLabel}
                                </span>
                            </div>
                            {groupMsgs.map((msg, i) => {
                                const isMe = msg.senderId === currentUser.id;
                                const isSeq = i > 0 && groupMsgs[i-1].senderId === msg.senderId;
                                const shareMatch = msg.content.match(/:::SHARE_TRACK:(.*?):::/);
                                const senderColor = ['text-orange-400', 'text-pink-400', 'text-purple-400', 'text-blue-400', 'text-green-400'][msg.senderId.charCodeAt(0) % 5];

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group/msg`}>
                                        <div 
                                            className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg text-[14px] shadow-sm relative ${
                                                isMe 
                                                ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                                                : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                            } ${!isMe && isSeq ? 'mt-0.5' : 'mt-2'}`}
                                        >
                                            {!isMe && !isSeq && (
                                                <div className={`text-xs font-bold mb-0.5 ${senderColor}`}>
                                                    {msg.senderName}
                                                </div>
                                            )}

                                            {shareMatch ? (
                                                (() => {
                                                    try {
                                                        const data = JSON.parse(shareMatch[1]);
                                                        return (
                                                            <div className="cursor-pointer group -mx-1 -mt-1" onClick={() => handleTrackClick(data)}>
                                                                <div className="bg-black/20 rounded-t-lg p-2 mb-1 flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xl">🗺️</div>
                                                                    <div className="flex-grow">
                                                                        <div className="font-bold text-sm text-[#e9edef]">{data.name}</div>
                                                                        <div className="text-[10px] text-[#8696a0]">{data.dist} km • Condiviso</div>
                                                                    </div>
                                                                </div>
                                                                <div className="px-1 pb-1">
                                                                    <button className="w-full bg-[#2a3942] hover:bg-[#374248] text-[#00a884] font-bold text-xs py-2 rounded uppercase tracking-wide transition-colors">
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
                                            
                                            <div className="text-[9px] text-[#8696a0] text-right mt-0.5 leading-none">
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                {/* Share Menu */}
                {showShareMenu && (
                    <div className="absolute bottom-16 left-4 right-4 bg-[#202c33] rounded-xl shadow-2xl p-4 z-30 animate-slide-up border border-[#2a3942]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-[#8696a0] uppercase tracking-widest">Invia Corsa al Gruppo</h4>
                            <button onClick={() => setShowShareMenu(false)} className="text-[#8696a0] hover:text-white">&times;</button>
                        </div>
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

                {/* Input */}
                <form 
                    onSubmit={(e) => handleSend(e)} 
                    className="p-2 md:p-3 bg-[#202c33] flex gap-2 shrink-0 items-center z-20 pb-[env(safe-area-inset-bottom)] md:pb-3"
                >
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
                            placeholder="Scrivi al gruppo..."
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
        </div>,
        document.body
    );
};

export default GroupChat;
