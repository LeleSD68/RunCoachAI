
import React, { useState, useMemo, useEffect } from 'react';
import { Track, PlannedWorkout, UserProfile, ActivityType } from '../types';
import TrackPreview from './TrackPreview';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';
import FormattedAnalysis from './FormattedAnalysis';
import RatingStars from './RatingStars';
import { loadChatFromDB } from '../services/dbService';

interface DiaryViewProps {
    tracks: Track[];
    plannedWorkouts?: PlannedWorkout[];
    userProfile: UserProfile;
    onClose: () => void;
    onSelectTrack: (trackId: string) => void;
    onDeletePlannedWorkout?: (id: string) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    onCheckAiAccess?: () => boolean;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const DiaryView: React.FC<DiaryViewProps> = ({ tracks, plannedWorkouts = [], userProfile, onClose, onSelectTrack, onAddPlannedWorkout, onCheckAiAccess }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAiCoach, setShowAiCoach] = useState(false);

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startIdx = (firstDay.getDay() + 6) % 7; 
        const days = [];
        for (let i = 0; i < startIdx; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push({ 
                day: i, date,
                tracks: tracks.filter(t => new Date(t.points[0].time).toDateString() === date.toDateString()),
                planned: plannedWorkouts.filter(w => new Date(w.date).toDateString() === date.toDateString())
            });
        }
        return days;
    }, [currentDate, tracks, plannedWorkouts]);

    return (
        <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col animate-fade-in overflow-hidden">
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                <button onClick={onClose} className="text-slate-400 hover:text-white font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                    Torna Indietro
                </button>
                <div className="flex items-center gap-4 bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className="p-1 hover:bg-slate-600 rounded">◀</button>
                    <span className="font-bold uppercase text-xs w-32 text-center">{currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className="p-1 hover:bg-slate-600 rounded">▶</button>
                </div>
                <button onClick={() => setShowAiCoach(!showAiCoach)} className="bg-purple-600 px-4 py-2 rounded-lg font-bold text-xs uppercase">Coach AI</button>
            </header>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 bg-slate-950 pb-28">
                <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map(d => <div key={d} className="p-2 text-center text-[10px] font-black text-slate-500 uppercase">{d}</div>)}
                    {calendarGrid.map((cell, idx) => {
                        if (!cell) return <div key={idx} className="bg-slate-800/10 h-32 rounded"></div>;
                        const isToday = cell.date.toDateString() === new Date().toDateString();
                        return (
                            <div key={idx} className={`h-32 rounded-lg border p-1 relative overflow-hidden flex flex-col ${isToday ? 'bg-slate-800 border-cyan-500/50' : 'bg-slate-800/40 border-slate-700/50'}`}>
                                <span className={`text-[10px] font-bold ${isToday ? 'text-cyan-400' : 'text-slate-500'}`}>{cell.day}</span>
                                <div className="space-y-1 overflow-y-auto no-scrollbar flex-grow">
                                    {cell.planned.map(w => (
                                        <div key={w.id} className="text-[8px] bg-purple-900/40 text-purple-200 p-1 rounded border border-purple-500/30 truncate font-bold">AI: {w.title}</div>
                                    ))}
                                    {cell.tracks.map(t => (
                                        <div key={t.id} onClick={() => onSelectTrack(t.id)} className="cursor-pointer">
                                            <div className="h-8 w-full bg-slate-900 rounded overflow-hidden relative">
                                                <TrackPreview points={t.points} color={t.color} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20"></div>
                                                <span className="absolute bottom-0 right-0 text-[7px] bg-black/60 px-1 text-white">{t.distance.toFixed(1)}k</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {showAiCoach && (
                <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-slate-900 border-t border-slate-700 z-[12000] p-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-cyan-400 uppercase">Scheda Allenamento AI</h3>
                        <button onClick={() => setShowAiCoach(false)} className="text-xl">&times;</button>
                    </div>
                    <AiTrainingCoachPanel userProfile={userProfile} allHistory={tracks} onAddPlannedWorkout={onAddPlannedWorkout} onCheckAiAccess={onCheckAiAccess} />
                </div>
            )}
        </div>
    );
};

export default DiaryView;
