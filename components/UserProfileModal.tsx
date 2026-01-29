
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, PersonalRecord, RunningGoal, AiPersonality, Track, WeightEntry } from '../types';
import { getStoredPRs, findBestTimeForDistance, PR_DISTANCES } from '../services/prService';
import Tooltip from './Tooltip';
import SimpleLineChart from './SimpleLineChart';
import GearManager from './GearManager'; // Import new component

interface UserProfileModalProps {
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    currentProfile: UserProfile;
    isWelcomeMode?: boolean; 
    tracks?: Track[];
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

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onSave, currentProfile, isWelcomeMode = false, tracks = [] }) => {
    const [profile, setProfile] = useState<UserProfile>({ ...currentProfile });
    const [personalRecords, setPersonalRecords] = useState<Record<string, PersonalRecord>>({});
    const [calculatingPRs, setCalculatingPRs] = useState(false);
    const [showWeightHistory, setShowWeightHistory] = useState(false);

    useEffect(() => {
        setProfile({ ...currentProfile });
        
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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ 
            ...prev, 
            [name]: value ? (['gender', 'aiPersonality', 'personalNotes', 'name'].includes(name) ? value : Number(value)) : undefined 
        }));
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

    // Gear Manager Handlers
    const handleAddShoe = (shoeName: string) => {
        setProfile(prev => ({
            ...prev,
            shoes: [...(prev.shoes || []), shoeName]
        }));
    };

    const handleRemoveShoe = (index: number) => {
        setProfile(prev => ({
            ...prev,
            shoes: (prev.shoes || []).filter((_, i) => i !== index)
        }));
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
    
    const sortedPRs = Object.values(personalRecords).sort((a: PersonalRecord, b: PersonalRecord) => a.distance - b.distance);

    const weightChartData = useMemo(() => {
        if (!profile.weightHistory || profile.weightHistory.length < 2) return null;
        return profile.weightHistory.map(entry => ({ date: new Date(entry.date), value: entry.weight }));
    }, [profile.weightHistory]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <header className="flex flex-col p-4 border-b border-slate-700 flex-shrink-0 bg-slate-900">
                    <div className="flex justify-between items-center w-full">
                        <h2 className="text-xl font-bold text-cyan-400">
                            {isWelcomeMode ? 'Configurazione Atleta' : 'Profilo & Impostazioni'}
                        </h2>
                        {!isWelcomeMode && (
                            <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-slate-700" aria-label="Close profile modal">&times;</button>
                        )}
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col h-full">
                        <div className="p-6 space-y-6">
                            
                            {/* Personal Info Group */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1">Dati Anagrafici</h3>
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Nome Atleta</label>
                                    <input type="text" name="name" id="name" value={profile.name || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Il tuo nome" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="gender" className="block text-sm font-medium text-slate-300">Genere</label>
                                        <select name="gender" id="gender" value={profile.gender || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500">
                                            <option value="">Seleziona</option>
                                            <option value="M">Uomo</option>
                                            <option value="F">Donna</option>
                                            <option value="Altro">Altro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="age" className="block text-sm font-medium text-slate-300">Età</label>
                                        <input type="number" name="age" id="age" value={profile.age || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Es. 30" />
                                    </div>
                                </div>
                            </div>

                            {/* Body Composition Group */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1">Fisiologia</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="height" className="block text-sm font-medium text-slate-300">Altezza (cm)</label>
                                        <input type="number" name="height" id="height" value={profile.height || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Es. 175" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center">
                                            <label htmlFor="weight" className="block text-sm font-medium text-slate-300">Peso (kg)</label>
                                            {weightChartData && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowWeightHistory(!showWeightHistory)} 
                                                    className={`p-1 rounded transition-colors ${showWeightHistory ? 'text-cyan-400 bg-slate-700' : 'text-slate-400 hover:text-white'}`}
                                                    title="Mostra/Nascondi Storico Peso"
                                                >
                                                    <ChartIcon />
                                                </button>
                                            )}
                                        </div>
                                        <input type="number" step="0.1" name="weight" id="weight" value={profile.weight || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Es. 70" />
                                    </div>
                                </div>
                                
                                {showWeightHistory && weightChartData && (
                                    <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 mt-2 animate-fade-in-down">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Storico Peso</p>
                                            <button onClick={() => setShowWeightHistory(false)} className="text-slate-500 hover:text-white">&times;</button>
                                        </div>
                                        <SimpleLineChart data={weightChartData} color1="#22d3ee" title="" yLabel="Kg" />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="maxHr" className="block text-sm font-medium text-slate-300">FC Max (bpm) <span className="text-cyan-400">*</span></label>
                                        <input type="number" name="maxHr" id="maxHr" value={profile.maxHr || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Es. 190" />
                                    </div>
                                    <div>
                                        <label htmlFor="restingHr" className="block text-sm font-medium text-slate-300">FC Riposo (bpm)</label>
                                        <input type="number" name="restingHr" id="restingHr" value={profile.restingHr || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500 placeholder-slate-500" placeholder="Es. 50" />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-700 pt-6">
                                <GearManager 
                                    shoes={profile.shoes || []} 
                                    onAddShoe={handleAddShoe} 
                                    onRemoveShoe={handleRemoveShoe}
                                    tracks={tracks} 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-cyan-500 uppercase tracking-widest mb-3">Obiettivo Principale</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(Object.entries(goalLabels) as [RunningGoal, string][]).map(([key, label]) => {
                                        const isSelected = (profile.goals || ['none']).includes(key);
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => toggleGoal(key)}
                                                className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                                    isSelected 
                                                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_-2px_rgba(34,211,238,0.3)]' 
                                                        : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            >
                                                <span>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t border-slate-700 pt-6">
                                <label htmlFor="aiPersonality" className="block text-sm font-bold text-cyan-500 uppercase tracking-widest mb-2">Tono del Coach AI</label>
                                <select name="aiPersonality" id="aiPersonality" value={profile.aiPersonality || 'pro_balanced'} onChange={handleChange} className="block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500">
                                    {Object.entries(personalityLabels).map(([key, { label }]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-2 italic bg-slate-700/50 p-2 rounded">
                                    {personalityLabels[profile.aiPersonality || 'pro_balanced']?.desc}
                                </p>
                            </div>

                            <div className="border-t border-slate-700 pt-6">
                                <label htmlFor="personalNotes" className="block text-sm font-bold text-cyan-500 uppercase tracking-widest mb-2">Note Personali</label>
                                <textarea name="personalNotes" id="personalNotes" value={profile.personalNotes || ''} onChange={handleChange} placeholder="Es: Recupero da infortunio, obiettivo 10km in 50 minuti..." className="block w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-sm text-white focus:ring-cyan-500 focus:border-cyan-500 h-24 resize-none" />
                            </div>
                        </div>

                        {!isWelcomeMode && (
                             <div className="p-6 border-t border-slate-700 bg-slate-900/30">
                                <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center justify-between">
                                    Record Personali
                                    {calculatingPRs && (
                                        <span className="text-[10px] text-cyan-400 font-normal animate-pulse flex items-center gap-1">
                                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                                            Analisi segmenti in corso...
                                        </span>
                                    )}
                                </h3>
                                <div className="space-y-2">
                                    {sortedPRs.length > 0 ? sortedPRs.map((pr: PersonalRecord) => (
                                        <div key={pr.distance} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md border border-slate-600/50">
                                            <div>
                                                <span className="font-semibold text-slate-300 text-sm block">{formatPRDistance(pr.distance)}</span>
                                                <span className="text-[10px] text-slate-500">{new Date(pr.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-white text-sm font-bold block">{formatPRTime(pr.time)}</span>
                                                <span className="text-[9px] text-slate-500 max-w-[150px] truncate block" title={pr.trackName}>{pr.trackName}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-500 italic text-center">Nessun record trovato. Carica delle corse per analizzare i tuoi tempi migliori.</p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <footer className="p-4 border-t border-slate-700 flex justify-end space-x-3 flex-shrink-0 mt-auto bg-slate-800">
                            {!isWelcomeMode && (
                                <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm">Annulla</button>
                            )}
                            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md text-sm shadow-lg shadow-cyan-900/20">
                                {isWelcomeMode ? 'Continua' : 'Salva Impostazioni'}
                            </button>
                        </footer>
                    </form>
                </div>
                <style>{`
                    @keyframes fade-in-down {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-down {
                        animation: fade-in-down 0.2s ease-out forwards;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default UserProfileModal;
