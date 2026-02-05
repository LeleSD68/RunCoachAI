
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FriendRequest, Track, DirectMessage, Reaction, SocialGroup } from '../types';
import { searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, getFriends, getFriendsActivityFeed, sendDirectMessage, getDirectMessages, toggleReaction, createGroup, getGroups, addMemberToGroup, getGroupMembers, getUnreadSenders, getGroupMembersDetails, removeMemberFromGroup } from '../services/socialService';
import { supabase } from '../services/supabaseClient';
import TrackPreview from './TrackPreview';
import RatingStars from './RatingStars';
import MiniChat from './MiniChat';

interface SocialHubProps {
    onClose: () => void;
    currentUserId: string;
    onChallengeGhost?: (track: Track) => void;
    onReadMessages?: () => void;
    initialChatUserId?: string | null;
}

const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>);
const AddUserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-4.385-1.572ZM16.25 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" /></svg>);
const ActivityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 2.1a.75.75 0 1 0 1.06 1.06l3.38-3.38a.75.75 0 0 0 0-1.06l-3.38-3.38a.75.75 0 1 0-1.06 1.06l2.1 2.1H6.75Z" clipRule="evenodd" /></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>);
const ChatBubbleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>);
const GroupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);

const SocialHub: React.FC<SocialHubProps> = ({ onClose, currentUserId, onChallengeGhost, onReadMessages, initialChatUserId }) => {
    const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'groups' | 'add'>('friends');
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [groups, setGroups] = useState<SocialGroup[]>([]);
    const [feed, setFeed] = useState<Track[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
    const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());
    
    const [newGroupName, setNewGroupName] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [activeGroupFilter, setActiveGroupFilter] = useState<SocialGroup | null>(null);
    const [inviteModeGroup, setInviteModeGroup] = useState<SocialGroup | null>(null);
    const [inviteableFriends, setInviteableFriends] = useState<UserProfile[]>([]);
    
    // New State for Viewing Members
    const [viewMembersGroup, setViewMembersGroup] = useState<SocialGroup | null>(null);
    const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);

    const [activeChatFriend, setActiveChatFriend] = useState<UserProfile | null>(null);

    // Initial load
    useEffect(() => {
        loadData();
        getFriendRequests(currentUserId).then(setRequests);
        refreshUnreadStatus();
    }, [activeTab, activeGroupFilter]);

    useEffect(() => {
        if (onReadMessages) onReadMessages();
    }, []);

    const refreshUnreadStatus = async () => {
        try {
            const senders = await getUnreadSenders(currentUserId);
            setUnreadSenders(senders);
        } catch (e) {
            console.error("Failed to refresh unread senders", e);
        }
    };

    useEffect(() => {
        if (initialChatUserId) {
            setActiveTab('friends');
            const openChat = async () => {
                let currentFriends = friends;
                if (currentFriends.length === 0) {
                    currentFriends = await getFriends(currentUserId);
                    setFriends(currentFriends);
                }
                const friend = currentFriends.find(f => f.id === initialChatUserId);
                if (friend) {
                    setActiveChatFriend(friend);
                }
            };
            openChat();
        }
    }, [initialChatUserId, currentUserId]);

    useEffect(() => {
        if (activeTab !== 'add') return;
        const timer = setTimeout(() => {
            if (searchQuery.length >= 3) handleSearch();
            else if (searchQuery.length === 0) setSearchResults([]);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'friends') {
                setFriends(await getFriends(currentUserId));
                setRequests(await getFriendRequests(currentUserId));
                refreshUnreadStatus();
            } else if (activeTab === 'feed') {
                setFeed(await getFriendsActivityFeed(currentUserId, activeGroupFilter?.id));
            } else if (activeTab === 'groups') {
                setGroups(await getGroups(currentUserId));
                if (!friends.length) setFriends(await getFriends(currentUserId));
            }
        } catch (e) {}
        setLoading(false);
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

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setLoading(true);
        try {
            await createGroup(newGroupName, '', currentUserId);
            setNewGroupName('');
            setIsCreatingGroup(false);
            loadData();
        } catch (e) {
            alert("Errore creazione gruppo");
        } finally {
            setLoading(false);
        }
    };

    const handleGroupClick = (group: SocialGroup) => {
        setActiveGroupFilter(group);
        setActiveTab('feed');
    };

    const handleViewMembers = async (group: SocialGroup) => {
        setLoading(true);
        try {
            const members = await getGroupMembersDetails(group.id);
            setGroupMembers(members);
            setViewMembersGroup(group);
        } catch (e) {
            console.error(e);
            alert("Errore caricamento membri.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!viewMembersGroup) return;
        if (!confirm("Rimuovere questo utente dal gruppo?")) return;
        
        try {
            await removeMemberFromGroup(viewMembersGroup.id, memberId);
            setGroupMembers(prev => prev.filter(m => m.id !== memberId));
            // Update group count in list
            setGroups(prev => prev.map(g => g.id === viewMembersGroup.id ? {...g, memberCount: g.memberCount - 1} : g));
        } catch (e) {
            alert("Errore rimozione membro.");
        }
    };

    const handleStartInvite = async (group: SocialGroup) => {
        setInviteModeGroup(group);
        setLoading(true);
        try {
            const currentMembers = await getGroupMembers(group.id);
            const membersSet = new Set(currentMembers);
            setInviteableFriends(friends.filter(f => f.id && !membersSet.has(f.id)));
        } catch (e) {
            setInviteableFriends(friends);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteFriend = async (friendId: string) => {
        if (!inviteModeGroup) return;
        try {
            await addMemberToGroup(inviteModeGroup.id, friendId);
            setInviteableFriends(prev => prev.filter(f => f.id !== friendId));
            const updatedGroups = groups.map(g => g.id === inviteModeGroup.id ? {...g, memberCount: g.memberCount + 1} : g);
            setGroups(updatedGroups);
        } catch (e) {
            console.error(e);
            alert("Impossibile aggiungere l'utente.");
        }
    };

    const handleSendRequest = async (userId: string) => {
        try {
            await sendFriendRequest(userId, currentUserId);
            setSentRequests(prev => new Set(prev).add(userId));
        } catch (e) {
            alert("Impossibile inviare richiesta.");
        }
    };

    const handleAccept = async (reqId: string) => {
        setLoading(true);
        await acceptFriendRequest(reqId);
        loadData();
        if (onReadMessages) onReadMessages();
    };

    const handleReject = async (reqId: string) => {
        if(confirm("Rifiutare richiesta?")) {
            setLoading(true);
            await rejectFriendRequest(reqId);
            loadData();
            if (onReadMessages) onReadMessages();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-cyan-400">⚡</span> Social Hub</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-900/50 shrink-0 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('friends')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'friends' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                        <UserIcon /> Amici
                        {(requests.length > 0 || unreadSenders.size > 0) && (
                            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${unreadSenders.size > 0 ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${unreadSenders.size > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </span>
                        )}
                    </button>
                    <button onClick={() => { setActiveTab('feed'); setActiveGroupFilter(null); }} className={`flex-1 min-w-[80px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'feed' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><ActivityIcon /> Feed</button>
                    <button onClick={() => setActiveTab('groups')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'groups' ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><GroupIcon /> Gruppi</button>
                    <button onClick={() => setActiveTab('add')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'add' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><AddUserIcon /> Cerca</button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar pb-24 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    {activeTab === 'feed' && (
                        <div className="space-y-3">
                            {activeGroupFilter && (
                                <div className="flex items-center justify-between bg-purple-900/20 border border-purple-500/30 p-2 rounded-lg mb-4">
                                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">Filtro: {activeGroupFilter.name}</span>
                                    <button onClick={() => setActiveGroupFilter(null)} className="text-purple-400 hover:text-white font-bold px-2">&times;</button>
                                </div>
                            )}
                            
                            {feed.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                    <div className="text-4xl mb-3 opacity-30">📭</div>
                                    <p>Il feed {activeGroupFilter ? 'di questo gruppo' : ''} è vuoto.</p>
                                </div>
                            ) : (
                                feed.map(track => {
                                    const reactionCount = track.reactions?.length || 0;
                                    return (
                                        <div 
                                            key={track.id} 
                                            onClick={() => {
                                                if (onChallengeGhost) {
                                                    if(confirm(`Sfidare ${track.userDisplayName} in modalità Ghost?`)) {
                                                        onChallengeGhost(track);
                                                        onClose();
                                                    }
                                                }
                                            }}
                                            className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group cursor-pointer"
                                        >
                                            <div className="flex items-center p-3 gap-3">
                                                <div className="w-12 h-12 bg-slate-950 rounded-lg border border-slate-700 overflow-hidden shrink-0 relative">
                                                    <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80" />
                                                </div>
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
                                                <div className="flex flex-col items-end gap-1">
                                                    {reactionCount > 0 && <div className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-900/50 text-purple-300">🔥 {reactionCount}</div>}
                                                    <button className="text-[10px] bg-purple-600 text-white px-2 py-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">SFIDA</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeTab === 'groups' && !inviteModeGroup && !viewMembersGroup && (
                        <div>
                            <button 
                                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                                className="w-full py-3 mb-4 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/50 rounded-xl text-purple-300 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                            >
                                {isCreatingGroup ? 'Annulla' : '+ Crea Nuovo Gruppo'}
                            </button>

                            {isCreatingGroup && (
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4 animate-fade-in-down">
                                    <input 
                                        type="text" 
                                        value={newGroupName} 
                                        onChange={e => setNewGroupName(e.target.value)}
                                        placeholder="Nome del gruppo (es. Marathon Training)"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm mb-2"
                                    />
                                    <button 
                                        onClick={handleCreateGroup} 
                                        disabled={!newGroupName.trim() || loading}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg text-xs uppercase"
                                    >
                                        Crea
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {groups.length === 0 ? <p className="text-center text-slate-500 text-xs italic">Nessun gruppo.</p> : groups.map(g => (
                                    <div 
                                        key={g.id} 
                                        className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col gap-2 hover:border-purple-500/50 transition-colors"
                                    >
                                        <div className="flex justify-between items-center cursor-pointer" onClick={() => handleGroupClick(g)}>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{g.name}</h4>
                                                <p className="text-[10px] text-slate-400">{g.memberCount} membri</p>
                                            </div>
                                            <div className="text-purple-400 text-xs font-bold uppercase">Apri Feed &rarr;</div>
                                        </div>
                                        
                                        <div className="border-t border-slate-700/50 pt-2 flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleViewMembers(g)}
                                                className="flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded font-bold uppercase transition-colors"
                                            >
                                                Vedi Membri
                                            </button>
                                            {g.ownerId === currentUserId && (
                                                <button 
                                                    onClick={() => handleStartInvite(g)}
                                                    className="flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-green-600 hover:text-white text-slate-300 px-2 py-1 rounded font-bold uppercase transition-colors"
                                                >
                                                    + Invita
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VIEW MEMBERS OVERLAY */}
                    {viewMembersGroup && (
                        <div className="space-y-4 animate-fade-in-right">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-white uppercase">Membri: {viewMembersGroup.name}</h3>
                                <button onClick={() => setViewMembersGroup(null)} className="text-xs text-slate-400 hover:text-white">Indietro</button>
                            </div>
                            <div className="space-y-2">
                                {groupMembers.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs py-8">Nessun membro visibile.</p>
                                ) : (
                                    groupMembers.map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {m.name?.substring(0,1)}
                                                </div>
                                                <span className="text-sm font-bold text-white">
                                                    {m.name} 
                                                    {m.id === viewMembersGroup.ownerId && <span className="text-[9px] ml-2 text-amber-400 bg-amber-900/30 px-1.5 rounded uppercase">Admin</span>}
                                                </span>
                                            </div>
                                            {/* Only owner can remove, and cannot remove self */}
                                            {viewMembersGroup.ownerId === currentUserId && m.id !== currentUserId && (
                                                <button 
                                                    onClick={() => m.id && handleRemoveMember(m.id)}
                                                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                    title="Rimuovi dal gruppo"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {inviteModeGroup && (
                        <div className="space-y-4 animate-fade-in-right">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-white uppercase">Aggiungi a "{inviteModeGroup.name}"</h3>
                                <button onClick={() => setInviteModeGroup(null)} className="text-xs text-slate-400 hover:text-white">Indietro</button>
                            </div>
                            
                            <div className="space-y-2">
                                {inviteableFriends.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs py-8">Nessun amico da aggiungere.</p>
                                ) : (
                                    inviteableFriends.map(friend => (
                                        <div key={friend.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                    {friend.name?.substring(0,1)}
                                                </div>
                                                <span className="text-sm font-bold text-white">{friend.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => friend.id && handleInviteFriend(friend.id)}
                                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-600 hover:bg-green-500 text-white transition-all shadow-md active:scale-95"
                                            >
                                                Aggiungi +
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'friends' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Requests */}
                            {requests.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-2">Richieste in sospeso</h3>
                                    {requests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-3 bg-slate-800/80 border border-cyan-500/30 rounded-xl">
                                            <span className="text-sm font-bold text-white">{req.requester.name}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAccept(req.id)} className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg></button>
                                                <button onClick={() => handleReject(req.id)} className="bg-red-900/50 hover:bg-red-900 text-red-400 p-1.5 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Friends List */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">I tuoi amici ({friends.length})</h3>
                                {friends.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-xs">
                                        <p>Non hai ancora amici connessi.</p>
                                        <button onClick={() => setActiveTab('add')} className="text-cyan-400 underline mt-1">Cerca qualcuno</button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {friends.map(friend => {
                                            const hasUnread = friend.id && unreadSenders.has(friend.id);
                                            return (
                                                <div 
                                                    key={friend.id} 
                                                    onClick={() => setActiveChatFriend(friend)}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors group cursor-pointer ${hasUnread ? 'bg-slate-800 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                                                {friend.name?.substring(0,1)}
                                                            </div>
                                                            {friend.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-slate-800 rounded-full"></div>}
                                                        </div>
                                                        <span className={`text-sm font-bold ${hasUnread ? 'text-green-400' : 'text-white'}`}>{friend.name}</span>
                                                    </div>
                                                    <button className={`p-2 rounded-lg transition-colors ${hasUnread ? 'text-green-400 bg-green-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                                        <ChatBubbleIcon />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'add' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <SearchIcon />
                                </div>
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cerca per nome..." 
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                {!loading && searchResults.length === 0 && searchQuery.length >= 3 && (
                                    <div className="text-center text-slate-500 text-xs py-4">Nessun utente trovato.</div>
                                )}

                                {searchResults.map(user => {
                                    const isSent = sentRequests.has(user.id || '');
                                    return (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                                    {user.name?.substring(0,1)}
                                                </div>
                                                <span className="text-sm font-bold text-white">{user.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => user.id && handleSendRequest(user.id)}
                                                disabled={isSent}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isSent ? 'bg-slate-700 text-slate-400' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                                            >
                                                {isSent ? 'Inviata' : 'Aggiungi'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {activeChatFriend && (
                <MiniChat 
                    currentUser={{ id: currentUserId }} 
                    friend={activeChatFriend} 
                    onClose={() => { setActiveChatFriend(null); refreshUnreadStatus(); }}
                    onMessagesRead={() => { onReadMessages?.(); refreshUnreadStatus(); }}
                />
            )}
        </div>
    );
};

export default SocialHub;
