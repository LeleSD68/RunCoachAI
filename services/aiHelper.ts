
import { GoogleGenAI, Type } from "@google/genai";
import { Track, UserProfile, PlannedWorkout, TrackPoint } from '../types';
import { calculateTrackStats } from './trackStatsService';

const CUSTOM_KEY_STORAGE = 'runcoach_custom_api_key';

export const getEffectiveApiKey = (): string | undefined => {
    const customKey = localStorage.getItem(CUSTOM_KEY_STORAGE);
    if (customKey && customKey.trim().length > 10) {
        return customKey.trim();
    }
    return process.env.API_KEY;
};

export const hasCustomApiKey = (): boolean => {
    const customKey = localStorage.getItem(CUSTOM_KEY_STORAGE);
    return !!(customKey && customKey.trim().length > 10);
};

export const saveCustomApiKey = (key: string) => {
    localStorage.setItem(CUSTOM_KEY_STORAGE, key.trim());
};

export const removeCustomApiKey = () => {
    localStorage.removeItem(CUSTOM_KEY_STORAGE);
};

export const getGenAI = () => {
    const key = getEffectiveApiKey();
    if (!key) throw new Error("API_KEY_MISSING");
    return new GoogleGenAI({ apiKey: key });
};

/**
 * Campiona i punti in modo intelligente per risparmiare token senza perdere il "carattere" della corsa.
 * 200 punti sono sufficienti per descrivere accuratamente anche un allenamento di ripetute su 21km.
 */
export const samplePointsForAi = (points: TrackPoint[], isEcoMode: boolean = false): any[] => {
    // Portiamo il limite a 200 per la modalità standard (risultato professionale)
    // e 80 per la modalità Eco (risultato comunque accettabile)
    const maxPoints = isEcoMode ? 80 : 200;
    
    if (points.length <= maxPoints) return points.map(p => ({
        d: parseFloat(p.cummulativeDistance.toFixed(3)),
        e: Math.round(p.ele),
        h: p.hr || 0,
        s: p.power || 0 // Usiamo s per saving/power se presente
    }));

    const step = points.length / maxPoints;
    const sampled = [];
    
    // Includiamo sempre il primo e l'ultimo punto
    sampled.push({
        d: parseFloat(points[0].cummulativeDistance.toFixed(3)),
        e: Math.round(points[0].ele),
        h: points[0].hr || 0
    });

    for (let i = 1; i < maxPoints - 1; i++) {
        const idx = Math.floor(i * step);
        const p = points[idx];
        sampled.push({
            d: parseFloat(p.cummulativeDistance.toFixed(3)),
            e: Math.round(p.ele),
            h: p.hr || 0
        });
    }

    sampled.push({
        d: parseFloat(points[points.length - 1].cummulativeDistance.toFixed(3)),
        e: Math.round(points[points.length - 1].ele),
        h: points[points.length - 1].hr || 0
    });

    return sampled;
};

export const isAuthError = (e: any): boolean => {
    const msg = (e.message || '').toLowerCase();
    const status = e.status || e.code;
    return status === 403 || status === 400 && (msg.includes('key') || msg.includes('api')) || msg.includes('403') || msg.includes('blocked') || msg.includes('permission_denied') || msg.includes('api key must be set');
};

export async function ensureApiKey() {
    // If user has custom key, we don't need the specialized UI picker for Veo usually, 
    // unless they specifically want to pick a paid project key.
    // However, if we are here, it means the current key failed.
    if (window.aistudio) await window.aistudio.openSelectKey();
}

export async function retryWithPolicy<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (e: any) {
        if (isAuthError(e)) {
            // If custom key failed, maybe prompt to check it?
            // For now fallback to standard flow
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
    
    if (userProfile.autoAnalyzeEnabled === false) return null;

    const stats = calculateTrackStats(track);
    const paceStr = formatPace(stats.movingAvgPace);
    
    let planContext = "Nessun allenamento specifico pianificato.";
    if (plannedWorkout) {
        planContext = `OBIETTIVO DIARIO: "${plannedWorkout.title}" (${plannedWorkout.activityType}).`;
    }

    const prompt = `Sei un Head Coach. Valuta questa sessione da 1 a 5 stelle.
    DATI: ${track.distance.toFixed(2)} km, Passo: ${paceStr}/km, HR: ${stats.avgHr ? Math.round(stats.avgHr) : 'N/D'} bpm. RPE: ${track.rpe ?? 'N/D'}.
    ${planContext}
    Rispondi SOLO JSON: { "rating": number, "reason": "max 12 parole" }`;

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
        
        // Fixed: Cast window to any when calling addTokens to resolve TypeScript error
        if (response.usageMetadata?.totalTokenCount) (window as any).gpxApp?.addTokens(response.usageMetadata.totalTokenCount);
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return null;
    }
};
