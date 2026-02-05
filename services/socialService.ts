
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlannedWorkout } from '../types';

interface LiveCoachScreenProps {
    workout: PlannedWorkout | null; // Null means "Free Run"
    onFinish: (durationMs: number) => void;
    onExit: () => void;
}

interface TrainingPhase {
    name: string;
    instruction: string; // Cosa fare in questa fase
    targetValue: number; // Seconds OR Meters
    targetType: 'time' | 'distance'; 
    type: 'warmup' | 'work' | 'rest' | 'cooldown';
    repInfo?: { current: number, total: number }; // Per dire "Ripetuta 1 di 10"
}

// Haversine formula for distance between two coords (in meters)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
};

const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Cancella code precedenti per dare priorità al messaggio attuale
    window.speechSynthesis.cancel();
    
    // Pulizia testo per lettura naturale
    let cleanText = text.replace(/\*\*/g, '').replace(/[-]/g, ' ').trim();
    // Migliora lettura tempi (es. "5:30" -> "5 e 30")
    cleanText = cleanText.replace(/(\d{1,2}):(\d{2})/g, '$1 e $2');
    // Migliora lettura "x" (es "10x" -> "10 per")
    cleanText = cleanText.replace(/(\d+)x/gi, '$1 per');
    cleanText = cleanText.replace(/km/gi, 'chilometri');
    cleanText = cleanText.replace(/mt/gi, 'metri');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'it-IT';
    utterance.rate = 1.05; // Leggermente più veloce
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    // Cerca voce Google o fallback italiana
    const itVoice = voices.find(v => v.lang === 'it-IT' && v.name.includes('Google')) || voices.find(v => v.lang === 'it-IT');
    if (itVoice) utterance.voice = itVoice;
    
    window.speechSynthesis.speak(utterance);
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0 || pace > 30) return '--:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * PARSER LOGIC
 */
