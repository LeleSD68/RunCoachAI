
import React, { useState, useMemo, useEffect } from 'react';
import { Track, PlannedWorkout, UserProfile, ActivityType, CalendarWeather } from '../types';
import TrackPreview from './TrackPreview';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';
import FormattedAnalysis from './FormattedAnalysis';
import DiaryActionModal from './DiaryActionModal';
import { exportToGoogleCalendar, exportToAppleCalendar, exportRangeToIcal } from '../services/calendarExportService';
import { loadChatFromDB } from '../services/dbService';
import WorkoutRescheduleModal from './WorkoutRescheduleModal';
import { fetchMonthWeather } from '../services/weatherService';
import RatingStars from './RatingStars';
import WeatherDayPopup from './WeatherDayPopup';

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
    initialSelectedWorkoutId?: string | null;
    onCheckAiAccess?: (feature: 'workout' | 'analysis' | 'chat') => boolean;
    onStartWorkout?: (workout: PlannedWorkout) => void;
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

const HeadsetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75v5.25c0 .621.504 1.125 1.125 1.125h2.25c1.243 0 2.25-1.007 2.25-2.25v-4.5c0-1.243-1.007-2.25-2.25-2.25h-1.5v-2.625a7.5 7.5 0 0 1 15 0v2.625h-1.5c-1.243 0-2.25 1.007-2.25 2.25v4.5c0 1.243 1.007 2.25 2.25 2.25h2.25c.621 0 1.125-.504 1.125-1.125v-5.25c0-5.385-4.365-9.75-9.75-9.75Z" clipRule="evenodd" />
    </svg>
);

