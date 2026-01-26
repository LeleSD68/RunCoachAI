
import React, { useState, useMemo, useEffect } from 'react';
import { Track, PlannedWorkout, UserProfile, ActivityType } from '../types';
import TrackPreview from './TrackPreview';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';
import FormattedAnalysis from './FormattedAnalysis';
import RatingStars from './RatingStars';
import { loadChatFromDB } from '../services/dbService';
import WorkoutRescheduleModal from './WorkoutRescheduleModal';

interface DiaryViewProps {
    tracks: Track[];
    plannedWorkouts?: PlannedWorkout[];
    userProfile: UserProfile;
    onClose: () => void;
    onSelectTrack: (trackId: string) => void;
    onDeletePlannedWorkout?: (id: string) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    onUpdatePlannedWorkout?: (workout: PlannedWorkout) => void; 
    onMassUpdatePlannedWorkouts?: (workouts: PlannedWorkout[]) => void;
    onOpenTrackChat?: (trackId: string) => void;
    onOpenGlobalChat?: () => void;
    initialSelectedWorkoutId?: string | null;
    onCheckAiAccess?: () => boolean;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-purple-400">
        <path d="M8 1.75a.75.75 0 0 1 .75.75V4a.75.75 0 0 1-1.5 0V2.5a.75.75 0 0 1 .75-.75Z M3.25 3.25a.75.75 0 0 1 1.06 0L5.37 4.31a.75.75 0 0 1-1.06 1.06L3.25 4.31a.75.75 0 0 1 0-1.06ZM1.75 8a.75.75 0 0 1 .75-.75H4a.75.75 0 0 1 0 1.5H2.5a.75.75 0 0 1-.75-.75ZM4.31 10.63a.75.75 0 0 1 1.06 1.06L4.31 12.75a.75.75 0 0 1-1.06-1.06l1.06-1.06Z M8 12a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0V12.75a.75.75 0 0 1 .75-.75ZM10.63 11.69a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06ZM12 8a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0V8.75a.75.75 0 0 1 .75-.75ZM10.69 4.31a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Z M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
    </svg>
);

const ChatBubbleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-cyan-400">
        <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-400">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-purple-400">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-11-4.69v.447a3.5 3.5 0 0 0 1.025 2.475L8.293 10 8 10.293a1 1 0 0 0 0 1.414l1.06 1.06a1.5 1.5 0 0 1 .44 1.061v.363a6.5 6.5 0 0 1-5.5-2.259V10a6.5 6.5 0 0 1 12.5 0Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M9 2.5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM5.5 5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM14.5 13a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM12.5 16a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1Z" clipRule="evenodd" />
    </svg>
);

const GoogleCalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-400">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/>
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-cyan-400">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
);

const NoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.38 2H4.5Zm10 14.5h-9a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H11v3.5A1.5 1.5 0 0 0 12.5 7H16v9a.5.5 0 0 1-.5.5ZM16 5.5l-3.5-3.5V5.5H16Z" clipRule="evenodd" />
    </svg>
);

const NoteSmallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-amber-400">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.38 2H4.5Zm10 14.5h-9a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H11v3.5A1.5 1.5 0 0 0 12.5 7H16v9a.5.5 0 0 1-.5.5ZM16 5.5l-3.5-3.5V5.5H16Z" clipRule="evenodd" />
    </svg>
);

const RulerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 mr-1">
        <path fillRule="evenodd" d="M10 1c3.866 0 7 1.79 7 4s-3.134 4-7 4-7-1.79-7-4 3.134-4 7-4Zm5.694 8.13c.464-.264.91-.583 1.306-.952V10a6.996 6.996 0 0 1-6 6.92l.008-.007a.75.75 0 0 1-1.016 0l-.007.007A6.996 6.996 0 0 1 3 10V8.178c.396.37.842.688 1.306.953C5.838 10.006 7.854 10.5 10 10.5s4.162-.494 5.694-1.37Z" clipRule="evenodd" />
    </svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 mr-1">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
    </svg>
);

