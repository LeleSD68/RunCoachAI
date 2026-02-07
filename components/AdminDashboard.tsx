
import React, { useEffect, useState } from 'react';
import { AdminStats, getAdminStats, updateUserStatus } from '../services/adminService';
import { AdminUserStats, SubscriptionTier } from '../types';
import { getApiUsage } from '../services/usageService';

interface AdminDashboardProps {
    onClose: () => void;
}

const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return (tokens / 1000000).toFixed(1) + 'M';
    if (tokens >= 1000) return (tokens / 1000).toFixed(1) + 'k';
    return tokens.toString();
};

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className={`bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform ${color}`}>
            {icon}
        </div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
        <p className="text-3xl font-black text-white">{value}</p>
    </div>
);

const ActivityBar: React.FC<{ value: number, max: number, label: string }> = ({ value, max, label }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const color = value > 0 ? (value > 10 ? 'bg-green-500' : 'bg-cyan-500') : 'bg-slate-700';
    
    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between text-[9px] text-slate-500 font-mono uppercase">
                <span>{label}</span>
                <span>{value}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
};

const UserRow: React.FC<{ user: AdminUserStats, onUpdate: (id: string, tier: SubscriptionTier, isAdmin: boolean) => void }> = ({ user, onUpdate }) => {
    const isOnline = new Date(user.lastSeenAt).getTime() > Date.now() - 5 * 60 * 1000;
    const [tier, setTier] = useState<SubscriptionTier>(user.subscriptionTier || 'free');
    const [isAdmin, setIsAdmin] = useState(user.isAdmin);
    const [isDirty, setIsDirty] = useState(false);

    const handleSave = () => {
        if (confirm(`Modificare utente ${user.name}?`)) {
            onUpdate(user.id, tier, isAdmin);
            setIsDirty(false);
        }
    };

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex flex-col gap-4 hover:border-slate-500 transition-colors">
            {/* Header: Identity */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    <div>
                        <div className="font-bold text-sm text-white">{user.name || 'Senza Nome'}</div>
                        <div className="text-[10px] text-slate-500 font-mono select-all">{user.id}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            Ultimo: {new Date(user.lastSeenAt).toLocaleString()}
                        </div>
                    </div>
                </div>
                
                {/* Controls */}
                <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2">
                        <select 
                            value={tier}
                            onChange={(e) => { setTier(e.target.value as SubscriptionTier); setIsDirty(true); }}
                            className={`text-xs font-bold rounded px-2 py-1 outline-none border ${tier === 'elite' ? 'bg-amber-900/40 text-amber-400 border-amber-500/50' : tier === 'pro' ? 'bg-purple-900/40 text-purple-400 border-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-600'}`}
                        >
                            <option value="free">FREE</option>
                            <option value="pro">PRO</option>
                            <option value="elite">ELITE</option>
                        </select>
                        
                        <button 
                            onClick={() => { setIsAdmin(!isAdmin); setIsDirty(true); }}
                            className={`text-[10px] font-black px-2 py-1 rounded border uppercase ${isAdmin ? 'bg-red-600 text-white border-red-500' : 'bg-slate-900 text-slate-500 border-slate-700'}`}
                        >
                            {isAdmin ? 'ADMIN' : 'USER'}
                        </button>
                    </div>
                    {isDirty && (
                        <button onClick={handleSave} className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded font-bold uppercase tracking-wider animate-pulse">
                            Salva Modifiche
                        </button>
                    )}
                </div>
            </div>
            
            {/* AI Stats Row */}
            <div className="flex items-center gap-4 bg-purple-900/10 p-2 rounded-lg border border-purple-500/20">
                <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1">
                    <span>🧠 AI Usage:</span>
                </div>
                <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400">Tokens</span>
                        <span className="text-sm font-black text-white font-mono">{formatTokens(user.aiTokens)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400">Requests</span>
                        <span className="text-sm font-black text-white font-mono">{user.aiRequests}</span>
                    </div>
                </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-3 gap-4 border-t border-slate-700/50 pt-3">
                <ActivityBar value={user.logins24h} max={10} label="24 Ore" />
                <ActivityBar value={user.logins7d} max={30} label="7 Giorni" />
                <ActivityBar value={user.logins30d} max={100} label="30 Giorni" />
            </div>
        </div>
    );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [apiUsage, setApiUsage] = useState<any>(null);

    const load = async () => {
        try {
            const data = await getAdminStats();
            setStats(data);
            setApiUsage(getApiUsage());
        } catch (e) {
            console.error(e);
            alert("Errore caricamento dati admin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleUserUpdate = async (id: string, tier: SubscriptionTier, isAdmin: boolean) => {
        try {
            await updateUserStatus(id, tier, isAdmin);
            await load(); // Reload to confirm
        } catch(e) {
            alert("Errore aggiornamento utente.");
        }
    };

    const filteredUsers = stats?.usersList.filter(u => 
        u.name?.toLowerCase().includes(filter.toLowerCase()) || 
        u.id.includes(filter)
    ) || [];

    return (
        <div className="fixed inset-0 bg-slate-950 z-[12000] overflow-hidden flex flex-col animate-fade-in font-sans text-white">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-red-900/20">🛡️</div>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter">Admin Control</h1>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Accesso Riservato</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={load} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">Aggiorna</button>
                    <button onClick={onClose} className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">Chiudi</button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Analisi Database...</p>
                    </div>
                ) : stats ? (
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* KPI GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Utenti Totali" value={stats.totalUsers} icon="👥" color="text-blue-500" />
                            <StatCard title="Attivi Oggi" value={stats.activeToday} icon="🟢" color="text-green-500" />
                            <StatCard title="Tracce Cloud" value={stats.totalTracks} icon="☁️" color="text-purple-500" />
                            <StatCard title="Allenamenti" value={stats.totalWorkouts} icon="📅" color="text-amber-500" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* USER MANAGEMENT LIST (2/3 Width) */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <span className="text-cyan-400">⚡</span> Gestione Utenti ({filteredUsers.length})
                                    </h3>
                                    <input 
                                        type="text" 
                                        placeholder="Cerca nome o ID..." 
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 outline-none w-48"
                                    />
                                </div>
                                
                                <div className="space-y-3">
                                    {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                        <UserRow key={user.id} user={user} onUpdate={handleUserUpdate} />
                                    )) : (
                                        <div className="text-center py-8 text-slate-500 italic">Nessun utente trovato.</div>
                                    )}
                                </div>
                            </div>

                            {/* SYSTEM HEALTH (1/3 Width) */}
                            <div className="space-y-6">
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-4">
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <span className="text-purple-400">🧠</span> Stato AI (Tu)
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                                            <span className="text-slate-400 text-sm font-bold">Richieste Sessione</span>
                                            <span className="text-white font-mono font-black text-xl">{apiUsage?.requests || 0}</span>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                                            <span className="text-slate-400 text-sm font-bold">Token Usati</span>
                                            <span className="text-purple-400 font-mono font-black text-xl">{formatTokens(apiUsage?.tokens || 0)}</span>
                                        </div>
                                        
                                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                            <h4 className="text-[10px] text-slate-500 uppercase font-black mb-2">Quote Giornaliere</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Workout Gen</span>
                                                    <span className="font-mono font-bold text-white">{apiUsage?.dailyCounts?.workout || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Analisi Deep</span>
                                                    <span className="font-mono font-bold text-white">{apiUsage?.dailyCounts?.analysis || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Chat Msg</span>
                                                    <span className="font-mono font-bold text-white">{apiUsage?.dailyCounts?.chat || 0}</span>
                                                </div>
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
