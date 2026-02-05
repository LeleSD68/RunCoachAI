
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, PersonalRecord, RunningGoal, AiPersonality, Track, WeightEntry, ApiUsage, CalendarPreference } from '../types';
import { getStoredPRs, PR_DISTANCES } from '../services/prService';
import Tooltip from './Tooltip';
import GearManager from './GearManager';
import { supabase } from '../services/supabaseClient';
import { isStravaConnected } from '../services/stravaService';
import { deleteUserAccount } from '../services/dbService';

interface UserProfileModalProps {
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    currentProfile: UserProfile;
    isWelcomeMode?: boolean; 
    tracks?: Track[];
    onLogout?: () => void;
}

const goalLabels: Record<string, string> = {
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
    'friend_coach': { label: 'Coach AI (Best Friend)', desc: 'Empatico, flessibile, il tuo pilastro di supporto.' },
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
        retiredShoes: [],
        ...currentProfile 
    });

    const [customGoalInput, setCustomGoalInput] = useState('');

    const personalRecords = useMemo(() => getStoredPRs(), []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const { name, value, type } = target;
        const val = type === 'checkbox' ? (target as HTMLInputElement).checked : (['gender', 'aiPersonality', 'personalNotes', 'name', 'calendarPreference'].includes(name) ? value : Number(value));
        setProfile(prev => ({ ...prev, [name]: val }));
    };

    const toggleGoal = (goal: string) => {
        setProfile(prev => {
            const currentGoals = prev.goals || [];
            const nextGoals = currentGoals.includes(goal) 
                ? currentGoals.filter(g => g !== goal)
                : [...currentGoals, goal];
            return { ...prev, goals: nextGoals };
        });
    };

    const addCustomGoal = () => {
        if (!customGoalInput.trim()) return;
        const goalStr = `Obiettivo: ${customGoalInput} km`;
        toggleGoal(goalStr);
        setCustomGoalInput('');
    };

    const handleSave = () => {
        onSave(profile);
        onClose();
    };

    const handleDeleteAccount = async () => {
        if (confirm("SEI SICURO? Questa azione cancellerà permanentemente tutti i tuoi dati, tracce, amici e messaggi. Non si può annullare.")) {
            if (confirm("Confermi l'eliminazione definitiva dell'account?")) {
                await deleteUserAccount();
            }
        }
    };

    // Gear Manager Handlers
    const handleAddShoe = (name: string) => setProfile(p => ({ ...p, shoes: [...(p.shoes || []), name] }));
    
    const handleRemoveShoe = (idx: number) => {
        if (confirm("Eliminare definitivamente questa scarpa? Se vuoi mantenere lo storico, usa 'Ritira' (icona scatola).")) {
            setProfile(p => ({ ...p, shoes: (p.shoes || []).filter((_, i) => i !== idx) }));
        }
    };

    const handleRetireShoe = (idx: number) => {
        setProfile(p => {
            const shoeToRetire = (p.shoes || [])[idx];
            const newActive = (p.shoes || []).filter((_, i) => i !== idx);
            const newRetired = [...(p.retiredShoes || []), shoeToRetire];
            return { ...p, shoes: newActive, retiredShoes: newRetired };
        });
    };

    const handleRestoreShoe = (idx: number) => {
        setProfile(p => {
            const shoeToRestore = (p.retiredShoes || [])[idx];
            const newRetired = (p.retiredShoes || []).filter((_, i) => i !== idx);
            const newActive = [...(p.shoes || []), shoeToRestore];
            return { ...p, shoes: newActive, retiredShoes: newRetired };
        });
    };

    const handleDeleteRetiredShoe = (idx: number) => {
        if (confirm("Eliminare definitivamente dall'archivio?")) {
            setProfile(p => ({ ...p, retiredShoes: (p.retiredShoes || []).filter((_, i) => i !== idx) }));
        }
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
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                            {/* Standard Goals */}
                            {(Object.keys(goalLabels)).map(goalKey => (
                                <button
                                    key={goalKey}
                                    onClick={() => toggleGoal(goalKey)}
                                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${profile.goals?.includes(goalKey) ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                                >
                                    {goalLabels[goalKey]}
                                </button>
                            ))}
                            
                            {/* Custom Goals Display */}
                            {profile.goals?.filter(g => !goalLabels[g]).map((customGoal, idx) => (
                                <button
                                    key={`custom-${idx}`}
                                    onClick={() => toggleGoal(customGoal)}
                                    className="px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border bg-purple-900/40 border-purple-500/50 text-purple-200 hover:bg-red-900/40 hover:border-red-500"
                                    title="Clicca per rimuovere"
                                >
                                    {customGoal} ✕
                                </button>
                            ))}
                        </div>

                        {/* Custom Goal Input */}
                        <div className="flex gap-2 items-center">
                            <input 
                                type="number" 
                                value={customGoalInput}
                                onChange={(e) => setCustomGoalInput(e.target.value)}
                                placeholder="Km personalizzati (es. 2000)"
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 outline-none w-40"
                            />
                            <button 
                                onClick={addCustomGoal}
                                disabled={!customGoalInput}
                                className="bg-slate-700 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                                + Aggiungi Km
                            </button>
                        </div>
                    </section>

                    {/* SECTION: GEAR */}
                    <section>
                         <GearManager 
                            shoes={profile.shoes || []} 
                            retiredShoes={profile.retiredShoes || []}
                            onAddShoe={handleAddShoe}
                            onRemoveShoe={handleRemoveShoe}
                            onRetireShoe={handleRetireShoe}
                            onRestoreShoe={handleRestoreShoe}
                            onDeleteRetiredShoe={handleDeleteRetiredShoe}
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
                    <div className="flex flex-col items-start gap-2">
                        {onLogout && !isWelcomeMode && (
                            <button onClick={onLogout} className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" /><path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" /></svg>
                                Esci
                            </button>
                        )}
                        {!isWelcomeMode && (
                            <button onClick={handleDeleteAccount} className="text-red-900 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                                Elimina
                            </button>
                        )}
                    </div>
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
