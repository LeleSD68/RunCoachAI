
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
 * PARSER LOGIC: Tenta di estrarre la struttura delle ripetute dal testo.
 * Supporta formati come:
 * "10x 2 min veloci, 1 min lento"
 * "5x 1000m rec 3 min"
 * "8 ripetute da 400 metri con 200 metri recupero"
 */
const parseWorkoutStructure = (description: string, title: string): TrainingPhase[] => {
    const fullText = (title + " " + description).toLowerCase();
    
    // Regex per trovare pattern tipo "10x", "10 ripetute", "10 volte"
    // Cattura: Gruppo 1 = Numero ripetizioni
    const repRegex = /(\d+)\s*(?:x|per|volte|ripetute)/i;
    const repMatch = fullText.match(repRegex);

    if (!repMatch) return []; // Nessuna struttura ripetuta trovata

    const count = parseInt(repMatch[1]);
    if (count < 2 || count > 50) return []; // Sanity check

    // Regex per trovare durata/distanza fase attiva (Work)
    // Cerca dopo il numero di ripetizioni. Es: "2 min", "400m", "1km"
    // Cattura: Gruppo 1 = Valore, Gruppo 2 = Unità (m, km, min, ')
    const workRegex = /(?:da|di)?\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|'|”)/i;
    // Rimuoviamo la parte "Nx" per cercare il resto
    const textAfterReps = fullText.substring(fullText.indexOf(repMatch[0]) + repMatch[0].length);
    const workMatch = textAfterReps.match(workRegex);

    if (!workMatch) return [];

    const workValRaw = parseFloat(workMatch[1].replace(',', '.'));
    const workUnit = workMatch[2];
    
    let workTarget = 0;
    let workType: 'time' | 'distance' = 'time';

    if (workUnit.startsWith('m') && workUnit !== 'min') { // meters
        workTarget = workValRaw;
        workType = 'distance';
    } else if (workUnit === 'km') {
        workTarget = workValRaw * 1000;
        workType = 'distance';
    } else { // minutes or seconds
        if (workUnit === 'secondi' || workUnit === '”') workTarget = workValRaw;
        else workTarget = workValRaw * 60; // minutes
        workType = 'time';
    }

    // Regex per trovare recupero
    // Cerca parole chiave come "recupero", "lento", "piano", "rest", "off"
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
        // Default recovery if not found but reps detected
        restTarget = 120; // 2 min default
        restType = 'time';
    }

    // Costruzione Fasi Sequenziali
    const phases: TrainingPhase[] = [];
    
    // Riscaldamento Standard
    phases.push({ 
        name: "Riscaldamento", 
        instruction: "Corri piano per attivare i muscoli.", 
        targetValue: 600, // 10 min default
        targetType: 'time', 
        type: 'warmup' 
    });

    // Generazione Ripetute
    for (let i = 1; i <= count; i++) {
        // Fase Veloce
        phases.push({
            name: `Ripetuta ${i}`,
            instruction: `Vai! ${workType === 'time' ? formatTime(workTarget) : (workTarget/1000).toFixed(2)+'km'} ritmo forte!`,
            targetValue: workTarget,
            targetType: workType,
            type: 'work',
            repInfo: { current: i, total: count }
        });

        // Fase Recupero (se non è l'ultima o se c'è defaticamento dopo)
        if (restTarget > 0) {
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

    // Defaticamento Standard
    phases.push({ 
        name: "Defaticamento", 
        instruction: "Ottimo lavoro. Corsetta sciolta finale.", 
        targetValue: 300, // 5 min default
        targetType: 'time', 
        type: 'cooldown' 
    });

    return phases;
};

const LiveCoachScreen: React.FC<LiveCoachScreenProps> = ({ workout, onFinish, onExit }) => {
    // State
    const [isRunning, setIsRunning] = useState(false);
    const [phases, setPhases] = useState<TrainingPhase[]>([]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    
    // Metrics
    const [totalTime, setTotalTime] = useState(0);
    const [totalDistance, setTotalDistance] = useState(0); // Meters
    const [phaseValue, setPhaseValue] = useState(0); // Elapsed Time OR Distance based on phase type
    const [currentPace, setCurrentPace] = useState(0); // min/km
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null); // meters

    // Refs for logic (avoid stale closures)
    const watchIdRef = useRef<number | null>(null);
    const lastPosRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
    const paceBufferRef = useRef<number[]>([]); // For smoothing pace
    const wakeLock = useRef<any>(null);
    const timerRef = useRef<number | null>(null);
    const hasStartedRef = useRef(false); // To track if initial briefing was done

    // 1. Initialize Workout Structure (Smart Parsing or Fallback)
    useEffect(() => {
        let generatedPhases: TrainingPhase[] = [];

        if (workout) {
            // Tenta parsing avanzato per ripetute
            const structuredPhases = parseWorkoutStructure(workout.description, workout.title);
            
            if (structuredPhases.length > 0) {
                generatedPhases = structuredPhases;
            } else {
                // Fallback Logic per allenamenti semplici / non parsabili
                const titleLower = workout.title.toLowerCase();
                const distMatch = titleLower.match(/(\d+)(?:[.,]\d+)?\s*(k|km|m)/);
                
                let targetDistMeters = 0;
                if (distMatch) {
                    const val = parseFloat(distMatch[1]);
                    if (distMatch[2] === 'm') targetDistMeters = val;
                    else targetDistMeters = val * 1000;
                }

                if (workout.activityType === 'Gara' || targetDistMeters > 0) {
                    const mainDist = targetDistMeters > 0 ? targetDistMeters : 5000;
                    generatedPhases = [
                        { name: "Riscaldamento", instruction: "Riscaldamento libero. Corri piano.", targetValue: 600, targetType: 'time', type: 'warmup' }, // 0 = open ended till manual skip? No, let's put 5 min default or make it manual
                        { name: workout.title, instruction: `${workout.description || 'Mantieni il ritmo gara.'}`, targetValue: mainDist, targetType: 'distance', type: 'work' },
                        { name: "Defaticamento", instruction: "Defaticamento finale.", targetValue: 300, targetType: 'time', type: 'cooldown' }
                    ];
                } else if (['Ripetute', 'Fartlek'].includes(workout.activityType)) {
                    // Fallback se il parser ha fallito ma è un workout di qualità
                    generatedPhases = [
                        { name: "Riscaldamento", instruction: "Inizia molto lentamente.", targetValue: 600, targetType: 'time', type: 'warmup' },
                        { name: "Lavoro Centrale", instruction: `Segui le indicazioni: ${workout.description}`, targetValue: 0, targetType: 'time', type: 'work' }, 
                        { name: "Defaticamento", instruction: "Corsetta sciolta finale.", targetValue: 300, targetType: 'time', type: 'cooldown' }
                    ];
                } else {
                    // Lento / Lungo / Altro
                    generatedPhases = [
                        { name: workout.title, instruction: workout.description || "Corri a sensazione costante.", targetValue: 0, targetType: 'time', type: 'work' }
                    ];
                }
            }
        } else {
            generatedPhases = [{ name: "Corsa Libera", instruction: "Divertiti!", targetValue: 0, targetType: 'distance', type: 'work' }];
        }
        
        // Ensure manual advance for warmup if 0
        if(generatedPhases[0].targetValue === 0) generatedPhases[0].targetValue = 600; // Default 10 min

        setPhases(generatedPhases);
    }, [workout]);

    // 2. Wake Lock
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

    // 3. Timer (Ticks every second)
    useEffect(() => {
        if (isRunning) {
            timerRef.current = window.setInterval(() => {
                setTotalTime(t => t + 1);
                
                // Only increment phase value if it's TIME based
                const currentPhase = phases[currentPhaseIndex];
                if (currentPhase && currentPhase.targetType === 'time') {
                    setPhaseValue(v => v + 1);
                }
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, phases, currentPhaseIndex]);

    // 4. GPS Tracking Engine
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

                    if (accuracy > 30) return; // Ignore poor signal

                    if (!lastPosRef.current) {
                        lastPosRef.current = { lat: latitude, lon: longitude, time: timestamp };
                        return;
                    }

                    const distDelta = calculateDistance(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
                    const timeDelta = (timestamp - lastPosRef.current.time) / 1000;

                    // Speed filter (max 30km/h ~ 8.3 m/s to avoid jumps)
                    if (timeDelta > 0 && (distDelta / timeDelta) > 8.3) return; 

                    if (distDelta > 2) { // Minimum movement threshold
                        setTotalDistance(d => d + distDelta);
                        
                        if (phases[currentPhaseIndex] && phases[currentPhaseIndex].targetType === 'distance') {
                            setPhaseValue(v => v + distDelta);
                        }

                        const rawPace = (timeDelta / 60) / (distDelta / 1000); 
                        paceBufferRef.current.push(rawPace);
                        if (paceBufferRef.current.length > 5) paceBufferRef.current.shift();
                        
                        const avgPace = paceBufferRef.current.reduce((a,b) => a+b, 0) / paceBufferRef.current.length;
                        setCurrentPace(avgPace);

                        lastPosRef.current = { lat: latitude, lon: longitude, time: timestamp };
                    }
                },
                (error) => console.warn("GPS Error", error),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        }

        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [isRunning, phases, currentPhaseIndex]);

    // 5. Phase Logic & Audio Feedback Check
    useEffect(() => {
        if (!isRunning || phases.length === 0) return;

        const currentPhase = phases[currentPhaseIndex];
        const nextPhase = phases[currentPhaseIndex + 1];
        const target = currentPhase.targetValue;
        const isDistanceBased = currentPhase.targetType === 'distance';

        if (target > 0) {
            const remaining = target - phaseValue;

            // --- AUDIO FEEDBACK & PRE-WARNING ---
            if (isDistanceBased) {
                // Distance Milestones (every km)
                if (remaining > 200 && phaseValue > 0 && Math.floor(phaseValue) % 1000 < 5 && phaseValue > 100) { 
                    const km = Math.floor(phaseValue / 1000);
                    // Avoid spamming if updating fast
                    if (km > 0) speak(`${km} chilometri. Passo ${formatPace(currentPace)}.`);
                }
                
                // Pre-Warning Distanza
                if (remaining <= 50 && remaining > 40) {
                    let msg = "Ultimi 50 metri.";
                    if (nextPhase) msg += ` Poi: ${nextPhase.name}.`;
                    speak(msg);
                }
            } else {
                // Time Milestones
                if (remaining === 60) speak("Un minuto al cambio.");
                
                // Pre-Warning Tempo (10 secondi)
                if (remaining === 10) {
                    let msg = "10 secondi.";
                    if (nextPhase) msg += ` Preparati per: ${nextPhase.name}.`;
                    else msg += " Alla fine.";
                    speak(msg);
                }
                
                if (remaining <= 3 && remaining > 0.5) speak(`${Math.floor(remaining)}`);
            }

            // --- PHASE TRANSITION (AUTO) ---
            if (remaining <= 0) {
                if (currentPhaseIndex < phases.length - 1) {
                    // Next phase
                    const p = phases[currentPhaseIndex + 1];
                    setCurrentPhaseIndex(i => i + 1);
                    setPhaseValue(0);
                    paceBufferRef.current = [];
                    
                    // SPEAK NEW PHASE IMMEDIATELY
                    let msg = "";
                    if (p.type === 'work' && p.repInfo) {
                        msg = `Ripetuta ${p.repInfo.current}. ${p.instruction}`;
                    } else if (p.type === 'rest' && p.repInfo) {
                        msg = `Recupero. ${p.instruction}`;
                    } else {
                        msg = `Fase successiva: ${p.name}. ${p.instruction}`;
                    }
                    speak(msg);

                } else {
                    // Finish
                    setIsRunning(false);
                    speak("Allenamento completato! Ottimo lavoro.");
                }
            }
        } 

    }, [phaseValue, isRunning, phases, currentPhaseIndex, currentPace]);


    const handleToggle = () => {
        if (!isRunning) {
            // START LOGIC
            if (totalTime === 0) {
                hasStartedRef.current = true;
                
                // BRIEFING INIZIALE
                const p = phases[0];
                let briefing = `Si parte. ${workout?.title || 'Allenamento'}. `;
                briefing += `Prima fase: ${p.name}. ${p.instruction}`;
                speak(briefing);
            } else {
                speak("Riprendo.");
            }
        } else {
            speak("Pausa.");
        }
        setIsRunning(!isRunning);
    };

    const handleNextPhase = () => {
        if (currentPhaseIndex < phases.length - 1) {
            // Forziamo il cambio manuale
            const nextP = phases[currentPhaseIndex + 1];
            speak(`Passo a: ${nextP.name}.`);
            setCurrentPhaseIndex(i => i + 1);
            setPhaseValue(0);
        } else {
            speak("Allenamento finito.");
            setIsRunning(false);
        }
    };

    const currentPhase: TrainingPhase = phases[currentPhaseIndex] || { 
        name: '...', 
        targetValue: 0, 
        targetType: 'time', 
        instruction: '', 
        type: 'work' 
    };
    const progressPercent = currentPhase.targetValue > 0 ? Math.min(100, (phaseValue / currentPhase.targetValue) * 100) : 0;
    const remaining = Math.max(0, currentPhase.targetValue - phaseValue);

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
        <div className="fixed inset-0 z-[20000] bg-black text-white flex flex-col font-sans overflow-hidden">
            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-start bg-slate-900 border-b border-slate-800 pt-safe-top">
                <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Totale</div>
                    <div className="text-2xl font-mono font-bold text-white">{formatTime(totalTime)}</div>
                    <div className="text-xs text-slate-500 font-mono">{(totalDistance/1000).toFixed(2)} km</div>
                </div>
                
                {/* GPS Indicator */}
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">GPS</span>
                        <div className={`w-2 h-2 rounded-full ${gpsAccuracy && gpsAccuracy < 20 ? 'bg-green-500' : gpsAccuracy ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></div>
                    </div>
                    {gpsAccuracy && <span className="text-[9px] text-slate-600">±{Math.round(gpsAccuracy)}m</span>}
                </div>
            </div>

            {/* Main Center */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-6 relative">
                
                {/* Rep Counter Overlay (if applicable) */}
                {currentPhase.repInfo && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 px-4 py-1 rounded-full border border-slate-700 text-xs font-black uppercase tracking-widest text-slate-300">
                        Ripetuta {currentPhase.repInfo.current} / {currentPhase.repInfo.total}
                    </div>
                )}

                {/* Phase Info */}
                <div className="text-center w-full mb-8">
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Fase {currentPhaseIndex + 1}/{phases.length}</h2>
                    <h1 className={`text-3xl sm:text-4xl font-black uppercase leading-tight truncate ${getPhaseColor(currentPhase.type)}`}>
                        {currentPhase.name}
                    </h1>
                    <div className="bg-slate-900/50 p-3 rounded-xl mt-4 border border-slate-800 mx-auto max-w-sm">
                        <p className="text-sm text-slate-200 font-medium italic">"{currentPhase.instruction}"</p>
                    </div>
                </div>

                {/* Big Metric: Remaining Distance/Time or Pace */}
                <div className="flex flex-col items-center gap-2">
                    <div className={`text-[80px] sm:text-[120px] font-mono font-bold leading-none tracking-tighter ${isRunning ? 'text-white' : 'text-slate-600'}`}>
                        {currentPhase.targetType === 'distance' 
                            ? (remaining > 1000 ? (remaining/1000).toFixed(2) : Math.round(remaining))
                            : formatTime(remaining > 0 ? remaining : phaseValue)
                        }
                    </div>
                    <div className={`text-sm font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-current ${getPhaseColor(currentPhase.type)} opacity-80`}>
                        {currentPhase.targetType === 'distance' 
                            ? (remaining > 1000 ? 'CHILOMETRI' : 'METRI') 
                            : (remaining > 0 ? 'RIMANENTI' : 'TRASCORSI')
                        }
                    </div>
                </div>

                {/* Secondary Metric: Pace */}
                <div className="mt-10 text-center">
                    <div className="text-4xl font-mono font-bold text-slate-200">{formatPace(currentPace)}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passo (min/km)</div>
                </div>

            </div>

            {/* Progress Bar */}
            {currentPhase.targetValue > 0 && (
                <div className="w-full h-3 bg-slate-800">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(255,255,255,0.2)] ${getBarColor(currentPhase.type)}`}
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            )}

            {/* Controls */}
            <div className="w-full p-8 pb-12 bg-slate-900 border-t border-slate-800 flex flex-col gap-6">
                <div className="flex justify-center items-center gap-8">
                    <button 
                        onClick={handleNextPhase}
                        className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.69v2.34L5.055 7.061Z" /></svg>
                    </button>

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

                    <button 
                        onClick={() => {
                            if(confirm("Terminare l'allenamento?")) {
                                speak("Allenamento concluso.");
                                onFinish(totalTime * 1000);
                            }
                        }}
                        className="w-16 h-16 rounded-full bg-red-900/20 border border-red-500/50 text-red-500 flex items-center justify-center active:bg-red-900/40 transition-colors hover:bg-red-900/30"
                    >
                        <div className="w-6 h-6 bg-current rounded-sm"></div>
                    </button>
                </div>
                <div className="text-center">
                    <button onClick={onExit} className="text-slate-500 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors p-2">Esci senza salvare</button>
                </div>
            </div>
        </div>
    );
};

export default LiveCoachScreen;
