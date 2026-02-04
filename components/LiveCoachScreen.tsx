
import React, { useState, useEffect, useRef } from 'react';
import { PlannedWorkout } from '../types';

interface LiveCoachScreenProps {
    workout: PlannedWorkout | null; // Null means "Free Run"
    onFinish: (durationMs: number) => void;
    onExit: () => void;
}

interface TrainingPhase {
    name: string;
    instruction: string; 
    targetValue: number; // Seconds OR Meters
    targetType: 'time' | 'distance'; 
    type: 'warmup' | 'work' | 'rest' | 'cooldown';
    repInfo?: { current: number, total: number };
    targetPace?: number; // min/km (es. 4.5 per 4:30)
}

// --- UTILS ---

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const speak = (text: string, priority: boolean = false) => {
    if (!('speechSynthesis' in window)) return;
    
    if (priority) window.speechSynthesis.cancel(); // Interrompi tutto per messaggi urgenti

    // Pulizia testo per sintesi vocale naturale
    let cleanText = text
        .replace(/\*\*/g, '')
        .replace(/:/g, ' e ') // 4:30 -> 4 e 30
        .replace(/km\/h/g, 'chilometri orari')
        .replace(/min\/km/g, 'minuti al chilometro')
        .replace(/['"]/g, ' minuti ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'it-IT';
    utterance.rate = 1.05; 
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
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

const parsePaceFromText = (text: string): number | undefined => {
    // Cerca pattern come "4:30", "5.00", "3'45"
    const regex = /(\d{1,2})[:'.](\d{2})/;
    const match = text.match(regex);
    if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        return min + (sec / 60);
    }
    return undefined;
};

/**
 * PARSER INTELLIGENTE
 */
const parseWorkoutStructure = (description: string, title: string): TrainingPhase[] => {
    const fullText = (title + " " + description).toLowerCase();
    
    // Pattern Ripetute: "10x 400m", "10 ripetute da 2 minuti"
    const repRegex = /(\d+)\s*(?:x|per|volte|ripetute)/i;
    const repMatch = fullText.match(repRegex);

    if (!repMatch) return []; 

    const count = parseInt(repMatch[1]);
    if (count < 2 || count > 50) return [];

    const textAfterReps = fullText.substring(fullText.indexOf(repMatch[0]) + repMatch[0].length);
    
    // Fase Attiva (Work)
    const workRegex = /(?:da|di)?\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|'|”)/i;
    const workMatch = textAfterReps.match(workRegex);
    
    if (!workMatch) return [];

    const workValRaw = parseFloat(workMatch[1].replace(',', '.'));
    const workUnit = workMatch[2];
    
    let workTarget = 0;
    let workType: 'time' | 'distance' = 'time';

    if ((workUnit.startsWith('m') && workUnit !== 'min') || workUnit === 'km') {
        workTarget = workUnit === 'km' ? workValRaw * 1000 : workValRaw;
        workType = 'distance';
    } else {
        workTarget = (workUnit === 'secondi' || workUnit === '”') ? workValRaw : workValRaw * 60;
        workType = 'time';
    }

    // Cerchiamo un passo target nella descrizione (es. "a 4:00")
    const targetPace = parsePaceFromText(description);

    // Fase Recupero (Rest)
    const restRegex = /(?:recupero|rec|lento|piano|rest|off)\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|'|”)/i;
    const restMatch = textAfterReps.match(restRegex);

    let restTarget = 0;
    let restType: 'time' | 'distance' = 'time';

    if (restMatch) {
        const restValRaw = parseFloat(restMatch[1].replace(',', '.'));
        const restUnit = restMatch[2];
        if ((restUnit.startsWith('m') && restUnit !== 'min') || restUnit === 'km') {
            restTarget = restUnit === 'km' ? restValRaw * 1000 : restValRaw;
            restType = 'distance';
        } else {
            restTarget = (restUnit === 'secondi' || restUnit === '”') ? restValRaw : restValRaw * 60;
            restType = 'time';
        }
    } else {
        restTarget = 120; // Default 2 min se non specificato ma ci sono ripetute
        restType = 'time';
    }

    // Costruzione Fasi
    const phases: TrainingPhase[] = [];
    
    phases.push({ 
        name: "Riscaldamento", 
        instruction: "Iniziamo. Corri piano per scaldarti bene.", 
        targetValue: 600, // 10 min default
        targetType: 'time', 
        type: 'warmup' 
    });

    for (let i = 1; i <= count; i++) {
        phases.push({
            name: `Ripetuta ${i}`,
            instruction: `Vai! ${workType === 'time' ? formatTime(workTarget) + ' minuti' : (workTarget/1000).toFixed(2)+'km'} a buon ritmo!`,
            targetValue: workTarget,
            targetType: workType,
            type: 'work',
            repInfo: { current: i, total: count },
            targetPace: targetPace // Assegna il passo target solo alle fasi attive
        });

        if (restTarget > 0 && i < count) { // Niente recupero dopo l'ultima, si va al defaticamento
            phases.push({
                name: `Recupero ${i}`,
                instruction: `Piano. Recupera fiato per ${restType === 'time' ? formatTime(restTarget) + ' minuti' : (restTarget).toFixed(0)+' metri'}.`,
                targetValue: restTarget,
                targetType: restType,
                type: 'rest',
                repInfo: { current: i, total: count }
            });
        }
    }

    phases.push({ 
        name: "Defaticamento", 
        instruction: "Ottimo lavoro. Corsetta sciolta per finire.", 
        targetValue: 300, 
        targetType: 'time', 
        type: 'cooldown' 
    });

    return phases;
};

// --- COMPONENT ---

const LiveCoachScreen: React.FC<LiveCoachScreenProps> = ({ workout, onFinish, onExit }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [phases, setPhases] = useState<TrainingPhase[]>([]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    
    const [totalTime, setTotalTime] = useState(0);
    const [totalDistance, setTotalDistance] = useState(0);
    const [phaseValue, setPhaseValue] = useState(0); 
    const [currentPace, setCurrentPace] = useState(0); 
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    const watchIdRef = useRef<number | null>(null);
    const lastPosRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
    const paceBufferRef = useRef<number[]>([]); 
    const wakeLock = useRef<any>(null);
    const timerRef = useRef<number | null>(null);
    const lastFeedbackTimeRef = useRef<number>(0); // Per non spammare correzioni

    // 1. Inizializzazione Struttura Allenamento
    useEffect(() => {
        let generatedPhases: TrainingPhase[] = [];

        if (workout) {
            const structuredPhases = parseWorkoutStructure(workout.description, workout.title);
            
            if (structuredPhases.length > 0) {
                generatedPhases = structuredPhases;
            } else {
                // Fallback Intelligente per altri tipi (Gara, Lungo, Lento)
                const titleLower = workout.title.toLowerCase();
                const distMatch = titleLower.match(/(\d+)(?:[.,]\d+)?\s*(k|km|m)/);
                let targetDistMeters = 0;
                if (distMatch) {
                    const val = parseFloat(distMatch[1]);
                    targetDistMeters = distMatch[2] === 'm' ? val : val * 1000;
                }

                if (workout.activityType === 'Gara' || targetDistMeters > 0) {
                    const mainDist = targetDistMeters > 0 ? targetDistMeters : 5000;
                    generatedPhases = [
                        { name: "Riscaldamento", instruction: "Riscaldamento libero. Corri sciolto.", targetValue: 300, targetType: 'time', type: 'warmup' },
                        { name: workout.title, instruction: `${workout.description || 'Mantieni il ritmo gara costante.'}`, targetValue: mainDist, targetType: 'distance', type: 'work' },
                        { name: "Defaticamento", instruction: "Defaticamento finale.", targetValue: 0, targetType: 'time', type: 'cooldown' }
                    ];
                } else {
                    // Allenamento semplice a sensazione
                    generatedPhases = [
                        { name: workout.title, instruction: workout.description || "Corri a sensazione costante.", targetValue: 0, targetType: 'time', type: 'work' }
                    ];
                }
            }
        } else {
            generatedPhases = [{ name: "Corsa Libera", instruction: "Divertiti!", targetValue: 0, targetType: 'distance', type: 'work' }];
        }
        
        setPhases(generatedPhases);
    }, [workout]);

    // 2. Wake Lock
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try { wakeLock.current = await (navigator as any).wakeLock.request('screen'); } catch (e) {}
            }
        };
        requestWakeLock();
        return () => { if (wakeLock.current) wakeLock.current.release(); };
    }, []);

    // 3. Timer & Monitoraggio Performance (Feedback Loop)
    useEffect(() => {
        if (isRunning) {
            timerRef.current = window.setInterval(() => {
                setTotalTime(t => {
                    const newTime = t + 1;
                    
                    // --- MONITORAGGIO INTELLIGENTE (Ogni 20s) ---
                    if (newTime % 20 === 0 && phases.length > 0) {
                        monitorPerformance(phases[currentPhaseIndex], currentPace);
                    }
                    return newTime;
                });
                
                const currentPhase = phases[currentPhaseIndex];
                if (currentPhase && currentPhase.targetType === 'time') {
                    setPhaseValue(v => v + 1);
                }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, phases, currentPhaseIndex, currentPace]);

    // Funzione "Cervello" del Coach
    const monitorPerformance = (phase: TrainingPhase, pace: number) => {
        const now = Date.now();
        // Evita di parlare troppo spesso (minimo 40s tra correzioni)
        if (now - lastFeedbackTimeRef.current < 40000) return;
        if (pace <= 0 || pace > 30) return; // Dati GPS non validi

        // Controllo Ripetute (Fase Work)
        if (phase.type === 'work' && phase.targetPace) {
            const diff = pace - phase.targetPace;
            // Tolleranza: +/- 15 sec/km
            if (diff > 0.25) { // Troppo lento (>15s sopra target)
                speak("Sei in ritardo sul passo. Aumenta il ritmo!", true);
                lastFeedbackTimeRef.current = now;
            } else if (diff < -0.25) { // Troppo veloce (>15s sotto target)
                speak("Stai andando troppo forte! Gestisci le energie.", true);
                lastFeedbackTimeRef.current = now;
            } else {
                // Feedback positivo ogni tanto
                if (Math.random() > 0.7) {
                    speak("Perfetto. Ritmo ideale, mantienilo.", true);
                    lastFeedbackTimeRef.current = now;
                }
            }
        } 
        
        // Controllo Recupero (Fase Rest)
        else if (phase.type === 'rest') {
            if (pace < 5.5) { // Se corre sotto i 5:30/km durante il recupero (generico)
                speak("Rallenta. È un recupero, respira a fondo.", true);
                lastFeedbackTimeRef.current = now;
            }
        }
    };

    // 4. GPS Engine
    useEffect(() => {
        if (!isRunning) {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            return;
        }

        if ('geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setGpsAccuracy(accuracy);
                    if (accuracy > 25) return; // Filtro precisione

                    if (!lastPosRef.current) {
                        lastPosRef.current = { lat: latitude, lon: longitude, time: position.timestamp };
                        return;
                    }

                    const distDelta = calculateDistance(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
                    const timeDelta = (position.timestamp - lastPosRef.current.time) / 1000;

                    if (timeDelta > 0 && (distDelta / timeDelta) > 9.0) return; // Speed sanity check (Usain Bolt filter)

                    if (distDelta > 3) {
                        setTotalDistance(d => d + distDelta);
                        if (phases[currentPhaseIndex] && phases[currentPhaseIndex].targetType === 'distance') {
                            setPhaseValue(v => v + distDelta);
                        }

                        const rawPace = (timeDelta / 60) / (distDelta / 1000); 
                        paceBufferRef.current.push(rawPace);
                        if (paceBufferRef.current.length > 5) paceBufferRef.current.shift();
                        
                        const avgPace = paceBufferRef.current.reduce((a,b) => a+b, 0) / paceBufferRef.current.length;
                        setCurrentPace(avgPace);

                        lastPosRef.current = { lat: latitude, lon: longitude, time: position.timestamp };
                    }
                },
                (error) => console.warn("GPS Error", error),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        }
        return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
    }, [isRunning, phases, currentPhaseIndex]);

    // 5. Phase Logic & Transitions
    useEffect(() => {
        if (!isRunning || phases.length === 0) return;

        const currentPhase = phases[currentPhaseIndex];
        const nextPhase = phases[currentPhaseIndex + 1];
        const target = currentPhase.targetValue;
        const isDistanceBased = currentPhase.targetType === 'distance';

        if (target > 0) {
            const remaining = target - phaseValue;

            // Avvisi Distanza
            if (isDistanceBased) {
                if (remaining <= 50 && remaining > 40) {
                    speak(`Ultimi 50 metri. Preparati per ${nextPhase ? nextPhase.name : 'la fine'}.`);
                }
            } else {
                // Avvisi Tempo
                if (remaining === 60) speak("Ultimo minuto.");
                if (remaining === 30 && currentPhase.type === 'work') speak("30 secondi, tieni duro!");
                if (remaining === 10) speak("10 secondi al cambio.");
                if (remaining <= 3 && remaining > 0) speak(`${Math.floor(remaining)}`);
            }

            // Transizione Fase
            if (remaining <= 0) {
                if (currentPhaseIndex < phases.length - 1) {
                    const p = phases[currentPhaseIndex + 1];
                    setCurrentPhaseIndex(i => i + 1);
                    setPhaseValue(0);
                    paceBufferRef.current = []; // Reset passo medio per nuova fase
                    
                    // Messaggio Transizione Intelligente
                    let msg = "";
                    if (p.type === 'work') {
                        msg = `Via! ${p.name}. ${p.instruction}`;
                        if (p.targetPace) msg += ` Obiettivo passo ${formatPace(p.targetPace)}.`;
                    } else if (p.type === 'rest') {
                        msg = `Recupero. ${p.instruction} Respira.`;
                    } else {
                        msg = `Cambio fase: ${p.name}.`;
                    }
                    speak(msg, true); // Priorità alta

                } else {
                    setIsRunning(false);
                    speak("Allenamento completato! Sei stato grande.", true);
                }
            }
        } 
    }, [phaseValue, isRunning, phases, currentPhaseIndex]);

    const handleToggle = () => {
        if (!isRunning) {
            if (totalTime === 0) {
                // START
                const p = phases[0];
                speak(`Iniziamo l'allenamento: ${workout?.title || 'Sessione'}. Prima fase: ${p.name}. ${p.instruction}`, true);
            } else {
                speak("Riprendo l'allenamento.", true);
            }
        } else {
            speak("Allenamento in pausa.", true);
        }
        setIsRunning(!isRunning);
    };

    const handleNextPhase = () => {
        if (currentPhaseIndex < phases.length - 1) {
            const nextP = phases[currentPhaseIndex + 1];
            speak(`Salto alla fase successiva: ${nextP.name}.`, true);
            setCurrentPhaseIndex(i => i + 1);
            setPhaseValue(0);
        } else {
            speak("Allenamento terminato manualmente.");
            setIsRunning(false);
        }
    };

    const currentPhase: TrainingPhase = phases[currentPhaseIndex] || { 
        name: '...', targetValue: 0, targetType: 'time', instruction: '', type: 'work' 
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
                {currentPhase.repInfo && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 px-4 py-1 rounded-full border border-slate-700 text-xs font-black uppercase tracking-widest text-slate-300">
                        Ripetuta {currentPhase.repInfo.current} / {currentPhase.repInfo.total}
                    </div>
                )}

                <div className="text-center w-full mb-8">
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Fase {currentPhaseIndex + 1}/{phases.length}</h2>
                    <h1 className={`text-3xl sm:text-4xl font-black uppercase leading-tight truncate ${getPhaseColor(currentPhase.type)}`}>
                        {currentPhase.name}
                    </h1>
                    <div className="bg-slate-900/50 p-3 rounded-xl mt-4 border border-slate-800 mx-auto max-w-sm">
                        <p className="text-sm text-slate-200 font-medium italic">"{currentPhase.instruction}"</p>
                    </div>
                </div>

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

                <div className="mt-10 text-center">
                    <div className="text-4xl font-mono font-bold text-slate-200">{formatPace(currentPace)}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passo Attuale (min/km)</div>
                    {currentPhase.targetPace && (
                        <div className="text-xs text-green-400 mt-1 font-mono">Target: {formatPace(currentPhase.targetPace)}</div>
                    )}
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
                    <button onClick={handleNextPhase} className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.69v2.34L5.055 7.061Z" /></svg>
                    </button>

                    <button onClick={handleToggle} className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-95 ${isRunning ? 'bg-amber-500 hover:bg-amber-400' : 'bg-green-600 hover:bg-green-500'}`}>
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
