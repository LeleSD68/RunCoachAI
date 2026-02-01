
import { Track, TrackPoint, PauseSegment } from '../types';

const haversineDistance = (p1: {lat: number, lon: number}, p2: {lat: number, lon: number}): number => {
  const R = 6371; 
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const recalculateTrackMetrics = (points: TrackPoint[]): { points: TrackPoint[], distance: number, duration: number } => {
    if (points.length < 2) {
        return { points, distance: 0, duration: 0 };
    }
    
    let totalDistance = 0;
    const pointsWithDistance: TrackPoint[] = points.map((p, index) => {
        if (index > 0) {
            totalDistance += haversineDistance(points[index-1], p);
        }
        return { ...p, cummulativeDistance: totalDistance };
    });
    
    const totalDuration = points[points.length - 1].time.getTime() - points[0].time.getTime();
    return { points: pointsWithDistance, distance: totalDistance, duration: totalDuration };
}

export const getTrackPointAtDistance = (track: Track, targetDistance: number): TrackPoint | null => {
    if (track.points.length < 2 || targetDistance < 0 || targetDistance > track.distance) {
        return null;
    }
    if (targetDistance <= 0) return track.points[0];
    if (targetDistance >= track.distance) return track.points[track.points.length - 1];
    
    for (let i = 0; i < track.points.length - 1; i++) {
        const p1 = track.points[i];
        const p2 = track.points[i + 1];
        if (p1.cummulativeDistance <= targetDistance && p2.cummulativeDistance >= targetDistance) {
            const segmentDistance = p2.cummulativeDistance - p1.cummulativeDistance;
            if (segmentDistance === 0) return p1;
            const ratio = (targetDistance - p1.cummulativeDistance) / segmentDistance;
            return {
                lat: p1.lat + (p2.lat - p1.lat) * ratio,
                lon: p1.lon + (p2.lon - p1.lon) * ratio,
                ele: p1.ele + (p2.ele - p1.ele) * ratio,
                time: new Date(p1.time.getTime() + (p2.time.getTime() - p1.time.getTime()) * ratio),
                cummulativeDistance: targetDistance,
                hr: p1.hr !== undefined && p2.hr !== undefined ? Math.round(p1.hr + (p2.hr - p1.hr) * ratio) : (p1.hr ?? p2.hr),
                cad: p1.cad,
                power: p1.power !== undefined && p2.power !== undefined ? Math.round(p1.power + (p2.power - p1.power) * ratio) : (p1.power ?? p2.power)
            };
        }
    }
    return null;
};

export const getTrackStateAtTime = (track: Track, timeOffsetMs: number): { point: TrackPoint, pace: number } | null => {
    if (track.points.length < 2) return null;
    const startTime = track.points[0].time.getTime();
    const targetTime = startTime + timeOffsetMs;
    const endTime = track.points[track.points.length - 1].time.getTime();
    if (targetTime <= startTime) return { point: track.points[0], pace: 0 };
    if (targetTime >= endTime) return { point: track.points[track.points.length - 1], pace: 0 };

    let low = 0, high = track.points.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const pTime = track.points[mid].time.getTime();
        if (pTime < targetTime) low = mid + 1;
        else if (pTime > targetTime) high = mid - 1;
        else return { point: track.points[mid], pace: 0 };
    }
    const p1 = track.points[high], p2 = track.points[low];
    const timeDiff = p2.time.getTime() - p1.time.getTime();
    const ratio = (targetTime - p1.time.getTime()) / timeDiff;
    const distDiff = p2.cummulativeDistance - p1.cummulativeDistance;
    return { 
        point: { 
            lat: p1.lat + (p2.lat - p1.lat) * ratio, 
            lon: p1.lon + (p2.lon - p1.lon) * ratio, 
            ele: p1.ele + (p2.ele - p1.ele) * ratio, 
            time: new Date(targetTime),
            cummulativeDistance: p1.cummulativeDistance + distDiff * ratio,
            hr: p1.hr 
        },
        pace: distDiff > 0.0001 ? (timeDiff / 60000) / distDiff : 0
    };
};

