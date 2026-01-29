
import React, { useState, useEffect } from 'react';
import { getStravaConfig, saveStravaConfig, initiateStravaAuth } from '../services/stravaService';

interface StravaConfigModalProps {
    onClose: () => void;
}

const StravaLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-[#fc4c02]">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

const StravaConfigModal: React.FC<StravaConfigModalProps> = ({ onClose }) => {
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const config = getStravaConfig();
        if (config.clientId) setClientId(config.clientId);
        if (config.clientSecret) setClientSecret(config.clientSecret);
        if (config.clientId && config.clientSecret) setIsSaved(true);
    }, []);

    const handleSave = () => {
        if (!clientId || !clientSecret) return;
        saveStravaConfig(clientId, clientSecret);
        setIsSaved(true);
    };

    const handleConnect = () => {
        handleSave();
        initiateStravaAuth();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[11000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-[#fc4c02]/50 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">&times;</button>
                
                <div className="flex flex-col items-center mb-6">
                    <StravaLogo />
                    <h2 className="text-xl font-black text-white mt-2">Connetti Strava</h2>
                    <p className="text-xs text-slate-400 mt-1">Sincronizza automaticamente le tue corse.</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6 text-xs text-slate-300 space-y-2">
                    <p>Per collegare Strava, devi creare una tua "App" sul portale sviluppatori:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-400">
                        <li>Vai su <a href="https://www.strava.com/settings/api" target="_blank" className="text-[#fc4c02] hover:underline">strava.com/settings/api</a></li>
                        <li>Crea un'applicazione (Nome: RunCoachAI).</li>
                        <li><strong>Importante:</strong> Inserisci <code>{window.location.hostname}</code> nel campo "Authorization Callback Domain".</li>
                        <li>Copia i codici qui sotto.</li>
                    </ol>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Client ID</label>
                        <input 
                            type="text" 
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-[#fc4c02] outline-none font-mono"
                            placeholder="Es. 12345"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Client Secret</label>
                        <input 
                            type="password" 
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-[#fc4c02] outline-none font-mono"
                            placeholder="Es. a1b2c3d4..."
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                    >
                        Annulla
                    </button>
                    <button 
                        onClick={handleConnect}
                        disabled={!clientId || !clientSecret}
                        className="flex-1 py-3 bg-[#fc4c02] hover:bg-[#e34402] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isSaved ? 'Sincronizza Ora' : 'Salva & Connetti'}
                    </button>
                </div>
                
                <p className="text-[10px] text-center text-slate-500 mt-4">
                    Le chiavi vengono salvate solo nel tuo browser locale.
                </p>
            </div>
        </div>
    );
};

export default StravaConfigModal;
