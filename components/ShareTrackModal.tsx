
import React, { useState, useEffect } from 'react';
import { Track, UserProfile, SocialGroup } from '../types';
import { getFriends, getGroups, updateTrackSharing } from '../services/socialService';
import { supabase } from '../services/supabaseClient';

interface ShareTrackModalProps {
    track: Track;
    onClose: () => void;
}

const ShareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 12a3 3 0 1 1-2.5 1.34l-3.15-1.92a3 3 0 1 1 0-2.83l3.15-1.92a3.001 3.001 0 0 1 5 1.33Z" /></svg>);
const GlobeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-11-4.69v.447a3.5 3.5 0 0 0 1.025 2.475L8.293 10 8 10.293a1 1 0 0 0 0 1.414l1.06 1.06a1.5 1.5 0 0 1 .44 1.061v.363a6.5 6.5 0 0 1-5.5-2.259V10a6.5 6.5 0 0 1 12.5 0Z" clipRule="evenodd" /><path fillRule="evenodd" d="M9 2.5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM5.5 5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM14.5 13a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM12.5 16a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1Z" clipRule="evenodd" /></svg>);
const UsersIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" /></svg>);
const LockClosedIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>);

const ShareTrackModal: React.FC<ShareTrackModalProps> = ({ track, onClose }) => {
    const [isPublic, setIsPublic] = useState(track.isPublic || false);
    const [friends, setFriends] = useState<UserProfile[]>([]);
    const [groups, setGroups] = useState<SocialGroup[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set(track.sharedWithUsers || []));
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(track.sharedWithGroups || []));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const [friendsList, groupsList] = await Promise.all([
                        getFriends(session.user.id),
                        getGroups(session.user.id)
                    ]);
                    setFriends(friendsList);
                    // Filter groups to show only those I am a member of
                    setGroups(groupsList.filter(g => g.isMember));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const toggleFriend = (id: string) => {
        const next = new Set(selectedFriends);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedFriends(next);
    };

    const toggleGroup = (id: string) => {
        const next = new Set(selectedGroups);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedGroups(next);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateTrackSharing(
                track.id,
                isPublic,
                Array.from(selectedFriends),
                Array.from(selectedGroups)
            );
            track.isPublic = isPublic;
            track.sharedWithUsers = Array.from(selectedFriends);
            track.sharedWithGroups = Array.from(selectedGroups);
            onClose();
        } catch (e) {
            alert("Errore salvataggio condivisione.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <ShareIcon /> Condividi Corsa
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar space-y-6">
                    {loading ? (
                        <div className="text-center text-slate-500 py-8">Caricamento contatti...</div>
                    ) : (
                        <>
                            {/* GLOBAL VISIBILITY */}
                            <div className={`p-4 rounded-xl border transition-all cursor-pointer ${isPublic ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-slate-800 border-slate-700'}`} onClick={() => setIsPublic(!isPublic)}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isPublic ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        <GlobeIcon />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className={`text-sm font-bold ${isPublic ? 'text-cyan-400' : 'text-slate-300'}`}>Tutti gli Amici</h3>
                                        <p className="text-xs text-slate-500">Visibile nel feed generale dei tuoi amici.</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isPublic ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500'}`}>
                                        {isPublic && <span className="text-white text-xs">✓</span>}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-800" />

                            {/* GROUPS */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><UsersIcon /> Gruppi</h3>
                                {groups.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">Nessun gruppo. Creane uno nel Social Hub.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {groups.map(g => (
                                            <div key={g.id} onClick={() => toggleGroup(g.id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${selectedGroups.has(g.id) ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                                                <span className="text-sm font-bold text-slate-200">{g.name}</span>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedGroups.has(g.id) ? 'bg-purple-500 border-purple-500' : 'border-slate-500'}`}>
                                                    {selectedGroups.has(g.id) && <span className="text-white text-[10px]">✓</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* PRIVATE FRIENDS */}
                            <div>
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LockClosedIcon /> Amici Specifici</h3>
                                {friends.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">Non hai ancora amici.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {friends.map(f => (
                                            <div key={f.id} onClick={() => toggleFriend(f.id!)} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selectedFriends.has(f.id!) ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                                                <div className={`w-3 h-3 rounded border flex items-center justify-center ${selectedFriends.has(f.id!) ? 'bg-green-500 border-green-500' : 'border-slate-500'}`}>
                                                    {selectedFriends.has(f.id!) && <span className="text-white text-[8px]">✓</span>}
                                                </div>
                                                <span className="text-xs font-bold text-slate-300 truncate">{f.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <footer className="p-5 bg-slate-900 border-t border-slate-800 flex gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors">Annulla</button>
                    <button onClick={handleSave} disabled={saving} className="flex-grow bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'Salvataggio...' : 'Salva Impostazioni'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ShareTrackModal;