export const getSmoothedPace = (track: Track, currentDist: number, lookbackMeters: number): number => {
    if (currentDist < 0.05) return 0;
    const startDist = Math.max(0, currentDist - (lookbackMeters / 1000));
    const pEnd = getTrackPointAtDistance(track, currentDist), pStart = getTrackPointAtDistance(track, startDist);
    if (!pEnd || !pStart) return 0;
    const distDiff = pEnd.cummulativeDistance - pStart.cummulativeDistance;
    const timeDiffMs = pEnd.time.getTime() - pStart.time.getTime();
    return (distDiff > 0.001 && timeDiffMs > 0) ? (timeDiffMs / 60000) / distDiff : 0;
}

export const getPointsInDistanceRange = (track: Track, startDistance: number, endDistance: number): TrackPoint[] => {
    const pointsInRange: TrackPoint[] = [];
    const startPoint = getTrackPointAtDistance(track, startDistance);
    if (startPoint) pointsInRange.push(startPoint);
    track.points.forEach(p => {
        if (p.cummulativeDistance > startDistance && p.cummulativeDistance < endDistance) pointsInRange.push(p);
    });
    const endPoint = getTrackPointAtDistance(track, endDistance);
    if (endPoint) pointsInRange.push(endPoint);
    return pointsInRange;
};

/**
 * Calcola statistiche dettagliate per un segmento (inclusi min/max)
 */
export const calculateSegmentStats = (track: Track, startDistance: number, endDistance: number) => {
    const points = getPointsInDistanceRange(track, startDistance, endDistance);
    if (points.length < 2) return null;

    const distance = endDistance - startDistance;
    const duration = points[points.length - 1].time.getTime() - points[0].time.getTime();
    const pace = distance > 0 ? (duration / 60000) / distance : 0;
    
    let elevationGain = 0, elevationLoss = 0;
    let minEle = points[0].ele, maxEle = points[0].ele;
    let heartRates: number[] = [], powers: number[] = [], paces: number[] = [], cadences: number[] = [];

    for (let i = 1; i < points.length; i++) {
        const p1 = points[i-1], p2 = points[i];
        const diff = p2.ele - p1.ele;
        if (diff > 0) elevationGain += diff; else elevationLoss += Math.abs(diff);
        if (p2.ele < minEle) minEle = p2.ele; if (p2.ele > maxEle) maxEle = p2.ele;
        if (p2.hr) heartRates.push(p2.hr);
        if (p2.power) powers.push(p2.power);
        if (p2.cad) cadences.push(p2.cad);
        
        const d = p2.cummulativeDistance - p1.cummulativeDistance;
        const t = (p2.time.getTime() - p1.time.getTime()) / 60000;
        if (d > 0.001 && t > 0) paces.push(t / d);
    }

    return {
        distance, duration, pace,
        minPace: paces.length > 0 ? Math.min(...paces) : pace,
        maxPace: paces.length > 0 ? Math.max(...paces) : pace,
        elevationGain, elevationLoss, minEle, maxEle,
        avgHr: heartRates.length > 0 ? heartRates.reduce((a,b)=>a+b,0)/heartRates.length : null,
        minHr: heartRates.length > 0 ? Math.min(...heartRates) : null,
        maxHr: heartRates.length > 0 ? Math.max(...heartRates) : null,
        avgPower: powers.length > 0 ? powers.reduce((a,b)=>a+b,0)/powers.length : null,
        avgCadence: cadences.length > 0 ? cadences.reduce((a,b)=>a+b,0)/cadences.length : null
    };
};

