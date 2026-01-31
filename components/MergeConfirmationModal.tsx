
import React, { useState } from 'react';
import { Track } from '../types';

interface MergeConfirmationModalProps {
    selectedTracks: Track[];
    onConfirm: (deleteOriginals: boolean) => void;
    onCancel: () => void;
}

const MergeTracksIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-cyan-400 mb-4">
        <path fillRule="evenodd" d="M3.75 3a.75.75 0 0 0-1.5 0v4a6.5 6.5 0 0 0 6.5 6.5h4.19l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.75A5 5 0 0 1 3.75 7V3Z" clipRule="evenodd" />
    </svg>
);

const MergeConfirmationModal: React.FC<MergeConfirmationModalProps> = ({ selectedTracks, onConfirm, onCancel }) => {
    const [deleteOriginals, setDeleteOriginals] = useState(false);

    const totalDistance = selectedTracks.reduce((acc, t) => acc + t.distance, 0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-hidden flex flex-col">
                <div className="flex justify-center">
                    <MergeTracksIcon />
                </div>
                
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight text-center">Unisci Tracce</h3>
                <p className="text-slate-400 text-sm mb-6 text-center">
                    Stai per unire <span className="text-white font-bold">{selectedTracks.length} sessioni</span> in un'unica attività continua di <span className="text-cyan-400 font-bold">{totalDistance.toFixed(2)} km</span>.
                </p>

                <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Tracce incluse:</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                        {selectedTracks.map(t => (
                            <div key={t.id} className="flex justify-between items-center text-xs">
                                <span className="truncate text-slate-300 mr-2">{t.name}</span>
                                <span className="font-mono text-slate-500 shrink-0">{t.distance.toFixed(1)}k</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/30 cursor-pointer hover:bg-slate-800 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={deleteOriginals} 
                            onChange={(e) => setDeleteOriginals(e.target.checked)}
                            className="w-5 h-5 accent-red-500 rounded border-slate-600 bg-slate-900"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white uppercase tracking-tight">Elimina originali dopo l'unione</span>
                            <span className="text-[10px] text-slate-500 font-medium italic">L'operazione è definitiva sul Cloud.</span>
                        </div>
                    </label>
                </div>

                <div className="flex gap-3 mt-auto">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                        Annulla
                    </button>
                    <button 
                        onClick={() => onConfirm(deleteOriginals)}
                        className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 transition-all active:scale-95 uppercase tracking-widest"
                    >
                        CONFERMA UNIONE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MergeConfirmationModal;
