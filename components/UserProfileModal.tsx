
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, PersonalRecord, RunningGoal, AiPersonality, Track, WeightEntry, ApiUsage } from '../types';
import { getStoredPRs, findBestTimeForDistance, PR_DISTANCES } from '../services/prService';
import Tooltip from './Tooltip';
import SimpleLineChart from './SimpleLineChart';
import GearManager from './GearManager';
import { supabase } from '../services/supabaseClient';

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
    'pro_balanced': { label: 'Coach Professionista', desc: 'Feedback realistici ed equilibrati. Dice quello che c\'è da dire con professionalità, senza eccessi.' },
    'analytic': { label: 'Analitico', desc: 'Freddo e basato sui dati. Solo fatti e statistiche, senza emozioni.' },
    'strict': { label: 'Sergente', desc: 'Severo e rigoroso. Non accetta scuse, solo impegno.' }
};

const formatPRTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let timeString = '';
    if (hours > 0) timeString += `${hours}:`;
    timeString += `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    return timeString;
};

const formatPRDistance = (meters: number): string => {
    if (meters === 1000) return '1 km';
    if (meters === 5000) return '5 km';
    if (meters === 10000) return '10 km';
    if (meters === 21097.5) return 'Mezza Maratona';
    if (meters === 42195) return 'Maratona';
    return `${(meters / 1000).toFixed(2)} km`;
};

const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" />
    </svg>
);

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onSave, currentProfile, isWelcomeMode = false, tracks = [], onLogout }) => {
    const [profile, setProfile] = useState<UserProfile>({ 
        autoAnalyzeEnabled: true, 
        powerSaveMode: false,
        ...currentProfile 
    });
    const [personalRecords, setPersonalRecords] = useState<Record<string, PersonalRecord>>({});
    const [calculatingPRs, setCalculatingPRs] = useState(false);
    const [showWeightHistory, setShowWeightHistory] = useState(false);
    const [usage, setUsage] = useState<ApiUsage | null>(null);
    
    const [newPassword, setNewPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState('');

    useEffect(() => {
        if (window.gpxApp) {
            setUsage(window.gpxApp.getUsage());
        }
    }, []);

    useEffect(() => {
        setProfile({ autoAnalyzeEnabled: true, powerSaveMode: false, ...currentProfile });
        
        if (tracks && tracks.length > 0) {
            setCalculatingPRs(true);
            setTimeout(() => {
                const computedPRs: Record<string, PersonalRecord> = {};
                PR_DISTANCES.forEach(distanceDef => {
                    const targetKm = distanceDef.meters / 1000;
                    let globalBestTime = Infinity;
                    let globalBestTrack: Track | null = null;
                    tracks.forEach(track => {
                        if (track.distance < targetKm) return;
                        const time = findBestTimeForDistance(track.points, targetKm);
                        if (time !== null && time < globalBestTime) {
                            globalBestTime = time;
                            globalBestTrack = track;
                        }
                    });
                    if (globalBestTrack && globalBestTime !== Infinity) {
                        computedPRs[distanceDef.meters] = {
                            distance: distanceDef.meters,
                            time: globalBestTime,
                            trackId: (globalBestTrack as Track).id,
                            trackName: (globalBestTrack as Track).name,
                            date: new Date((globalBestTrack as Track).points[0].time).toISOString()
                        };
                    }
                });
                setPersonalRecords(computedPRs);
                setCalculatingPRs(false);
            }, 100);
        } else {
            setPersonalRecords(getStoredPRs());
        }
    }, [currentProfile, tracks]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as any;
        const val = type === 'checkbox' ? e.target.checked : (['gender', 'aiPersonality', 'personalNotes', 'name'].includes(name) ? value : Number(value));
        setProfile(prev => ({ ...prev, [name]: val }));
    };

    const toggleGoal = (goal: RunningGoal) => {
        setProfile(prev => {
            const currentGoals = prev.goals || [];
            if (goal === 'none') return { ...prev, goals: ['none'] };
            let nextGoals = currentGoals.filter(g => g !== 'none');
            if (nextGoals.includes(goal)) nextGoals = nextGoals.filter(g => g !== goal);
            else nextGoals = [...nextGoals, goal];
            if (nextGoals.length === 0) nextGoals = ['none'];
            return { ...prev, goals: nextGoals };
        });
    };

    const handleSave = () => {
        const updatedProfile = { ...profile };
        const currentWeight = Number(profile.weight);
        const history = [...(profile.weightHistory || [])];
        if (!isNaN(currentWeight) && currentWeight > 0) {
            const lastEntry = history.length > 0 ? history[history.length - 1] : null;
            if (!lastEntry || Math.abs(lastEntry.weight - currentWeight) > 0.1) {
                history.push({ date: new Date().toISOString(), weight: currentWeight });
            }
        }
        updatedProfile.weightHistory = history;
        onSave(updatedProfile);
        onClose();
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setPasswordStatus('La password deve essere di almeno 6 caratteri.');
            return;
        }
        setPasswordStatus('Aggiornamento in corso...');
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordStatus('Password aggiornata con successo!');
            setNewPassword('');
        } catch (e: any) {
            setPasswordStatus(`Errore: ${e.message}`);
        }
    };
    
    const sortedPRs = Object.values(personalRecords).sort((a: PersonalRecord, b: PersonalRecord) => a.distance - b.distance);
    const weightChartData = useMemo(() => {
        if (!profile.weightHistory || profile.weightHistory.length < 2) return null;
        return profile.weightHistory.map(entry => ({ date: new Date(entry.date), value: entry.weight }));
    }, [profile.weightHistory]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 shrink-0">
                    <h2 className="text-xl font-bold text-cyan-400">Profilo Atleta</h2>
                    {!isWelcomeMode && (
                        <button onClick={onClose} className="text-2xl leading-none p-1 hover:bg-slate-700">&times;</button>
                    )}
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-8">
                        
                        {/* Cost Control Dashboard */}
                        {!isWelcomeMode && usage && (
                            <section className="bg-slate-900/50 p-4 rounded-xl border border-cyan-500/30">
                                <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                    Consumi AI (Oggi)
                                    <span className="text-[10px] text-slate-500 font-mono">{usage.lastReset}</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Richieste</p>
                                        <p className="text-xl font-black text-white">{usage.requests}</p>
                                    </div>
                                    <div className="bg-slate-800 p-2 rounded border border-slate-700">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold">Token Stimati</p>
                                        <p className="text-xl font-black text-white">{(usage.tokens / 1000).toFixed(1)}k</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2 border-t border-slate-800">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Analisi Automatica</span>
                                        <input 
                                            type="checkbox" 
                                            name="autoAnalyzeEnabled"
                                            checked={profile.autoAnalyzeEnabled} 
                                            onChange={handleChange}
                                            className="w-4 h-4 accent-cyan-500" 
                                        />
                                    </label>
                                    <p className="text-[9px] text-slate-500 leading-tight">Se disattivato, l'AI non analizzerà le corse finché non premi esplicitamente il pulsante "Analizza".</p>
                                    
                                    <label className="flex items-center justify-between cursor-pointer group mt-4">
                                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Risparmio Token (Eco Mode)</span>
                                        <input 
                                            type="checkbox" 
                                            name="powerSaveMode"
                                            checked={profile.powerSaveMode} 
                                            onChange={handleChange}
                                            className="w-4 h-4 accent-purple-500" 
                                        />
                                    </label>
                                    <p className="text-[9px] text-slate-500 leading-tight">Riduce drasticamente i dati GPS inviati all'AI, sacrificando un po' di precisione per dimezzare i costi.</p>
                                </div>
                            </section>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1">Dati Anagrafici</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-300">Nome Atleta</label>
                                <input type="text" name="name" value={profile.name || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Genere</label>
                                    <select name="gender" value={profile.gender || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                        <option value="">Seleziona</option>
                                        <option value="M">Uomo</option>
                                        <option value="F">Donna</option>
                                        <option value="Altro">Altro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Età</label>
                                    <input type="number" name="age" value={profile.age || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1">Fisiologia</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Altezza (cm)</label>
                                    <input type="number" name="height" value={profile.height || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center">
                                        <label className="block text-sm font-medium text-slate-300">Peso (kg)</label>
                                        {weightChartData && (
                                            <button type="button" onClick={() => setShowWeightHistory(!showWeightHistory)} className={`p-1 rounded ${showWeightHistory ? 'text-cyan-400 bg-slate-700' : 'text-slate-400'}`}><ChartIcon /></button>
                                        )}
                                    </div>
                                    <input type="number" step="0.1" name="weight" value={profile.weight || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                                </div>
                            </div>
                            
                            {showWeightHistory && weightChartData && (
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 mt-2 animate-fade-in-down">
                                    <SimpleLineChart data={weightChartData} color1="#22d3ee" title="Peso" yLabel="Kg" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">FC Max</label>
                                    <input type="number" name="maxHr" value={profile.maxHr || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">FC Riposo</label>
                                    <input type="number" name="restingHr" value={profile.restingHr || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                                </div>
                            </div>
                        </div>

                        <GearManager shoes={profile.shoes || []} onAddShoe={s => setProfile(p => ({ ...p, shoes: [...(p.shoes || []), s] }))} onRemoveShoe={i => setProfile(p => ({ ...p, shoes: (p.shoes || []).filter((_, idx) => idx !== i) }))} tracks={tracks} />

                        <div>
                            <label className="block text-sm font-bold text-cyan-500 uppercase mb-3">Obiettivo Principale</label>
                            <div className="grid grid-cols-1 gap-2">
                                {(Object.entries(goalLabels) as [RunningGoal, string][]).map(([key, label]) => (
                                    <button key={key} type="button" onClick={() => toggleGoal(key)} className={`text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${(profile.goals || ['none']).includes(key) ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>{label}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-cyan-500 uppercase mb-2">Tono del Coach AI</label>
                            <select name="aiPersonality" value={profile.aiPersonality || 'pro_balanced'} onChange={handleChange} className="block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                {Object.entries(personalityLabels).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-slate-700 flex justify-between bg-slate-800 shrink-0">
                    {onLogout && !isWelcomeMode && <button type="button" onClick={onLogout} className="text-red-400 font-bold px-4 py-2 hover:bg-red-900/20 rounded">Logout</button>}
                    <div className="flex gap-3 ml-auto">
                        {!isWelcomeMode && <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400">Annulla</button>}
                        <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md shadow-lg">Salva</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default UserProfileModal;
