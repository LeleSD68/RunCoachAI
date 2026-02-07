
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlannedWorkout, WorkoutPhase } from '../types';

interface LiveCoachScreenProps {
    workout: PlannedWorkout | null; // Null means "Free Run"
    onFinish: (durationMs: number) => void;
    onExit: () => void;
}

// Reuse the type alias for clarity inside this component file too
interface TrainingPhase extends WorkoutPhase {
    name: string;
    instruction: string;
    repInfo?: { current: number, total: number };
}

// Icons
const VolumeUpIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 2.485.565 4.817 1.577 6.92.26 1.157 1.439 1.77 2.583 1.77h1.012l3.768 3.768c.944.944 2.56.276 2.56-1.06V4.06ZM18.9 12c0-1.656-.67-3.156-1.755-4.243a.75.75 0 0 1 1.06-1.061 7.5 7.5 0 0 1 0 10.608.75.75 0 0 1-1.06-1.06C18.23 15.156 18.9 13.656 18.9 12ZM17.25 12a5.25 5.25 0 0 0-1.537-3.713.75.75 0 1 1 1.06-1.06 6.75 6.75 0 0 1 0 9.546.75.75 0 1 1-1.06-1.06A5.25 5.25 0 0 0 17.25 12Z" /></svg>);
const VolumeOffIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 2.485.565 4.817 1.577 6.92.26 1.157 1.439 1.77 2.583 1.77h1.012l3.768 3.768c.944.944 2.56.276 2.56-1.06V4.06Z" /><path d="M17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" /></svg>);

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

// Helper for Legacy Parsing (fallback)
const parseValueAndUnit = (rawVal: string, unit: string): { targetValue: number, targetType: 'time' | 'distance' } => {
    const val = parseFloat(rawVal.replace(',', '.'));
    if (unit.startsWith('km') || unit.startsWith('chilometr')) return { targetValue: val * 1000, targetType: 'distance' };
    if (unit.startsWith('m') && !unit.startsWith('min')) return { targetValue: val, targetType: 'distance' };
    if (unit.startsWith('sec') || unit === '”' || unit === '"') return { targetValue: val, targetType: 'time' };
    return { targetValue: val * 60, targetType: 'time' };
};

