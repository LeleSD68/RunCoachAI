
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlannedWorkout, ActivityType } from '../types';

interface LiveCoachScreenProps {
    workout: PlannedWorkout | null; // Null means "Free Run"
    onFinish: (durationMs: number) => void;
    onExit: () => void;
}

interface TrainingPhase {
    name: string;
    duration: number; // Seconds (0 = open ended)
    type: 'warmup' | 'work' | 'rest' | 'cooldown';
}

const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const itVoice = voices.find(v => v.lang === 'it-IT' && v.name.includes('Google')) || voices.find(v => v.lang === 'it-IT');
    if (itVoice) utterance.voice = itVoice;

    window.speechSynthesis.speak(utterance);
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const LiveCoachScreen: React.FC<LiveCoachScreenProps> = ({ workout, onFinish, onExit }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [phaseTime, setPhaseTime] = useState(0);
    const [wakeLock, setWakeLock] = useState<any>(null);
    const [phases, setPhases] = useState<TrainingPhase[]>([]);

    const timerRef = useRef<number | null>(null);

    // 1. Initialize Workout Structure based on Diary Entry
    useEffect(() => {
        let generatedPhases: TrainingPhase[] = [];

        if (workout) {
            // Se c'è una struttura testuale semplice, usiamola
            // Altrimenti default standard
            // Esempio parsing semplice: cerchiamo di capire se è una gara o un lavoro specifico
            
            if (workout.activityType === 'Gara') {
                generatedPhases = [
                    { name: "Riscaldamento Gara", duration: 900, type: 'warmup' }, // 15 min
                    { name: `GARA: ${workout.title}`, duration: 0, type: 'work' },
                    { name: "Defaticamento", duration: 300, type: 'cooldown' }
                ];
            } else if (workout.activityType === 'Ripetute' || workout.activityType === 'Fartlek') {
                // Generico per lavori: Riscaldamento + Lavoro Centrale + Defaticamento
                generatedPhases = [
                    { name: "Riscaldamento", duration: 600, type: 'warmup' },
                    { name: workout.title, duration: 0, type: 'work' },
                    { name: "Defaticamento", duration: 300, type: 'cooldown' }
                ];
            } else {
                // Lenti, Lunghi, ecc.
                generatedPhases = [
                    { name: workout.title, duration: 0, type: 'work' }
                ];
            }
        } else {
            // Corsa Libera
            generatedPhases = [
                { name: "Corsa Libera", duration: 0, type: 'work' }
            ];
        }
        setPhases(generatedPhases);
    }, [workout]);

    // 2. Manage Wake Lock (Screen Always On)
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    const lock = await (navigator as any).wakeLock.request('screen');
                    setWakeLock(lock);
                } catch (err) {
                    console.warn(`Wake Lock failed: ${err}`);
                }
            }
        };

        requestWakeLock();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') requestWakeLock();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (wakeLock) wakeLock.release();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // 3. Timer Logic
    useEffect(() => {
        if (isRunning) {
            timerRef.current = window.setInterval(() => {
                setTotalTime(t => t + 1);
                setPhaseTime(t => t + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning]);

    // 4. Phase Monitoring & Audio Feedback
    useEffect(() => {
        if (!isRunning || phases.length === 0) return;

        const currentPhase = phases[currentPhaseIndex];
        
        // Initial Announcement
        if (phaseTime === 0) {
            // Announce Phase
            speak(`Fase ${currentPhaseIndex + 1}: ${currentPhase.name}.`);
            
            // Read instructions if it's the main work phase and we have a description
            if (currentPhase.type === 'work' && workout?.description && currentPhaseIndex === (phases.length > 1 ? 1 : 0)) {
                // Clean markdown for speech
                const cleanDesc = workout.description.replace(/\*\*/g, '').replace(/[\n\r]/g, '. ');
                // Delay slightly to let the phase name sink in
                setTimeout(() => speak(`Istruzioni: ${cleanDesc}`), 3000);
            }

            if (currentPhase.duration > 0) {
                setTimeout(() => speak(`Durata: ${Math.round(currentPhase.duration / 60)} minuti.`), 2500);
            }
        }

        // Phase Transition Logic
        if (currentPhase.duration > 0) {
            const remaining = currentPhase.duration - phaseTime;

            if (remaining === Math.floor(currentPhase.duration / 2) && remaining > 60) {
                speak("Sei a metà della fase.");
            }

            if (remaining === 30) speak("30 secondi al termine.");
            if (remaining <= 3 && remaining > 0) speak(`${remaining}`);

            if (remaining <= 0) {
                if (currentPhaseIndex < phases.length - 1) {
                    setCurrentPhaseIndex(i => i + 1);
                    setPhaseTime(0);
                } else {
                    setIsRunning(false);
                    speak("Allenamento terminato. Ottimo lavoro!");
                }
            }
        }
        
        // Periodic Feedback for open-ended phases (every 5 mins)
        if (currentPhase.duration === 0 && phaseTime > 0 && phaseTime % 300 === 0) {
            const mins = phaseTime / 60;
            speak(`${mins} minuti trascorsi.`);
        }

    }, [phaseTime, isRunning, phases, currentPhaseIndex, workout]);

    const handleToggle = () => {
        if (!isRunning) speak(totalTime === 0 ? "Iniziamo. Buon allenamento." : "Riprendo.");
        else speak("Pausa.");
        setIsRunning(!isRunning);
    };

    const handleNextPhase = () => {
        if (currentPhaseIndex < phases.length - 1) {
            speak("Passo alla fase successiva.");
            setCurrentPhaseIndex(i => i + 1);
            setPhaseTime(0);
        } else {
            speak("Non ci sono altre fasi.");
        }
    };

    const currentPhase = phases[currentPhaseIndex] || { name: '...', duration: 0, type: 'work' };
    const remainingTime = currentPhase.duration > 0 ? currentPhase.duration - phaseTime : null;
    const progressPercent = currentPhase.duration > 0 ? (phaseTime / currentPhase.duration) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[20000] bg-black text-white flex flex-col items-center justify-between font-sans overflow-hidden">
            {/* Top Bar: Total Time */}
            <div className="w-full p-6 flex justify-between items-start bg-gradient-to-b from-gray-900 to-transparent pt-safe-top">
                <div>
                    <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Totale</div>
                    <div className="text-3xl font-mono font-bold text-white">{formatTime(totalTime)}</div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Fase</div>
                    <div className="text-3xl font-mono font-bold text-cyan-400">{currentPhaseIndex + 1}<span className="text-sm text-gray-500">/{phases.length}</span></div>
                </div>
            </div>

            {/* Main Center: Current Phase */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-6">
                <h1 className="text-4xl sm:text-6xl font-black uppercase text-center mb-2 leading-tight tracking-tighter text-white drop-shadow-lg break-words max-w-full">
                    {currentPhase.name}
                </h1>
                
                {/* Description Text (Subtitles) */}
                {currentPhase.type === 'work' && workout?.description && (
                    <p className="text-sm text-slate-400 text-center max-w-md line-clamp-3 mb-4 italic">
                        "{workout.description}"
                    </p>
                )}
                
                <div className="my-4 relative">
                    <div className={`text-[80px] sm:text-[120px] font-mono font-bold leading-none tracking-tighter ${isRunning ? 'text-white' : 'text-gray-500'}`}>
                        {remainingTime !== null ? formatTime(remainingTime) : formatTime(phaseTime)}
                    </div>
                    {remainingTime === null && (
                        <div className="text-center text-xs text-gray-400 uppercase tracking-[0.3em] mt-2 font-bold">Tempo Trascorso</div>
                    )}
                </div>

                {/* Progress Bar for Timed Phases */}
                {currentPhase.duration > 0 && (
                    <div className="w-full max-w-sm h-3 bg-gray-800 rounded-full overflow-hidden mt-4 border border-gray-700">
                        <div 
                            className="h-full bg-cyan-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="w-full p-8 pb-12 bg-gray-900 border-t border-gray-800 flex flex-col gap-6">
                
                <div className="flex justify-center items-center gap-8">
                    {/* Skip Phase Button */}
                    <button 
                        onClick={handleNextPhase}
                        className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-white active:bg-gray-700 transition-colors border border-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                            <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.69v2.34L5.055 7.061Z" />
                        </svg>
                    </button>

                    {/* Main Play/Pause */}
                    <button 
                        onClick={handleToggle}
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-95 ${isRunning ? 'bg-amber-500 hover:bg-amber-400' : 'bg-green-600 hover:bg-green-500'}`}
                    >
                        {isRunning ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                        )}
                    </button>

                    {/* Stop/Finish Button */}
                    <button 
                        onClick={() => {
                            speak("Allenamento concluso.");
                            onFinish(totalTime * 1000);
                        }}
                        className="w-16 h-16 rounded-full bg-red-900/30 border border-red-500/50 text-red-500 flex items-center justify-center active:bg-red-900/50 transition-colors"
                    >
                        <div className="w-6 h-6 bg-current rounded-sm"></div>
                    </button>
                </div>

                <div className="text-center">
                    <button onClick={onExit} className="text-gray-500 text-xs uppercase font-bold tracking-widest hover:text-white transition-colors p-2">
                        Esci senza salvare
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveCoachScreen;
