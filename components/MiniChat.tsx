
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, DirectMessage } from '../types';
import { sendDirectMessage, getDirectMessages } from '../services/socialService';
import { supabase } from '../services/supabaseClient';

interface MiniChatProps {
    currentUser: UserProfile; // Full profile needed for ID
    friend: UserProfile;
    onClose: () => void;
    onMinimize?: () => void;
}

const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" /></svg>);
const CloseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>);

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

    return (
        <div className="fixed bottom-0 right-4 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-t-xl shadow-2xl z-[10000] flex flex-col animate-slide-up h-96">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 rounded-t-xl cursor-pointer" onClick={onClose}>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {friend.name?.substring(0,1)}
                        </div>
                        {friend.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-slate-800 rounded-full"></div>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm leading-none">{friend.name}</h4>
                        <span className="text-[10px] text-slate-400">{friend.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-white">
                    <CloseIcon />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-3 bg-slate-900/95 space-y-2 custom-scrollbar">
                {messages.length === 0 && <div className="text-center text-slate-500 text-xs mt-4">Inizia a chattare...</div>}
                {messages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${isMe ? 'bg-cyan-700 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                <p>{msg.content}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-2 bg-slate-800 border-t border-slate-700 flex gap-2">
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Messaggio..."
                    className="flex-grow bg-slate-900 border border-slate-600 rounded-full px-3 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                    autoFocus
                />
                <button type="submit" disabled={!newMessage.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-full transition-colors disabled:opacity-50">
                    <SendIcon />
                </button>
            </form>
            <style>{`
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default MiniChat;
