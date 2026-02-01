
import React from 'react';
import { UserProfile } from '../types';
import { isStravaConnected } from '../services/stravaService';

interface SettingsModalProps {
    onClose: () => void;
    userProfile: UserProfile;
    onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, userProfile, onUpdateProfile }) => {
    const stravaConnected = isStravaConnected();

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9000] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <header className="p-5 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Impostazioni</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </header>

                <div className="p-6 space-y-6 bg-slate-900/50">
                    
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
                        <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${userProfile.stravaAutoSync ? 'bg-[#fc4c02]/10 border-[#fc4c02]/50' : 'bg-slate-800 border-slate-700'}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-bold text-sm">Strava Auto-Sync</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-tight max-w-[200px]">Importa automaticamente le nuove attività all'apertura dell'app.</p>
                                {!stravaConnected && <p className="text-[9px] text-red-400 font-bold mt-1">Richiede login Strava.</p>}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={userProfile.stravaAutoSync} 
                                    onChange={(e) => onUpdateProfile({ stravaAutoSync: e.target.checked })} 
                                    disabled={!stravaConnected}
                                />
                                <div className="w-11 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fc4c02]"></div>
                            </label>
                        </div>
                    </section>

                </div>

                <footer className="p-4 bg-slate-900 border-t border-slate-800 text-center">
                    <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-xs uppercase tracking-widest">
                        Chiudi
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SettingsModal;
