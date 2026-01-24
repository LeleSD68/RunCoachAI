
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Track } from '../types';
import { syncTrackToCloud } from '../services/dbService';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: () => void;
    tracks: Track[];
}

const translateError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('invalid login credentials')) return 'Credenziali non valide. Controlla email e password.';
    if (m.includes('email not confirmed')) return 'Indirizzo email non confermato. Controlla la tua casella di posta.';
    if (m.includes('user already registered')) return 'Utente già registrato. Prova ad accedere.';
    if (m.includes('password should be at least')) return 'La password deve avere almeno 6 caratteri.';
    if (m.includes('rate limit')) return 'Troppi tentativi. Riprova più tardi.';
    return `Errore: ${msg}`;
};

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess, tracks }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [syncStatus, setSyncStatus] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

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
        setSuccessMessage('');
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
                        // Check if session is null (implies email confirmation required)
                        if (!data.session) {
                            setSuccessMessage('Registrazione creata! Controlla la tua email per il link di conferma, poi fai Login.');
                            setIsSignUp(false); // Switch to login view
                        } else {
                            // Auto-login worked (email confirm disabled in supabase)
                            await syncLocalDataToCloud(data.user.id);
                            onLoginSuccess();
                            onClose();
                        }
                    } else {
                        // Offline Mode: Auto-login immediately after signup
                        setSuccessMessage('Account Locale creato! Accesso...');
                        await syncLocalDataToCloud(data.user.id);
                        onLoginSuccess();
                        onClose();
                    }
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
            console.error("Auth Error:", err);
            setError(translateError(err.message || 'Errore sconosciuto'));
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
                    {successMessage && (
                        <div className="bg-green-500/20 text-green-400 p-3 rounded-lg text-xs font-bold border border-green-500/50 text-center">
                            {successMessage}
                        </div>
                    )}
                    
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

                    {error && <p className="text-red-400 text-xs bg-red-900/20 p-3 rounded-lg border border-red-900/50 text-center font-bold">{error}</p>}

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
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMessage(''); }}
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
        
