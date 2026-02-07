
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
const parseValueAndUnit = (text: string): { targetValue: number, targetType: 'time' | 'distance' } | null => {
    // Regex matches "2.5 km", "10k", "500 m", "10 min", "30 sec"
    // Handles dots/commas and spacing
    const regex = /(\d+(?:[.,]\d+)?)\s*(k|km|chilometr|m|metri|min|minuti|sec|secondi|'|”|")/i;
    const match = text.match(regex);
    
    if (!match) return null;
    
    const val = parseFloat(match[1].replace(',', '.'));
    const unit = match[2].toLowerCase();

    // 'k' shorthand (10k, 1k) or 'km'
    if (unit === 'k' || unit.startsWith('km') || unit.startsWith('chil')) return { targetValue: val * 1000, targetType: 'distance' };
    
    if (unit.startsWith('m') && !unit.startsWith('min')) return { targetValue: val, targetType: 'distance' }; // 'm' or 'metri'
    
    if (unit.startsWith('min') || unit === "'") return { targetValue: val * 60, targetType: 'time' };
    
    // Seconds
    return { targetValue: val, targetType: 'time' };
};

const parsePace = (text: string): number | undefined => {
    // Matches "@ 5:30", "a 5.30", "ritmo 5:30"
    const regex = /(?:@|a|ritmo)\s*(\d{1,2})[:.](\d{2})/i;
    const match = text.match(regex);
    if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return undefined;
};

/**
 * Line-by-line robust parser that mimics exactly what the user reads in the text.
 */
const parseLegacyWorkoutStructure = (description: string, title: string): TrainingPhase[] => {
    const lines = description.split(/\n+/); // Split by lines
    const phases: TrainingPhase[] = [];
    
    let repCounter = 0;
    let totalReps = 0;

    const workLines = lines.filter(l => l.toLowerCase().includes('veloce') || l.toLowerCase().includes('ripetuta') || l.toLowerCase().includes('frazione')).length;
    if (workLines > 1) totalReps = workLines;

    for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        if (!lowerLine || lowerLine.length < 5) continue;

        let type: 'warmup' | 'work' | 'rest' | 'cooldown' | 'other' = 'other';
        if (lowerLine.includes('riscaldamento') || lowerLine.includes('warmup')) type = 'warmup';
        else if (lowerLine.includes('defaticamento') || lowerLine.includes('cooldown')) type = 'cooldown';
        else if (lowerLine.includes('recupero') || lowerLine.includes('lento') || lowerLine.includes('rest')) type = 'rest';
        else if (lowerLine.includes('veloce') || lowerLine.includes('ripetuta') || lowerLine.includes('frazione') || lowerLine.includes('gara') || lowerLine.includes('fartlek')) type = 'work';
        
        if (lowerLine.startsWith('info:') || lowerLine.startsWith('obiettivo:')) continue;

        const metric = parseValueAndUnit(line);
        if (!metric && type === 'other') continue; 

        if (!metric) continue; 

        const pace = parsePace(line);
        
        let name = "Fase";
        if (type === 'warmup') name = "Riscaldamento";
        if (type === 'cooldown') name = "Defaticamento";
        if (type === 'work') {
            repCounter++;
            name = totalReps > 1 ? `Ripetuta ${repCounter}` : "Fase Veloce";
        }
        if (type === 'rest') name = "Recupero";

        // Clean up instructions for visual display (keep numbers for visual, but we will process them for audio later)
        let cleanInstruction = line.replace(/^[-*•]\s*/, '').trim();
        // Remove markdown bold from instruction
        cleanInstruction = cleanInstruction.replace(/\*\*/g, '');

        phases.push({
            name: name,
            instruction: cleanInstruction,
            targetValue: metric.targetValue,
            targetType: metric.targetType,
            type: type !== 'other' ? type : 'work', 
            paceTarget: pace,
            repInfo: (type === 'work' || type === 'rest') && totalReps > 1 ? { current: repCounter, total: totalReps } : undefined
        });
    }

    if (phases.length === 0) {
        phases.push({ 
            name: "Allenamento Libero", 
            instruction: description || "Corri a sensazione.", 
            targetValue: 3600, 
            targetType: 'time', 
            type: 'work' 
        });
    }

    return phases;
};

