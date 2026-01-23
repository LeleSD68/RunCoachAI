
import { Track, UserProfile } from '../types';
import { calculateTrackStats } from './trackStatsService';

interface PerformanceMetrics {
    vo2max: number;
    marathonShape: number; // 0-100%
    atl: number; // Fatigue (7 days)
    ctl: number; // Fitness (42 days)
    tsb: number; // Form (CTL - ATL)
    workloadRatio: number; // A:C Ratio
    lastTrimp: number;
    monotony: number;
    trainingLoad: number; // Total load last 7 days
    evolutionScore: number; // NEW: 0-1000 score indicating current capability
    evolutionTrend: number; // NEW: Percentage change vs past
}

export interface HistoryPoint {
    date: Date;
    ctl: number;
    atl: number;
    evolutionScore: number;
    vo2max: number;
}

interface RacePrediction {
    distance: number;
    label: string;
    timeSeconds: number;
    pace: number; // min/km
}

// Riegel's formula for race prediction
const predictTime = (baseDistance: number, baseTime: number, targetDistance: number): number => {
    return baseTime * Math.pow(targetDistance / baseDistance, 1.06);
};

// Calculate TRIMP (Training Impulse)
// Uses HR Reserve if available (Banister's), otherwise uses a TSS approximation based on Speed (rTSS-like)
const calculateTrimp = (track: Track, userProfile: UserProfile, historyAvgSpeed: number): number => {
    const stats = calculateTrackStats(track);
    const durationMin = stats.movingDuration / 1000 / 60;
    
    // 1. HR Based TRIMP (Banister's) - Most Accurate
    if (stats.avgHr && userProfile.maxHr && userProfile.restingHr) {
        const hrReserve = userProfile.maxHr - userProfile.restingHr;
        const avgHrReserve = (stats.avgHr - userProfile.restingHr) / hrReserve;
        // Generic factor (1.92 men, 1.67 women). Using 1.92 as distinct default.
        const genderFactor = userProfile.gender === 'female' ? 1.67 : 1.92;
        return durationMin * avgHrReserve * 0.64 * Math.exp(genderFactor * avgHrReserve);
    }
    
    // 2. Pace Based TRIMP (Running Stress Score Approximation)
    // Needs a reference speed (Threshold Speed). If unknown, estimate from history (approx top 10% speed).
    // If no history, assume 12km/h (5:00/km) as baseline.
    const thresholdSpeedKmh = historyAvgSpeed > 0 ? historyAvgSpeed * 1.15 : 12; 
    const speedKmh = stats.avgSpeed;
    
    if (speedKmh > 0) {
        const intensityFactor = speedKmh / thresholdSpeedKmh;
        // Formula approx: Duration(hrs) * IF^2 * 100
        const durationHrs = durationMin / 60;
        // rTSS formula often uses Normalized Graded Pace, simplified here to avg speed
        let rTSS = durationHrs * Math.pow(intensityFactor, 2) * 100;
        
        // Cap absurd values for GPS errors
        return Math.min(rTSS, 400);
    }

    return 0;
};

// Calculates a normalized performance score for a single track based on 10k equivalent speed
const calculateTrackPerformanceScore = (track: Track): number => {
    if (track.distance < 3 || track.duration <= 0) return 0; // Ignore short/invalid runs
    
    // Normalize to 10km performance using Riegel
    // T10k = T_actual * (10 / D_actual)^1.06
    const durationSec = track.duration / 1000;
    const predicted10kSeconds = durationSec * Math.pow(10 / track.distance, 1.06);
    
    // Calculate Speed at 10k equivalent in km/h
    const speed10kEquivalent = 10 / (predicted10kSeconds / 3600);
    
    // Base score: 10km/h => 100 points. 15km/h => 150 points.
    // Multiplied by 10 for granularity.
    return speed10kEquivalent * 10;
};

const calculateEstimatedVo2 = (track: Track): number => {
    if (track.distance < 3) return 0;
    const minutes = track.duration / 1000 / 60;
    const velocity = track.distance * 1000 / minutes; 
    const vo2Cost = 3.5 + (velocity * 0.2); 
    const estimatedVo2 = vo2Cost / Math.max(0.8, (1.05 - (minutes/300))); 
    return (estimatedVo2 > 0 && estimatedVo2 < 85) ? estimatedVo2 : 0;
};

