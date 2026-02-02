
import { Track, TrackPoint } from '../types';

export type GradientMetric = 'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power';

export interface ColoredSegment {
    p1: TrackPoint;
    p2: TrackPoint;
    color: string;
    value?: number;
}

const getHrZoneColor = (hr: number, maxHr: number) => {
    const ratio = hr / maxHr;
    if (ratio < 0.6) return '#3b82f6'; // Z1 Blue
    if (ratio < 0.7) return '#22c55e'; // Z2 Green
    if (ratio < 0.8) return '#eab308'; // Z3 Yellow
    if (ratio < 0.9) return '#f97316'; // Z4 Orange
    return '#ef4444'; // Z5 Red
};

// Interpolazione HSL helper
const getHslColor = (ratio: number, startHue: number, endHue: number) => {
    const hue = startHue + (endHue - startHue) * ratio;
    return `hsl(${hue}, 90%, 50%)`;
};

export const getTrackSegmentColors = (track: Track, metric: GradientMetric, defaultColor: string = '#06b6d4'): ColoredSegment[] => {
    if (metric === 'none' || track.points.length < 2) {
        return track.points.slice(1).map((p, i) => ({
            p1: track.points[i],
            p2: p,
            color: defaultColor,
        }));
    }

    const values = track.points.map((p, i) => {
        if (metric === 'elevation') return p.ele;
        if (metric === 'hr' || metric === 'hr_zones') return p.hr || 0;
        if (metric === 'power') return p.power || 0;
        
        if (i === 0) return 0;
        const p1 = track.points[i-1];
        const dist = p.cummulativeDistance - p1.cummulativeDistance;
        const time = (p.time.getTime() - p1.time.getTime()) / 3600000;
        // Calcolo ritmo min/km (pace)
        // Se time è troppo piccolo o zero, evitiamo divisioni per zero.
        if (metric === 'pace') {
             if (dist > 0.0005 && time > 0) {
                 return (time * 60) / dist; // min/km
             }
             return 0;
        }
        
        // Speed calculation
        const speed = time > 0 ? dist / time : 0;
        return metric === 'speed' ? speed : 0;
    });

    // Filtra valori validi per calcolare min/max sensati
    // Per il passo, ignoriamo valori assurdi (es. sotto 2:00 o sopra 20:00 per evitare che le pause rovinino il gradiente)
    let validValues = values.filter(v => v > 0);
    
    if (metric === 'pace') {
        validValues = values.filter(v => v > 2.5 && v < 15); 
    }

    let minVal = Math.min(...validValues);
    let maxVal = Math.max(...validValues);
    
    // Safety check se tutti i valori sono uguali o vuoti
    if (!isFinite(minVal) || !isFinite(maxVal) || minVal === maxVal) {
        minVal = 0; 
        maxVal = 1;
    }
    
    const range = maxVal - minVal || 1;
    const maxHr = Math.max(...track.points.map(p => p.hr || 0)) || 190;

    return track.points.slice(1).map((p, i) => {
        const val = values[i+1];
        let color = defaultColor;

        if (metric === 'hr_zones') {
            color = getHrZoneColor(val, maxHr);
        } else {
            // Normalizza tra 0 e 1
            let ratio = Math.max(0, Math.min(1, (val - minVal) / range));
            
            if (metric === 'pace') {
                // PACE: Valori bassi (veloci) -> Colori "Hot" (Viola/Rosso) o "Cool" (Verde/Blu)?
                // Convenzione Runalize/Strava spesso usa: 
                // Veloce = Blu/Viola scuro
                // Medio = Verde/Giallo
                // Lento = Rosso/Arancio
                
                // Quindi invertiamo il ratio se vogliamo che 0 (veloce) sia un colore specifico
                // Usiamo uno spettro HSL:
                // 270 (Purple) -> Fast
                // 120 (Green) -> Medium
                // 0 (Red) -> Slow
                
                // Mapping: MinVal (Veloce) -> Ratio 0 -> HSL 260
                // MaxVal (Lento) -> Ratio 1 -> HSL 0
                
                // Curva non lineare per enfatizzare le variazioni alle velocità medie
                color = getHslColor(Math.pow(ratio, 0.8), 260, 0); 

            } else if (metric === 'speed') {
                // Speed: Alto (Veloce) -> Viola/Blu, Basso (Lento) -> Rosso
                color = getHslColor(1 - ratio, 260, 0);
                
            } else if (metric === 'hr') {
                // HR: Basso -> Blu/Azzurro (200), Alto -> Rosso (0)
                color = getHslColor(ratio, 200, 0);
                
            } else if (metric === 'elevation') {
                // Elevation: Basso -> Verde (120), Alto -> Marrone/Rosso (0)
                // O Nero -> Bianco per rilievo? Usiamo colori topo: Verde -> Marrone -> Grigio
                if (ratio < 0.5) {
                    // Verde (120) a Giallo (60)
                    color = getHslColor(ratio * 2, 120, 60);
                } else {
                    // Giallo (60) a Rosso scuro (0)
                    color = getHslColor((ratio - 0.5) * 2, 60, 0);
                }
            } else if (metric === 'power') {
                // Power: Basso -> Giallo, Alto -> Viola
                color = getHslColor(ratio, 60, 280);
            }
        }

        return { p1: track.points[i], p2: p, color, value: val };
    });
};