const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 mr-1">
        <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.16-6.825v-.133L10 8.333l1.53 1.611v.133a20.758 20.758 0 0 1-1.16 6.825l-.019.01-.005.003h-.693Zm-7.147-6.25c-.794 3.967 2.056 6.661 6.969 6.952l.525-5.592-4.332-4.577a3.99 3.99 0 0 0-3.162 3.217ZM17.494 10.665c-.794-3.967-4.32-6.075-7.494-6.333v6.952l-2.73-2.872c.794-3.967 4.32-6.075 7.494-6.333a3.99 3.99 0 0 1 2.73 8.586Z" />
        <path d="M10 2a6 6 0 0 0-4.472 10.002L10 16.69l4.472-4.688A6 6 0 0 0 10 2Z" />
    </svg>
);

const extractStatsFromDescription = (description: string) => {
    // Regex looking for the specific format used by AiTrainingCoachPanel
    const durationMatch = description.match(/- ⏱️ Durata: (.*?)(\n|$)/);
    const distanceMatch = description.match(/- 📏 Distanza: (.*?)(\n|$)/);
    const hrMatch = description.match(/- ❤️ FC Target: (.*?)(\n|$)/);

    if (!durationMatch && !distanceMatch && !hrMatch) return null;

    return {
        duration: durationMatch ? durationMatch[1].trim() : null,
        distance: distanceMatch ? distanceMatch[1].trim() : null,
        hr: hrMatch ? hrMatch[1].trim() : null
    };
};