export const calculatePerformanceMetrics = (tracks: Track[], userProfile: UserProfile): PerformanceMetrics => {
    if (tracks.length === 0) {
        return { vo2max: 0, marathonShape: 0, atl: 0, ctl: 0, tsb: 0, workloadRatio: 0, lastTrimp: 0, monotony: 0, trainingLoad: 0, evolutionScore: 0, evolutionTrend: 0 };
    }

    // 1. Sort chronological (Oldest first) for correct EWMA calculation
    const sortedTracks = [...tracks].sort((a, b) => a.points[0].time.getTime() - b.points[0].time.getTime());
    
    // Determine a baseline speed from best recent efforts for fallback TRIMP calculation
    const recentSpeeds = sortedTracks.slice(-20).map(t => calculateTrackStats(t).avgSpeed).sort((a,b) => b-a);
    const avgTopSpeed = recentSpeeds.slice(0, Math.ceil(recentSpeeds.length * 0.2)).reduce((a,b) => a+b, 0) / (recentSpeeds.length * 0.2 || 1);

    // 2. Map loads to dates
    const dailyLoads = new Map<string, number>();
    let lastTrimp = 0;

    sortedTracks.forEach(t => {
        const dateStr = t.points[0].time.toDateString();
        const trimp = calculateTrimp(t, userProfile, avgTopSpeed);
        dailyLoads.set(dateStr, (dailyLoads.get(dateStr) || 0) + trimp);
        lastTrimp = trimp;
    });

    // 3. Setup Time Range (Go back 90 days to build up CTL/ATL)
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 89); // 90 days history window

    let ctl = 0; // Fitness (Chronic Load)
    let atl = 0; // Fatigue (Acute Load)
    
    // Constants for EWMA (Exponential Weighted Moving Average)
    const kATL = Math.exp(-1 / 7);
    const kCTL = Math.exp(-1 / 42);

    const historyLoads: number[] = [];

    // Iterate day by day from past to today
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const dailyLoad = dailyLoads.get(dateStr) || 0;
        
        atl = dailyLoad * (1 - kATL) + atl * kATL;
        ctl = dailyLoad * (1 - kCTL) + ctl * kCTL;
        
        historyLoads.push(dailyLoad);
    }

    const tsb = ctl - atl; // Form

    // 4. Monotony & Weekly Load
    const last7DaysLoads = historyLoads.slice(-7);
    const totalWeeklyLoad = last7DaysLoads.reduce((a, b) => a + b, 0);
    const avgDailyLoad = totalWeeklyLoad / 7;
    
    let variance = 0;
    last7DaysLoads.forEach(l => variance += Math.pow(l - avgDailyLoad, 2));
    variance /= 7;
    const stdDev = Math.sqrt(variance);
    
    const rawMonotony = stdDev > 0 ? (avgDailyLoad / stdDev) : (avgDailyLoad > 0 ? 4 : 0);
    const monotonyPercent = Math.min(100, (rawMonotony / 3) * 100);

    // 5. Marathon Shape Calculation
    const tenWeeksAgo = new Date();
    tenWeeksAgo.setDate(today.getDate() - 70);
    const relevantTracks = sortedTracks.filter(t => t.points[0].time >= tenWeeksAgo);
    
    let longRunScore = 0;
    relevantTracks.forEach(t => {
        if (t.distance > 13) {
            let pts = 0;
            if (t.distance >= 30) pts = 3.0;
            else if (t.distance >= 25) pts = 2.2;
            else if (t.distance >= 20) pts = 1.5;
            else if (t.distance >= 15) pts = 0.8;
            else pts = 0.4;

            const daysAgo = (today.getTime() - t.points[0].time.getTime()) / (1000 * 60 * 60 * 24);
            const weeksAgo = daysAgo / 7;
            const decay = Math.max(0.2, 1 - (weeksAgo * 0.08)); 
            longRunScore += (pts * decay);
        }
    });
    const longRunPercent = Math.min(100, (longRunScore / 12) * 100);
    const totalVolume = relevantTracks.reduce((sum, t) => sum + t.distance, 0);
    const avgWeeklyVolume = totalVolume / 10;
    const volumePercent = Math.min(100, (avgWeeklyVolume / 80) * 100);
    const marathonShape = (volumePercent * 0.4) + (longRunPercent * 0.6);

    // 6. VO2Max (VDOT estimation)
    let bestVo2 = 0;
    sortedTracks.slice(-15).forEach(t => {
        const estimatedVo2 = calculateEstimatedVo2(t);
        if (estimatedVo2 > bestVo2) bestVo2 = estimatedVo2;
    });
    if (bestVo2 === 0) bestVo2 = 35;

    // 7. EVOLUTION SCORE Calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const scoresRecent: number[] = [];
    const scoresBaseline: number[] = [];

    sortedTracks.forEach(t => {
        const tDate = t.points[0].time;
        const score = calculateTrackPerformanceScore(t);
        if (score > 0) {
            if (tDate >= thirtyDaysAgo) {
                scoresRecent.push(score);
            } else if (tDate >= ninetyDaysAgo && tDate < thirtyDaysAgo) {
                scoresBaseline.push(score);
            }
        }
    });

    const getTopAverage = (scores: number[]) => {
        if (scores.length === 0) return 0;
        scores.sort((a, b) => b - a); // Descending
        const topSlice = scores.slice(0, Math.max(1, Math.ceil(scores.length * 0.5))); // Top 50%
        return topSlice.reduce((a, b) => a + b, 0) / topSlice.length;
    };

    const avgRecentScore = getTopAverage(scoresRecent);
    const avgBaselineScore = getTopAverage(scoresBaseline);

    let evolutionScore = Math.round(avgRecentScore);
    let evolutionTrend = 0;

    if (avgBaselineScore > 0 && avgRecentScore > 0) {
        evolutionTrend = ((avgRecentScore - avgBaselineScore) / avgBaselineScore) * 100;
    } else if (avgRecentScore > 0 && avgBaselineScore === 0) {
        evolutionTrend = 100; // New data, 100% improvement technically
    }

    return {
        vo2max: parseFloat(bestVo2.toFixed(1)),
        marathonShape: Math.round(marathonShape),
        atl: Math.round(atl),
        ctl: Math.round(ctl),
        tsb: Math.round(tsb),
        workloadRatio: ctl > 0 ? parseFloat((atl / ctl).toFixed(2)) : 0,
        lastTrimp: Math.round(lastTrimp),
        monotony: Math.round(monotonyPercent),
        trainingLoad: Math.round(totalWeeklyLoad),
        evolutionScore,
        evolutionTrend
    };
};

