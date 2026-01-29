
import React from 'react';
import { Track } from '../types';

interface GearManagerProps {
    shoes: string[];
    onAddShoe: (name: string) => void;
    onRemoveShoe: (index: number) => void;
    tracks: Track[];
}

const ShoeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-400">
        <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V12a3 3 0 0 0-3-3H5.25Z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
);

const GearManager: React.FC<GearManagerProps> = ({ shoes, onAddShoe, onRemoveShoe, tracks }) => {
    const [newShoe, setNewShoe] = React.useState('');

    // Calcola i km totali per ogni scarpa basandosi sul nome (case insensitive matching)
    const shoeStats = React.useMemo(() => {
        const stats: Record<string, { distance: number, usage: number }> = {};
        shoes.forEach(s => stats[s] = { distance: 0, usage: 0 });
        
        tracks.forEach(t => {
            if (t.shoe) {
                // Find matching shoe in list (handling potential casing diffs or legacy)
                const match = shoes.find(s => s.toLowerCase() === t.shoe?.toLowerCase());
                if (match) {
                    stats[match].distance += t.distance;
                    stats[match].usage += 1;
                }
            }
        });
        return stats;
    }, [shoes, tracks]);

    const handleAdd = () => {
        if (newShoe.trim()) {
            onAddShoe(newShoe.trim());
            setNewShoe('');
        }
    };

    const MAX_KM = 800; // Limite standard scarpa

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShoeIcon /> Garage Attrezzatura
            </h4>
            
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={newShoe}
                    onChange={(e) => setNewShoe(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Modello scarpa (es. Nike Pegasus 40)"
                    className="flex-grow bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                />
                <button 
                    onClick={handleAdd}
                    disabled={!newShoe.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-4 rounded-lg transition-colors text-lg"
                >
                    +
                </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {shoes.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-4 italic">Nessuna scarpa nel garage.</p>
                ) : (
                    shoes.map((shoe, index) => {
                        const stat = shoeStats[shoe] || { distance: 0, usage: 0 };
                        const percent = Math.min(100, (stat.distance / MAX_KM) * 100);
                        let barColor = 'bg-green-500';
                        if (percent > 50) barColor = 'bg-yellow-500';
                        if (percent > 80) barColor = 'bg-orange-500';
                        if (percent >= 100) barColor = 'bg-red-500';

                        return (
                            <div key={index} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50 group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-bold text-sm text-white">{shoe}</div>
                                        <div className="text-[10px] text-slate-400">{stat.usage} attività</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-sm text-white">{stat.distance.toFixed(1)} <span className="text-[10px] text-slate-500">km</span></div>
                                        <button 
                                            onClick={() => onRemoveShoe(index)}
                                            className="text-slate-600 hover:text-red-400 transition-colors absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                                            title="Ritira scarpa"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-1 text-[9px] text-slate-500 font-mono">
                                    <span>0 km</span>
                                    <span>{MAX_KM} km</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default GearManager;