// Helper per formattare la data locale YYYY-MM-DD
const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const DiaryView: React.FC<DiaryViewProps> = ({ 
    tracks, 
    plannedWorkouts = [], 
    userProfile, 
    onClose, 
    onSelectTrack, 
    onDeletePlannedWorkout, 
    onAddPlannedWorkout, 
    onUpdatePlannedWorkout, 
    onMassUpdatePlannedWorkouts, 
    onOpenTrackChat, 
    initialSelectedWorkoutId,
    onCheckAiAccess,
    onStartWorkout
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(initialSelectedWorkoutId || null);
    const [showAiCoach, setShowAiCoach] = useState(false);
    const [globalChatDates, setGlobalChatDates] = useState<Set<string>>(new Set());
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [weatherData, setWeatherData] = useState<Record<string, CalendarWeather>>({});
    
    // Action States
    const [actionDate, setActionDate] = useState<Date | null>(null);
    const [aiTargetDate, setAiTargetDate] = useState<Date | undefined>(undefined);
    const [selectedWeather, setSelectedWeather] = useState<{ weather: CalendarWeather, date: Date } | null>(null);

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

    // Weather Fetching Logic
    useEffect(() => {
        const fetchWeather = async () => {
            let lat = 41.9028; // Default: Roma
            let lon = 12.4964;
            let foundLocation = false;

            // 1. Try to get location from the last uploaded track (Preferred)
            const sortedTracks = [...tracks].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
            const lastTrack = sortedTracks[0];
            
            if (lastTrack && lastTrack.points.length > 0) {
                lat = lastTrack.points[0].lat;
                lon = lastTrack.points[0].lon;
                foundLocation = true;
            }

            // 2. If no tracks, try Browser Geolocation
            if (!foundLocation && 'geolocation' in navigator) {
                try {
                    const position: any = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                    });
                    lat = position.coords.latitude;
                    lon = position.coords.longitude;
                } catch (e) {
                    console.log("Geolocation fallback to Rome");
                }
            }

            const data = await fetchMonthWeather(currentDate.getFullYear(), currentDate.getMonth(), lat, lon);
            setWeatherData(data);
        };

        fetchWeather();
    }, [currentDate, tracks.length]); 

    // Effect to update selected workout if prop changes
    useEffect(() => {
        if (initialSelectedWorkoutId) {
            setSelectedWorkoutId(initialSelectedWorkoutId);
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
            const dateStr = formatDateKey(date);
            
            const dayTracks = tracks.filter(t => {
                const d = t.points[0].time;
                return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
            });
            const dayPlanned = plannedWorkouts.filter(w => {
                const d = new Date(w.date);
                return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
            });
            const hasGlobalChat = globalChatDates.has(date.toDateString());
            const weather = weatherData[dateStr];
            
            days.push({ day: i, tracks: dayTracks, planned: dayPlanned, date, hasGlobalChat, weather });
        }

        const weeksCount = Math.ceil(days.length / 7);
        return { calendarGrid: days, weeksCount };
    }, [currentDate, tracks, plannedWorkouts, globalChatDates, weatherData]);

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

    const handleAiRequest = (date: Date, mode: 'today' | 'weekly', days?: number[]) => {
        if (onCheckAiAccess && !onCheckAiAccess('workout')) return;
        setActionDate(null);
        setShowAiCoach(true);
        if (mode === 'today') {
            setAiTargetDate(date);
        } else {
            setAiTargetDate(undefined);
        }
    };

    return (
        <div className="absolute inset-0 z-[2000] bg-slate-900 flex flex-col font-sans text-white animate-fade-in overflow-hidden">
            {/* Header */}
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
                        onClick={() => {
                            if (onCheckAiAccess && !onCheckAiAccess('workout')) return;
                            setShowAiCoach(!showAiCoach);
                        }}
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

            {/* Grid & Content */}
            <div className="flex-grow flex flex-col overflow-hidden relative">
                <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="p-1 sm:p-2 text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate">{day}</div>
                        ))}
                    </div>

                    <div className="flex-grow overflow-hidden bg-slate-900 p-1 sm:p-2">
                        <div className="grid grid-cols-7 gap-1 sm:gap-2 h-full w-full" style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}>
                            {calendarGrid.map((cell, idx) => {
                                if (!cell) return <div key={`empty-${idx}`} className="bg-slate-800/20 rounded-lg"></div>;
                                const isCurrentDay = isToday(cell.date);
                                return (
                                    <div 
                                        key={cell.day} 
                                        onClick={() => setActionDate(cell.date)}
                                        className={`rounded-lg p-1 sm:p-2 flex flex-col border relative transition-colors overflow-hidden cursor-pointer ${isCurrentDay ? 'bg-slate-800/90 border-cyan-500/50 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]' : 'bg-slate-800 border-slate-700/50 hover:bg-slate-700/50'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1 flex-shrink-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full">
                                                <span className={`text-[10px] sm:text-sm font-bold ${isCurrentDay ? 'text-cyan-400' : 'text-slate-400'}`}>
                                                    {cell.day}
                                                </span>
                                                {cell.weather && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedWeather({ weather: cell.weather!, date: cell.date }); }}
                                                        className="flex items-center gap-1 bg-slate-700/50 hover:bg-slate-700 px-1 py-0.5 rounded cursor-pointer transition-colors w-fit"
                                                    >
                                                        <span className="text-xl sm:text-2xl leading-none" title="Vedi Previsioni Dettagliate">{cell.weather.icon}</span>
                                                        <span className="text-[8px] sm:text-[9px] font-mono text-slate-300 leading-none flex flex-col">
                                                            <span>{cell.weather.maxTemp}°</span>
                                                            <span className="text-slate-500">{cell.weather.minTemp}°</span>
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                            {cell.hasGlobalChat && (
                                                <div className="bg-purple-900/50 p-0.5 rounded-full absolute top-1 right-1" title="Conversazione con Coach Generale">
                                                    <GlobeIcon />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1 flex-grow overflow-y-auto no-scrollbar mt-1">
                                            {cell.planned.map(workout => (
                                                <div 
                                                    key={workout.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedWorkoutId(workout.id); }}
                                                    className={`border border-dashed rounded p-1 sm:p-1.5 cursor-pointer transition-all flex flex-col gap-0.5 group ${
                                                        workout.completedTrackId 
                                                            ? 'bg-green-900/30 border-green-500/60 hover:bg-green-900/50' 
                                                            : 'bg-purple-900/30 border-purple-500/60 hover:bg-purple-900/50 animate-pulse-slow'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {workout.completedTrackId ? <CheckIcon /> : <SparklesIcon />}
                                                        <span className={`text-[8px] sm:text-[9px] font-bold uppercase truncate ${workout.completedTrackId ? 'text-green-400' : 'text-purple-400'}`}>
                                                            {workout.completedTrackId ? 'FATTO' : 'AI'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[8px] sm:text-[9px] font-medium text-slate-100 truncate leading-tight group-hover:text-white">{workout.title}</div>
                                                </div>
                                            ))}

                                            {cell.tracks.map(track => (
                                                <div key={track.id} onClick={(e) => { e.stopPropagation(); onSelectTrack(track.id); }} className="group cursor-pointer bg-slate-700 rounded p-1 border border-transparent hover:border-cyan-500/50 hover:bg-slate-600 transition-all flex flex-col gap-0.5 shadow-sm">
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

                {showAiCoach && (
                    <div className="fixed inset-0 z-[5000] sm:z-20 sm:static sm:inset-auto w-full h-full sm:h-auto sm:max-h-[45%] sm:shrink-0 border-t border-slate-700 bg-slate-900 sm:bg-slate-800 flex flex-col animate-slide-up shadow-2xl pb-[env(safe-area-inset-bottom)]">
                        <header className="p-4 sm:p-3 border-b border-slate-700 bg-slate-900 flex justify-between items-center flex-shrink-0">
                            <h3 className="font-bold text-cyan-400 uppercase tracking-widest text-sm flex items-center gap-2">
                                <SparklesIcon /> 
                                <span className="sm:hidden">Coach AI - Generazione</span>
                                <span className="hidden sm:inline">Prossime Sessioni Consigliate</span>
                            </h3>
                            <button 
                                onClick={() => setShowAiCoach(false)} 
                                className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full sm:bg-transparent sm:p-0 sm:text-slate-500 sm:hover:text-white transition-colors"
                            >
                                <span className="sm:hidden"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72-3.72a.75.75 0 1 0 1.06-1.06L10 8.94 6.28 5.22Z" /></svg></span>
                                <span className="hidden sm:inline">&times;</span>
                            </button>
                        </header>
                        <div className="flex-grow overflow-hidden relative bg-slate-900 sm:bg-transparent">
                            <AiTrainingCoachPanel 
                                userProfile={userProfile} 
                                allHistory={tracks} 
                                onAddPlannedWorkout={onAddPlannedWorkout}
                                isCompact={false}
                                layoutMode="horizontal"
                                targetDate={aiTargetDate}
                                onCheckAiAccess={(type) => onCheckAiAccess ? onCheckAiAccess(type) : true}
                            />
                        </div>
                    </div>
                )}
            </div>

            {selectedWeather && (
                <WeatherDayPopup 
                    weather={selectedWeather.weather} 
                    date={selectedWeather.date} 
                    onClose={() => setSelectedWeather(null)} 
                />
            )}

            {actionDate && (
                <DiaryActionModal 
                    date={actionDate}
                    onClose={() => setActionDate(null)}
                    onAddEntry={(entry) => { onAddPlannedWorkout?.(entry); setActionDate(null); }}
                    onGenerateAi={handleAiRequest}
                />
            )}

            {currentSelectedWorkout && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedWorkoutId(null)}>
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <header className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                {currentSelectedWorkout.completedTrackId ? <CheckIcon /> : <SparklesIcon />}
                                <h3 className={`font-bold uppercase tracking-widest text-sm ${currentSelectedWorkout.completedTrackId ? 'text-green-400' : 'text-purple-400'}`}>
                                    {currentSelectedWorkout.completedTrackId ? 'Allenamento Completato' : 'Programma Diario AI'}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedWorkoutId(null)} className="text-slate-500 hover:text-white text-xl">&times;</button>
                        </header>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-white mb-1">{currentSelectedWorkout.title}</h4>
                                    <p className="text-xs text-slate-400 font-mono uppercase">
                                        {new Date(currentSelectedWorkout.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                </div>
                                <span className={`border px-3 py-1 rounded text-[10px] font-bold uppercase ${
                                    currentSelectedWorkout.completedTrackId 
                                    ? 'bg-green-600/20 text-green-400 border-green-500/30' 
                                    : 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                                }`}>{currentSelectedWorkout.activityType}</span>
                            </div>
                            
                            <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 mb-6">
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
                                <div className="space-y-3 mb-6">
                                    {/* NUOVO PULSANTE AVVIA COACH */}
                                    {onStartWorkout && (
                                        <button 
                                            onClick={() => {
                                                if (onCheckAiAccess && !onCheckAiAccess('chat')) return; // Chat/Voice uses credits too
                                                onStartWorkout(currentSelectedWorkout);
                                                setSelectedWorkoutId(null);
                                            }}
                                            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/10"
                                        >
                                            <HeadsetIcon />
                                            AVVIA COACH VOCALE
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => setShowRescheduleModal(true)}
                                        className="w-full bg-slate-700 hover:bg-slate-600 text-cyan-400 font-bold py-3 rounded-xl border border-cyan-500/30 transition-colors text-xs flex items-center justify-center gap-2"
                                    >
                                        <SparklesIcon /> Sposta con AI
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-slate-700">
                                <button 
                                    onClick={() => {
                                        onDeletePlannedWorkout?.(currentSelectedWorkout.id);
                                        setSelectedWorkoutId(null);
                                    }}
                                    className="flex-1 py-3 bg-red-900/10 text-red-400 border border-red-900/30 rounded-lg hover:bg-red-900/30 transition-colors font-bold text-sm"
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
