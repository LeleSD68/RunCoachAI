
import React, { useEffect, useState } from 'react';
import { AdminStats, getAdminStats } from '../services/adminService';
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

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* USER LIST */}
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
                                        <h4 className="text-[10px] text-slate-500 uppercase font-black mb-2">Quote Giornaliere (Utente Attuale)</h4>
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
