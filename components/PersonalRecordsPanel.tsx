
import React, { useState, useEffect } from 'react';
import { Track } from '../types';
import { getStoredPRs, PR_DISTANCES, findBestTimeForDistance } from '../services/prService';

interface DistanceEffort {
    distanceName: string;
    distanceMeters: number;
    time: number;
    pbTime?: number;
    isNewPb: boolean;
}

const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let timeString = '';
    if (hours > 0) timeString += `${hours}:`;
    timeString += `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    return timeString;
};

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-amber-400 mr-1.5">
      <path fillRule="evenodd" d="M11.644 1.342a.875.875 0 0 1 .634 1.365l-1.32 2.292a.875.875 0 0 1-1.48-.854l1.32-2.292a.875.875 0 0 1 .787-.511Zm-7.288 0a.875.875 0 0 1 .787.511l1.32 2.292a.875.875 0 0 1-1.48.854L4.294 2.707a.875.875 0 0 1 .693-1.365ZM14.125 6a.875.875 0 0 1 .875.875v.236a.875.875 0 0 1-1.75 0v-.236a.875.875 0 0 1 .875-.875ZM1.875 6a.875.875 0 0 1 .875.875v.236a.875.875 0 0 1-1.75 0v-.236A.875.875 0 0 1 1.875 6ZM8 1.875a.875.875 0 0 1 .875.875v1.5a.875.875 0 0 1-1.75 0v-1.5A.875.875 0 0 1 8 1.875ZM3.185 8.137a.875.875 0 0 1 1.157-.592l.304.145a2.5 2.5 0 0 0 2.308 0l.92-.439a4.25 4.25 0 0 1 4.252 0l.92.439a2.5 2.5 0 0 0 2.308 0l.304-.145a.875.875 0 0 1 .565 1.745l-.304.145a4.25 4.25 0 0 1-3.922 0l-.92-.439a2.5 2.5 0 0 0-2.308 0l-.92.439a4.25 4.25 0 0 1-3.922 0l-.304-.145a.875.875 0 0 1-.592-1.157ZM8 10.125a2.625 2.625 0 1 0 0 5.25 2.625 2.625 0 0 0 0-5.25Z" clipRule="evenodd" />
    </svg>
);

const PersonalRecordsPanel: React.FC<{ track: Track }> = ({ track }) => {
    const [efforts, setEfforts] = useState<DistanceEffort[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const calculateEfforts = () => {
            setIsLoading(true);
            setTimeout(() => {
                const storedPRs = getStoredPRs();
                const foundEfforts: DistanceEffort[] = [];

                for (const dist of PR_DISTANCES) {
                    if (track.distance >= dist.meters / 1000) {
                        const time = findBestTimeForDistance(track.points, dist.meters / 1000);
                        if (time) {
                            const existingPR = storedPRs[dist.meters];
                            const isNewPb = !existingPR || time < existingPR.time;
                            foundEfforts.push({
                                distanceName: dist.name,
                                distanceMeters: dist.meters,
                                time,
                                pbTime: existingPR ? existingPR.time : undefined,
                                isNewPb
                            });
                        }
                    }
                }
                setEfforts(foundEfforts);
                setIsLoading(false);
            }, 50); // Unblock UI
        };
        calculateEfforts();
    }, [track]);

    if (isLoading) return null;
    if (efforts.length === 0) return null;

    return (
        <div className="mt-4">
            <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2 border-t border-slate-700 pt-4">Prestazioni Migliori (Questa Corsa)</h3>
             <div className="grid grid-cols-2 gap-2">
                {efforts.map(effort => (
                    <div 
                        key={effort.distanceMeters} 
                        className={`p-2 rounded border flex flex-col justify-center ${effort.isNewPb ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-700/30 border-slate-700'}`}
                    >
                        <div className="flex justify-between items-center mb-0.5">
                            <span className={`text-[10px] font-bold ${effort.isNewPb ? 'text-amber-400' : 'text-slate-400'}`}>{effort.distanceName}</span>
                            {effort.isNewPb && <TrophyIcon />}
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-mono font-black text-white">{formatTime(effort.time)}</span>
                            {!effort.isNewPb && effort.pbTime && (
                                <span className="text-[9px] text-slate-500 font-mono">(PB: {formatTime(effort.pbTime)})</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PersonalRecordsPanel;
