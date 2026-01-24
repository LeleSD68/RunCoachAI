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
    if (m.includes('email not confirmed')) return 'Indirizzo email non confermato.';
    if (m.includes('user already registered')) return 'Utente già registrato. Prova ad accedere.';
    if (m.includes('password should be at least')) return 'La password deve avere almeno 6 caratteri.';
    if (m.includes('rate limit')) return 'Troppi tentativi. Riprova più tardi.';
    return `Errore: ${msg}`;
};

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
);

const EyeSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.59 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
        <path d="M10.748 13.93 5.39 8.57a10.015 10.015 0 0 0-3.39 1.42 1.651 1.651 0 0 0 0 1.186A10.004 10.004 0 0 0 9.999 17c1.9 0 3.682-.534 5.194-1.465l-2.637-2.637a3.987 3.987 0 0 1-1.808.032Z" />
    </svg>
);

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess, tracks }) => {
    const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [syncStatus, setSyncStatus] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);

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

    const resendConfirmation = async () => {
        if (!email) {
            setError('Inserisci la tua email per rinviare la conferma.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email.trim(),
                options: {
                    emailRedirectTo: window.location.origin,
                }
            });
            if (error) throw error;
            setSuccessMessage('Nuova email di conferma inviata! Controlla anche la cartella Spam.');
        } catch (err: any) {
            setError(translateError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');
        setSyncStatus('');
        setNeedsConfirmation(false);

        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        try {
            if (view === 'signup') {
                const { error, data } = await supabase.auth.signUp({
                    email: cleanEmail,
                    password: cleanPassword,
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
                            setSuccessMessage('Registrazione creata! Controlla la tua email per il link di conferma.');
                            setView('login');
                            setNeedsConfirmation(true);
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
            } else if (view === 'login') {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: cleanPassword,
                });
                if (error) {
                    if (error.message.toLowerCase().includes('email not confirmed')) {
                        setNeedsConfirmation(true);
                        throw new Error('Email not confirmed');
                    }
                    throw error;
                }
                
                if (data.user) {
                    await syncLocalDataToCloud(data.user.id);
                    onLoginSuccess();
                    onClose();
                }
            } else if (view === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setSuccessMessage('Ti abbiamo inviato un\'email per resettare la password.');
                setView('login');
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
                        {view === 'signup' ? 'Crea Account' : view === 'forgot' ? 'Recupero Password' : 'Bentornato'}
                    </h2>
                    <p className="text-slate-400 text-sm h-6">
                        {syncStatus || (view === 'forgot' ? "Inserisci la tua email per ricevere le istruzioni." : (isSupabaseConfigured() ? "Salva le tue corse nel cloud e accedi ovunque." : "Modalità Offline: Account locale simulato."))}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {successMessage && (
                        <div className="bg-green-500/20 text-green-400 p-3 rounded-lg text-xs font-bold border border-green-500/50 text-center animate-pulse">
                            {successMessage}
                        </div>
                    )}
                    
                    {needsConfirmation && (
                        <div className="bg-amber-900/20 border border-amber-500/30 p-3 rounded-lg text-amber-200 text-xs text-center animate-fade-in">
                            <p className="mb-2 font-bold">Non hai ricevuto l'email?</p>
                            <button 
                                type="button" 
                                onClick={resendConfirmation}
                                disabled={loading}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded transition-colors text-xs"
                            >
                                {loading ? 'Invio in corso...' : 'Invia di nuovo link conferma'}
                            </button>
                            <p className="mt-2 text-[10px] opacity-70">Controlla la cartella Spam o Posta Indesiderata.</p>
                        </div>
                    )}
                    
                    {view === 'signup' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                            <input 
                                type="text" 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                                required={view === 'signup'}
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
                    
                    {view !== 'forgot' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-cyan-500 outline-none pr-10"
                                    required
                                    minLength={6}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            {view === 'login' && (
                                <div className="text-right mt-1">
                                    <button 
                                        type="button"
                                        onClick={() => { setView('forgot'); setError(''); setSuccessMessage(''); setNeedsConfirmation(false); }}
                                        className="text-xs text-cyan-500 hover:text-cyan-400"
                                    >
                                        Password dimenticata?
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && <p className="text-red-400 text-xs bg-red-900/20 p-3 rounded-lg border border-red-900/50 text-center font-bold">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (syncStatus ? 'Sincronizzazione...' : 'Caricamento...') : (view === 'signup' ? 'Registrati' : view === 'forgot' ? 'Invia Link di Reset' : 'Accedi')}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-2">
                    {view === 'login' && (
                        <button 
                            onClick={() => { setView('signup'); setError(''); setSuccessMessage(''); setNeedsConfirmation(false); }}
                            className="text-sm text-slate-400 hover:text-white underline decoration-slate-600 underline-offset-4"
                        >
                            Non hai un account? Registrati
                        </button>
                    )}
                    {(view === 'signup' || view === 'forgot') && (
                        <button 
                            onClick={() => { setView('login'); setError(''); setSuccessMessage(''); setNeedsConfirmation(false); }}
                            className="text-sm text-slate-400 hover:text-white underline decoration-slate-600 underline-offset-4"
                        >
                            Torna al Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
