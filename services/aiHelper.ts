
import { GoogleGenAI, Type } from "@google/genai";
import { Track, UserProfile, PlannedWorkout } from '../types';
import { calculateTrackStats } from './trackStatsService';

export const getGenAI = () => {
    if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const isAuthError = (e: any): boolean => {
    const msg = (e.message || '').toLowerCase();
    const status = e.status || e.code;
    return status === 403 || status === 400 && (msg.includes('key') || msg.includes('api')) || msg.includes('403') || msg.includes('blocked') || msg.includes('permission_denied') || msg.includes('api key must be set');
};

export async function ensureApiKey() {
    if (window.aistudio) await window.aistudio.openSelectKey();
}

export async function retryWithPolicy<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (e: any) {
        if (isAuthError(e)) {
            await ensureApiKey();
            return await operation();
        }
        throw e;
    }
}

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const generateAiRating = async (
    track: Track, 
    allTracks: Track[], 
    userProfile: UserProfile, 
    plannedWorkout?: { title: string; description: string; activityType: string }
): Promise<{ rating: number; reason: string } | null> => {
    
    const stats = calculateTrackStats(track);
    const paceStr = formatPace(stats.movingAvgPace);
    
    let planContext = "Nessun allenamento specifico pianificato nel diario.";
    if (plannedWorkout) {
        planContext = `
        ALLENAMENTO PIANIFICATO DAL DIARIO:
        - Titolo: "${plannedWorkout.title}"
        - Obiettivo Dichiarato: ${plannedWorkout.activityType}
        - Istruzioni: "${plannedWorkout.description}"
        
        REGOLE DI VALUTAZIONE (MERITOCRATICHE):
        - Se era un 'Lento' o 'Recupero' ma l'atleta ha corso forte (FC alta/Passo veloce) -> IL VOTO DEVE ESSERE BASSO (1-2 stelle) per mancata disciplina fisiologica.
        - Se era un 'Lungo' ed è stato costante -> 5 stelle.
        - Se erano 'Ripetute' e i ritmi sono corretti -> 5 stelle.
        - Premia la coerenza con l'obiettivo, non la velocità fine a se stessa.
        `;
    }

    const prompt = `Sei un Head Coach di corsa severo. Valuta questa sessione da 1 a 5 stelle.

    DATI REALI:
    - Distanza: ${track.distance.toFixed(2)} km
    - Passo Medio: ${paceStr}/km
    - FC Media: ${stats.avgHr ? Math.round(stats.avgHr) : 'N/D'} bpm (FC Max: ${stats.maxHr ?? 'N/D'})
    - Sforzo Percepito (RPE): ${track.rpe ?? 'N/D'} / 10
    - Note Atleta: "${track.notes || 'Nessuna'}"

    ${planContext}

    Rispondi SOLO con un JSON: { "rating": number (1-5), "reason": "Motivazione tecnica brevissima (max 12 parole)" }`;

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
                        rating: { type: Type.INTEGER },
                        reason: { type: Type.STRING }
                    },
                    required: ["rating", "reason"]
                }
            }
        });
        
        if (response.usageMetadata?.totalTokenCount) window.gpxApp?.addTokens(response.usageMetadata.totalTokenCount);
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Rating generation error", e);
        return null;
    }
};
