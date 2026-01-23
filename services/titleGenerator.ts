
import { TrackPoint, ActivityType } from '../types';

// Helper function to calculate elevation gain roughly for naming purposes
export const calculateRoughElevationGain = (points: { ele: number }[]): number => {
    let gain = 0;
    for (let i = 1; i < points.length; i++) {
        const diff = points[i].ele - points[i - 1].ele;
        if (diff > 0) gain += diff;
    }
    return gain;
};

// Calcola la variabilità della velocità per determinare se è un allenamento strutturato (ripetute/fartlek)
const analyzeSpeedVariance = (points: TrackPoint[]): { isIntervals: boolean, isFartlek: boolean } => {
    if (points.length < 50) return { isIntervals: false, isFartlek: false };

    const speeds: number[] = [];
    const windowSize = 5; // Analisi ogni 5 punti per ridurre il rumore istantaneo

    for (let i = windowSize; i < points.length; i += windowSize) {
        const p1 = points[i - windowSize];
        const p2 = points[i];
        const dist = p2.cummulativeDistance - p1.cummulativeDistance; // km
        const time = (p2.time.getTime() - p1.time.getTime()) / 3600000; // hours
        
        if (time > 0) {
            const speed = dist / time; // km/h
            // Filtriamo velocità assurde o da fermo
            if (speed > 4 && speed < 30) {
                speeds.push(speed);
            }
        }
    }

    if (speeds.length < 10) return { isIntervals: false, isFartlek: false };

    // Calcolo deviazione standard e coefficiente di variazione
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coefficient of Variation

    // Soglie empiriche
    // Una corsa lenta costante ha solitamente un CV < 0.08 (8%)
    // Un Fartlek ha variazioni moderate: 0.08 < CV < 0.15
    // Le Ripetute hanno variazioni alte (alternanza corsa/recupero): CV > 0.15

    const isIntervals = cv > 0.16;
    const isFartlek = cv > 0.09 && cv <= 0.16;

    return { isIntervals, isFartlek };
};

export interface SmartTitleResult {
    title: string;
    activityType: ActivityType;
    folder?: string;
}

export const generateSmartTitle = (points: TrackPoint[], distanceKm: number, originalName: string): SmartTitleResult => {
    if (points.length === 0) return { title: originalName, activityType: 'Altro' };

    const startTime = points[0].time instanceof Date ? points[0].time : new Date(points[0].time);
    const hour = startTime.getHours();
    const day = startTime.getDay(); // 0 = Sunday
    const elevationGain = calculateRoughElevationGain(points);
    const gainPerKm = distanceKm > 0 ? elevationGain / distanceKm : 0;

    // 1. Contesto Temporale
    let timeStr = "";
    if (hour >= 5 && hour < 10) timeStr = "Mattina";
    else if (hour >= 10 && hour < 12) timeStr = "Tarda Mattinata";
    else if (hour >= 12 && hour < 14) timeStr = "Pausa Pranzo";
    else if (hour >= 14 && hour < 17) timeStr = "Pomeriggio";
    else if (hour >= 17 && hour < 20) timeStr = "Sera";
    else if (hour >= 20 || hour < 5) timeStr = "Notturna";

    // 2. Terreno / Difficoltà
    let terrainStr = "";
    if (gainPerKm > 25) terrainStr = "Montagna"; 
    else if (gainPerKm > 12) terrainStr = "Collinare";
    else if (gainPerKm < 3 && distanceKm > 5) terrainStr = "Piano";

    // Analisi Varianza Velocità
    const { isIntervals, isFartlek } = analyzeSpeedVariance(points);

    // 3. Tipologia Corsa basata sulla distanza e varianza
    let typeStr = "Corsa";
    let activityType: ActivityType = 'Lento';
    let folder: string | undefined = undefined;

    // Controllo prioritario su Ripetute/Fartlek
    if (isIntervals && distanceKm > 3) {
        typeStr = "Ripetute";
        activityType = 'Ripetute';
        folder = "Qualità";
    } else if (isFartlek && distanceKm > 4) {
        typeStr = "Fartlek";
        activityType = 'Fartlek';
        folder = "Qualità";
    } else {
        // Logica standard basata su distanza se non è un lavoro specifico
        if (distanceKm < 5) {
            typeStr = "Rigenerante";
            activityType = 'Lento';
        }
        else if (distanceKm >= 5 && distanceKm < 13) {
            typeStr = "Fondo Lento";
            activityType = 'Lento';
        }
        else if (distanceKm >= 13 && distanceKm < 18) {
            typeStr = "Medio";
            activityType = 'Lungo'; 
        }
        else if (distanceKm >= 18 && distanceKm < 28) {
            typeStr = "Lungo";
            activityType = 'Lungo';
            folder = "Lunghi";
        }
        else if (distanceKm >= 28) {
            typeStr = "Lunghissimo";
            activityType = 'Lungo';
            folder = "Lunghi";
        }
    }

    // Casi Speciali: Distanze Gara (hanno priorità su tutto tranne che se sembrano palesemente ripetute lente)
    if (Math.abs(distanceKm - 21.1) < 0.5 && !isIntervals) {
        typeStr = "Mezza Maratona";
        activityType = 'Gara';
        folder = "Gare";
    }
    if (Math.abs(distanceKm - 42.2) < 1.0 && !isIntervals) {
        typeStr = "Maratona";
        activityType = 'Gara';
        folder = "Gare";
    }

    // Caso Speciale: Lungo Domenicale
    if (day === 0 && distanceKm > 15 && activityType === 'Lungo') {
        return {
            title: `Lungo Domenicale ⛪ (${distanceKm.toFixed(1)}k)`,
            activityType: 'Lungo',
            folder: 'Lunghi'
        };
    }

    // Costruzione Titolo: [Tipo] [Terreno] ([Orario]) -> es. "Fondo Lento Collinare (Mattina)"
    const mainParts = [typeStr, terrainStr].filter(s => s).join(" ");
    const title = `${mainParts} (${timeStr})`;

    return { title, activityType, folder };
};
