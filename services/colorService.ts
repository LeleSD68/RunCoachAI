
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
        const speed = time > 0 ? dist / time : 0;
        return metric === 'speed' ? speed : (speed > 0.1 ? 60 / speed : 0);
    });

    const validValues = values.filter(v => v > 0);
    const minVal = Math.min(...validValues);
    const maxVal = Math.max(...validValues);
    const range = maxVal - minVal || 1;

    const maxHr = Math.max(...track.points.map(p => p.hr || 0)) || 190;

    return track.points.slice(1).map((p, i) => {
        const val = values[i+1];
        let color = defaultColor;

        if (metric === 'hr_zones') {
            color = getHrZoneColor(val, maxHr);
        } else {
            const ratio = Math.max(0, Math.min(1, (val - minVal) / range));
            if (metric === 'pace') {
                // Pace: Green (Fast) to Red (Slow)
                color = `hsl(${(1 - ratio) * 120}, 100%, 50%)`;
            } else if (metric === 'speed') {
                // Speed: Red (Slow) to Green (Fast)
                color = `hsl(${ratio * 120}, 100%, 50%)`;
            } else if (metric === 'hr') {
                // HR: Blue (Low) to Red (High)
                color = `hsl(${240 - ratio * 240}, 100%, 50%)`;
            } else if (metric === 'elevation') {
                // Elevation: Brownish gradient
                color = `hsl(30, 70%, ${30 + ratio * 40}%)`;
            } else if (metric === 'power') {
                // Power: Purple to Yellow
                color = `hsl(${280 - ratio * 220}, 100%, 50%)`;
            }
        }

        return { p1: track.points[i], p2: p, color, value: val };
    });
};
