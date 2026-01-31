
import React from 'react';

interface StravaSyncModalProps {
    onClose: () => void;
    onSync: (afterTimestamp?: number) => void;
    lastSyncDate: Date | null;
}

const StravaLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-[#fc4c02] mb-4">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const CloudArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clipRule="evenodd" />
    </svg>
);

const StravaSyncModal: React.FC<StravaSyncModalProps> = ({ onClose, onSync, lastSyncDate }) => {
    
    const handleSyncNew = () => {
        if (lastSyncDate) {
            // Add 1 second to avoid refetching the exact same last run
            const timestamp = Math.floor(lastSyncDate.getTime() / 1000) + 1;
            onSync(timestamp);
        } else {
            // Fallback if no local data, sync last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            onSync(Math.floor(thirtyDaysAgo.getTime() / 1000));
        }
    };

    const handleSyncMonth = () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        onSync(Math.floor(thirtyDaysAgo.getTime() / 1000));
    };

    const handleSyncYear = () => {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        onSync(Math.floor(startOfYear.getTime() / 1000));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[11000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-[#fc4c02]/50 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">&times;</button>
                
                <div className="flex flex-col items-center text-center">
                    <StravaLogo />
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Sincronizzazione Strava</h2>
                    <p className="text-sm text-slate-400 mb-6">Scegli quali attività importare nel tuo diario.</p>
                    
                    <div className="w-full space-y-3">
                        <button 
                            onClick={handleSyncNew}
                            disabled={!lastSyncDate}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                        >
                            <CloudArrowIcon />
                            {lastSyncDate ? 'Solo Nuove Attività' : 'Nessuna attività precedente trovata'}
                        </button>
                        {lastSyncDate && (
                            <div className="text-[10px] text-slate-500 -mt-2 mb-2">
                                Ultima corsa: {lastSyncDate.toLocaleDateString()}
                            </div>
                        )}

                        <button 
                            onClick={handleSyncMonth}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl border border-slate-600 transition-all flex items-center justify-center"
                        >
                            Ultimi 30 Giorni
                        </button>

                        <button 
                            onClick={handleSyncYear}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl border border-slate-600 transition-all flex items-center justify-center"
                        >
                            Tutto l'Anno Corrente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StravaSyncModal;