export const mergeTracks = (tracks: Track[]): Track => {
    const sortedTracks = [...tracks].sort((a, b) => (a.points[0]?.time.getTime() || 0) - (b.points[0]?.time.getTime() || 0));
    const newPoints: TrackPoint[] = [];
    let runningEndTime = 0;
    sortedTracks.forEach((track, idx) => {
        if (track.points.length === 0) return;
        const offset = idx > 0 ? (runningEndTime + 1000) - track.points[0].time.getTime() : 0;
        track.points.forEach(p => {
             const newTime = p.time.getTime() + offset;
             newPoints.push({ ...p, time: new Date(newTime) });
             runningEndTime = newTime;
        });
    });
    const { points, distance, duration } = recalculateTrackMetrics(newPoints);
    return { id: `merged-${Date.now()}`, name: sortedTracks.map(t => t.name).join(' + '), color: '#0ea5e9', points, distance, duration };
};

export const cutTrackSection = (track: Track, startDistance: number, endDistance: number): Track => {
    if (startDistance >= endDistance || !track.points.length) return track;
    const p1 = getTrackPointAtDistance(track, startDistance), p2 = getTrackPointAtDistance(track, endDistance);
    if (!p1 || !p2) return track;
    const removedDur = p2.time.getTime() - p1.time.getTime();
    const combined = [...track.points.filter(p => p.cummulativeDistance < startDistance), p1, ...track.points.filter(p => p.cummulativeDistance > endDistance).map(p => ({ ...p, time: new Date(p.time.getTime() - removedDur) }))];
    const { points, distance, duration } = recalculateTrackMetrics(combined);
    return { ...track, points, distance, duration };
};

export const trimTrackToSelection = (track: Track, startDistance: number, endDistance: number): Track => {
    const trimmed = getPointsInDistanceRange(track, startDistance, endDistance);
    if (trimmed.length < 2) return { ...track, points: [], distance: 0, duration: 0 };
    const t0 = trimmed[0].time.getTime(), d0 = trimmed[0].cummulativeDistance;
    const final = trimmed.map(p => ({ ...p, time: new Date(p.time.getTime() - t0), cummulativeDistance: p.cummulativeDistance - d0 }));
    const { points, distance, duration } = recalculateTrackMetrics(final);
    return { ...track, points, distance, duration };
};

export const findPauses = (track: Track, minDurationSec: number = 10, maxSpeedKmh: number = 1.5): PauseSegment[] => {
    if (track.points.length < 2) return [];
    const pauses: PauseSegment[] = [];
    let start: TrackPoint | null = null;
    for (let i = 1; i < track.points.length; i++) {
        const p1 = track.points[i-1], p2 = track.points[i];
        const dt = (p2.time.getTime() - p1.time.getTime()) / 1000, dd = p2.cummulativeDistance - p1.cummulativeDistance;
        const speed = dt > 0.1 ? (dd / dt) * 3600 : Infinity;
        if (speed < maxSpeedKmh) { if (!start) start = p1; }
        else { if (start) { const dur = (p1.time.getTime() - start.time.getTime()) / 1000; if (dur >= minDurationSec) pauses.push({ startPoint: start, endPoint: p1, duration: dur }); start = null; } }
    }
    return pauses;
};

export const smoothTrackData = (track: Track): { newTrack: Track, correctedCount: number } => {
    if (track.points.length < 3) return { newTrack: track, correctedCount: 0 };
    const points = [...track.points];
    let corrected = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i-1], p1 = points[i], p2 = points[i+1];
        const d = haversineDistance(p0, p1), t = (p1.time.getTime() - p0.time.getTime()) / 3600000;
        if (t > 0 && (d/t) > 45) {
            points[i] = { ...p1, lat: (p0.lat + p2.lat)/2, lon: (p0.lon + p2.lon)/2, ele: (p0.ele + p2.ele)/2 };
            corrected++;
        }
    }
    const { points: smoothed, distance, duration } = recalculateTrackMetrics(points);
    return { newTrack: { ...track, points: smoothed, distance, duration }, correctedCount: corrected };
};
