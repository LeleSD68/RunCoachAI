
import React from 'react';
import { PlannedWorkout } from '../types';

interface WorkoutConfirmationModalProps {
    workout: PlannedWorkout;
    onConfirm: () => void;
    onCancel: () => void;
    onStartLiveCoach?: () => void; // New optional prop
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-12 h-12 text-cyan-400 mb-4">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75ZM10 9.75a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const HeadsetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75v5.25c0 .621.504 1.125 1.125 1.125h2.25c1.243 0 2.25-1.007 2.25-2.25v-4.5c0-1.243-1.007-2.25-2.25-2.25h-1.5v-2.625a7.5 7.5 0 0 1 15 0v2.625h-1.5c-1.243 0-2.25 1.007-2.25 2.25v4.5c0 1.243 1.007 2.25 2.25 2.25h2.25c.621 0 1.125-.504 1.125-1.125v-5.25c0-5.385-4.365-9.75-9.75-9.75Z" clipRule="evenodd" />
    </svg>
);

const WorkoutConfirmationModal: React.FC<WorkoutConfirmationModalProps> = ({ workout, onConfirm, onCancel, onStartLiveCoach }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                <div className="flex justify-center">
                    <CalendarIcon />
                </div>
                
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Allenamento Trovato</h3>
                <p className="text-slate-400 text-sm mb-6">
                    Per la data di questa corsa c'è un allenamento pianificato nel diario.
                </p>

                <div className="bg-slate-700/50 rounded-xl p-4 mb-6 border border-slate-600 text-left">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-cyan-400 text-lg">{workout.title}</span>
                        <span className="text-[10px] uppercase font-bold bg-slate-800 px-2 py-1 rounded text-slate-300">{workout.activityType}</span>
                    </div>
                    <p className="text-slate-300 text-sm italic line-clamp-3">"{workout.description}"</p>
                </div>

                {onStartLiveCoach && (
                    <button 
                        onClick={onStartLiveCoach}
                        className="w-full mb-4 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    >
                        <HeadsetIcon /> Avvia Coach Vocale (Live)
                    </button>
                )}

                <div className="flex gap-3">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                        No, Corsa Libera
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
                    >
                        Abbina e Salva
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkoutConfirmationModal;
