
import React, { useState, useEffect } from 'react';
import { UserProfile, FriendRequest, Track } from '../types';
import { searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, getFriends, getFriendsActivityFeed } from '../services/socialService';

interface SocialHubProps {
    onClose: () => void;
    currentUserId: string;
}

const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>);
const AddUserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-4.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" /></svg>);
const ActivityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 2.1a.75.75 0 1 0 1.06 1.06l3.38-3.38a.75.75 0 0 0 0-1.06l-3.38-3.38a.75.75 0 1 0-1.06 1.06l2.1 2.1H6.75Z" clipRule="evenodd" /></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>);

const SocialHub: React.FC<SocialHubProps> = ({ onClose, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'add'>('feed');
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [feed, setFeed] = useState<Track[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, [activeTab]);

    // Auto-search debounce
    useEffect(() => {
        if (activeTab !== 'add') return;
        const timer = setTimeout(() => {
            if (searchQuery.length >= 3) {
                handleSearch();
            } else if (searchQuery.length === 0) {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'friends') {
                const f = await getFriends(currentUserId);
                setFriends(f);
                const r = await getFriendRequests(currentUserId);
                setRequests(r);
            } else if (activeTab === 'feed') {
                const activity = await getFriendsActivityFeed(currentUserId);
                setFeed(activity);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.length < 3) return;
        setLoading(true);
        try {
            const results = await searchUsers(searchQuery);
            // Filter out self and already friends (basic check, ideally backend handles this)
            const friendIds = new Set(friends.map(f => f.id));
            setSearchResults(results.filter(u => u.id !== currentUserId && u.id && !friendIds.has(u.id)));
        } catch (e) { console.error(e); }
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

    const handleAccept = async (reqId: string) => {
        await acceptFriendRequest(reqId);
        loadData();
    };

    const handleReject = async (reqId: string) => {
        if(confirm("Vuoi rifiutare questa richiesta di amicizia?")) {
            await rejectFriendRequest(reqId);
            loadData();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-cyan-400">⚡</span> Social Hub
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-900/50 shrink-0">
                    <button 
                        onClick={() => setActiveTab('feed')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'feed' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <ActivityIcon /> Feed
                    </button>
                    <button 
                        onClick={() => setActiveTab('friends')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'friends' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <UserIcon /> Amici {friends.length > 0 && `(${friends.length})`}
                    </button>
                    <button 
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'add' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <AddUserIcon /> Aggiungi
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                    {/* Feedback Message Overlay */}
                    {message && (
                        <div className="sticky top-0 z-10 bg-cyan-900/90 border border-cyan-500/50 text-cyan-200 p-3 rounded-lg mb-4 text-center text-sm font-bold animate-fade-in-down shadow-lg backdrop-blur-sm">
                            {message}
                        </div>
                    )}

                    {activeTab === 'feed' && (
                        <div className="space-y-3">
                            {feed.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                    <div className="text-4xl mb-3 opacity-30">📭</div>
                                    <p>Il feed è vuoto.</p>
                                    <p className="text-xs mt-1">Aggiungi amici per vedere le loro corse qui.</p>
                                    <button onClick={() => setActiveTab('add')} className="mt-4 text-cyan-400 text-xs font-bold uppercase hover:underline">Trova Amici</button>
                                </div>
                            ) : (
                                feed.map(track => (
                                    <div key={track.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex justify-between items-center hover:bg-slate-800 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                                                    {track.userDisplayName?.substring(0,2)}
                                                </div>
                                                <span className="text-xs text-slate-300 font-bold uppercase">{track.userDisplayName}</span>
                                                <span className="text-xs text-slate-500">• {new Date(track.points[0].time).toLocaleDateString()}</span>
                                            </div>
                                            <h3 className="font-bold text-white text-base">{track.name}</h3>
                                            <div className="flex gap-3 mt-1 text-xs text-slate-400 font-mono">
                                                <span className="flex items-center gap-1">📏 {track.distance.toFixed(2)} km</span>
                                                <span className="flex items-center gap-1">⏱️ {(track.duration / 60000).toFixed(0)} min</span>
                                            </div>
                                        </div>
                                        <div className="text-2xl opacity-20 grayscale">👟</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'friends' && (
                        <div className="space-y-6">
                            {requests.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                        Richieste in attesa
                                    </h3>
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-slate-800 border border-purple-500/30 p-3 rounded-lg flex justify-between items-center mb-2 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-purple-900/50 rounded-full flex items-center justify-center text-purple-300 font-bold text-xs border border-purple-500/20">
                                                    {req.requester.name?.substring(0,2)}
                                                </div>
                                                <span className="text-white font-bold text-sm">{req.requester.name}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAccept(req.id)} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-purple-900/20">Accetta</button>
                                                <button onClick={() => handleReject(req.id)} className="bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Rifiuta</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">La tua Crew</h3>
                                {friends.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">Non hai ancora amici. Cerca qualcuno nella tab "Aggiungi"!</p>
                                ) : (
                                    friends.map(friend => (
                                        <div key={friend.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold border border-slate-600">
                                                        {friend.name?.substring(0,1)}
                                                    </div>
                                                    {friend.isOnline && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full shadow-lg shadow-green-500/50" title="Online adesso"></div>
                                                    )}
                                                </div>
                                                <span className="text-slate-200 font-medium text-sm">{friend.name}</span>
                                            </div>
                                            {friend.isOnline ? (
                                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-900/20 px-2 py-0.5 rounded border border-green-500/20">Online</span>
                                            ) : (
                                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Offline</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'add' && (
                        <div className="h-full flex flex-col">
                            <div className="relative mb-6 shrink-0">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <SearchIcon />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Cerca nome utente..." 
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                {loading && (
                                    <div className="absolute inset-y-0 right-3 flex items-center">
                                        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-grow space-y-2">
                                {searchResults.length === 0 && searchQuery.length > 0 && !loading && (
                                    <p className="text-center text-slate-500 text-sm mt-4">Nessun utente trovato con questo nome.</p>
                                )}
                                
                                {searchResults.length === 0 && searchQuery.length === 0 && (
                                    <div className="text-center text-slate-600 text-sm mt-8">
                                        <p>Inizia a scrivere per cercare runner nella community.</p>
                                    </div>
                                )}

                                {searchResults.map(user => {
                                    const isSent = user.id && sentRequests.has(user.id);
                                    return (
                                        <div key={user.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    {user.name?.substring(0,1)}
                                                </div>
                                                <span className="text-white font-bold text-sm">{user.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => user.id && handleSendRequest(user.id)}
                                                disabled={isSent}
                                                className={`text-xs px-4 py-2 rounded-lg font-bold transition-all ${
                                                    isSent 
                                                    ? 'bg-green-900/30 text-green-400 border border-green-500/30 cursor-default'
                                                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg active:scale-95'
                                                }`}
                                            >
                                                {isSent ? 'Inviata ✓' : 'Invia Richiesta'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocialHub;
