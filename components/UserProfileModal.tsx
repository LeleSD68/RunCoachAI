
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, PersonalRecord, RunningGoal, AiPersonality, Track, WeightEntry, ApiUsage, CalendarPreference } from '../types';
import { getStoredPRs, PR_DISTANCES } from '../services/prService';
import Tooltip from './Tooltip';
import GearManager from './GearManager';
import { supabase } from '../services/supabaseClient';
import { isStravaConnected } from '../services/stravaService';

interface UserProfileModalProps {
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    currentProfile: UserProfile;
    isWelcomeMode?: boolean; 
    tracks?: Track[];
    onLogout?: () => void;
}

const goalLabels: Record<RunningGoal, string> = {
    'none': 'Nessun obiettivo specifico',
    '5k': 'Migliorare sui 5km',
    '10k': 'Migliorare sui 10km',
    'half_marathon': 'Preparazione Mezza Maratona',
    'marathon': 'Preparazione Maratona',
    'speed': 'Aumentare la Velocità',
    'endurance': 'Aumentare la Resistenza',
    'weight_loss': 'Perdita di peso / Salute'
};

const personalityLabels: Record<AiPersonality, { label: string, desc: string }> = {
    'pro_balanced': { label: 'Coach Professionista', desc: 'Feedback realistici ed equilibrati.' },
    'analytic': { label: 'Analitico', desc: 'Freddo e basato sui dati. Solo fatti e statistiche.' },
    'strict': { label: 'Sergente', desc: 'Severo e rigoroso. Non accetta scuse.' }
};