const parseWorkoutStructure = (description: string, title: string): TrainingPhase[] => {
    const fullText = (title + " " + description).toLowerCase();
    
    // Tentativo di parsing semplice per ripetute (es: 10x 400m rec 1:30)
    const repRegex = /(\d+)\s*(?:x|per|volte|ripetute)/i;
    const repMatch = fullText.match(repRegex);

    if (!repMatch) {
        // Fallback: Allenamento semplice o Gara
        const distMatch = fullText.match(/(\d+)(?:[.,]\d+)?\s*(k|km|m)/);
        let targetDistMeters = 0;
        if (distMatch) {
            const val = parseFloat(distMatch[1]);
            if (distMatch[2] === 'm') targetDistMeters = val;
            else targetDistMeters = val * 1000;
        }

        const phases: TrainingPhase[] = [];
        // Riscaldamento standard se non specificato
        phases.push({ name: "Riscaldamento", instruction: "Riscaldamento libero. Corri piano per attivare le gambe.", targetValue: 300, targetType: 'time', type: 'warmup' });
        
        // Fase centrale
        if (targetDistMeters > 0) {
            phases.push({ name: "Lavoro Centrale", instruction: `Obiettivo: ${targetDistMeters/1000}km. ${description}`, targetValue: targetDistMeters, targetType: 'distance', type: 'work' });
        } else {
            // Tempo o libero
            phases.push({ name: "Allenamento", instruction: description || "Corri a sensazione.", targetValue: 1200, targetType: 'time', type: 'work' });
        }

        // Defaticamento
        phases.push({ name: "Defaticamento", instruction: "Ottimo. Ora recupera con corsa lenta.", targetValue: 300, targetType: 'time', type: 'cooldown' });
        return phases;
    } 

    const count = parseInt(repMatch[1]);
    if (count < 2 || count > 50) return []; 

    const workRegex = /(?:da|di)?\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|'|”)/i;
    const textAfterReps = fullText.substring(fullText.indexOf(repMatch[0]) + repMatch[0].length);
    const workMatch = textAfterReps.match(workRegex);

    if (!workMatch) return [];

    const workValRaw = parseFloat(workMatch[1].replace(',', '.'));
    const workUnit = workMatch[2];
    
    let workTarget = 0;
    let workType: 'time' | 'distance' = 'time';

    if (workUnit.startsWith('m') && workUnit !== 'min') { 
        workTarget = workValRaw;
        workType = 'distance';
    } else if (workUnit === 'km') {
        workTarget = workValRaw * 1000;
        workType = 'distance';
    } else { 
        if (workUnit === 'secondi' || workUnit === '”') workTarget = workValRaw;
        else workTarget = workValRaw * 60; 
        workType = 'time';
    }

    const restRegex = /(?:recupero|rec|lento|piano|rest|off)\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|'|”)/i;
    const restMatch = textAfterReps.match(restRegex);

    let restTarget = 0;
    let restType: 'time' | 'distance' = 'time';

    if (restMatch) {
        const restValRaw = parseFloat(restMatch[1].replace(',', '.'));
        const restUnit = restMatch[2];
        if (restUnit.startsWith('m') && restUnit !== 'min') {
            restTarget = restValRaw;
            restType = 'distance';
        } else if (restUnit === 'km') {
            restTarget = restValRaw * 1000;
            restType = 'distance';
        } else {
            if (restUnit === 'secondi' || restUnit === '”') restTarget = restValRaw;
            else restTarget = restValRaw * 60;
            restType = 'time';
        }
    } else {
        restTarget = 120; // Default 2 min rest
        restType = 'time';
    }

    const phases: TrainingPhase[] = [];
    
    phases.push({ 
        name: "Riscaldamento", 
        instruction: "Iniziamo. Corri piano per 10 minuti di riscaldamento.", 
        targetValue: 600, 
        targetType: 'time', 
        type: 'warmup' 
    });

    for (let i = 1; i <= count; i++) {
        phases.push({
            name: `Ripetuta ${i}`,
            instruction: `Vai! ${workType === 'time' ? formatTime(workTarget) : (workTarget < 1000 ? workTarget+' metri' : (workTarget/1000).toFixed(2)+' km')} ritmo forte!`,
            targetValue: workTarget,
            targetType: workType,
            type: 'work',
            repInfo: { current: i, total: count }
        });

        if (restTarget > 0 && i < count) { // No rest after last rep, go to cooldown
            phases.push({
                name: `Recupero ${i}`,
                instruction: `Piano. Recupera per ${restType === 'time' ? formatTime(restTarget) : (restTarget).toFixed(0)+'m'}.`,
                targetValue: restTarget,
                targetType: restType,
                type: 'rest',
                repInfo: { current: i, total: count }
            });
        }
    }

    phases.push({ 
        name: "Defaticamento", 
        instruction: "Lavoro finito! Corsetta sciolta finale.", 
        targetValue: 300, 
        targetType: 'time', 
        type: 'cooldown' 
    });

    return phases;
};

