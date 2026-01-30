
import React, { useState, useRef, useEffect } from 'react';
import { Track } from '../types';

interface RaceSetupModalProps {
    tracks: Track[]; // All available tracks
    initialSelection: Set<string>; // Currently selected IDs
    onSelectionChange: (newSelection: Set<string>) => void; // Handler to update selection
    onConfirm: (renamedMap: Record<string, string>) => void;
    onCancel: () => void;
    onAddOpponent?: (files: File[]) => void;
    onRemoveTrack?: (trackId: string) => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" clipRule="evenodd" />
    </svg>
);

const GhostIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-400">
        <path d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
    </svg>
);

const RaceSetupModal: React.FC<RaceSetupModalProps> = ({ tracks, initialSelection, onSelectionChange, onConfirm, onCancel, onAddOpponent, onRemoveTrack }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [names, setNames] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<'grid' | 'select'>('grid');
    const [searchTerm, setSearchTerm] = useState('');

    const selectedTracks = tracks.filter(t => initialSelection.has(t.id));

    // Initialize names when modal opens or selection changes
    useEffect(() => {
        setNames(prev => {
            const next = { ...prev };
            selectedTracks.forEach(t => {
                if (!next[t.id]) next[t.id] = t.name;
            });
            return next;
        });
    }, [selectedTracks]);

    const handleChangeName = (id: string, value: string) => {
        setNames(prev => ({ ...prev, [id]: value }));
    };

    const handleStart = () => {
        onConfirm(names);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onAddOpponent) {
            onAddOpponent(Array.from(e.target.files));
            e.target.value = ''; 
        }
    };

    const toggleSelection = (id: string) => {
        const next = new Set(initialSelection);
        if (next.has(id)) {
            next.delete(id);
            // If checking off an external track, we might want to let parent handle removal logic too
            if (onRemoveTrack) onRemoveTrack(id); 
        } else {
            next.add(id);
        }
        onSelectionChange(next);
    };

    const filteredAvailableTracks = tracks.filter(t => 
        !t.isExternal && // Don't show ghosts in the selection list (they appear in Grid automatically)
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
                <header className="p-5 border-b border-slate-800 bg-slate-800/50">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <span className="text-2xl">🏁</span> Configurazione Griglia
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Prepara la tua gara virtuale.</p>
                </header>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-900/50">
                    <button 
                        onClick={() => setActiveTab('grid')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'grid' ? 'text-green-400 border-b-2 border-green-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Griglia di Partenza ({selectedTracks.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('select')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'select' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Seleziona Corse
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-slate-900">
                    
                    {activeTab === 'grid' && (
                        <div className="space-y-4">
                            {onAddOpponent && (
                                <div className="mb-4">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-3 px-4 rounded-xl border border-dashed border-purple-500/50 bg-purple-900/10 hover:bg-purple-900/20 text-purple-300 font-bold text-sm flex items-center justify-center gap-2 transition-all group"
                                    >
                                        <UploadIcon />
                                        Aggiungi Sfidante Esterno (Ghost)
                                    </button>
                                    <input type="file" ref={fileInputRef} multiple accept=".gpx,.tcx" className="hidden" onChange={handleFileChange} />
                                </div>
                            )}

                            {selectedTracks.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    <p>La griglia è vuota.</p>
                                    <button onClick={() => setActiveTab('select')} className="text-cyan-400 underline mt-2 hover:text-cyan-300">Seleziona corse dallo storico</button>
                                </div>
                            ) : (
                                selectedTracks.map((track, index) => (
                                    <div key={track.id} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700 group">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-900 shadow-lg shrink-0 relative" style={{ backgroundColor: track.color }}>
                                            {track.isExternal ? <GhostIcon /> : index + 1}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between mb-1">
                                                <label className="block text-[10px] uppercase text-slate-500 font-bold">
                                                    {track.isExternal ? "Sfidante (Ghost)" : `Corridore ${index + 1}`}
                                                </label>
                                                <span className="text-[10px] font-mono text-slate-400">{track.distance.toFixed(2)} km</span>
                                            </div>
                                            <input 
                                                type="text" 
                                                value={names[track.id] || ''} 
                                                onChange={(e) => handleChangeName(track.id, e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none transition-colors font-bold placeholder-slate-600"
                                                placeholder={track.name}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => toggleSelection(track.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                                            title="Rimuovi dalla gara"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'select' && (
                        <div className="space-y-2 h-full flex flex-col">
                            <div className="relative mb-2 shrink-0">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><SearchIcon /></div>
                                <input 
                                    type="text" 
                                    placeholder="Cerca nelle tue attività..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                                />
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1">
                                {filteredAvailableTracks.map(track => {
                                    const isSelected = initialSelection.has(track.id);
                                    return (
                                        <div 
                                            key={track.id} 
                                            onClick={() => toggleSelection(track.id)}
                                            className={`p-2 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors ${isSelected ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{track.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{new Date(track.points[0].time).toLocaleDateString()} • {track.distance.toFixed(2)} km</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredAvailableTracks.length === 0 && <p className="text-center text-slate-500 text-xs py-4">Nessuna traccia trovata.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-5 bg-slate-800/30 border-t border-slate-800 flex gap-3 shrink-0">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                        Annulla
                    </button>
                    <button 
                        onClick={handleStart}
                        disabled={selectedTracks.length < 2}
                        className="flex-grow px-4 py-3 rounded-xl font-black text-sm bg-green-600 text-white hover:bg-green-500 transition-all shadow-lg shadow-green-900/20 active:scale-95 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        SCENDI IN PISTA &rarr;
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default RaceSetupModal;