export const calculatePerformanceHistory = (tracks: Track[], userProfile: UserProfile): HistoryPoint[] => {
    if (tracks.length === 0) return [];

    const sortedTracks = [...tracks].sort((a, b) => a.points[0].time.getTime() - b.points[0].time.getTime());
    const startDate = new Date(sortedTracks[0].points[0].time);
    const today = new Date();
    
    // Fallback speed for TRIMP
    const recentSpeeds = sortedTracks.slice(0, 20).map(t => calculateTrackStats(t).avgSpeed).sort((a,b) => b-a);
    const avgTopSpeed = recentSpeeds.length > 0 ? recentSpeeds[0] : 12;

    const dailyLoads = new Map<string, number>();
    const trackScoresMap = new Map<string, number>(); // date -> score
    const vo2Map = new Map<string, number>();

    sortedTracks.forEach(t => {
        const dateStr = t.points[0].time.toDateString();
        const trimp = calculateTrimp(t, userProfile, avgTopSpeed);
        dailyLoads.set(dateStr, (dailyLoads.get(dateStr) || 0) + trimp);
        
        const score = calculateTrackPerformanceScore(t);
        if (score > 0) {
            const existing = trackScoresMap.get(dateStr) || 0;
            trackScoresMap.set(dateStr, Math.max(existing, score)); // Max score of the day
        }

        const vo2 = calculateEstimatedVo2(t);
        if (vo2 > 0) {
             const existingVo2 = vo2Map.get(dateStr) || 0;
             vo2Map.set(dateStr, Math.max(existingVo2, vo2));
        }
    });

    let ctl = 0;
    let atl = 0;
    const kATL = Math.exp(-1 / 7);
    const kCTL = Math.exp(-1 / 42);
    
    const history: HistoryPoint[] = [];
    const recentScoresBuffer: { date: Date, score: number }[] = [];
    const recentVo2Buffer: { date: Date, vo2: number }[] = [];

    // Start a bit before the first run to prime the pump? No, start from first run.
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toDateString();
        const dailyLoad = dailyLoads.get(dateStr) || 0;
        const dailyScore = trackScoresMap.get(dateStr);
        const dailyVo2 = vo2Map.get(dateStr);

        atl = dailyLoad * (1 - kATL) + atl * kATL;
        ctl = dailyLoad * (1 - kCTL) + ctl * kCTL;

        // Evolution Score Window logic (Last 30 days)
        if (dailyScore) recentScoresBuffer.push({ date: new Date(d), score: dailyScore });
        // Clean old scores (> 30 days)
        while (recentScoresBuffer.length > 0 && (d.getTime() - recentScoresBuffer[0].date.getTime()) > (30 * 24 * 60 * 60 * 1000)) {
            recentScoresBuffer.shift();
        }
        
        // VO2 Max logic (Last 60 days best)
        if (dailyVo2) recentVo2Buffer.push({ date: new Date(d), vo2: dailyVo2 });
        while (recentVo2Buffer.length > 0 && (d.getTime() - recentVo2Buffer[0].date.getTime()) > (60 * 24 * 60 * 60 * 1000)) {
            recentVo2Buffer.shift();
        }

        // Calculate Evolution Score for this day
        let currentEvolutionScore = 0;
        if (recentScoresBuffer.length > 0) {
            const scores = recentScoresBuffer.map(s => s.score).sort((a,b) => b-a);
            const topSlice = scores.slice(0, Math.max(1, Math.ceil(scores.length * 0.5)));
            currentEvolutionScore = topSlice.reduce((a, b) => a + b, 0) / topSlice.length;
        }

        let currentVo2 = 0;
        if (recentVo2Buffer.length > 0) {
            currentVo2 = Math.max(...recentVo2Buffer.map(v => v.vo2));
        }

        // Only push points every week or if there was activity, to keep chart clean?
        // Actually daily points are fine for a line chart if we filter later or render small.
        // Let's store daily for accuracy.
        history.push({
            date: new Date(d),
            ctl,
            atl,
            evolutionScore: currentEvolutionScore,
            vo2max: currentVo2
        });
    }

    return history;
};

