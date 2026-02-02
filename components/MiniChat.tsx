
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, DirectMessage } from '../types';
import { sendDirectMessage, getDirectMessages } from '../services/socialService';
import { supabase } from '../services/supabaseClient';

interface MiniChatProps {
    currentUser: UserProfile; // Full profile needed for ID
    friend: UserProfile;
    onClose: () => void;
    onMinimize?: () => void;
}

const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>);

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
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); // Compact format for mini chat
};

const MiniChat: React.FC<MiniChatProps> = ({ currentUser, friend, onClose }) => {
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<number | null>(null);

    const loadMessages = async () => {
        if (!currentUser.id || !friend.id) return;
        const msgs = await getDirectMessages(currentUser.id, friend.id);
        setMessages(msgs);
    };

    // Load initial messages
    useEffect(() => {
        loadMessages();
        
        // Polling fallback
        intervalRef.current = window.setInterval(loadMessages, 3000);
        
        // REALTIME SUBSCRIPTION
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
                    // Check if message belongs to this specific chat session
                    if (newMsg.sender_id === friend.id) {
                        setMessages(prev => {
                            // Avoid duplicates just in case
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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser.id || !friend.id) return;

        try {
            // Optimistic update
            const tempMsg: DirectMessage = {
                id: 'temp-' + Date.now(),
                senderId: currentUser.id,
                receiverId: friend.id,
                content: newMessage,
                createdAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, tempMsg]);
            
            await sendDirectMessage(currentUser.id, friend.id, newMessage);
            setNewMessage('');
            // Optional: loadMessages() to confirm ID from server, but optimistic is fine for UI flow
        } catch (e) {
            console.error("Failed to send", e);
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
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col h-[65vh] md:h-[550px] overflow-hidden animate-pop-in"
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
                    
                    {/* Added explicit type cast to [string, DirectMessage[]][] to fix map on unknown type error */}
                    {(Object.entries(groupedMessages) as [string, DirectMessage[]][]).map(([dateLabel, groupMsgs]) => (
                         <div key={dateLabel} className="space-y-3">
                            <div className="flex justify-center py-2">
                                <span className="bg-slate-800 text-[10px] text-slate-400 px-3 py-1 rounded-full font-bold uppercase border border-slate-700 shadow-sm">
                                    {dateLabel}
                                </span>
                            </div>
                            {groupMsgs.map(msg => {
                                const isMe = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-md ${isMe ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                            <p>{msg.content}</p>
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

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-3 shrink-0">
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
            `}</style>
        </div>
    );
};

export default MiniChat;
