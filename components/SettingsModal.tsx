
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { isStravaConnected } from '../services/stravaService';
import { cleanUpRemoteDuplicates, deleteUserAccount, loadProfileFromDB } from '../services/dbService';
import { supabase } from '../services/supabaseClient';

interface SettingsModalProps {
    onClose: () => void;
    userProfile: UserProfile;
    onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, userProfile, onUpdateProfile }) => {
    const stravaConnected = isStravaConnected();
    const [isCleaning, setIsCleaning] = useState(false);
    const [cleanupResult, setCleanupResult] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [gaId, setGaId] = useState(userProfile.gaMeasurementId || '');

    const handleCleanup = async () => {
        setIsCleaning(true);
        setCleanupResult(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const count = await cleanUpRemoteDuplicates(session.user.id);
                setCleanupResult(`Rimossi ${count} duplicati dal Cloud.`);
            } else {
                setCleanupResult("Devi essere loggato per pulire il cloud.");
            }
        } catch (e) {
            setCleanupResult("Errore durante la pulizia.");
        } finally {
            setIsCleaning(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (confirm("SEI SICURO? Questa azione cancellerà permanentemente tutti i tuoi dati, tracce, amici e messaggi. Non si può annullare.")) {
            if (confirm("Confermi l'eliminazione definitiva dell'account?")) {
                setIsDeleting(true);
                await deleteUserAccount();
            }
        }
    };

    const handleReloadApp = () => {
        window.location.reload();
    };

    const handleForceSyncPermissions = async () => {
        const freshProfile = await loadProfileFromDB(false); // false qui significa "non solo locale", quindi prova Cloud
        if (freshProfile) {
            onUpdateProfile(freshProfile);
            alert(`Permessi aggiornati dal Cloud.\nRuolo attuale: ${freshProfile.isAdmin ? 'ADMIN' : 'Utente Standard'}`);
        } else {
            alert("Impossibile contattare il server.");
        }
    };

    const toggleStravaSync = () => {
        if (!stravaConnected) return;
        const newValue = !(userProfile.stravaAutoSync === true);
        onUpdateProfile({ stravaAutoSync: newValue });
    };

    const handleSaveGaId = () => {
        onUpdateProfile({ gaMeasurementId: gaId });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9000] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-700 overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <header className="p-5 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Impostazioni</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </header>

                <div className="p-6 space-y-6 bg-slate-900/50 overflow-y-auto custom-scrollbar">
                    
                    {/* ACCOUNT STATUS */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-900/30 pb-2">Stato Account</h3>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-bold uppercase">Ruolo Rilevato</span>
                                <span className={`text-xs font-black uppercase px-2 py-1 rounded ${userProfile.isAdmin ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                    {userProfile.isAdmin ? 'ADMIN' : 'UTENTE STANDARD'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-bold uppercase">ID Utente</span>
                                <span className="text-[10px] font-mono text-slate-500 select-all" title={userProfile.id}>
                                    {userProfile.id ? userProfile.id.substring(0, 8) + '...' : 'Guest'}
                                </span>
                            </div>
                            <button 
                                onClick={handleForceSyncPermissions}
                                className="mt-2 w-full py-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 border border-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                ☁️ Aggiorna Permessi Cloud
                            </button>
                        </div>
                    </section>

                    {/* APP SYSTEM */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-700/50 pb-2">Sistema</h3>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white text-sm">Ricarica App</div>
                                <p className="text-[10px] text-slate-400 leading-tight">Forza l'aggiornamento e riscarica il profilo.</p>
                            </div>
                            <button 
                                onClick={handleReloadApp}
                                className="px-3 py-2 bg-slate-700 hover:bg-cyan-600 hover:text-white text-slate-300 border border-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                            >
                                ↻ Ricarica
                            </button>
                        </div>
                    </section>

                    {/* ANALYTICS CONFIG */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest border-b border-orange-900/30 pb-2">Analytics & Tracking</h3>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Google Analytics Measurement ID</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={gaId}
                                    onChange={(e) => setGaId(e.target.value)}
                                    placeholder="G-XXXXXXXXXX"
                                    className="flex-grow bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm font-mono focus:border-orange-500 outline-none"
                                />
                                <button 
                                    onClick={handleSaveGaId}
                                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 rounded-lg text-xs transition-colors"
                                >
                                    Salva
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Inserisci il tuo ID per attivare Google Analytics 4. Lascia vuoto per disattivare.
                            </p>
                        </div>
                    </section>

                    {/* CALENDAR PREFERENCE */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/30 pb-2">Sistema Operativo & Calendario</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => onUpdateProfile({ calendarPreference: 'google' })}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${userProfile.calendarPreference === 'google' ? 'bg-blue-600/10 border-blue-500 shadow-lg ring-1 ring-blue-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                            >
                                <span className="text-2xl">🤖</span>
                                <span className="font-bold text-xs uppercase">Android / Google</span>
                            </button>
                            <button 
                                onClick={() => onUpdateProfile({ calendarPreference: 'apple' })}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${userProfile.calendarPreference === 'apple' ? 'bg-white/10 border-white shadow-lg ring-1 ring-white/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                            >
                                <span className="text-2xl">🍎</span>
                                <span className="font-bold text-xs uppercase">iOS / Apple</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 text-center">Definisce il formato di esportazione del diario.</p>
                    </section>

                    {/* STRAVA SYNC */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-[#fc4c02] uppercase tracking-widest border-b border-[#fc4c02]/30 pb-2">Integrazioni</h3>
                        <div 
                            onClick={toggleStravaSync}
                            className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none active:scale-[0.98] ${userProfile.stravaAutoSync ? 'bg-[#fc4c02]/10 border-[#fc4c02]/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-bold text-sm ${userProfile.stravaAutoSync ? 'text-[#fc4c02]' : 'text-white'}`}>Strava Auto-Sync</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight max-w-[200px]">Importa automaticamente le nuove attività all'apertura dell'app.</p>
                                {!stravaConnected && <p className="text-[9px] text-red-400 font-bold mt-1">Richiede login Strava.</p>}
                            </div>
                            
                            {/* Visual Toggle Switch */}
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${userProfile.stravaAutoSync ? 'bg-[#fc4c02]' : 'bg-slate-950 border border-slate-600'}`}>
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${userProfile.stravaAutoSync ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                    </section>

                    {/* MAINTENANCE */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-red-400 uppercase tracking-widest border-b border-red-900/30 pb-2">Manutenzione Database</h3>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                            <p className="text-[10px] text-slate-400">Se l'avvio è lento, prova a rimuovere le copie multiple delle stesse attività dal database remoto.</p>
                            <button 
                                onClick={handleCleanup}
                                disabled={isCleaning}
                                className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                            >
                                {isCleaning ? 'Pulizia in corso...' : '🗑️ Pulisci Duplicati Cloud'}
                            </button>
                            {cleanupResult && (
                                <p className="text-center text-xs font-bold text-green-400 animate-pulse">{cleanupResult}</p>
                            )}
                        </div>
                    </section>

                    {/* DANGER ZONE */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-black text-red-600 uppercase tracking-widest border-b border-red-900/30 pb-2">Zona Pericolo</h3>
                        <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30">
                            <p className="text-[10px] text-red-300 mb-3">L'eliminazione dell'account è irreversibile e rimuoverà tutti i tuoi dati.</p>
                            <button 
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white border border-red-500 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                {isDeleting ? 'Eliminazione in corso...' : 'Elimina Account'}
                            </button>
                        </div>
                    </section>

                </div>

                <footer className="p-4 bg-slate-900 border-t border-slate-800 text-center shrink-0">
                    <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-xs uppercase tracking-widest">
                        Chiudi
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SettingsModal;