// --- HUMANIZER HELPERS ---
const humanizeText = (text: string): string => {
    let t = text.toLowerCase();

    // 1. Remove Symbols and Markdown that shouldn't be read
    t = t.replace(/[*@]/g, ''); // Removes * and @
    t = t.replace(/\*\*(.*?)\*\*/g, '$1'); // Strips bold markers but keeps content

    // 2. Handle Shorthand Units (1k, 10k)
    // Needs to happen before general replacements
    t = t.replace(/\b(\d+)\s?k\b/gi, '$1 chilometri');

    // 3. Smart Decimal Distance Handling
    // Matches "1.5 km", "1,5 k", "1.2 chilometri"
    t = t.replace(/(\d+)[.,](\d+)\s*(k|km|chilometri)/gi, (match, whole, dec, unit) => {
        const w = parseInt(whole);
        let dStr = dec;
        
        // Normalize decimal part to meters (e.g. .5 -> 500, .2 -> 200, .25 -> 250)
        // Assume max 3 digits for meters
        while (dStr.length < 3) dStr += '0';
        dStr = dStr.substring(0, 3);
        const meters = parseInt(dStr);

        let wText = w === 1 ? "un chilometro" : `${w} chilometri`;
        
        if (meters === 0) return wText;
        if (meters === 500) return `${wText} e mezzo`;
        if (meters > 0) return `${wText} e ${meters} metri`;
        return wText;
    });

    // 4. Fix Thousands separators in Meters (1.500 m -> millecinquecento)
    // Remove dots followed by 3 digits and 'm' or 'metri'
    t = t.replace(/(\d)\.(\d{3})\s*(m|metri)/g, '$1$2 metri'); 

    // 5. General Replacements & Units expansion
    t = t.replace(/\//g, ' su '); // e.g. min/km -> minuti su chilometro
    t = t.replace(/-/g, ' '); 
    t = t.replace(/km/g, 'chilometri');
    t = t.replace(/\bmt\b/g, 'metri');
    t = t.replace(/\bmin\b/g, 'minuti');
    t = t.replace(/\bsec\b/g, 'secondi');
    
    // 6. Pace formatting: 5:30 -> 5 e 30
    t = t.replace(/(\d{1,2}):(\d{2})/g, '$1 e $2');

    return t;
};

const getDistanceSpeech = (meters: number): string => {
    if (meters >= 1000) {
        const km = meters / 1000;
        if (km === 1) return "un chilometro";
        if (km === 1.5) return "un chilometro e mezzo";
        
        // Check for .X decimals to read naturally
        const whole = Math.floor(km);
        const decimal = km - whole;
        
        if (decimal === 0) return `${whole} chilometri`;
        
        const m = Math.round(decimal * 1000);
        let wText = whole === 1 ? "un chilometro" : `${whole} chilometri`;
        if (whole === 0) wText = ""; // e.g. 0.5km -> 500m logic handled elsewhere usually, but if here:
        
        if (m === 500) return `${wText} e mezzo`;
        if (m > 0) return whole > 0 ? `${wText} e ${m} metri` : `${m} metri`;
        
        return `${km.toFixed(2).replace('.', ' virgola ')} chilometri`;
    }
    return `${Math.round(meters)} metri`;
};

const getTimeSpeech = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m} minuti e ${s} secondi`;
    if (m > 0) return `${m} minuti`;
    return `${s} secondi`;
};

const LiveCoachScreen: React.FC<LiveCoachScreenProps> = ({ workout, onFinish, onExit }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [phases, setPhases] = useState<TrainingPhase[]>([]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
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
    const lastFeedbackTimeRef = useRef<number>(0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); 

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
            // Priority to text parsing as it aligns with visual description
            if (workout.description.includes("PROGRAMMA DETTAGLIATO") || workout.description.includes("-")) {
                 generatedPhases = parseLegacyWorkoutStructure(workout.description, workout.title);
            } else if (workout.structure && workout.structure.length > 0) {
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
        
        // Apply humanization
        const cleanText = humanizeText(text);

        const u = new SpeechSynthesisUtterance(cleanText);
        u.lang = 'it-IT';
        u.rate = 1.05;
        u.pitch = 1.0;

        const itVoice = voices.find(v => v.lang === 'it-IT' && v.name.includes('Google')) || voices.find(v => v.lang.includes('it'));
        if (itVoice) u.voice = itVoice;
        
        utteranceRef.current = u;
        u.onend = () => { utteranceRef.current = null; };
        
        window.speechSynthesis.speak(u);
    }, [isMuted, voices]);

    // Phase Change Announcer
    useEffect(() => {
        if (!isRunning || phases.length === 0) return;
        const phase = phases[currentPhaseIndex];
        
        let msg = `${phase.name}. `;
        
        // Read full instruction description if available and not just the name
        // The humanizer will strip symbols like * and @ from this description
        if (phase.instruction && phase.instruction.toLowerCase() !== phase.name.toLowerCase()) {
            msg += `${phase.instruction}. `;
        }

        // Add explicit duration/distance target
        if (phase.targetType === 'distance') {
            msg += `Per ${getDistanceSpeech(phase.targetValue)}. `;
        } else {
            msg += `Per ${getTimeSpeech(phase.targetValue)}. `;
        }

        if (phase.paceTarget) {
            const min = Math.floor(phase.paceTarget / 60);
            const sec = phase.paceTarget % 60;
            msg += `Ritmo: ${min} e ${sec}.`;
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

                        // Pace calculation (min/km)
                        const rawPace = (timeDelta / 60) / (distDelta / 1000); 
                        paceBufferRef.current.push(rawPace);
                        if (paceBufferRef.current.length > 5) paceBufferRef.current.shift();
                        
                        const avgPace = paceBufferRef.current.reduce((a,b) => a+b, 0) / paceBufferRef.current.length;
                        setCurrentPace(avgPace);

                        const now = Date.now();
                        // Check feedback every 45 seconds
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
            // Tolerance +/- 10 sec/km (~0.16 min/km)
            const tolerance = 0.16;

            if (diff > tolerance) {
                // Slower -> Pace number is higher
                const min = Math.floor(currentPace);
                const sec = Math.round((currentPace - min) * 60);
                speak(`Sei lento. Vai a ${min} e ${sec}. Accelera.`);
            } else if (diff < -tolerance) {
                // Faster -> Pace number is lower
                const min = Math.floor(currentPace);
                const sec = Math.round((currentPace - min) * 60);
                speak(`Troppo veloce. Vai a ${min} e ${sec}. Rallenta.`);
            } else {
                speak("Ritmo perfetto.");
            }
            return;
        }

        // Generic feedback based on phase type if no specific target
        if (phase.type === 'work') {
            if (currentPace > 6.5) speak("Spingi di più.");
            else if (currentPace < 4.0) speak("Ottimo ritmo!");
        } else if (phase.type === 'rest') {
            if (currentPace < 6.0) speak("Recupera, rallenta il passo.");
        }
    };

    const handleNextPhaseAuto = () => {
        if (currentPhaseIndex < phases.length - 1) {
            setCurrentPhaseIndex(i => i + 1);
            setPhaseValue(0);
            paceBufferRef.current = [];
        } else {
            setIsRunning(false);
            speak("Allenamento completato. Ottimo lavoro!");
        }
    };

    const handleToggle = () => {
        if (!isRunning) {
            // UNLOCK AUDIO CONTEXT ON START/RESUME
            speak(totalTime === 0 ? "Iniziamo l'allenamento." : "Riprendo.", true);
        } else {
            speak("Allenamento in pausa.");
        }
        setIsRunning(!isRunning);
    };

    const handleTestAudio = () => {
        speak("Test audio. Volume attivo. Un chilometro e mezzo.", true);
    };

    const handlePrevPhase = () => {
        if (currentPhaseIndex > 0) {
            const prevPhase = phases[currentPhaseIndex - 1];
            speak(`Torno indietro a: ${prevPhase.name}.`);
            setCurrentPhaseIndex(i => i - 1);
            setPhaseValue(0);
            paceBufferRef.current = [];
        }
    };

    const handleNextPhase = () => {
        if (currentPhaseIndex < phases.length - 1) {
            const nextPhase = phases[currentPhaseIndex + 1];
            speak(`Salto a: ${nextPhase.name}.`);
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
