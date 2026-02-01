
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FriendRequest, Track, DirectMessage, Reaction } from '../types';
import { searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, getFriends, getFriendsActivityFeed, sendDirectMessage, getDirectMessages, toggleReaction } from '../services/socialService';
import { supabase } from '../services/supabaseClient';
import TrackPreview from './TrackPreview';
import RatingStars from './RatingStars';

interface SocialHubProps {
    onClose: () => void;
    currentUserId: string;
    onChallengeGhost?: (track: Track) => void;
}

const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>);
const AddUserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-4.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" /></svg>);
const ActivityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 2.1a.75.75 0 1 0 1.06 1.06l3.38-3.38a.75.75 0 0 0 0-1.06l-3.38-3.38a.75.75 0 1 0-1.06 1.06l2.1 2.1H6.75Z" clipRule="evenodd" /></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>);
const ChatBubbleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" /></svg>);
const GhostIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" />
    </svg>
);

const getMessageDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    date.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    yesterday.setHours(0,0,0,0);
    if (date.getTime() === today.getTime()) return 'Oggi';
    if (date.getTime() === yesterday.getTime()) return 'Ieri';
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '-:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const REACTIONS_LIST = ['👍', '🔥', '⚡', '👏', '🏃'];

const SocialHub: React.FC<SocialHubProps> = ({ onClose, currentUserId, onChallengeGhost }) => {
    const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'add'>('feed');
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [feed, setFeed] = useState<Track[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
    
    // Chat states
    const [activeChatFriend, setActiveChatFriend] = useState<UserProfile | null>(null);
    const [chatMessages, setChatMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<number | null>(null);

    // Badge Modal states
    const [selectedFeedTrack, setSelectedFeedTrack] = useState<Track | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'add') return;
        const timer = setTimeout(() => {
            if (searchQuery.length >= 3) handleSearch();
            else if (searchQuery.length === 0) setSearchResults([]);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    useEffect(() => {
        if (activeChatFriend) {
            fetchChatMessages();
            pollIntervalRef.current = window.setInterval(fetchChatMessages, 5000);
            const channel = supabase.channel(`hub-chat:${currentUserId}:${activeChatFriend.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${currentUserId}` }, (payload) => {
                if (payload.new.sender_id === activeChatFriend.id) {
                    setChatMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, { id: payload.new.id, senderId: payload.new.sender_id, receiverId: payload.new.receiver_id, content: payload.new.content, createdAt: payload.new.created_at }]);
                }
            }).subscribe();
            return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); supabase.removeChannel(channel); };
        }
    }, [activeChatFriend, currentUserId]);

    useEffect(() => {
        if (activeChatFriend) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, activeChatFriend]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'friends') {
                setFriends(await getFriends(currentUserId));
                setRequests(await getFriendRequests(currentUserId));
            } else if (activeTab === 'feed') {
                setFeed(await getFriendsActivityFeed(currentUserId));
            }
        } catch (e) {}
        setLoading(false);
    };

    const fetchChatMessages = async () => {
        if (!activeChatFriend?.id) return;
        setChatMessages(await getDirectMessages(currentUserId, activeChatFriend.id));
    };

    const handleSearch = async () => {
        if (searchQuery.length < 3) return;
        setLoading(true);
        try {
            const results = await searchUsers(searchQuery);
            const friendIds = new Set(friends.map(f => f.id));
            setSearchResults(results.filter(u => u.id !== currentUserId && u.id && !friendIds.has(u.id)));
        } catch (e) {}
        setLoading(false);
    };

    const handleSendRequest = async (userId: string) => {
        try {
            await sendFriendRequest(userId, currentUserId);
            setSentRequests(prev => new Set(prev).add(userId));
            setMessage('Richiesta inviata!');
            setTimeout(() => setMessage(''), 3000);
        } catch (e: any) {
            setMessage(e.message);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleAccept = async (reqId: string) => { await acceptFriendRequest(reqId); loadData(); };
    const handleReject = async (reqId: string) => { if(confirm("Vuoi rifiutare questa richiesta?")) { await rejectFriendRequest(reqId); loadData(); } };
    const openChat = (friend: UserProfile) => { setActiveChatFriend(friend); setChatMessages([]); };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChatFriend?.id) return;
        try {
            const tempMsg: DirectMessage = { id: 'temp-' + Date.now(), senderId: currentUserId, receiverId: activeChatFriend.id, content: newMessage, createdAt: new Date().toISOString() };
            setChatMessages(prev => [...prev, tempMsg]);
            await sendDirectMessage(currentUserId, activeChatFriend.id, newMessage);
            setNewMessage('');
        } catch (e) { setMessage("Errore invio messaggio."); }
    };

    const groupedMessages = React.useMemo<Record<string, DirectMessage[]>>(() => {
        const groups: Record<string, DirectMessage[]> = {};
        chatMessages.forEach(msg => {
            const dateLabel = getMessageDateLabel(msg.createdAt);
            if (!groups[dateLabel]) groups[dateLabel] = [];
            groups[dateLabel].push(msg);
        });
        return groups;
    }, [chatMessages]);

    const handleReaction = async (track: Track, emoji: string) => {
        // Optimistic UI Update
        const updatedFeed = feed.map(t => {
            if (t.id === track.id) {
                const existingReaction = t.reactions?.find(r => r.userId === currentUserId && r.emoji === emoji);
                let newReactions = t.reactions || [];
                if (existingReaction) {
                    newReactions = newReactions.filter(r => !(r.userId === currentUserId && r.emoji === emoji));
                } else {
                    newReactions = [...newReactions, { userId: currentUserId, emoji }];
                }
                return { ...t, reactions: newReactions };
            }
            return t;
        });
        setFeed(updatedFeed);
        if (selectedFeedTrack && selectedFeedTrack.id === track.id) {
            // Update modal state too
            setSelectedFeedTrack(updatedFeed.find(t => t.id === track.id) || null);
        }

        try {
            await toggleReaction(track.id, currentUserId, emoji);
        } catch (e) {
            // Revert on failure (reload)
            loadData();
        }
    };

    // Chat View
    if (activeChatFriend) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <header className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveChatFriend(null)} className="text-slate-400 hover:text-white mr-2">&larr;</button>
                            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xs border border-slate-600">{activeChatFriend.name?.substring(0,1)}</div>
                            <div>
                                <h3 className="font-bold text-white text-sm">{activeChatFriend.name}</h3>
                                {activeChatFriend.isOnline && <p className="text-[10px] text-green-400">Online</p>}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">&times;</button>
                    </header>
                    <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-slate-900/50 space-y-3 pb-24">
                        {chatMessages.length === 0 && <div className="text-center text-slate-500 text-xs mt-10">Inizia la conversazione con {activeChatFriend.name}</div>}
                        {(Object.entries(groupedMessages) as [string, DirectMessage[]][]).map(([dateLabel, msgs]) => (
                            <div key={dateLabel} className="space-y-3">
                                <div className="flex justify-center sticky top-0 z-10 py-2 pointer-events-none">
                                    <span className="bg-slate-800/80 backdrop-blur-sm text-[10px] text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-slate-700/50">{dateLabel}</span>
                                </div>
                                {msgs.map(msg => {
                                    const isMe = msg.senderId === currentUserId;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-cyan-700 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                                <p>{msg.content}</p>
                                                <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-cyan-300' : 'text-slate-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendMessage} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2 shrink-0">
                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Scrivi un messaggio..." className="flex-grow bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none" autoFocus />
                        <button type="submit" disabled={!newMessage.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 rounded-xl"><SendIcon /></button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            {/* Main Social Panel */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-cyan-400">⚡</span> Social Hub</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="flex border-b border-slate-700 bg-slate-900/50 shrink-0">
                    <button onClick={() => setActiveTab('feed')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'feed' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><ActivityIcon /> Feed</button>
                    <button onClick={() => setActiveTab('friends')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'friends' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><UserIcon /> Amici {friends.length > 0 && `(${friends.length})`}</button>
                    <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'add' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><AddUserIcon /> Aggiungi</button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar pb-24">
                    {message && <div className="sticky top-0 z-10 bg-cyan-900/90 border border-cyan-500/50 text-cyan-200 p-3 rounded-lg mb-4 text-center text-sm font-bold shadow-lg backdrop-blur-sm animate-fade-in-down">{message}</div>}
                    
                    {activeTab === 'feed' && (
                        <div className="space-y-3">
                            {feed.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500"><div className="text-4xl mb-3 opacity-30">📭</div><p>Il feed è vuoto.</p><button onClick={() => setActiveTab('add')} className="mt-4 text-cyan-400 text-xs font-bold uppercase hover:underline">Trova Amici</button></div>
                            ) : (
                                feed.map(track => {
                                    const reactionCount = track.reactions?.length || 0;
                                    const userReacted = track.reactions?.some(r => r.userId === currentUserId);
                                    
                                    return (
                                        <div 
                                            key={track.id} 
                                            onClick={() => setSelectedFeedTrack(track)}
                                            className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group cursor-pointer"
                                        >
                                            <div className="flex items-center p-3 gap-3">
                                                {/* Mini Map Thumbnail */}
                                                <div className="w-12 h-12 bg-slate-950 rounded-lg border border-slate-700 overflow-hidden shrink-0 relative">
                                                    <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80" />
                                                </div>
                                                
                                                {/* Main Info */}
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-white truncate">{track.userDisplayName}</span>
                                                        <span className="text-[9px] text-slate-500">{new Date(track.startTime || '').toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-cyan-400 truncate">{track.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        {track.distance.toFixed(2)}km • {(track.duration / 60000 / track.distance).toFixed(2)}/km
                                                    </div>
                                                </div>

                                                {/* Reaction Counter */}
                                                <div className="flex flex-col items-end gap-1">
                                                    {reactionCount > 0 && (
                                                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${userReacted ? 'bg-purple-900/50 text-purple-300' : 'bg-slate-700 text-slate-400'}`}>
                                                            <span>🔥</span> {reactionCount}
                                                        </div>
                                                    )}
                                                    <div className="bg-slate-700 p-1.5 rounded-lg text-slate-400 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'friends' && (
                        <div className="space-y-6">
                            {requests.length > 0 && (
                                <div className="mb-6"><h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>Richieste in attesa</h3>
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-slate-800 border border-purple-500/30 p-3 rounded-lg flex justify-between items-center mb-2 shadow-sm">
                                            <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-900/50 rounded-full flex items-center justify-center text-purple-300 font-bold text-xs border border-purple-500/20">{req.requester.name?.substring(0,2)}</div><span className="text-white font-bold text-sm">{req.requester.name}</span></div>
                                            <div className="flex gap-2"><button onClick={() => handleAccept(req.id)} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg">Accetta</button><button onClick={() => handleReject(req.id)} className="bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Rifiuta</button></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">La tua Crew</h3>
                                {friends.length === 0 ? (<p className="text-slate-500 text-sm italic">Cerca qualcuno nella tab "Aggiungi"!</p>) : (
                                    friends.map(friend => (
                                        <div key={friend.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 mb-2">
                                            <div className="flex items-center gap-3"><div className="relative"><div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold border border-slate-600">{friend.name?.substring(0,1)}</div>{friend.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full shadow-lg"></div>}</div><span className="text-slate-200 font-medium text-sm">{friend.name}</span></div>
                                            <div className="flex items-center gap-2"><button onClick={() => openChat(friend)} className="bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white p-2 rounded-lg transition-colors border border-slate-600"><ChatBubbleIcon /></button></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'add' && (
                        <div className="h-full flex flex-col"><div className="relative mb-6 shrink-0"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><SearchIcon /></div><input type="text" placeholder="Cerca nome utente..." className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white focus:border-cyan-500 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />{loading && <div className="absolute inset-y-0 right-3 flex items-center"><div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>}</div><div className="flex-grow space-y-2">{searchResults.map(user => { const isSent = user.id && sentRequests.has(user.id); return (<div key={user.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-all"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xs">{user.name?.substring(0,1)}</div><span className="text-white font-bold text-sm">{user.name}</span></div><button onClick={() => user.id && handleSendRequest(user.id)} disabled={isSent} className={`text-xs px-4 py-2 rounded-lg font-bold transition-all ${isSent ? 'bg-green-900/30 text-green-400' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>{isSent ? 'Inviata ✓' : 'Invia Richiesta'}</button></div>); })}</div></div>
                    )}
                </div>
            </div>

            {/* TRACK DETAIL BADGE (MODAL) */}
            {selectedFeedTrack && (
                <div 
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[12000] flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedFeedTrack(null)}
                >
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        
                        {/* Map Header */}
                        <div className="h-48 w-full bg-slate-950 relative border-b border-slate-800">
                            <TrackPreview points={selectedFeedTrack.points} color={selectedFeedTrack.color} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none"></div>
                            
                            {/* Close Button */}
                            <button 
                                onClick={() => setSelectedFeedTrack(null)}
                                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-md transition-colors z-20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                            </button>

                            {/* Info Overlay */}
                            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                                <div>
                                    <h3 className="text-xl font-black text-white leading-none drop-shadow-md">{selectedFeedTrack.name}</h3>
                                    <p className="text-xs text-slate-300 font-bold uppercase mt-1 drop-shadow-sm">{selectedFeedTrack.userDisplayName} • {new Date(selectedFeedTrack.startTime!).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-2 py-1 rounded text-xs font-mono text-cyan-400 font-bold">
                                    {(selectedFeedTrack.duration / 60000 / selectedFeedTrack.distance).toFixed(2)}/km
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="text-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                    <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest">Distanza</span>
                                    <span className="text-lg font-black text-white">{selectedFeedTrack.distance.toFixed(2)} <span className="text-xs text-slate-500 font-normal">km</span></span>
                                </div>
                                <div className="text-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                    <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest">Tempo</span>
                                    <span className="text-lg font-black text-white">{(selectedFeedTrack.duration / 60000).toFixed(0)} <span className="text-xs text-slate-500 font-normal">min</span></span>
                                </div>
                                <div className="text-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                    <span className="block text-[9px] text-slate-500 font-black uppercase tracking-widest">Rating</span>
                                    <div className="flex justify-center pt-1"><RatingStars rating={selectedFeedTrack.rating} size="sm" /></div>
                                </div>
                            </div>

                            {/* Reactions */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Reazioni</h4>
                                <div className="flex justify-center gap-4">
                                    {REACTIONS_LIST.map(emoji => {
                                        const count = selectedFeedTrack.reactions?.filter(r => r.emoji === emoji).length || 0;
                                        const hasReacted = selectedFeedTrack.reactions?.some(r => r.userId === currentUserId && r.emoji === emoji);
                                        
                                        return (
                                            <button 
                                                key={emoji}
                                                onClick={() => handleReaction(selectedFeedTrack, emoji)}
                                                className={`flex flex-col items-center gap-1 transition-transform active:scale-95 ${hasReacted ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-110'}`}
                                            >
                                                <span className="text-2xl">{emoji}</span>
                                                {count > 0 && (
                                                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${hasReacted ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                        {count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action Button */}
                            {onChallengeGhost && (
                                <button 
                                    onClick={() => {
                                        onChallengeGhost(selectedFeedTrack);
                                        setSelectedFeedTrack(null);
                                        onClose();
                                    }}
                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <GhostIcon /> Sfida questo tempo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SocialHub;
