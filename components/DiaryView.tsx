
import React, { useState, useMemo, useEffect } from 'react';
import { Track, PlannedWorkout, UserProfile, ActivityType } from '../types';
import TrackPreview from './TrackPreview';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';
import FormattedAnalysis from './FormattedAnalysis';
import DiaryActionModal from './DiaryActionModal';
import { exportToGoogleCalendar, exportToAppleCalendar, exportRangeToIcal } from '../services/calendarExportService';

interface DiaryViewProps {
    tracks: Track[];
    plannedWorkouts?: PlannedWorkout[];
    userProfile: UserProfile;
    onClose: () => void;
    onSelectTrack: (trackId: string) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    onUpdatePlannedWorkout?: (workout: PlannedWorkout) => void;
    onDeletePlannedWorkout?: (id: string) => void;
    onCheckAiAccess?: () => boolean;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const DiaryView: React.FC<DiaryViewProps> = ({ 
    tracks, plannedWorkouts = [], userProfile, onClose, onSelectTrack, 
    onAddPlannedWorkout, onUpdatePlannedWorkout, onDeletePlannedWorkout, onCheckAiAccess 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAiCoach, setShowAiCoach] = useState(false);
    const [selectedDateForAction, setSelectedDateForAction] = useState<Date | null>(null);
    const [targetDateForAi, setTargetDateForAi] = useState<Date | null>(null);
    const [aiGenMode, setAiGenMode] = useState<'today' | 'weekly'>('today');
    const [aiSelectedDays, setAiSelectedDays] = useState<number[]>([]);
    
    const [editingWorkout, setEditingWorkout] = useState<PlannedWorkout | null>(null);
    const [editMode, setEditMode] = useState(false);
    
    const [showSyncOptions, setShowSyncOptions] = useState(false);

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

    const handleDayClick = (date: Date) => {
        setSelectedDateForAction(date);
    };

    const handleEntryClick = (e: React.MouseEvent, entry: PlannedWorkout) => {
        e.stopPropagation();
        setEditingWorkout(entry);
        setEditMode(false);
    };

    const handleGenerateAiForDate = (date: Date, mode: 'today' | 'weekly', days?: number[]) => {
        setTargetDateForAi(date);
        setAiGenMode(mode);
        if (days) setAiSelectedDays(days);
        setShowAiCoach(true);
        setSelectedDateForAction(null);
    };

    const handleSaveEdit = () => {
        if (editingWorkout && onUpdatePlannedWorkout) {
            onUpdatePlannedWorkout(editingWorkout);
            setEditingWorkout(null);
        }
    };

    const handleMassSync = (range: 'today' | 'week' | 'month') => {
        let filtered: PlannedWorkout[] = [];
        const now = new Date();
        const todayStr = now.toDateString();

        if (range === 'today') {
            filtered = plannedWorkouts.filter(w => new Date(w.date).toDateString() === todayStr);
        } else if (range === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            startOfWeek.setHours(0,0,0,0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            filtered = plannedWorkouts.filter(w => {
                const d = new Date(w.date);
                return d >= startOfWeek && d < endOfWeek;
            });
        } else if (range === 'month') {
            const month = currentDate.getMonth();
            const year = currentDate.getFullYear();
            filtered = plannedWorkouts.filter(w => {
                const d = new Date(w.date);
                return d.getMonth() === month && d.getFullYear() === year;
            });
        }

        if (filtered.length === 0) {
            alert("Nessun impegno trovato nell'intervallo selezionato.");
            return;
        }

        if (userProfile.calendarPreference === 'google' && range === 'today' && filtered.length === 1) {
            exportToGoogleCalendar(filtered[0]);
        } else {
            exportRangeToIcal(filtered, `export_${range}_runcoach.ics`);
        }
        setShowSyncOptions(false);
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative pb-16 md:pb-0">
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0 shadow-lg z-10">
                <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                    <span className="text-lg">←</span> Indietro
                </button>
                <div className="flex items-center gap-4 bg-slate-700/50 p-1 rounded-lg border border-slate-600">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-600 rounded">◀</button>
                    <span className="font-black uppercase text-[11px] tracking-widest w-32 text-center text-white">{currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-600 rounded">▶</button>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowSyncOptions(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
                    >
                        <span>📅</span> Sync
                    </button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-950 flex flex-col">
                <div className="grid grid-cols-7 gap-px bg-slate-800 border-b border-slate-700 shrink-0">
                    {DAYS_OF_WEEK.map(d => (
                        <div key={d} className="p-2 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-900">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-slate-800 flex-grow">
                    {calendarGrid.map((cell, idx) => {
                        if (!cell) return <div key={idx} className="bg-slate-900/40 min-h-[100px]"></div>;
                        const isToday = cell.date.toDateString() === new Date().toDateString();
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleDayClick(cell.date)}
                                className={`min-h-[100px] p-1 relative overflow-hidden flex flex-col transition-colors cursor-pointer ${isToday ? 'bg-slate-800/90 border-cyan-500/50 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]' : 'bg-slate-800 border-slate-700/50 hover:bg-slate-700/50'}`}
                            >
                                <span className={`text-[10px] sm:text-sm font-black mb-1 px-1 ${isToday ? 'text-cyan-400' : 'text-slate-600'}`}>{cell.day}</span>
                                <div className="space-y-1 overflow-y-auto no-scrollbar flex-grow">
                                    {cell.planned.map(w => {
                                        const isNote = w.entryType === 'note';
                                        const isComm = w.entryType === 'commitment';
                                        return (
                                            <div 
                                                key={w.id} 
                                                onClick={(e) => handleEntryClick(e, w)}
                                                className={`text-[8px] p-1 rounded border truncate font-bold shadow-sm transition-transform active:scale-95 ${
                                                    isNote ? 'bg-cyan-900/30 text-cyan-300 border-cyan-500/20' : 
                                                    isComm ? 'bg-amber-900/30 text-amber-300 border-amber-500/20' : 
                                                    'bg-purple-900/30 text-purple-300 border-purple-500/20'
                                                }`}
                                            >
                                                {isNote ? '📝 ' : isComm ? '🕒 ' : 'AI: '}{w.title}
                                            </div>
                                        );
                                    })}
                                    {cell.tracks.map(t => (
                                        <div key={t.id} onClick={(e) => { e.stopPropagation(); onSelectTrack(t.id); }} className="group">
                                            <div className="h-10 w-full bg-slate-950 rounded border border-slate-800 overflow-hidden relative group-hover:border-cyan-500/50 transition-all">
                                                <TrackPreview points={t.points} color={t.color} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent"></div>
                                                <span className="absolute bottom-0 right-0 text-[7px] font-black bg-black/70 px-1 text-white rounded-tl">{t.distance.toFixed(1)}k</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sync Modal */}
            {showSyncOptions && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSyncOptions(false)}>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-white uppercase text-lg mb-4 text-center">Esporta Calendario</h3>
                        <div className="space-y-3">
                            <button onClick={() => handleMassSync('today')} className="w-full p-3 bg-slate-700 hover:bg-cyan-600 rounded-xl text-xs font-bold text-white uppercase transition-colors">Oggi</button>
                            <button onClick={() => handleMassSync('week')} className="w-full p-3 bg-slate-700 hover:bg-cyan-600 rounded-xl text-xs font-bold text-white uppercase transition-colors">Questa Settimana</button>
                            <button onClick={() => handleMassSync('month')} className="w-full p-3 bg-slate-700 hover:bg-cyan-600 rounded-xl text-xs font-bold text-white uppercase transition-colors">Tutto il Mese</button>
                        </div>
                        <button onClick={() => setShowSyncOptions(false)} className="w-full mt-4 p-2 text-slate-500 hover:text-white text-xs font-bold uppercase">Annulla</button>
                    </div>
                </div>
            )}
            
            {/* AI Coach Panel Modal */}
            {showAiCoach && (
                <div className="fixed bottom-0 left-0 right-0 h-[60vh] bg-slate-900 border-t border-slate-700 z-[12000] p-4 overflow-y-auto shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-slide-up flex flex-col">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="font-black text-cyan-400 uppercase tracking-widest text-sm flex items-center gap-2">
                            <span className="text-xl">🧠</span> Coach AI Training
                        </h3>
                        <button onClick={() => { setShowAiCoach(false); setTargetDateForAi(null); }} className="text-slate-400 hover:text-white p-2 text-2xl leading-none">&times;</button>
                    </div>
                    <div className="flex-grow">
                        <AiTrainingCoachPanel 
                            userProfile={userProfile} 
                            allHistory={tracks} 
                            onAddPlannedWorkout={onAddPlannedWorkout} 
                            onCheckAiAccess={onCheckAiAccess}
                            targetDate={targetDateForAi || undefined}
                            plannedWorkouts={plannedWorkouts}
                        />
                    </div>
                </div>
            )}

            {selectedDateForAction && (
                <DiaryActionModal 
                    date={selectedDateForAction} 
                    onClose={() => setSelectedDateForAction(null)} 
                    onAddEntry={onAddPlannedWorkout!} 
                    onGenerateAi={handleGenerateAiForDate} 
                />
            )}

            {/* Entry Edit/Delete Modal */}
            {editingWorkout && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditingWorkout(null)}>
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <header className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold uppercase tracking-widest text-xs text-white">Dettaglio Impegno</h3>
                            <button onClick={() => setEditingWorkout(null)} className="text-slate-500 hover:text-white">&times;</button>
                        </header>
                        <div className="p-6">
                            {editMode ? (
                                <div className="space-y-4">
                                    <input 
                                        type="text" 
                                        value={editingWorkout.title} 
                                        onChange={e => setEditingWorkout({...editingWorkout, title: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                                    />
                                    <textarea 
                                        value={editingWorkout.description} 
                                        onChange={e => setEditingWorkout({...editingWorkout, description: e.target.value})}
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm h-24"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded text-xs uppercase">Salva</button>
                                        <button onClick={() => setEditMode(false)} className="flex-1 bg-slate-700 text-white font-bold py-2 rounded text-xs uppercase">Annulla</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-lg font-bold text-white mb-2">{editingWorkout.title}</h4>
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4 max-h-40 overflow-y-auto">
                                        <div className="text-xs text-slate-300 leading-relaxed prose prose-invert">
                                            <FormattedAnalysis text={editingWorkout.description} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setEditMode(true)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold uppercase">Modifica</button>
                                        <button onClick={() => { onDeletePlannedWorkout?.(editingWorkout.id); setEditingWorkout(null); }} className="flex-1 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded text-xs font-bold uppercase">Elimina</button>
                                    </div>
                                    
                                    {editingWorkout.entryType === 'workout' && !editingWorkout.completedTrackId && (
                                        <button 
                                            onClick={() => {
                                                if (userProfile.calendarPreference === 'google') exportToGoogleCalendar(editingWorkout);
                                                else exportToAppleCalendar(editingWorkout);
                                            }}
                                            className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase"
                                        >
                                            Esporta al Calendario
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default DiaryView;