const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toFixed(0).padStart(2, '0')}`;
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onSave, currentProfile, isWelcomeMode = false, tracks = [], onLogout }) => {
    const [profile, setProfile] = useState<UserProfile>({ 
        autoAnalyzeEnabled: true, 
        googleCalendarSyncEnabled: false,
        calendarPreference: 'google',
        stravaAutoSync: false,
        goals: [],
        shoes: [],
        ...currentProfile 
    });

    const [stravaConnected, setStravaConnected] = useState(false);

    useEffect(() => {
        setStravaConnected(isStravaConnected());
    }, []);

    const personalRecords = useMemo(() => getStoredPRs(), []);

    // Fix: Properly handle checked property with type casting to HTMLInputElement
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const { name, value, type } = target;
        const val = type === 'checkbox' ? (target as HTMLInputElement).checked : (['gender', 'aiPersonality', 'personalNotes', 'name', 'calendarPreference'].includes(name) ? value : Number(value));
        setProfile(prev => ({ ...prev, [name]: val }));
    };

    const toggleGoal = (goal: RunningGoal) => {
        setProfile(prev => {
            const currentGoals = prev.goals || [];
            const nextGoals = currentGoals.includes(goal) 
                ? currentGoals.filter(g => g !== goal)
                : [...currentGoals, goal];
            return { ...prev, goals: nextGoals };
        });
    };

    const handleSave = () => {
        onSave(profile);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9000] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Profilo Atleta</h2>
                        <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest opacity-80">Configurazione parametri e preferenze</p>
                    </div>
                    {!isWelcomeMode && (
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-all text-2xl">&times;</button>
                    )}
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8 bg-slate-900/50">
                    
                    {/* SECTION: SYNC & CALENDAR (NEW) */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] border-b border-blue-900/30 pb-2">Sincronizzazione</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${profile.calendarPreference === 'google' ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800/50 border-slate-700'}`} onClick={() => setProfile({...profile, calendarPreference: 'google'})}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">🤖</span>
                                    <span className="font-bold text-sm uppercase">Google / Android</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight">Usa Google Calendar per gestire i tuoi allenamenti.</p>
                            </div>
                            <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${profile.calendarPreference === 'apple' ? 'bg-white/10 border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-slate-800/50 border-slate-700'}`} onClick={() => setProfile({...profile, calendarPreference: 'apple'})}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">🍎</span>
                                    <span className="font-bold text-sm uppercase">Apple / iOS</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight">Esporta in formato iCal compatibile con Apple e Outlook.</p>
                            </div>
                        </div>
                        {/* Auto Sync Toggle */}
                        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${profile.stravaAutoSync ? 'bg-[#fc4c02]/10 border-[#fc4c02]/50' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[#fc4c02] font-black text-sm uppercase">Sync Strava all'Avvio</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Importa automaticamente le nuove corse quando apri l'app.</p>
                                {!stravaConnected && <p className="text-[9px] text-red-400 font-bold mt-1">Richiede connessione Strava attiva.</p>}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={profile.stravaAutoSync} 
                                    onChange={(e) => setProfile({...profile, stravaAutoSync: e.target.checked})} 
                                    disabled={!stravaConnected}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#fc4c02]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fc4c02]"></div>
                            </label>
                        </div>
                    </section>

                    {/* SECTION: ANAGRAFICA */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">Dati Biometrici</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nome Atleta</label>
                                <input type="text" name="name" value={profile.name || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors" placeholder="Il tuo nome" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Genere</label>
                                <select name="gender" value={profile.gender || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none">
                                    <option value="">Seleziona...</option>
                                    <option value="M">Maschio</option>
                                    <option value="F">Femmina</option>
                                    <option value="Altro">Altro</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Età</label>
                                <input type="number" name="age" value={profile.age || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Peso (kg)</label>
                                <input type="number" name="weight" value={profile.weight || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Altezza (cm)</label>
                                <input type="number" name="height" value={profile.height || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono" />
                            </div>
                        </div>
                    </section>

                    {/* SECTION: FISIOLOGIA */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] border-b border-red-900/20 pb-2">Parametri Cardiaci</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">FC Max (bpm)</label>
                                <input type="number" name="maxHr" value={profile.maxHr || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono" placeholder="Es. 185" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">FC Riposo (bpm)</label>
                                <input type="number" name="restingHr" value={profile.restingHr || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono" placeholder="Es. 50" />
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-500 italic">Questi dati permettono al Coach AI di calcolare con precisione le tue zone di allenamento.</p>
                    </section>

                    {/* SECTION: OBIETTIVI */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] border-b border-purple-900/20 pb-2">Obiettivi Stagionali</h3>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(goalLabels) as RunningGoal[]).map(goal => (
                                <button
                                    key={goal}
                                    onClick={() => toggleGoal(goal)}
                                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${profile.goals?.includes(goal) ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                                >
                                    {goalLabels[goal]}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* SECTION: GEAR */}
                    <section>
                         <GearManager 
                            shoes={profile.shoes || []} 
                            onAddShoe={(name) => setProfile(p => ({ ...p, shoes: [...(p.shoes || []), name] }))}
                            onRemoveShoe={(idx) => setProfile(p => ({ ...p, shoes: (p.shoes || []).filter((_, i) => i !== idx) }))}
                            tracks={tracks}
                         />
                    </section>

                    {/* SECTION: PERSONAL RECORDS */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] border-b border-amber-900/20 pb-2">Record Personali (PB)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {PR_DISTANCES.map(d => {
                                const record = personalRecords[d.meters];
                                return (
                                    <div key={d.meters} className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">{d.name}</div>
                                        <div className="text-sm font-black text-white font-mono">{record ? formatTime(record.time) : '--:--'}</div>
                                        {record && <div className="text-[8px] text-slate-500 truncate mt-1">{new Date(record.date).toLocaleDateString()}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* SECTION: AI COACH */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] border-b border-cyan-900/20 pb-2">Impostazioni Coach AI</h3>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Personalità del Coach</label>
                            <div className="grid gap-2">
                                {(Object.entries(personalityLabels) as [AiPersonality, any][]).map(([key, info]) => (
                                    <button
                                        key={key}
                                        onClick={() => setProfile({...profile, aiPersonality: key})}
                                        className={`w-full p-3 rounded-xl border text-left transition-all ${profile.aiPersonality === key ? 'bg-cyan-600/10 border-cyan-500 ring-1 ring-cyan-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                                    >
                                        <div className="font-bold text-sm text-white">{info.label}</div>
                                        <div className="text-[10px] text-slate-400">{info.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <footer className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                    {onLogout && !isWelcomeMode && (
                        <button onClick={onLogout} className="text-red-500 text-xs font-black uppercase tracking-widest hover:underline">Esci dall'account</button>
                    ) || <div></div>}
                    <div className="flex gap-3">
                        {!isWelcomeMode && <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors">Annulla</button>}
                        <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 px-10 rounded-xl shadow-lg shadow-cyan-900/20 active:scale-95 transition-all uppercase tracking-widest text-sm">Salva Profilo</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default UserProfileModal;
