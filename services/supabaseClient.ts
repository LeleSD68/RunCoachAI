
import { createClient } from '@supabase/supabase-js';

// Helper function per leggere le variabili d'ambiente in modo sicuro
const getEnv = (key: string) => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            return (import.meta as any).env[key] || '';
        }
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

let supabaseInstance: any;

if (supabaseUrl && supabaseAnonKey) {
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error("Errore inizializzazione Supabase:", e);
    }
}

// Simulazione Auth Locale (Mock)
const mockSessionKey = 'mock-session';
const getMockSession = () => {
    const stored = localStorage.getItem(mockSessionKey);
    return stored ? JSON.parse(stored) : null;
};

if (!supabaseInstance) {
    console.warn("⚠️ Supabase non configurato. Modalità Offline/Demo attiva.");
    
    // Mock robusto per supportare le chiamate concatenate
    const createMockBuilder = (data: any = null) => {
        const builder = {
            select: () => builder,
            insert: () => builder,
            upsert: () => builder,
            update: () => builder,
            delete: () => builder,
            eq: () => builder,
            order: () => builder,
            single: () => ({ data: data, error: null }),
            then: (resolve: any) => resolve({ data: Array.isArray(data) ? data : [data], error: null })
        };
        return builder;
    };

    supabaseInstance = {
        auth: {
            getSession: async () => ({ data: { session: getMockSession() }, error: null }),
            onAuthStateChange: (callback: any) => {
                return { data: { subscription: { unsubscribe: () => {} } } };
            },
            signUp: async ({ email, options }: any) => {
                const newUser = { 
                    user: { id: 'local-user-id', email: email, user_metadata: options?.data }, 
                    session: { access_token: 'mock-token', user: { id: 'local-user-id', email } } 
                };
                localStorage.setItem(mockSessionKey, JSON.stringify(newUser.session));
                return { data: newUser, error: null };
            },
            signInWithPassword: async ({ email }: any) => {
                const session = { access_token: 'mock-token', user: { id: 'local-user-id', email } };
                localStorage.setItem(mockSessionKey, JSON.stringify(session));
                return { data: { session, user: session.user }, error: null };
            },
            signOut: async () => {
                localStorage.removeItem(mockSessionKey);
                return { error: null };
            }
        },
        from: (table: string) => {
            // Ritorna dati mock basati sulla tabella richiesta per evitare crash
            if (table === 'profiles') return createMockBuilder({ name: 'Utente Locale' });
            if (table === 'tracks') return createMockBuilder([]);
            if (table === 'planned_workouts') return createMockBuilder([]);
            return createMockBuilder([]);
        }
    };
}

export const supabase = supabaseInstance;

export const isSupabaseConfigured = () => {
    return !!supabaseUrl && !!supabaseAnonKey;
};