const LiveCoachScreen: React.FC<LiveCoachScreenProps> = ({ workout, onFinish, onExit }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [phases, setPhases] = useState<TrainingPhase[]>([]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    
    const [totalTime, setTotalTime] = useState(0);
    const [totalDistance, setTotalDistance] = useState(0); 
    const [phaseValue, setPhaseValue] = useState(0); // Progress in current phase (sec or meters)
    const [currentPace, setCurrentPace] = useState(0); 
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null); 

    const watchIdRef = useRef<number | null>(null);
    const lastPosRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
    const paceBufferRef = useRef<number[]>([]); 
    const wakeLock = useRef<any>(null);
    const timerRef = useRef<number | null>(null);
    const lastFeedbackTimeRef = useRef<number>(0);

    // Initial Setup
    useEffect(() => {
        let generatedPhases: TrainingPhase[] = [];
        if (workout) {
            generatedPhases = parseWorkoutStructure(workout.description, workout.title);
        } else {
            generatedPhases = [{ name: "Corsa Libera", instruction: "Allenamento libero. Divertiti!", targetValue: 3600, targetType: 'time', type: 'work' }];
        }
        setPhases(generatedPhases);
    }, [workout]);

    // Wake Lock
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLock.current = await (navigator as any).wakeLock.request('screen');
                } catch (err) { console.warn("Wake Lock failed", err); }
            }
        };
        requestWakeLock();
        return () => { if (wakeLock.current) wakeLock.current.release(); };
    }, []);

    // Phase Change Announcer
    useEffect(() => {
        if (!isRunning || phases.length === 0) return;
        const phase = phases[currentPhaseIndex];
        speak(`${phase.name}. ${phase.instruction}`);
    }, [currentPhaseIndex, isRunning, phases]);

    // Timer Loop
    useEffect(() => {
        if (isRunning) {
            timerRef.current = window.setInterval(() => {
                setTotalTime(t => t + 1);
                
                const currentPhase = phases[currentPhaseIndex];
                if (currentPhase && currentPhase.targetType === 'time') {
                    setPhaseValue(v => {
                        const newVal = v + 1;
                        if (newVal >= currentPhase.targetValue) {
                            handleNextPhaseAuto();
                            return 0;
                        }
                        return newVal;
                    });
                }
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, phases, currentPhaseIndex]);

    // GPS & Pace Logic
    useEffect(() => {
        if (!isRunning) {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            return;
        }

        if ('geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    const timestamp = position.timestamp;
                    setGpsAccuracy(accuracy);

                    if (accuracy > 35) return; // Ignore poor signal

                    if (!lastPosRef.current) {
                        lastPosRef.current = { lat: latitude, lon: longitude, time: timestamp };
                        return;
                    }

                    const distDelta = calculateDistance(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
                    const timeDelta = (timestamp - lastPosRef.current.time) / 1000; // seconds

                    // Filter unrealistic jumps (> 30km/h => ~8.3 m/s)
                    if (timeDelta > 0 && (distDelta / timeDelta) > 8.3) return; 

                    if (distDelta > 3) { 
                        setTotalDistance(d => d + distDelta);
                        
                        const currentPhase = phases[currentPhaseIndex];
                        if (currentPhase && currentPhase.targetType === 'distance') {
                            setPhaseValue(v => {
                                const newVal = v + distDelta;
                                if (newVal >= currentPhase.targetValue) {
                                    handleNextPhaseAuto();
                                    return 0;
                                }
                                return newVal;
                            });
                        }

                        // Pace Calculation (min/km)
                        const rawPace = (timeDelta / 60) / (distDelta / 1000); 
                        paceBufferRef.current.push(rawPace);
                        if (paceBufferRef.current.length > 5) paceBufferRef.current.shift();
                        
                        const avgPace = paceBufferRef.current.reduce((a,b) => a+b, 0) / paceBufferRef.current.length;
                        setCurrentPace(avgPace);

                        // LIVE COACH FEEDBACK (Every ~30s)
                        const now = Date.now();
                        if (now - lastFeedbackTimeRef.current > 30000 && avgPace > 0 && avgPace < 20) {
                            provideFeedback(currentPhase, avgPace);
                            lastFeedbackTimeRef.current = now;
                        }

                        lastPosRef.current = { lat: latitude, lon: longitude, time: timestamp };
                    }
                },
                (error) => console.warn("GPS Error", error),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        }

        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [isRunning, phases, currentPhaseIndex]);

    const provideFeedback = (phase: TrainingPhase, pace: number) => {
        if (phase.type === 'work') {
            if (pace > 6.5) { // Arbitrary slow threshold
                speak("Sei un po' lento. Prova ad accelerare.");
            } else if (pace < 4.0) {
                speak("Stai volando! Ottimo ritmo.");
            } else {
                speak("Ritmo costante. Continua così.");
            }
        } else if (phase.type === 'rest') {
            if (pace < 6.0) {
                speak("Rallenta, è recupero. Respira.");
            }
        }
    };

    const handleNextPhaseAuto = () => {
        if (currentPhaseIndex < phases.length - 1) {
            setCurrentPhaseIndex(i => i + 1);
            setPhaseValue(0);
            paceBufferRef.current = [];
        } else {
            setIsRunning(false);
            speak("Allenamento completato! Sei stato grande.");
        }
    };

    const handleToggle = () => {
        if (!isRunning) {
            if (totalTime === 0) {
                speak("Iniziamo.");
            } else {
                speak("Riprendo.");
            }
        } else {
            speak("Pausa.");
        }
        setIsRunning(!isRunning);
    };

    const handlePrevPhase = () => {
        if (currentPhaseIndex > 0) {
            const prevPhase = phases[currentPhaseIndex - 1];
            speak(`Torno indietro: ${prevPhase.name}.`);
            setCurrentPhaseIndex(i => i - 1);
            setPhaseValue(0);
            paceBufferRef.current = [];
        }
    };

    const handleNextPhase = () => {
        if (currentPhaseIndex < phases.length - 1) {
            const nextPhase = phases[currentPhaseIndex + 1];
            speak(`Passo avanti: ${nextPhase.name}.`);
            setCurrentPhaseIndex(i => i + 1);
            setPhaseValue(0);
            paceBufferRef.current = [];
        } else {
            speak("Ultima fase.");
        }
    };

    const currentPhase: TrainingPhase = phases[currentPhaseIndex] || { 
        name: 'Caricamento...', 
        targetValue: 0, 
        targetType: 'time', 
        instruction: '', 
        type: 'work' 
    };
    
    const remaining = Math.max(0, currentPhase.targetValue - phaseValue);
    const progressPercent = currentPhase.targetValue > 0 ? Math.min(100, (phaseValue / currentPhase.targetValue) * 100) : 0;

    const getPhaseColor = (type: string) => {
        switch(type) {
            case 'warmup': return 'text-amber-400';
            case 'work': return 'text-green-400';
            case 'rest': return 'text-blue-400';
            case 'cooldown': return 'text-purple-400';
            default: return 'text-white';
        }
    };

    const getBarColor = (type: string) => {
        switch(type) {
            case 'warmup': return 'bg-amber-500';
            case 'work': return 'bg-green-500';
            case 'rest': return 'bg-blue-500';
            case 'cooldown': return 'bg-purple-500';
            default: return 'bg-cyan-500';
        }
    };

    return (
        <div className="fixed inset-0 z-[20000] bg-black text-white flex flex-col font-sans h-[100dvh] overflow-hidden">
            {/* Top Bar: Totali (Always visible) */}
            <div className="w-full p-4 flex justify-between items-start bg-slate-900 border-b border-slate-800 shrink-0 safe-area-pt">
                <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Totale Trascorso</div>
                    <div className="text-2xl font-mono font-bold text-white">{formatTime(totalTime)}</div>
                    <div className="text-xs text-slate-500 font-mono">{(totalDistance/1000).toFixed(2)} km</div>
                </div>
                
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">GPS</span>
                        <div className={`w-2 h-2 rounded-full ${gpsAccuracy && gpsAccuracy < 20 ? 'bg-green-500' : gpsAccuracy ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></div>
                    </div>
                    {gpsAccuracy && <span className="text-[9px] text-slate-600">±{Math.round(gpsAccuracy)}m</span>}
                </div>
            </div>

            {/* Main Center Area (Flexible height to prevent overflow) */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-4 relative min-h-0 overflow-hidden space-y-4">
                
                {/* Rep Info Badge */}
                {currentPhase.repInfo && (
                    <div className="bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 text-xs font-black uppercase tracking-widest text-slate-300 shrink-0">
                        Ripetuta {currentPhase.repInfo.current} / {currentPhase.repInfo.total}
                    </div>
                )}

                {/* Phase Title & Instruction */}
                <div className="text-center w-full shrink-0">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Fase {currentPhaseIndex + 1}/{phases.length}</h2>
                    <h1 className={`text-3xl sm:text-4xl font-black uppercase leading-tight truncate ${getPhaseColor(currentPhase.type)}`}>
                        {currentPhase.name}
                    </h1>
                    <div className="bg-slate-900/50 p-2 rounded-xl mt-2 border border-slate-800 mx-auto max-w-sm">
                        <p className="text-xs sm:text-sm text-slate-200 font-medium italic line-clamp-2">"{currentPhase.instruction}"</p>
                    </div>
                </div>

                {/* THE BIG NUMBER (Countdown/Distance) */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`font-mono font-bold leading-none tracking-tighter transition-all duration-300 ${isRunning ? 'text-white' : 'text-slate-600'} text-7xl sm:text-9xl`}>
                        {currentPhase.targetType === 'distance' 
                            ? (remaining > 1000 ? (remaining/1000).toFixed(2) : Math.round(remaining))
                            : formatTime(remaining > 0 ? remaining : phaseValue)
                        }
                    </div>
                    <div className={`text-xs font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-current ${getPhaseColor(currentPhase.type)} opacity-80`}>
                        {currentPhase.targetType === 'distance' 
                            ? (remaining > 1000 ? 'KM RIMANENTI' : 'METRI RIMANENTI') 
                            : (remaining > 0 ? '- TEMPO RIMANENTE' : 'TEMPO TRASCORSO')
                        }
                    </div>
                </div>

                {/* Secondary Metric: Pace */}
                <div className="text-center shrink-0">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-200">{formatPace(currentPace)}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passo (min/km)</div>
                </div>

            </div>

            {/* Progress Bar (Attached to bottom controls) */}
            {currentPhase.targetValue > 0 && (
                <div className="w-full h-2 bg-slate-800 shrink-0 mt-auto">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(255,255,255,0.2)] ${getBarColor(currentPhase.type)}`}
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            )}

            {/* Controls (Fixed Bottom) */}
            <div className="w-full p-6 pb-8 bg-slate-900 border-t border-slate-800 flex flex-col gap-4 shrink-0 safe-area-pb">
                <div className="flex justify-center items-center gap-4 sm:gap-8">
                    {/* Previous Phase */}
                    <button 
                        onClick={handlePrevPhase}
                        disabled={currentPhaseIndex <= 0}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M7.28 7.72a.75.75 0 0 1 0 1.06l-2.47 2.47H21a.75.75 0 0 1 0 1.5H4.81l2.47 2.47a.75.75 0 1 1-1.06 1.06l-3.75-3.75a.75.75 0 0 1 0-1.06l3.75-3.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                    </button>

                    {/* Toggle Play/Pause */}
                    <button 
                        onClick={handleToggle}
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-95 ${isRunning ? 'bg-amber-500 hover:bg-amber-400' : 'bg-green-600 hover:bg-green-500'}`}
                    >
                        {isRunning ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 sm:w-12 sm:h-12"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 sm:w-12 sm:h-12 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                        )}
                    </button>

                    {/* Next Phase */}
                    <button 
                        onClick={handleNextPhase}
                        disabled={currentPhaseIndex >= phases.length - 1}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M16.72 7.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 1 1-1.06-1.06l2.47-2.47H3a.75.75 0 0 1 0-1.5h16.19l-2.47-2.47a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                    </button>
                </div>

                <div className="flex justify-center mt-2">
                    <button 
                        onClick={() => {
                            if(confirm("Terminare l'allenamento?")) {
                                speak("Allenamento concluso.");
                                onFinish(totalTime * 1000);
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-2 rounded-full bg-red-900/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-900/40 transition-colors active:scale-95"
                    >
                        <div className="w-2.5 h-2.5 bg-current rounded-sm"></div>
                        Termina Sessione
                    </button>
                </div>

                <div className="text-center mt-2">
                    <button onClick={onExit} className="text-slate-600 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors">Esci senza salvare</button>
                </div>
            </div>
        </div>
    );
};

export default LiveCoachScreen;
