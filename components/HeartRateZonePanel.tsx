
import React, { useMemo } from 'react';
import { Track, UserProfile, TrackPoint } from '../types';

interface HeartRateZonePanelProps {
    track: Track;
    userProfile: UserProfile;
    onZoneSelect?: (segments: (TrackPoint & { highlightColor: string })[][] | null) => void;
}

const formatDuration = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export interface ZoneInfo {
    name: string;
    threshold: number;
    color: string;
    range: string;
    duration: number;
    percent: number;
    min: number;
}

export const getHeartRateZoneInfo = (track: Track, userProfile: UserProfile): { zones: ZoneInfo[], maxHrUsed: number } => {
    const maxHrFromTrack = Math.max(...track.points.map(p => p.hr || 0));
    const maxHrFromProfile = userProfile.maxHr || (userProfile.age ? 220 - userProfile.age : null);
    const maxHrUsed = maxHrFromProfile || maxHrFromTrack;
    if (!maxHrUsed || maxHrUsed === 0) return { zones: [], maxHrUsed: 0 };

    const zonesDef = [
        { name: 'Z1 Molto leggero', threshold: 0.6, color: '#3b82f6', min: 0 },
        { name: 'Z2 Leggero', threshold: 0.7, color: '#22c55e', min: 0.6 },
        { name: 'Z3 Moderato', threshold: 0.8, color: '#eab308', min: 0.7 },
        { name: 'Z4 Difficile', threshold: 0.9, color: '#f97316', min: 0.8 },
        { name: 'Z5 Massimo', threshold: 1.0, color: '#ef4444', min: 0.9 },
    ];

    const zoneDurations = Array(5).fill(0);
    let totalHrDuration = 0;
    for (let i = 1; i < track.points.length; i++) {
        const p1 = track.points[i - 1], p2 = track.points[i];
        if (p1.hr && p2.hr) {
            const ratio = ((p1.hr + p2.hr) / 2) / maxHrUsed;
            const duration = p2.time.getTime() - p1.time.getTime();
            totalHrDuration += duration;
            if (ratio < zonesDef[0].threshold) zoneDurations[0] += duration;
            else if (ratio < zonesDef[1].threshold) zoneDurations[1] += duration;
            else if (ratio < zonesDef[2].threshold) zoneDurations[2] += duration;
            else if (ratio < zonesDef[3].threshold) zoneDurations[3] += duration;
            else zoneDurations[4] += duration;
        }
    }
    return { 
        zones: zonesDef.map((z, i) => ({ ...z, range: `${Math.round(z.min * maxHrUsed)}-${Math.round(z.threshold * maxHrUsed)} bpm`, duration: zoneDurations[i], percent: totalHrDuration > 0 ? (zoneDurations[i] / totalHrDuration) * 100 : 0 })), 
        maxHrUsed 
    };
};

const HeartRateZonePanel: React.FC<HeartRateZonePanelProps> = ({ track, userProfile, onZoneSelect }) => {
    const { zones, maxHrUsed } = useMemo(() => getHeartRateZoneInfo(track, userProfile), [track, userProfile]);

    const handleZoneClick = (zone: ZoneInfo) => {
        if (!onZoneSelect) return;
        
        const segments: (TrackPoint & { highlightColor: string })[][] = [];
        let currentSegment: (TrackPoint & { highlightColor: string })[] = [];

        for (let i = 0; i < track.points.length; i++) {
            const p = track.points[i];
            const ratio = (p.hr || 0) / maxHrUsed;
            const isInZone = ratio >= zone.min && ratio < zone.threshold;

            if (isInZone) {
                currentSegment.push({ ...p, highlightColor: zone.color });
            } else if (currentSegment.length > 0) {
                if (currentSegment.length > 1) segments.push(currentSegment);
                currentSegment = [];
            }
        }
        if (currentSegment.length > 1) segments.push(currentSegment);
        
        onZoneSelect(segments.length > 0 ? segments : null);
    };

    if (zones.length === 0) return null;

    return (
        <div className="space-y-2">
            <p className="text-[9px] text-slate-500 mb-2 italic">Basato su max {maxHrUsed} bpm. Tocca una zona per evidenziarla.</p>
            {zones.map(zone => (
                <div key={zone.name} onClick={() => handleZoneClick(zone)} className="grid grid-cols-12 gap-x-2 items-center text-[10px] cursor-pointer group hover:bg-slate-800/50 p-1 rounded transition-colors">
                    <div className="col-span-4"><p className="text-slate-300 truncate font-bold group-hover:text-white">{zone.name}</p><p className="text-[8px] text-slate-500 font-mono">{zone.range}</p></div>
                    <div className="col-span-5"><div className="w-full bg-slate-800 rounded-full h-2 shadow-inner"><div className="h-2 rounded-full transition-all duration-700" style={{ width: `${zone.percent}%`, backgroundColor: zone.color }}></div></div></div>
                    <div className="col-span-3 text-right"><p className="font-mono text-slate-200 font-bold">{formatDuration(zone.duration)}</p><p className="text-[8px] text-slate-500 font-black">{zone.percent.toFixed(1)}%</p></div>
                </div>
            ))}
            <button onClick={() => onZoneSelect?.(null)} className="w-full mt-2 text-[8px] font-black text-slate-600 uppercase hover:text-slate-400 py-1">Resetta Mappa</button>
        </div>
    );
};

export default HeartRateZonePanel;
