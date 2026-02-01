
import React from 'react';
import { PlannedWorkout } from '../types';

interface ReminderNotificationProps {
    entries: PlannedWorkout[];
}

const ReminderNotification: React.FC<ReminderNotificationProps> = ({ entries }) => {
    if (entries.length === 0) return null;

    return (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[4800] flex flex-col gap-2 w-full max-w-xs animate-fade-in-down pointer-events-none">
            {entries.map(entry => (
                <div 
                    key={entry.id} 
                    className={`p-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl pointer-events-auto transition-all hover:scale-105 ${
                        entry.entryType === 'commitment' 
                        ? 'bg-amber-900/60 border-amber-500/50 text-amber-100' 
                        : 'bg-cyan-900/60 border-cyan-500/50 text-cyan-100'
                    }`}
                >
                    <span className="text-xl">{entry.entryType === 'commitment' ? '🕒' : '📝'}</span>
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {entry.entryType === 'commitment' ? 'Impegno Oggi' : 'Promemoria'}
                        </div>
                        <div className="text-xs font-bold truncate">{entry.title}</div>
                        {entry.entryType === 'commitment' && (
                            <div className="text-[9px] font-mono opacity-80">{entry.startTime} - {entry.endTime}</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ReminderNotification;
