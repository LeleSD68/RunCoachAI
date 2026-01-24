
import { createClient } from '@supabase/supabase-js';

// Helper function per leggere le variabili d'ambiente in modo sicuro
// Evita il crash "Cannot read properties of undefined" se import.meta.env non esiste
const getEnv = (key: string) => {
    try {
        // Vite / Modern Browsers
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return (import.meta as any).env[key] || '';
        }
        // Fallback per altri ambienti
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key] || '';
        }
    } catch (e) {
        console.warn('Errore lettura env:', e);
    }
    return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Se le chiavi mancano, creiamo un "finto" client che non fa nulla ma non fa crashare l'app.
// Questo permette all'app di partire anche se Vercel non è ancora configurato.
let supabaseInstance: any;

if (supabaseUrl && supabaseAnonKey) {
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error("Errore inizializzazione Supabase:", e);
    }
}

if (!supabaseInstance) {
    console.warn("⚠️ Supabase non configurato. Modalità Offline attiva.");
    // Client Mock (Finto) per evitare crash
    supabaseInstance = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signUp: async () => ({ error: { message: "Supabase non configurato. Aggiungi le chiavi su Vercel." } }),
            signInWithPassword: async () => ({ error: { message: "Supabase non configurato. Aggiungi le chiavi su Vercel." } }),
        },
        from: () => ({
            select: () => ({ order: () => ({ data: [], error: null }) }), // Ritorna lista vuota
            insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
            upsert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
            delete: () => ({ eq: () => ({}) }),
            update: () => ({ eq: () => ({}) }),
        })
    };
}

export const supabase = supabaseInstance;

export const isSupabaseConfigured = () => {
    return !!supabaseUrl && !!supabaseAnonKey;
};
