
import React from 'react';
import { PlannedWorkout } from '../types';

interface NextWorkoutWidgetProps {
    workout: PlannedWorkout;
    onClick?: () => void;
    forceCompact?: boolean;
}

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-purple-400">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const NextWorkoutWidget: React.FC<NextWorkoutWidgetProps> = ({ workout, onClick, forceCompact = false }) => {
    const isToday = new Date(workout.date).toDateString() === new Date().toDateString();
    
    if (forceCompact) {
        return (
            <button 
                onClick={onClick}
                className="bg-slate-900/90 backdrop-blur-md border border-purple-500/50 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl active:scale-95 transition-all"
            >
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[120px]">
                    {isToday ? 'OGGI: ' : ''}{workout.title}
                </span>
                <SparklesIcon />
            </button>
        );
    }

    return (
        <div 
            onClick={onClick}
            className="bg-slate-800/80 hover:bg-slate-700 border border-purple-500/30 rounded-xl p-3 cursor-pointer transition-all group shadow-lg"
        >
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Prossimo Allenamento</span>
                    {isToday && (
                        <span className="bg-green-500 text-white text-[8px] font-black px-1.5 rounded uppercase">Oggi</span>
                    )}
                </div>
                <SparklesIcon />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">{workout.title}</h4>
            <div className="mt-1 flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(workout.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}
                </span>
                <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 font-bold uppercase tracking-tighter">
                    {workout.activityType}
                </span>
            </div>
        </div>
    );
};

export default NextWorkoutWidget;