const parseLegacyWorkoutStructure = (description: string, title: string): TrainingPhase[] => {
    const fullText = (title + " " + description).toLowerCase();
    const phases: TrainingPhase[] = [];

    const warmupRegex = /(?:riscaldamento|warmup)\s*(?:di|per)?\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|sec|'|”|chilometri|metri)/i;
    const warmupMatch = fullText.match(warmupRegex);

    if (warmupMatch) {
        const { targetValue, targetType } = parseValueAndUnit(warmupMatch[1], warmupMatch[2]);
        phases.push({
            name: "Riscaldamento",
            instruction: `Riscaldamento di ${targetType === 'time' ? formatTime(targetValue) : targetValue + 'm'}.`,
            targetValue,
            targetType,
            type: 'warmup'
        });
    }

    const repRegex = /(\d+)\s*(?:x|per|volte|ripetute)/i;
    const repMatch = fullText.match(repRegex);

    if (repMatch) {
        const count = parseInt(repMatch[1]);
        if (phases.length === 0) {
            phases.push({ 
                name: "Riscaldamento", 
                instruction: "10 minuti di riscaldamento standard.", 
                targetValue: 600, 
                targetType: 'time', 
                type: 'warmup' 
            });
        }

        const textAfterReps = fullText.substring(fullText.indexOf(repMatch[0]) + repMatch[0].length);
        const workRegex = /(?:da|di)?\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|sec|'|”)/i;
        const workMatch = textAfterReps.match(workRegex);

        if (workMatch) {
            const { targetValue: workTarget, targetType: workType } = parseValueAndUnit(workMatch[1], workMatch[2]);
            const restRegex = /(?:recupero|rec|lento|piano|rest|off)\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|sec|'|”)/i;
            const restMatch = textAfterReps.match(restRegex);
            
            let restTarget = 0;
            let restType: 'time' | 'distance' = 'time';

            if (restMatch) {
                const res = parseValueAndUnit(restMatch[1], restMatch[2]);
                restTarget = res.targetValue;
                restType = res.targetType;
            } else {
                restTarget = 120; 
            }

            for (let i = 1; i <= count; i++) {
                phases.push({
                    name: `Ripetuta ${i}`,
                    instruction: `Vai! ${workType === 'time' ? formatTime(workTarget) : (workTarget < 1000 ? workTarget+' metri' : (workTarget/1000).toFixed(2)+' km')}`,
                    targetValue: workTarget,
                    targetType: workType,
                    type: 'work',
                    repInfo: { current: i, total: count }
                });

                if (restTarget > 0 && i < count) {
                    phases.push({
                        name: `Recupero ${i}`,
                        instruction: `Recupera per ${restType === 'time' ? formatTime(restTarget) : (restTarget).toFixed(0)+'m'}.`,
                        targetValue: restTarget,
                        targetType: restType,
                        type: 'rest',
                        repInfo: { current: i, total: count }
                    });
                }
            }
        }
    } else {
        let mainWorkRegex = /(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|sec|'|”|chilometri|metri)/g;
        let match;
        let foundMain = false;

        while ((match = mainWorkRegex.exec(fullText)) !== null) {
            if (warmupMatch && match[0] === warmupMatch[0]) continue;
            if (fullText.substring(Math.max(0, match.index - 15), match.index).includes('defaticamento')) continue;

            const { targetValue, targetType } = parseValueAndUnit(match[1], match[2]);
            
            phases.push({
                name: "Allenamento",
                instruction: description || "Corri al ritmo previsto.",
                targetValue,
                targetType,
                type: 'work'
            });
            foundMain = true;
            break;
        }

        if (!foundMain) {
            if (phases.length === 0) {
                phases.push({ name: "Corsa Libera", instruction: "Allenamento libero. Corri a sensazione.", targetValue: 3600, targetType: 'time', type: 'work' });
            }
        }
    }

    const cooldownRegex = /(?:defaticamento|cooldown)\s*(?:di|per)?\s*(\d+(?:[.,]\d+)?)\s*(min|m|km|secondi|sec|'|”)/i;
    const cooldownMatch = fullText.match(cooldownRegex);

    if (cooldownMatch) {
        const { targetValue, targetType } = parseValueAndUnit(cooldownMatch[1], cooldownMatch[2]);
        phases.push({
            name: "Defaticamento",
            instruction: "Defaticamento finale.",
            targetValue,
            targetType,
            type: 'cooldown'
        });
    } else if (repMatch) {
        phases.push({ name: "Defaticamento", instruction: "Lavoro finito! Corsetta sciolta.", targetValue: 300, targetType: 'time', type: 'cooldown' });
    }

    return phases;
};

const LiveCoachScreen: React.FC<LiveCoachScreenProps> = ({ workout, onFinish, onExit }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [phases, setPhases] = useState<TrainingPhase[]>([]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
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
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); // Ref to prevent GC on iOS

    // Load Voices
    useEffect(() => {
        const loadVoices = () => {
            const availVoices = window.speechSynthesis.getVoices();
            if (availVoices.length > 0) {
                setVoices(availVoices);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // Initial Setup
    useEffect(() => {
        let generatedPhases: TrainingPhase[] = [];
        if (workout) {
            if (workout.structure && workout.structure.length > 0) {
                generatedPhases = workout.structure.map(p => ({
                    ...p,
                    name: p.description || (p.type === 'warmup' ? 'Riscaldamento' : p.type === 'cooldown' ? 'Defaticamento' : 'Fase'),
                    instruction: p.description || (p.targetType === 'time' ? `Corri per ${formatTime(p.targetValue)}` : `Corri per ${p.targetValue} metri`)
                }));
            } else {
                generatedPhases = parseLegacyWorkoutStructure(workout.description, workout.title);
            }
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

    const speak = useCallback((text: string, force = false) => {
        if (!('speechSynthesis' in window)) return;
        if (isMuted && !force) return;
        
        window.speechSynthesis.cancel();
        
        let cleanText = text.replace(/\*\*/g, '').replace(/[-]/g, ' ').trim();
        cleanText = cleanText.replace(/(\d{1,2}):(\d{2})/g, '$1 e $2');
        cleanText = cleanText.replace(/(\d+)x/gi, '$1 per');
        cleanText = cleanText.replace(/km/gi, 'chilometri');
        cleanText = cleanText.replace(/mt/gi, 'metri');

        const u = new SpeechSynthesisUtterance(cleanText);
        u.lang = 'it-IT';
        u.rate = 1.05;
        u.pitch = 1.0;

        const itVoice = voices.find(v => v.lang === 'it-IT' && v.name.includes('Google')) || voices.find(v => v.lang.includes('it'));
        if (itVoice) u.voice = itVoice;
        
        // IMPORTANT: Reference assignment to prevent iOS Garbage Collection mid-speech
        utteranceRef.current = u;
        u.onend = () => { utteranceRef.current = null; };
        
        window.speechSynthesis.speak(u);
    }, [isMuted, voices]);

    // Phase Change Announcer
    useEffect(() => {
        if (!isRunning || phases.length === 0) return;
        const phase = phases[currentPhaseIndex];
        let msg = `${phase.name}.`;
        if (phase.paceTarget) {
            const min = Math.floor(phase.paceTarget / 60);
            const sec = phase.paceTarget % 60;
            msg += ` Obiettivo passo: ${min} e ${sec}.`;
        } else if (phase.instruction) {
            // Keep instructions short for TTS
            msg += ` ${phase.instruction.substring(0, 50)}`; 
        }
        speak(msg);
    }, [currentPhaseIndex, isRunning, phases, speak]);

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

                    if (accuracy > 35) return; 

                    if (!lastPosRef.current) {
                        lastPosRef.current = { lat: latitude, lon: longitude, time: timestamp };
                        return;
                    }

                    const distDelta = calculateDistance(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
                    const timeDelta = (timestamp - lastPosRef.current.time) / 1000; 

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

                        const rawPace = (timeDelta / 60) / (distDelta / 1000); 
                        paceBufferRef.current.push(rawPace);
                        if (paceBufferRef.current.length > 5) paceBufferRef.current.shift();
                        
                        const avgPace = paceBufferRef.current.reduce((a,b) => a+b, 0) / paceBufferRef.current.length;
                        setCurrentPace(avgPace);

                        const now = Date.now();
                        if (now - lastFeedbackTimeRef.current > 45000 && avgPace > 0 && avgPace < 20) {
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
    }, [isRunning, phases, currentPhaseIndex, speak]);

    const provideFeedback = (phase: TrainingPhase, currentPace: number) => {
        if (phase.paceTarget) {
            const targetPaceMinKm = phase.paceTarget / 60; 
            const diff = currentPace - targetPaceMinKm;
            const tolerance = 0.16;

            if (diff > tolerance) {
                speak(`Sei lento. Accelera.`);
            } else if (diff < -tolerance) {
                speak(`Rallenta.`);
            } else {
                speak("Ritmo ok.");
            }
            return;
        }

        if (phase.type === 'work') {
            if (currentPace > 6.5) speak("Spingi un po'.");
            else if (currentPace < 4.0) speak("Vai forte.");
        } else if (phase.type === 'rest') {
            if (currentPace < 6.0) speak("Recupera, rallenta.");
        }
    };

    const handleNextPhaseAuto = () => {
        if (currentPhaseIndex < phases.length - 1) {
            setCurrentPhaseIndex(i => i + 1);
            setPhaseValue(0);
            paceBufferRef.current = [];
        } else {
            setIsRunning(false);
            speak("Allenamento completato.");
        }
    };

    const handleToggle = () => {
        if (!isRunning) {
            // UNLOCK AUDIO CONTEXT ON START/RESUME
            speak(totalTime === 0 ? "Iniziamo." : "Riprendo.", true);
        } else {
            speak("Pausa.");
        }
        setIsRunning(!isRunning);
    };

    const handleTestAudio = () => {
        speak("Test audio uno due tre. Volume attivo.", true);
    };

    const handlePrevPhase = () => {
        if (currentPhaseIndex > 0) {
            const prevPhase = phases[currentPhaseIndex - 1];
            speak(`Indietro: ${prevPhase.name}.`);
            setCurrentPhaseIndex(i => i - 1);
            setPhaseValue(0);
            paceBufferRef.current = [];
        }
    };

    const handleNextPhase = () => {
        if (currentPhaseIndex < phases.length - 1) {
            const nextPhase = phases[currentPhaseIndex + 1];
            speak(`Avanti: ${nextPhase.name}.`);
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
            {/* Top Bar */}
            <div className="w-full p-4 flex justify-between items-start bg-slate-900 border-b border-slate-800 shrink-0 safe-area-pt">
                <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Totale Trascorso</div>
                    <div className="text-2xl font-mono font-bold text-white">{formatTime(totalTime)}</div>
                    <div className="text-xs text-slate-500 font-mono">{(totalDistance/1000).toFixed(2)} km</div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 p-1 rounded-full hover:bg-slate-800 border border-slate-700">
                        {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                    </button>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">GPS</span>
                        <div className={`w-2 h-2 rounded-full ${gpsAccuracy && gpsAccuracy < 20 ? 'bg-green-500' : gpsAccuracy ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></div>
                    </div>
                </div>
            </div>

            {/* Main Center Area */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-4 relative min-h-0 overflow-hidden space-y-4">
                
                {currentPhase.repInfo && (
                    <div className="bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 text-xs font-black uppercase tracking-widest text-slate-300 shrink-0">
                        Ripetuta {currentPhase.repInfo.current} / {currentPhase.repInfo.total}
                    </div>
                )}

                <div className="text-center w-full shrink-0">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Fase {currentPhaseIndex + 1}/{phases.length}</h2>
                    <h1 className={`text-3xl sm:text-4xl font-black uppercase leading-tight truncate ${getPhaseColor(currentPhase.type)}`}>
                        {currentPhase.name}
                    </h1>
                    <div className="bg-slate-900/50 p-2 rounded-xl mt-2 border border-slate-800 mx-auto max-w-sm">
                        <p className="text-xs sm:text-sm text-slate-200 font-medium italic line-clamp-2">
                            "{currentPhase.description || currentPhase.instruction}"
                        </p>
                    </div>
                </div>

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

                <div className="text-center shrink-0">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-200">{formatPace(currentPace)}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Passo {currentPhase.paceTarget ? `(Target: ${formatPace(currentPhase.paceTarget/60)})` : ''}
                    </div>
                </div>

            </div>

            {currentPhase.targetValue > 0 && (
                <div className="w-full h-2 bg-slate-800 shrink-0 mt-auto">
                    <div 
                        className={`h-full transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(255,255,255,0.2)] ${getBarColor(currentPhase.type)}`}
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            )}

            {/* Controls */}
            <div className="w-full p-6 pb-8 bg-slate-900 border-t border-slate-800 flex flex-col gap-4 shrink-0 safe-area-pb">
                <div className="flex justify-center items-center gap-4 sm:gap-8">
                    <button 
                        onClick={handlePrevPhase}
                        disabled={currentPhaseIndex <= 0}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M7.28 7.72a.75.75 0 0 1 0 1.06l-2.47 2.47H21a.75.75 0 0 1 0 1.5H4.81l2.47 2.47a.75.75 0 1 1-1.06 1.06l-3.75-3.75a.75.75 0 0 1 0-1.06l3.75-3.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                    </button>

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

                    <button 
                        onClick={handleNextPhase}
                        disabled={currentPhaseIndex >= phases.length - 1}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 flex items-center justify-center text-white active:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M16.72 7.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 1 1-1.06-1.06l2.47-2.47H3a.75.75 0 0 1 0-1.5h16.19l-2.47-2.47a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                    </button>
                </div>

                <div className="flex justify-between mt-2 px-2">
                    <button onClick={handleTestAudio} className="text-slate-500 hover:text-cyan-400 text-[10px] uppercase font-bold tracking-widest">Test Audio</button>
                    
                    <button 
                        onClick={() => {
                            if(confirm("Terminare l'allenamento?")) {
                                speak("Allenamento concluso.");
                                onFinish(totalTime * 1000);
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-2 rounded-full bg-red-900/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-900/40 transition-colors active:scale-95"
                    >
                        Termina
                    </button>
                    
                    <button onClick={onExit} className="text-slate-600 hover:text-white text-[10px] uppercase font-bold tracking-widest">Esci</button>
                </div>
            </div>
        </div>
    );
};

export default LiveCoachScreen;