export const calculatePredictions = (tracks: Track[]): RacePrediction[] => {
    const recentTracks = tracks.filter(t => {
        const diff = new Date().getTime() - t.points[0].time.getTime();
        return diff < 1000 * 60 * 60 * 24 * 90; 
    });

    if (recentTracks.length === 0) return [];

    let bestEffort = { dist: 0, time: 0, score: 0 };

    recentTracks.forEach(t => {
        if (t.distance >= 3) {
            // Riegel Score comparison to find best relative effort
            // T_pred_10k = T * (10 / D)^1.06
            const predicted10k = (t.duration/1000) * Math.pow(10 / t.distance, 1.06);
            const score = 100000 / predicted10k; // Higher is better
            
            if (score > bestEffort.score) {
                bestEffort = { dist: t.distance, time: t.duration / 1000, score };
            }
        }
    });

    if (bestEffort.dist === 0) return [];

    const targets = [
        { d: 5, l: '5,00 km' },
        { d: 10, l: '10,00 km' },
        { d: 21.0975, l: '21,10 km' },
        { d: 42.195, l: '42,20 km' },
    ];

    return targets.map(target => {
        const predictedSeconds = predictTime(bestEffort.dist, bestEffort.time, target.d);
        return {
            distance: target.d,
            label: target.l,
            timeSeconds: predictedSeconds,
            pace: (predictedSeconds / 60) / target.d
        };
    });
};
