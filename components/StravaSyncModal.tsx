
import React, { useState, useEffect } from 'react';
import { fetchStravaActivitiesMetadata, fetchDetailedStravaActivity } from '../services/stravaService';
import { Track } from '../types';

interface StravaSyncModalProps {
    onClose: () => void;
    onImportFinished: (tracks: Track[]) => void;
    lastSyncDate: Date | null;
    autoStart?: boolean; 
    isAutoSyncEnabled?: boolean; // New Prop
    onToggleAutoSync?: (enabled: boolean) => void; // New Prop
}

const StravaLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-[#fc4c02] mb-2">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const StravaSyncModal: React.FC<StravaSyncModalProps> = ({ onClose, onImportFinished, lastSyncDate, autoStart = false, isAutoSyncEnabled, onToggleAutoSync }) => {
    const [view, setView] = useState<'options' | 'range' | 'select'>('options');
    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    const [dateFrom, setDateFrom] = useState(lastSyncDate ? lastSyncDate.toISOString().split('T')[0] : '');
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

    // Handle Fetch Logic
    const executeFetch = async (after?: number, before?: number) => {
        setLoading(true);
        try {
            const data = await fetchStravaActivitiesMetadata(after, before);
            const runningOnly = data.filter((a: any) => ['Run', 'TrailRun', 'VirtualRun'].includes(a.type));
            setActivities(runningOnly);
            
            // Auto-select all by default if auto-started
            if (autoStart) {
                setSelectedIds(new Set(runningOnly.map((a: any) => a.id)));
            }
            
            setView('select');
        } catch (e) {
            // Se fallisce in auto-start, non mostrare alert invasivi, chiudi solo o logga
            if (!autoStart) alert("Impossibile caricare le attività da Strava.");
            else console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Auto-start logic
    useEffect(() => {
        if (autoStart) {
            handleSyncQuick();
        }
    }, [autoStart]);

    const handleSyncQuick = () => {
        const after = lastSyncDate ? Math.floor(lastSyncDate.getTime() / 1000) + 1 : undefined;
        executeFetch(after);
    };

    const handleSyncRange = () => {
        const after = dateFrom ? Math.floor(new Date(dateFrom).getTime() / 1000) : undefined;
        const before = dateTo ? Math.floor(new Date(dateTo).getTime() / 1000) + 86400 : undefined;
        executeFetch(after, before);
    };

    const handleConfirmImport = async () => {
        setLoading(true);
        const imported: Track[] = [];
        const ids = Array.from(selectedIds);
        
        for (const id of ids) {
            try {
                const track = await fetchDetailedStravaActivity(id as number);
                if (track) imported.push(track);
            } catch (e) {
                console.error(`Failed to import ${id}`, e);
            }
        }
        
        onImportFinished(imported);
        onClose();
    };

    const toggleSelection = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const selectAll = () => {
        if (selectedIds.size === activities.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(activities.map(a => a.id)));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[11000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-[#fc4c02]/50 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                
                <header className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <StravaLogo />
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Strava Sync</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {autoStart ? 'Nuove attività trovate' : 'Importa le tue sessioni'}
                            </p>
                        </div>
                    </div>
                    {!loading && <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl">&times;</button>}
                </header>

                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 border-4 border-[#fc4c02] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-white uppercase animate-pulse">Sincronizzazione in corso...</p>
                            <p className="text-xs text-slate-500 mt-2">Scarico dati da Strava API</p>
                        </div>
                    ) : view === 'options' ? (
                        <div className="space-y-3">
                            <button onClick={handleSyncQuick} className="w-full p-4 bg-green-600/10 hover:bg-green-600/20 border border-green-500/30 rounded-2xl text-left transition-all group">
                                <div className="font-black text-green-400 text-sm uppercase">Recupero Rapido</div>
                                <p className="text-xs text-slate-400">Scarica solo le novità dall'ultima sincronizzazione.</p>
                            </button>
                            <button onClick={() => setView('range')} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-left hover:border-cyan-500 transition-all">
                                <div className="font-black text-white text-sm uppercase">Intervallo Date</div>
                                <p className="text-xs text-slate-400">Scegli un periodo specifico da importare.</p>
                            </button>
                            <button onClick={() => executeFetch(undefined, undefined)} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-left hover:border-purple-500 transition-all">
                                <div className="font-black text-white text-sm uppercase">Lista Completa</div>
                                <p className="text-xs text-slate-400">Vedi le ultime 50 attività e scegli cosa salvare.</p>
                            </button>

                            {/* AUTO SYNC TOGGLE */}
                            {onToggleAutoSync && (
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/30 cursor-pointer group hover:border-[#fc4c02]/30 transition-colors">
                                        <div>
                                            <div className={`font-bold text-sm ${isAutoSyncEnabled ? 'text-[#fc4c02]' : 'text-slate-300'}`}>Auto-Sync</div>
                                            <div className="text-[10px] text-slate-500">Controlla nuove corse all'avvio dell'app</div>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isAutoSyncEnabled ? 'bg-[#fc4c02]' : 'bg-slate-700'}`}>
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${isAutoSyncEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={isAutoSyncEnabled} 
                                            onChange={(e) => onToggleAutoSync(e.target.checked)} 
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    ) : view === 'range' ? (
                        <div className="space-y-4 animate-fade-in-right">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Dalla data</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Alla data</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm" />
                                </div>
                            </div>
                            <button onClick={handleSyncRange} className="w-full bg-[#fc4c02] text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs">Cerca Attività</button>
                            <button onClick={() => setView('options')} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-white uppercase">Indietro</button>
                        </div>
                    ) : (
                        <div className="space-y-2 animate-fade-in-right">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{activities.length} corse trovate</span>
                                <button onClick={selectAll} className="text-[10px] font-black text-cyan-400 uppercase hover:underline">
                                    {selectedIds.size === activities.length ? 'Deseleziona Tutto' : 'Seleziona Tutto'}
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                {activities.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs py-8 italic">Nessuna corsa trovata nel periodo.</p>
                                ) : activities.map(a => (
                                    <div 
                                        key={a.id} 
                                        onClick={() => toggleSelection(a.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedIds.has(a.id) ? 'bg-[#fc4c02]/10 border-[#fc4c02]/50' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(a.id) ? 'bg-[#fc4c02] border-[#fc4c02]' : 'border-slate-500'}`}>
                                            {selectedIds.has(a.id) && <span className="text-white text-[10px]">✓</span>}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-xs font-bold text-white truncate">{a.name}</div>
                                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                {new Date(a.start_date).toLocaleDateString()} • {(a.distance/1000).toFixed(2)}km • {(a.moving_time/60).toFixed(0)}m
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-6 bg-slate-950 border-t border-slate-800 shrink-0">
                    {view === 'select' && activities.length > 0 && (
                        <button 
                            onClick={handleConfirmImport}
                            disabled={selectedIds.size === 0 || loading}
                            className="w-full bg-[#fc4c02] hover:bg-[#e34402] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs mb-3"
                        >
                            Importa {selectedIds.size} Attività
                        </button>
                    )}
                    <button onClick={onClose} disabled={loading} className="w-full text-xs font-black text-slate-500 uppercase hover:text-white">Annulla</button>
                </footer>
            </div>
        </div>
    );
};

export default StravaSyncModal;
