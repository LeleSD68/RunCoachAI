
import { GoogleGenAI, Type } from "@google/genai";
import { Track, UserProfile, PlannedWorkout } from '../types';
import { calculateTrackStats } from './trackStatsService';

export const getGenAI = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const isAuthError = (e: any): boolean => {
    const msg = (e.message || '').toLowerCase();
    const status = e.status || e.code;
    return (
        status === 403 || 
        status === 400 && (msg.includes('key') || msg.includes('api')) ||
        msg.includes('403') || 
        msg.includes('blocked') || 
        msg.includes('permission_denied') ||
        msg.includes('api key must be set')
    );
};

export const isRetryableError = (error: any): boolean => {
    const status = error?.status || error?.code;
    const errorMessage = (error?.message || '').toLowerCase();
    if (status === 429 || status === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota') || errorMessage.includes('rate limit')) return false;
    if (isAuthError(error) || errorMessage.includes('api key')) return false;
    return errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || (status === 'UNAVAILABLE') || (status === 503);
};

export const getFriendlyErrorMessage = (error: any): string => {
    const msg = (error?.message || '').toLowerCase();
    const status = error?.status || error?.code;
    if (msg.includes('api_key_missing') || msg.includes('api key must be set')) return "⚠️ Chiave API mancante. Selezionala per continuare.";
    if (status === 429 || status === 'RESOURCE_EXHAUSTED' || msg.includes('quota')) return "⚠️ Quota richieste esaurita. Riprova tra circa 1 minuto.";
    if (isAuthError(error)) return "⚠️ Errore di autenticazione API. Controlla la tua chiave.";
    if (msg.includes('overloaded')) return "⚠️ I server AI sono sovraccarichi. Riprova tra poco.";
    return "⚠️ Si è verificato un errore di connessione.";
};

export async function ensureApiKey() {
    if (window.aistudio) await window.aistudio.openSelectKey();
}

export async function retryWithPolicy<T>(
    operation: () => Promise<T>, 
    handleTokenCount?: (count: number) => void
): Promise<T> {
    try {
        return await operation();
    } catch (e: any) {
        if (isAuthError(e) || e.message === 'API_KEY_MISSING' || e.message?.includes('API Key')) {
            console.warn("API Auth Error. Prompting for new key...", e);
            await ensureApiKey();
            return await operation();
        }
        throw e;
    }
}

// --- AUTOMATIC RATING FUNCTION ---
export const generateAiRating = async (
    track: Track, 
    allTracks: Track[], 
    userProfile: UserProfile, 
    plannedWorkout?: { title: string; description: string; activityType: string }
): Promise<{ rating: number; reason: string } | null> => {
    
    // 1. Calculate History Context
    const similarTracks = allTracks.filter(t => 
        t.id !== track.id && 
        t.distance >= track.distance * 0.9 && 
        t.distance <= track.distance * 1.1
    );

    let historyContext = "Questa è la prima volta che corri questa distanza.";
    if (similarTracks.length > 0) {
        const avgPace = similarTracks.reduce((acc, t) => acc + (t.duration / 1000 / 60) / t.distance, 0) / similarTracks.length;
        const avgPaceStr = `${Math.floor(avgPace)}:${Math.round((avgPace % 1) * 60).toString().padStart(2, '0')}`;
        historyContext = `Hai corso questa distanza ${similarTracks.length} volte in passato. La tua media storica è ${avgPaceStr}/km.`;
    }

    // 2. Prepare Stats
    const stats = calculateTrackStats(track);
    const paceMinKm = stats.movingAvgPace;
    const paceStr = `${Math.floor(paceMinKm)}:${Math.round((paceMinKm % 1) * 60).toString().padStart(2, '0')}`;
    
    // 3. Prepare Planned Workout Context
    let planContext = "Nessun allenamento specifico pianificato.";
    if (plannedWorkout) {
        planContext = `
        ALLENAMENTO PIANIFICATO DAL DIARIO:
        - Titolo: "${plannedWorkout.title}"
        - Tipo: ${plannedWorkout.activityType}
        - Istruzioni: "${plannedWorkout.description}"
        
        REGOLE CRITICHE DI VALUTAZIONE:
        - Se l'atleta doveva correre un 'Lento' ma è andato troppo forte (Cardio alto), il voto è BASSO (1-2) anche se la performance è veloce.
        - Se era un 'Recupero' ed è stato rispettato il cardio basso -> 5 STELLE.
        - Se erano 'Ripetute' e i picchi di velocità sono coerenti -> 5 STELLE.
        - La fedeltà alla tipologia di sforzo è più importante della velocità pura.
        `;
    }

    const prompt = `Sei un coach di corsa esperto e severo. Valuta questa specifica sessione da 1 a 5 stelle.

    DATI CORSA ATTUALE:
    - Distanza: ${track.distance.toFixed(2)} km
    - Ritmo: ${paceStr}/km
    - Tipo rilevato dai dati: ${track.activityType}
    - FC Media: ${stats.avgHr ? Math.round(stats.avgHr) : 'N/D'} bpm
    - Sforzo Percepito (RPE): ${track.rpe ?? 'Non inserito'} / 10

    CONTEXT STORICO:
    ${historyContext}

    ${planContext}

    Rispondi SOLO con un JSON: { "rating": number (1-5), "reason": "Motivazione tecnica in italiano (max 15 parole)" }`;

    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rating: { type: Type.INTEGER, description: "Rating from 1 to 5 stars" },
                        reason: { type: Type.STRING, description: "Short motivation in Italian" }
                    }
                }
            }
        });
        
        if (response.usageMetadata?.totalTokenCount) {
             window.gpxApp?.addTokens(response.usageMetadata.totalTokenCount);
        }

        const json = JSON.parse(response.text || '{}');
        if (json.rating && json.reason) {
            return { rating: json.rating, reason: json.reason };
        }
    } catch (e) {
        console.error("AI Rating Failed:", e);
    }
    return null;
};
