
import React, { useEffect, useState } from 'react';
import { AdminStats, getAdminStats, searchAllUsers, updateUserStatus, AdminUserProfile } from '../services/adminService';
import { getApiUsage } from '../services/usageService';

interface AdminDashboardProps {
    onClose: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className={`bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform ${color}`}>
            {icon}
        </div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
        <p className="text-3xl font-black text-white">{value}</p>
    </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiUsage, setApiUsage] = useState<any>(null);
    
    // User Management State
    const [searchQuery, setSearchQuery] = useState('');
    const [userResults, setUserResults] = useState<AdminUserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAdminStats();
                setStats(data);
                setApiUsage(getApiUsage());
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        setIsSearching(true);
        try {
            const results = await searchAllUsers(searchQuery);
            setUserResults(results);
        } catch (e) {
            alert("Errore ricerca utenti (Verifica permessi Admin)");
        } finally {
            setIsSearching(false);
        }
    };

    const handleUpdateUser = async (userId: string, type: 'tier' | 'role', value: any) => {
        try {
            const updates = type === 'tier' ? { subscription_tier: value } : { is_admin: value };
            await updateUserStatus(userId, updates);
            // Optimistic update
            setUserResults(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        } catch (e) {
            alert("Errore aggiornamento utente");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950 z-[12000] overflow-hidden flex flex-col animate-fade-in font-sans text-white">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-red-900/20">🛡️</div>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter">Admin Control</h1>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Accesso Riservato</p>
                    </div>
                </div>
                <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">Chiudi</button>
            </header>

            <div className="flex-grow overflow-y-auto p-6 md:p-10 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Caricamento Dati Globali...</p>
                    </div>
                ) : stats ? (
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* KPI GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Utenti Totali" value={stats.totalUsers} icon="👥" color="text-blue-500" />
                            <StatCard title="Attivi Oggi" value={stats.activeToday} icon="🟢" color="text-green-500" />
                            <StatCard title="Tracce Cloud" value={stats.totalTracks} icon="☁️" color="text-purple-500" />
                            <StatCard title="Allenamenti" value={stats.totalWorkouts} icon="📅" color="text-amber-500" />
                        </div>

                        {/* USER MANAGEMENT SECTION */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <span className="text-amber-400">🔑</span> Gestione Permessi
                            </h3>
                            <div className="flex gap-4 mb-6">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Cerca utente per nome..."
                                    className="flex-grow bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500"
                                />
                                <button 
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-sm transition-colors"
                                >
                                    {isSearching ? '...' : 'Cerca'}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {userResults.length === 0 && searchQuery && !isSearching && (
                                    <p className="text-center text-slate-500 text-sm italic">Nessun utente trovato.</p>
                                )}
                                {userResults.map(user => (
                                    <div key={user.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex items-center gap-4 mb-3 md:mb-0">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg text-slate-400">
                                                {user.name ? user.name[0].toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{user.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{user.id}</div>
                                                <div className="text-[10px] text-slate-500">Ultima visita: {new Date(user.last_seen_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-4 items-center">
                                            <div className="flex flex-col items-end">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold mb-1">Livello</label>
                                                <select 
                                                    value={user.subscription_tier || 'free'}
                                                    onChange={(e) => handleUpdateUser(user.id, 'tier', e.target.value)}
                                                    className="bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1 outline-none focus:border-red-500"
                                                >
                                                    <option value="free">Free</option>
                                                    <option value="pro">Pro</option>
                                                    <option value="elite">Elite (Full)</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold mb-1">Ruolo</label>
                                                <button 
                                                    onClick={() => handleUpdateUser(user.id, 'role', !user.is_admin)}
                                                    className={`px-3 py-1 rounded text-xs font-bold uppercase ${user.is_admin ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                                >
                                                    {user.is_admin ? 'Admin' : 'User'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* USER LIST (RECENT) */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="text-cyan-400">⚡</span> Utenti Recenti
                                </h3>
                                <div className="space-y-4">
                                    {stats.recentUsers.map((u, i) => {
                                        const isOnline = new Date(u.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000;
                                        return (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                                    <div>
                                                        <div className="font-bold text-sm text-white">{u.name || 'Senza Nome'}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">Ultima azione: {new Date(u.last_seen_at).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SYSTEM HEALTH / AI USAGE */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="text-purple-400">🧠</span> Stato AI (Sessione Corrente)
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-bold">Richieste Totali</span>
                                        <span className="text-white font-mono font-black text-xl">{apiUsage?.requests || 0}</span>
                                    </div>
                                    <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-bold">Token Usati</span>
                                        <span className="text-purple-400 font-mono font-black text-xl">{apiUsage?.tokens || 0}</span>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <h4 className="text-[10px] text-slate-500 uppercase font-black mb-2">Quote Giornaliere (Tuo Utente)</h4>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <div className="text-xs text-slate-400">Workout</div>
                                                <div className="font-mono font-bold text-white">{apiUsage?.dailyCounts?.workout || 0}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400">Analisi</div>
                                                <div className="font-mono font-bold text-white">{apiUsage?.dailyCounts?.analysis || 0}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400">Chat</div>
                                                <div className="font-mono font-bold text-white">{apiUsage?.dailyCounts?.chat || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-red-500">Errore caricamento.</div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
