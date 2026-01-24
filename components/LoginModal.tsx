
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Track } from '../types';
import { syncTrackToCloud } from '../services/dbService';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: () => void;
    tracks: Track[];
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess, tracks }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [syncStatus, setSyncStatus] = useState('');

    const syncLocalDataToCloud = async (userId: string) => {
        if (!tracks || tracks.length === 0) return;
        
        setSyncStatus(`Sincronizzazione di ${tracks.length} attività...`);
        let syncedCount = 0;
        
        // Push local tracks to cloud
        for (const track of tracks) {
            // Only sync actual tracks, not ghost opponents
            if (!track.isExternal) {
                try {
                    await syncTrackToCloud(track);
                    syncedCount++;
                } catch (e) {
                    console.warn(`Failed to sync track ${track.id}`, e);
                }
            }
        }
        
        setSyncStatus(`Sincronizzati ${syncedCount} tracciati!`);
        // Small delay to let user see success message
        await new Promise(r => setTimeout(r, 800));
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSyncStatus('');

        try {
            if (isSignUp) {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;
                if (data.user) {
                    if (isSupabaseConfigured()) {
                        alert('Registrazione completata! Controlla la tua email per il link di conferma, poi fai Login.');
                    } else {
                        alert('Account Locale creato con successo! Ora puoi effettuare il Login con le credenziali appena inserite.');
                    }
                    setIsSignUp(false);
                }
            } else {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                
                if (data.user) {
                    await syncLocalDataToCloud(data.user.id);
                    onLoginSuccess();
                    onClose();
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">&times;</button>
                
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-tighter mb-1">
                        {isSignUp ? 'Crea Account' : 'Bentornato'}
                    </h2>
                    <p className="text-slate-400 text-sm h-6">
                        {syncStatus || (isSupabaseConfigured() ? "Salva le tue corse nel cloud e accedi ovunque." : "Modalità Offline: Account locale simulato.")}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                            <input 
                                type="text" 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                                required={isSignUp}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900/50">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (syncStatus ? 'Sincronizzazione...' : 'Caricamento...') : (isSignUp ? 'Registrati' : 'Accedi')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-slate-400 hover:text-white underline decoration-slate-600 underline-offset-4"
                    >
                        {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