const DiaryView: React.FC<DiaryViewProps> = ({ tracks, plannedWorkouts = [], userProfile, onClose, onSelectTrack, onDeletePlannedWorkout, onAddPlannedWorkout, onUpdatePlannedWorkout, onMassUpdatePlannedWorkouts, onOpenTrackChat, onOpenGlobalChat, initialSelectedWorkoutId, onCheckAiAccess }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(initialSelectedWorkoutId || null);
    const [showAiCoach, setShowAiCoach] = useState(false);
    const [globalChatDates, setGlobalChatDates] = useState<Set<string>>(new Set());
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    
    // Day Menu & Creation State
    const [selectedDateForMenu, setSelectedDateForMenu] = useState<Date | null>(null);
    const [creationMode, setCreationMode] = useState<'workout' | 'note' | 'ai-coach' | null>(null);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemType, setNewItemType] = useState<ActivityType>('Lento');
    const [newItemDesc, setNewItemDesc] = useState('');

    // Load global chat history to identify dates with messages
    useEffect(() => {
        const fetchGlobalChatDates = async () => {
            const messages = await loadChatFromDB('global-coach');
            if (messages) {
                const dates = new Set<string>();
                messages.forEach(msg => {
                    if (msg.timestamp) {
                        dates.add(new Date(msg.timestamp).toDateString());
                    }
                });
                setGlobalChatDates(dates);
            }
        };
        fetchGlobalChatDates();
    }, []);

    // Effect to update selected workout if prop changes
    useEffect(() => {
        if (initialSelectedWorkoutId) {
            setSelectedWorkoutId(initialSelectedWorkoutId);
            // Optionally, switch to the month of the workout
            const workout = plannedWorkouts.find(w => w.id === initialSelectedWorkoutId);
            if (workout) {
                setCurrentDate(new Date(workout.date));
            }
        }
    }, [initialSelectedWorkoutId, plannedWorkouts]);

    const { stats } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const filteredTracks = tracks.filter(t => {
            const tDate = t.points[0].time;
            return tDate.getFullYear() === year && tDate.getMonth() === month;
        });

        const totalDistance = filteredTracks.reduce((sum, t) => sum + t.distance, 0);
        const totalDuration = filteredTracks.reduce((sum, t) => sum + t.duration, 0);

        return { stats: { totalDistance, totalDuration, count: filteredTracks.length } };
    }, [tracks, currentDate]);

    const { calendarGrid, weeksCount } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; 

        const days = [];
        for (let i = 0; i < startDayIndex; i++) days.push(null);

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayTracks = tracks.filter(t => {
                const d = t.points[0].time;
                return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
            });
            const dayPlanned = plannedWorkouts.filter(w => {
                const d = new Date(w.date);
                return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
            });
            const hasGlobalChat = globalChatDates.has(date.toDateString());
            
            days.push({ day: i, tracks: dayTracks, planned: dayPlanned, date, hasGlobalChat });
        }

        const weeksCount = Math.ceil(days.length / 7);
        return { calendarGrid: days, weeksCount };
    }, [currentDate, tracks, plannedWorkouts, globalChatDates]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        setCurrentDate(newDate);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const currentSelectedWorkout = useMemo(() => 
        plannedWorkouts.find(w => w.id === selectedWorkoutId),
    [selectedWorkoutId, plannedWorkouts]);

    const workoutStats = useMemo(() => {
        if (!currentSelectedWorkout) return null;
        return extractStatsFromDescription(currentSelectedWorkout.description);
    }, [currentSelectedWorkout]);

    const handleRescheduleConfirm = (updatedWorkouts: PlannedWorkout | PlannedWorkout[]) => {
        if (Array.isArray(updatedWorkouts)) {
            if (onMassUpdatePlannedWorkouts) {
                onMassUpdatePlannedWorkouts(updatedWorkouts);
            }
        } else {
            if (onUpdatePlannedWorkout) {
                onUpdatePlannedWorkout(updatedWorkouts);
            }
        }
        setShowRescheduleModal(false);
    };

    const handleDayClick = (date: Date) => {
        setSelectedDateForMenu(date);
        setCreationMode(null); // Reset creation mode when opening menu
    };

    const handleCreateItem = () => {
        if (!selectedDateForMenu || !onAddPlannedWorkout) return;

        const newWorkout: PlannedWorkout = {
            id: `planned-manual-${Date.now()}-${Math.random()}`,
            title: newItemTitle || (creationMode === 'note' ? 'Nota del Giorno' : 'Nuovo Allenamento'),
            description: newItemDesc,
            date: selectedDateForMenu,
            activityType: creationMode === 'note' ? 'Nota' : newItemType,
            isAiSuggested: false
        };

        onAddPlannedWorkout(newWorkout);
        setSelectedDateForMenu(null);
        setCreationMode(null);
        setNewItemTitle('');
        setNewItemDesc('');
        setNewItemType('Lento');
    };

    const handleAddToGoogleCalendar = (workout: PlannedWorkout) => {
        const title = encodeURIComponent(workout.title);
        const details = encodeURIComponent(workout.description);
        const dateStr = new Date(workout.date).toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 8); // YYYYMMDD
        const start = `${dateStr}T090000`;
        const end = `${dateStr}T100000`;
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${start}/${end}`;
        window.open(url, '_blank');
    };

    return (
        <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden">
            <header className="flex items-center justify-between p-2 sm:p-4 bg-slate-800 border-b border-slate-700 shadow-md flex-shrink-0 z-10">
                <div className="flex items-center space-x-2 sm:space-x-6">
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-bold text-sm sm:text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
                        <span className="hidden sm:inline">Esci</span>
                    </button>
                    <div className="flex items-center bg-slate-700 rounded-lg p-0.5 sm:p-1">
                        <button onClick={() => changeMonth(-1)} className="p-1 sm:p-2 hover:bg-slate-600 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg></button>
                        <h2 className="text-sm sm:text-lg font-bold w-32 sm:w-40 text-center capitalize truncate">
                            {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-1 sm:p-2 hover:bg-slate-600 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg></button>
                    </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-6">
                    <button 
                        onClick={() => setShowAiCoach(!showAiCoach)}
                        className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase transition-all shadow-md active:scale-95 ${showAiCoach ? 'bg-cyan-700 border border-cyan-400 text-white' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-cyan-400'}`}
                    >
                        <SparklesIcon />
                        <span className="hidden sm:inline">{showAiCoach ? 'Nascondi Schede' : 'Fai scheda Allenamento'}</span>
                        <span className="sm:hidden">Scheda AI</span>
                    </button>

                    <div className="hidden lg:flex space-x-4 text-xs border-l border-slate-700 pl-6">
                        <div className="flex flex-col items-center">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Km Mese</span>
                            <span className="font-bold text-cyan-400 text-base">{stats.totalDistance.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider">Uscite</span>
                            <span className="font-bold text-white text-base">{stats.count}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* AI COACH PANEL - MOVED TO TOP */}
            {showAiCoach && (
                <div className="w-full shrink-0 border-b border-slate-700 bg-slate-800 flex flex-col animate-slide-down shadow-xl z-20 h-auto max-h-[45%]">
                    <header className="p-2 border-b border-slate-700 bg-slate-900 flex justify-between items-center flex-shrink-0">
                        <h3 className="font-bold text-cyan-400 uppercase tracking-widest text-sm flex items-center gap-2 px-2">
                            <SparklesIcon /> Prossime Sessioni Consigliate
                        </h3>
                        <button onClick={() => setShowAiCoach(false)} className="text-slate-500 hover:text-white transition-colors px-2">&times;</button>
                    </header>
                    <div className="flex-grow overflow-y-auto custom-scrollbar relative">
                        {/* Pass layoutMode="horizontal" to display cards in a row */}
                        <AiTrainingCoachPanel 
                            userProfile={userProfile} 
                            allHistory={tracks} 
                            onAddPlannedWorkout={onAddPlannedWorkout}
                            onDeletePlannedWorkout={onDeletePlannedWorkout}
                            plannedWorkouts={plannedWorkouts}
                            isCompact={false}
                            layoutMode="horizontal"
                            onCheckAiAccess={onCheckAiAccess}
                        />
                    </div>
                </div>
            )}

            <div className="flex-grow flex flex-col overflow-hidden relative">
                <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="p-1 sm:p-2 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate">{day}</div>
                        ))}
                    </div>

                    {/* Added padding-bottom 28 (112px) to ensure content is visibly scrolling above dock */}
                    <div className="flex-grow overflow-y-auto bg-slate-900 p-1 sm:p-2 pb-28 min-h-0 overscroll-y-contain">
                        <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full" style={{ minHeight: '100%', gridTemplateRows: `repeat(${weeksCount}, minmax(100px, 1fr))` }}>
                            {calendarGrid.map((cell, idx) => {
                                if (!cell) return <div key={`empty-${idx}`} className="bg-slate-800/20 rounded-lg min-h-[80px]"></div>;
                                const isCurrentDay = isToday(cell.date);
                                return (
                                    <div 
                                        key={cell.day} 
                                        onClick={() => handleDayClick(cell.date)}
                                        className={`rounded-lg p-1 sm:p-2 flex flex-col border relative transition-colors overflow-hidden cursor-pointer min-h-[80px] ${isCurrentDay ? 'bg-slate-800/90 border-cyan-500/50 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]' : 'bg-slate-800 border-slate-700/50 hover:bg-slate-700/50'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1 flex-shrink-0 pointer-events-none">
                                            <span className={`text-[10px] sm:text-sm font-bold ${isCurrentDay ? 'text-cyan-400' : 'text-slate-400'}`}>
                                                {cell.day}
                                            </span>
                                            {cell.hasGlobalChat && (
                                                <div className="bg-purple-900/50 p-0.5 rounded-full" title="Conversazione con Coach Generale">
                                                    <GlobeIcon />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1 flex-grow overflow-y-auto no-scrollbar pointer-events-none">
                                            {cell.planned.map(workout => {
                                                const isNote = workout.activityType === 'Nota';
                                                return (
                                                    <div 
                                                        key={workout.id}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedWorkoutId(workout.id); }}
                                                        className={`pointer-events-auto border border-dashed rounded p-1 sm:p-1.5 cursor-pointer transition-all flex flex-col gap-0.5 group ${
                                                            isNote 
                                                                ? 'bg-amber-900/30 border-amber-500/60 hover:bg-amber-900/50'
                                                                : workout.completedTrackId 
                                                                    ? 'bg-green-900/30 border-green-500/60 hover:bg-green-900/50' 
                                                                    : 'bg-purple-900/30 border-purple-500/60 hover:bg-purple-900/50 animate-pulse-slow'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            {isNote ? <NoteSmallIcon /> : (workout.completedTrackId ? <CheckIcon /> : <SparklesIcon />)}
                                                            <span className={`text-[8px] sm:text-[9px] font-bold uppercase truncate ${
                                                                isNote 
                                                                    ? 'text-amber-400' 
                                                                    : workout.completedTrackId ? 'text-green-400' : 'text-purple-400'
                                                            }`}>
                                                                {isNote ? 'NOTA' : (workout.completedTrackId ? 'FATTO' : 'AI')}
                                                            </span>
                                                        </div>
                                                        <div className="text-[8px] sm:text-[9px] font-medium text-slate-100 truncate leading-tight group-hover:text-white">{workout.title}</div>
                                                    </div>
                                                );
                                            })}

                                            {cell.tracks.map(track => (
                                                <div 
                                                    key={track.id} 
                                                    onClick={(e) => { e.stopPropagation(); onSelectTrack(track.id); }} 
                                                    className="pointer-events-auto group cursor-pointer bg-slate-700 rounded p-1 border border-transparent hover:border-cyan-500/50 hover:bg-slate-600 transition-all flex flex-col gap-0.5 shadow-sm"
                                                >
                                                    <div className="w-full h-8 sm:h-10 bg-slate-900 rounded overflow-hidden relative flex-shrink-0">
                                                        <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute bottom-0 right-0 bg-black/70 px-1 text-[8px] font-mono text-white rounded-tl">{track.distance.toFixed(1)}k</div>
                                                        <div className="absolute top-0 right-0 flex gap-0.5 p-0.5">
                                                            {track.hasChat && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); onOpenTrackChat?.(track.id); }}
                                                                    className="bg-cyan-900/80 p-0.5 rounded hover:bg-cyan-700 transition-colors"
                                                                    title="Chat Attività"
                                                                >
                                                                    <ChatBubbleIcon />
                                                                </button>
                                                            )}
                                                            {track.rating !== undefined && (
                                                                <div className="bg-black/50 rounded p-0.5">
                                                                    <RatingStars rating={track.rating} reason={track.ratingReason} size="xs" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {selectedDateForMenu && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedDateForMenu(null)}>
                    <div className={`bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full ${creationMode === 'ai-coach' ? 'max-w-xl h-[80vh]' : 'max-w-sm'} overflow-hidden flex flex-col transition-all duration-300`} onClick={e => e.stopPropagation()}>
                        <header className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                                {selectedDateForMenu.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <button onClick={() => setSelectedDateForMenu(null)} className="text-slate-500 hover:text-white">&times;</button>
                        </header>
                        
                        <div className="flex-grow overflow-y-auto custom-scrollbar relative">
                            {creationMode === 'ai-coach' ? (
                                <div className="p-4 h-full flex flex-col">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h4 className="text-cyan-400 font-bold text-sm uppercase">Generazione Scheda AI</h4>
                                        <button onClick={() => setCreationMode(null)} className="text-xs text-slate-400 hover:text-white underline">Indietro</button>
                                    </div>
                                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                                        <AiTrainingCoachPanel 
                                            userProfile={userProfile} 
                                            allHistory={tracks} 
                                            onAddPlannedWorkout={(w) => {
                                                onAddPlannedWorkout?.(w);
                                                setSelectedDateForMenu(null);
                                            }}
                                            plannedWorkouts={plannedWorkouts}
                                            isCompact={false}
                                            layoutMode="vertical"
                                            targetDate={selectedDateForMenu}
                                            onCheckAiAccess={onCheckAiAccess}
                                        />
                                    </div>
                                </div>
                            ) : !creationMode ? (
                                <div className="p-4 space-y-3">
                                    <button 
                                        onClick={() => setCreationMode('ai-coach')}
                                        className="w-full bg-cyan-600 hover:bg-cyan-500 hover:text-white text-white font-bold py-4 rounded-xl border border-cyan-500 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-cyan-900/20 active:scale-95"
                                    >
                                        <div className="p-1 bg-cyan-700 rounded-full group-hover:bg-transparent"><SparklesIcon /></div>
                                        Nuovo Allenamento (Coach AI)
                                    </button>
                                    <button 
                                        onClick={() => setCreationMode('note')}
                                        className="w-full bg-slate-700 hover:bg-amber-600 hover:text-white text-amber-400 font-bold py-3 rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <div className="p-1 bg-slate-800 rounded-full group-hover:bg-transparent"><NoteIcon /></div>
                                        Aggiungi Nota
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedDateForMenu(null); onOpenGlobalChat?.(); }}
                                        className="w-full bg-slate-700 hover:bg-purple-600 hover:text-white text-purple-400 font-bold py-3 rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <div className="p-1 bg-slate-800 rounded-full group-hover:bg-transparent"><GlobeIcon /></div>
                                        Chiedi al Coach AI
                                    </button>
                                    
                                    <div className="flex justify-center pt-2">
                                        <button 
                                            onClick={() => setCreationMode('workout')}
                                            className="text-xs text-slate-500 hover:text-slate-300 underline"
                                        >
                                            Inserimento Manuale
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Titolo</label>
                                        <input 
                                            type="text" 
                                            value={newItemTitle}
                                            onChange={(e) => setNewItemTitle(e.target.value)}
                                            placeholder={creationMode === 'note' ? 'Es. Dolore al ginocchio' : 'Es. Ripetute 400m'}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        />
                                    </div>
                                    
                                    {creationMode === 'workout' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo</label>
                                            <select 
                                                value={newItemType}
                                                onChange={(e) => setNewItemType(e.target.value as ActivityType)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                            >
                                                <option value="Lento">Lento</option>
                                                <option value="Fartlek">Fartlek</option>
                                                <option value="Ripetute">Ripetute</option>
                                                <option value="Lungo">Lungo</option>
                                                <option value="Gara">Gara</option>
                                                <option value="Altro">Altro</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Dettagli</label>
                                        <textarea 
                                            value={newItemDesc}
                                            onChange={(e) => setNewItemDesc(e.target.value)}
                                            rows={3}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm focus:border-cyan-500 outline-none resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => setCreationMode(null)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg font-bold text-sm">Indietro</button>
                                        <button onClick={handleCreateItem} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-500">Salva</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {currentSelectedWorkout && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedWorkoutId(null)}>
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <header className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2">
                                {currentSelectedWorkout.activityType === 'Nota' ? <NoteIcon /> : (currentSelectedWorkout.completedTrackId ? <CheckIcon /> : <SparklesIcon />)}
                                <h3 className={`font-bold uppercase tracking-widest text-sm ${
                                    currentSelectedWorkout.activityType === 'Nota' 
                                    ? 'text-amber-400' 
                                    : currentSelectedWorkout.completedTrackId ? 'text-green-400' : 'text-purple-400'
                                }`}>
                                    {currentSelectedWorkout.activityType === 'Nota' ? 'Nota Personale' : (currentSelectedWorkout.completedTrackId ? 'Allenamento Completato' : 'Programma Diario')}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleAddToGoogleCalendar(currentSelectedWorkout)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                    title="Salva su Google Calendar"
                                >
                                    <GoogleCalendarIcon />
                                </button>
                                <button onClick={() => setSelectedWorkoutId(null)} className="text-slate-500 hover:text-white text-xl ml-2">&times;</button>
                            </div>
                        </header>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-white mb-1 leading-tight">{currentSelectedWorkout.title}</h4>
                                    <p className="text-xs text-slate-400 font-mono uppercase">
                                        {new Date(currentSelectedWorkout.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                </div>
                                <span className={`border px-3 py-1 rounded text-[10px] font-bold uppercase shrink-0 ml-2 ${
                                    currentSelectedWorkout.activityType === 'Nota'
                                    ? 'bg-amber-600/20 text-amber-400 border-amber-500/30'
                                    : currentSelectedWorkout.completedTrackId 
                                        ? 'bg-green-600/20 text-green-400 border-green-500/30' 
                                        : 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                                }`}>{currentSelectedWorkout.activityType}</span>
                            </div>
                            
                            {workoutStats && currentSelectedWorkout.activityType !== 'Nota' && (
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50 text-center">
                                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-bold mb-1">
                                            <ClockIcon /> Durata
                                        </div>
                                        <div className="text-sm font-mono font-bold text-white">{workoutStats.duration}</div>
                                    </div>
                                    <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50 text-center">
                                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-bold mb-1">
                                            <RulerIcon /> Dist.
                                        </div>
                                        <div className="text-sm font-mono font-bold text-white">{workoutStats.distance}</div>
                                    </div>
                                    <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50 text-center">
                                        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-bold mb-1">
                                            <HeartIcon /> FC
                                        </div>
                                        <div className="text-sm font-mono font-bold text-red-300 truncate" title={workoutStats.hr || ''}>{workoutStats.hr || '-'}</div>
                                    </div>
                                </div>
                            )}
                            
                            <div className={`p-4 rounded-xl border mb-6 ${currentSelectedWorkout.activityType === 'Nota' ? 'bg-amber-900/10 border-amber-500/20' : 'bg-slate-700/30 border-slate-600/50'}`}>
                                <div className="text-sm text-slate-200 leading-relaxed italic prose prose-invert prose-sm">
                                    <FormattedAnalysis text={currentSelectedWorkout.description} />
                                </div>
                            </div>

                            {currentSelectedWorkout.completedTrackId ? (
                                <div className="mb-6 p-3 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center justify-between">
                                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Eseguito il {new Date(currentSelectedWorkout.date).toLocaleDateString()}</span>
                                    <button 
                                        onClick={() => {
                                            onSelectTrack(currentSelectedWorkout.completedTrackId!);
                                            setSelectedWorkoutId(null);
                                        }}
                                        className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded transition-colors"
                                    >
                                        Vedi Corsa
                                    </button>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <button 
                                        onClick={() => setShowRescheduleModal(true)}
                                        className="w-full bg-slate-700 hover:bg-cyan-600 hover:text-white text-cyan-400 font-bold py-2 rounded-lg border border-cyan-500/30 transition-colors text-xs flex items-center justify-center gap-2"
                                    >
                                        <SparklesIcon /> Sposta con AI
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3 mt-auto">
                                <button 
                                    onClick={() => {
                                        onDeletePlannedWorkout?.(currentSelectedWorkout.id);
                                        setSelectedWorkoutId(null);
                                    }}
                                    className="flex-1 py-3 bg-red-900/20 text-red-400 border border-red-900/30 rounded-lg hover:bg-red-900/40 transition-colors font-bold text-sm"
                                >
                                    Rimuovi
                                </button>
                                <button onClick={() => setSelectedWorkoutId(null)} className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-bold text-sm">
                                    Chiudi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRescheduleModal && currentSelectedWorkout && (
                <WorkoutRescheduleModal 
                    workout={currentSelectedWorkout}
                    allWorkouts={plannedWorkouts}
                    tracks={tracks}
                    userProfile={userProfile}
                    onConfirm={handleRescheduleConfirm}
                    onCancel={() => setShowRescheduleModal(false)}
                />
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.98); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s infinite ease-in-out;
                }
                @keyframes fade-in-right { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
                .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
                
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default DiaryView;
