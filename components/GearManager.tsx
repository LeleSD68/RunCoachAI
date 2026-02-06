
import React, { useState, useMemo } from 'react';
import { Track } from '../types';

interface GearManagerProps {
    shoes: string[];
    retiredShoes?: string[];
    onAddShoe: (name: string) => void;
    onRemoveShoe: (index: number) => void;
    onRetireShoe?: (index: number) => void;
    onRestoreShoe?: (index: number) => void;
    onDeleteRetiredShoe?: (index: number) => void;
    tracks: Track[];
}

const ShoeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-400">
        <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V12a3 3 0 0 0-3-3H5.25Z" />
    </svg>
);

const ArchiveBoxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2 3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" />
        <path fillRule="evenodd" d="M13 9a1 1 0 1 0 0 2h-6a1 1 0 1 0 0-2h6ZM2.75 7A.75.75 0 0 0 2 7.75v8.5c0 .69.56 1.25 1.25 1.25h13.5c.69 0 1.25-.56 1.25-1.25v-8.5A.75.75 0 0 0 17.25 7H2.75Z" clipRule="evenodd" />
    </svg>
);

const RestoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0v2.433l-.31-.31a7 7 0 0 0-11.712 3.138.75.75 0 0 0 1.449.39 5.5 5.5 0 0 1 9.201-2.466l.312.311h-2.433a.75.75 0 0 0 0 1.5h4.242a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
);

const ShoppingBagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M6 5v1H4.667a1.75 1.75 0 0 0-1.743 1.598l-.826 9.5A1.75 1.75 0 0 0 3.84 19H16.16a1.75 1.75 0 0 0 1.743-1.902l-.826-9.5A1.75 1.75 0 0 0 15.333 6H14V5a4 4 0 0 0-8 0Zm4-2.5A2.5 2.5 0 0 0 7.5 5v1h5V5A2.5 2.5 0 0 0 10 2.5ZM7.5 10a2.5 2.5 0 0 0 5 0V8.75a.75.75 0 0 1 1.5 0V10a4 4 0 0 1-8 0V8.75a.75.75 0 0 1 1.5 0V10Z" clipRule="evenodd" />
    </svg>
);

const GearManager: React.FC<GearManagerProps> = ({ shoes, retiredShoes = [], onAddShoe, onRemoveShoe, onRetireShoe, onRestoreShoe, onDeleteRetiredShoe, tracks }) => {
    const [newShoe, setNewShoe] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'retired'>('active');

    const shoeStats = useMemo(() => {
        const stats: Record<string, { distance: number, usage: number }> = {};
        [...shoes, ...retiredShoes].forEach(s => stats[s] = { distance: 0, usage: 0 });
        tracks.forEach(t => {
            if (t.shoe) {
                const match = [...shoes, ...retiredShoes].find(s => s.toLowerCase() === t.shoe?.toLowerCase());
                if (match) {
                    stats[match].distance += t.distance;
                    stats[match].usage += 1;
                }
            }
        });
        return stats;
    }, [shoes, retiredShoes, tracks]);

    const handleAdd = () => {
        if (newShoe.trim()) {
            onAddShoe(newShoe.trim());
            setNewShoe('');
        }
    };

    const handleBuyShoe = (shoeName: string) => {
        const query = encodeURIComponent(`${shoeName} running shoes`);
        // Affiliate Link Logic (Placeholder)
        const affiliateUrl = `https://www.amazon.it/s?k=${query}&tag=runcoachai-21`;
        window.open(affiliateUrl, '_blank');
    };

    const MAX_KM = 800; 

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShoeIcon /> Garage Attrezzatura
                </h4>
                <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button onClick={() => setActiveTab('active')} className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-colors ${activeTab === 'active' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Attive</button>
                    <button onClick={() => setActiveTab('retired')} className={`px-3 py-1 text-[9px] font-bold uppercase rounded-md transition-colors ${activeTab === 'retired' ? 'bg-slate-700 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}>Ritirate</button>
                </div>
            </div>
            
            <div className="p-4">
                {activeTab === 'active' && (
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={newShoe}
                            onChange={(e) => setNewShoe(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder="Nuova scarpa (es. Nike Pegasus 40)"
                            className="flex-grow bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                        />
                        <button onClick={handleAdd} disabled={!newShoe.trim()} className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-4 rounded-lg transition-colors text-lg">+</button>
                    </div>
                )}

                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {activeTab === 'active' ? (
                        shoes.length === 0 ? <p className="text-center text-xs text-slate-500 py-4 italic">Nessuna scarpa attiva.</p> :
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
                                            <div className="font-bold text-sm text-white flex items-center gap-2">
                                                {shoe}
                                            </div>
                                            <div className="text-[10px] text-slate-400">{stat.usage} attività</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-sm text-white">{stat.distance.toFixed(1)} <span className="text-[10px] text-slate-500">km</span></div>
                                            <div className="flex gap-2 justify-end absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 pl-2 shadow-xl rounded-bl-lg border-l border-b border-slate-700">
                                                <button onClick={() => handleBuyShoe(shoe)} className="text-slate-400 hover:text-amber-400 transition-colors p-1" title="Cerca offerte online (Affiliato)">
                                                    <ShoppingBagIcon />
                                                </button>
                                                {onRetireShoe && <button onClick={() => onRetireShoe(index)} className="text-slate-400 hover:text-purple-400 transition-colors p-1" title="Ritira"><ArchiveBoxIcon /></button>}
                                                <button onClick={() => onRemoveShoe(index)} className="text-slate-400 hover:text-red-400 transition-colors p-1" title="Elimina"><TrashIcon /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                    {percent > 80 && (
                                        <div onClick={() => handleBuyShoe(shoe)} className="mt-2 text-[9px] text-amber-400 font-bold uppercase tracking-wide cursor-pointer hover:underline text-center">
                                            ⚠️ Scarpa scarica? Cerca offerta &rarr;
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        retiredShoes.map((shoe, index) => (
                            <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 group relative opacity-70 hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-center">
                                    <div className="font-bold text-sm text-slate-300 line-through decoration-slate-500">{shoe}</div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleBuyShoe(shoe)} className="text-slate-500 hover:text-amber-400 transition-colors"><ShoppingBagIcon /></button>
                                        {onRestoreShoe && <button onClick={() => onRestoreShoe(index)} className="text-slate-500 hover:text-green-400 transition-colors"><RestoreIcon /></button>}
                                        {onDeleteRetiredShoe && <button onClick={() => onDeleteRetiredShoe(index)} className="text-slate-500 hover:text-red-400 transition-colors"><TrashIcon /></button>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="mt-3 text-[9px] text-slate-600 text-center italic">
                    Supporta lo sviluppo acquistando l'attrezzatura dai nostri partner.
                </div>
            </div>
        </div>
    );
};

export default GearManager;
