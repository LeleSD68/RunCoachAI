
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { PlannedWorkout, WorkoutPhase } from '../types';
import { getEffectiveApiKey } from '../services/aiHelper';

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
const BrainIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>);

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
    const regex = /(\d+(?:[.,]\d+)?)\s*(k|km|chilometr|m|metri|min|minuti|sec|secondi|'|”|")/i;
    const match = text.match(regex);
    if (!match) return null;
    const val = parseFloat(match[1].replace(',', '.'));
    const unit = match[2].toLowerCase();
    if (unit === 'k' || unit.startsWith('km') || unit.startsWith('chil')) return { targetValue: val * 1000, targetType: 'distance' };
    if (unit.startsWith('m') && !unit.startsWith('min')) return { targetValue: val, targetType: 'distance' };
    if (unit.startsWith('min') || unit === "'") return { targetValue: val * 60, targetType: 'time' };
    return { targetValue: val, targetType: 'time' };
};

const parsePace = (text: string): number | undefined => {
    const regex = /(?:@|a|ritmo)\s*(\d{1,2})[:.](\d{2})/i;
    const match = text.match(regex);
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
    return undefined;
};

const parseLegacyWorkoutStructure = (description: string, title: string): TrainingPhase[] => {
    const lines = description.split(/\n+/);
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
        if (!metric) continue; 
        const pace = parsePace(line);
        
        // Cleanup instruction: Remove "1. ", "- ", etc.
        let cleanInstruction = line.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, '').trim();
        cleanInstruction = cleanInstruction.replace(/\*\*/g, '');
        
        // Extract Name from instruction if it starts with standard keywords
        let name = "Fase";
        if (type === 'warmup') name = "Riscaldamento";
        else if (type === 'cooldown') name = "Defaticamento";
        else if (type === 'work') { repCounter++; name = totalReps > 1 ? `Ripetuta ${repCounter}` : "Fase Veloce"; }
        else if (type === 'rest') name = "Recupero";
        else {
            // Try to extract title from text (e.g. "Fase 1 - Stabilità")
            const parts = cleanInstruction.split(/[-:]/);
            if (parts.length > 1 && parts[0].length < 20) {
                name = parts[0].trim();
                // Removed redundant name from instruction potentially
            }
        }

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
        phases.push({ name: "Corsa Libera", instruction: description || "Corri a sensazione.", targetValue: 3600, targetType: 'time', type: 'work' });
    }
    return phases;
};

// --- ADVANCED SPEECH PROCESSOR ---
// Transforms text into speakable Italian following specific user rules
const advancedSpeechProcessor = (text: string): string => {
    if (!text) return "";
    let t = text;

    // 1. Remove Markdown
    t = t.replace(/[*@_]/g, ''); 
    
    // 2. Remove leading list numbers (e.g., "1. ", "2. ")
    t = t.replace(/^\d+\.\s*/g, '');
    
    // 3. Clean up structure separators: "Fase 1 - Stabilità" -> "Fase 1, Stabilità"
    t = t.replace(/\s-\s/g, ', ');
    t = t.replace(/\s–\s/g, ', '); 

    // 4. Handle Parentheses: "Riscaldamento (15')" -> "Riscaldamento, 15 minuti,"
    // Replace parens with commas for natural pause
    t = t.replace(/\(/g, ', ').replace(/\)/g, ', ');

    // 5. Handle Time Units
    // 15' -> 15 minuti
    t = t.replace(/\b(\d+)'\b/g, '$1 minuti');
    t = t.replace(/(\d+)'/g, '$1 minuti'); // catch attached
    // 15" -> 15 secondi
    t = t.replace(/\b(\d+)"\b/g, '$1 secondi');
    t = t.replace(/(\d+)"/g, '$1 secondi'); // catch attached
    
    // 6. Handle Pace (min/km)
    // Remove "min/km" or "min al km" completely as context implies it
    t = t.replace(/\s?min\/km/gi, '');
    t = t.replace(/\s?min al km/gi, '');

    // 7. Handle Pace Format
    // 7:00 -> 7 (Do not read "7 zero zero")
    t = t.replace(/\b(\d{1,2}):00\b/g, '$1');
    // 6:50 -> 6 e 50
    t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, '$1 e $2');

    // 8. General Cleanup
    t = t.replace(/\s+/g, ' ').trim();
    // Fix double commas or trailing commas
    t = t.replace(/,\s*,/g, ',');
    t = t.replace(/,$/g, '');
    
    return t;
};

const getDistanceSpeech = (meters: number): string => {
    if (meters >= 1000) {
        const km = meters / 1000;
        const whole = Math.floor(km);
        const decimal = km - whole;
        
        if (km === 1) return "un chilometro";
        if (decimal === 0) return `${whole} chilometri`;
        
        const m = Math.round(decimal * 1000);
        let wText = whole === 1 ? "un chilometro" : whole === 0 ? "" : `${whole} chilometri`;
        
        if (m === 500) return whole > 0 ? `${wText} e mezzo` : "500 metri";
        if (m > 0) return whole > 0 ? `${wText} e ${m} metri` : `${m} metri`;
        // Fallback roughly
        return `${km.toFixed(1).replace('.', ' virgola ')} chilometri`;
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
    
    // AI Mode State
    const [isAiMode, setIsAiMode] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiTokensUsed, setAiTokensUsed] = useState(0);
    
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
        
        // Cancel previous speech to prevent lagging queue
        window.speechSynthesis.cancel();
        
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'it-IT';
        u.rate = 1.05; // Slightly faster for natural feel
        u.pitch = 1.0;

        // Try to find a good IT voice
        const itVoice = voices.find(v => v.lang === 'it-IT' && v.name.includes('Google')) || voices.find(v => v.lang.includes('it'));
        if (itVoice) u.voice = itVoice;
        
        utteranceRef.current = u;
        u.onend = () => { utteranceRef.current = null; };
        
        window.speechSynthesis.speak(u);
    }, [isMuted, voices]);

    // AI Generation Logic
    const generateAiFeedback = async (contextType: 'phase_change' | 'feedback', data: any) => {
        const apiKey = getEffectiveApiKey();
        if (!isAiMode || !apiKey) return null;

        setIsAiThinking(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            // SYSTEM PROMPT TUNED FOR HUMAN SPEECH
            const systemInstr = `Sei un Running Coach professionista che parla in cuffia all'atleta.
            Tono: Energico, Chiaro, Motivante, Umano.
            Lingua: Italiano parlato naturale.
            
            REGOLE DI LETTURA RIGOROSE:
            1. NON leggere MAI numeri di elenco (es. "1.", "2.").
            2. "15'" si legge "15 minuti". "15"" si legge "15 secondi".
            3. RITMI: "6:50" si legge "6 e 50". "7:00" si legge "7". 
            4. NON dire mai "zero zero" o "minuti al chilometro".
            5. Usa le pause (virgole) al posto delle parentesi o dei trattini.
            6. Sii conciso. Non fare monologhi.
            `;

            let prompt = "";
            if (contextType === 'phase_change') {
                prompt = `
                SITUAZIONE: Inizia la fase: "${data.name}".
                DESCRIZIONE ORIGINALE: "${data.rawText}"
                TARGET: ${data.target}
                
                COACH SCRIPT (Genera solo il parlato pulito seguendo le regole):
                1. Annuncia la fase.
                2. Spiega cosa fare basandoti sulla descrizione (semplifica).
                3. Dai il target.
                4. Concludi con un comando breve (es. "Partiamo!").
                `;
            } else {
                prompt = `Stato: Passo attuale ${data.pace}. Fase: ${data.phaseName}. Target: ${data.targetPace || 'Nessuno'}. 
                Problema: ${data.diffStatus}.
                
                Dai un feedback correttivo rapido (max 10 parole). Esempio: "Sei troppo veloce, rallenta a 5 e 30."`;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    maxOutputTokens: 150,
                    systemInstruction: systemInstr
                }
            });

            if (response.usageMetadata?.totalTokenCount) {
                setAiTokensUsed(prev => prev + response.usageMetadata!.totalTokenCount);
            }

            return response.text;
        } catch (e) {
            console.error("AI Generation Error", e);
            return null; // Fallback to standard
        } finally {
            setIsAiThinking(false);
        }
    };

    // Phase Change Announcer
    useEffect(() => {
        if (!isRunning || phases.length === 0) return;
        const phase = phases[currentPhaseIndex];
        
        // Costruiamo la stringa grezza che contiene le istruzioni
        const rawPhaseText = `${phase.name}. ${phase.instruction || ''}`;

        const announcePhase = async () => {
            let msg = "";
            let aiSpoken = false;
            
            // Try AI first if enabled - with TIMEOUT race to prevent blocking
            if (isAiMode) {
                const aiPromise = generateAiFeedback('phase_change', {
                    rawText: rawPhaseText,
                    name: phase.name,
                    target: phase.targetType === 'distance' ? `${(phase.targetValue/1000).toFixed(2)}km` : `${(phase.targetValue/60).toFixed(0)}min`,
                    pace: phase.paceTarget ? formatPace(phase.paceTarget/60) : null
                });
                
                // Timeout after 3 seconds, if AI is slow, fallback to regex
                const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
                
                const aiResult = await Promise.race([aiPromise, timeoutPromise]);
                
                if (aiResult) {
                    speak(aiResult);
                    aiSpoken = true;
                }
            }

            if (!aiSpoken) {
                // Fallback: Advanced Regex Processor (Standard Mode)
                // 1. Process Name & Instruction through the rules
                const cleanText = advancedSpeechProcessor(rawPhaseText);
                
                // 2. Add Target Duration/Distance nicely
                let targetText = "";
                if (phase.targetType === 'distance') {
                    targetText = `Per ${getDistanceSpeech(phase.targetValue)}.`;
                } else {
                    targetText = `Per ${getTimeSpeech(phase.targetValue)}.`;
                }

                // 3. Add Pace Target if exists
                let paceText = "";
                if (phase.paceTarget) {
                    const min = Math.floor(phase.paceTarget / 60);
                    const sec = phase.paceTarget % 60;
                    // "Ritmo 5 e 30"
                    paceText = `Ritmo, ${min} e ${sec}.`; 
                }

                msg = `${cleanText}. ${targetText} ${paceText}`;
                speak(msg);
            }
        };

        announcePhase();
    }, [currentPhaseIndex, isRunning, phases, speak, isAiMode]);

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

    // GPS & Pace Logic (unchanged)
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

    const provideFeedback = async (phase: TrainingPhase, currentPace: number) => {
        let diffStatus = 'ok';
        let targetPaceFormatted = null;

        if (phase.paceTarget) {
            const targetPaceMinKm = phase.paceTarget / 60; 
            const diff = currentPace - targetPaceMinKm;
            const tolerance = 0.16; // Tolerace ~10sec/km

            if (diff > tolerance) diffStatus = 'slow';
            else if (diff < -tolerance) diffStatus = 'fast';
            
            targetPaceFormatted = formatPace(targetPaceMinKm);
        } else {
            if (phase.type === 'work' && currentPace > 6.5) diffStatus = 'slow';
            if (phase.type === 'rest' && currentPace < 6.0) diffStatus = 'fast'; 
        }

        if (diffStatus === 'ok') {
            // Random motivation if AI is on
            if (Math.random() > 0.7 && isAiMode) { 
                 const aiMsg = await generateAiFeedback('feedback', { pace: formatPace(currentPace), phaseName: phase.name, diffStatus: 'good' });
                 if (aiMsg) speak(aiMsg);
            }
            return;
        }

        if (isAiMode) {
            const aiMsg = await generateAiFeedback('feedback', { 
                pace: formatPace(currentPace), 
                phaseName: phase.name, 
                targetPace: targetPaceFormatted, 
                diffStatus: diffStatus === 'slow' ? 'troppo lento' : 'troppo veloce' 
            });
            if (aiMsg) {
                speak(aiMsg);
                return;
            }
        }

        // Standard Feedback (Robust Fallback)
        if (diffStatus === 'slow') {
            const min = Math.floor(currentPace);
            const sec = Math.round((currentPace - min) * 60);
            speak(`Sei lento. Vai a ${min} e ${sec}. Accelera.`);
        } else if (diffStatus === 'fast') {
            const min = Math.floor(currentPace);
            const sec = Math.round((currentPace - min) * 60);
            speak(`Troppo veloce. Vai a ${min} e ${sec}. Rallenta.`);
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

    const handleFinish = () => {
        if(confirm(`Terminare l'allenamento? ${isAiMode ? `(Costo AI stimato: ${aiTokensUsed} token)` : ''}`)) {
            if (isAiMode && aiTokensUsed > 0) {
                alert(`Sessione terminata.\nToken AI Utilizzati: ${aiTokensUsed}\nCosto stimato: $${(aiTokensUsed * 0.0000001).toFixed(6)}`);
            }
            speak("Allenamento concluso.");
            onFinish(totalTime * 1000);
        }
    };

    const currentPhase: TrainingPhase = phases[currentPhaseIndex] || { 
        name: 'Caricamento...', 
        targetValue: 0, 
        targetType: 'time', 
        instruction: '', 
        type: 'work' 
    };
    
    // Calculate Next Phase for Preview
    const nextPhase: TrainingPhase | null = currentPhaseIndex < phases.length - 1 ? phases[currentPhaseIndex + 1] : null;
    
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
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsAiMode(!isAiMode)} 
                            className={`p-1 rounded-full border transition-all ${isAiMode ? 'text-purple-400 border-purple-500 bg-purple-900/20 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'text-slate-500 border-slate-700 bg-slate-800'}`}
                            title={isAiMode ? "Coach AI Attivo (Consuma Token)" : "Coach Standard (Gratis)"}
                        >
                            <BrainIcon />
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 p-1 rounded-full hover:bg-slate-800 border border-slate-700">
                            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">GPS</span>
                        <div className={`w-2 h-2 rounded-full ${gpsAccuracy && gpsAccuracy < 20 ? 'bg-green-500' : gpsAccuracy ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></div>
                    </div>
                </div>
            </div>

            {/* Main Center Area */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-4 relative min-h-0 overflow-hidden space-y-3">
                
                {/* AI Thinking Indicator */}
                {isAiThinking && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-purple-900/80 px-3 py-1 rounded-full flex items-center gap-2 border border-purple-500/50 shadow-lg z-10 animate-pulse">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Coach AI sta pensando...</span>
                    </div>
                )}

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
                    
                    {/* Current Instruction Display */}
                    <div className="bg-slate-900/50 p-3 rounded-xl mt-2 border border-slate-800 mx-auto max-w-sm">
                        <p className="text-sm text-slate-200 font-medium italic line-clamp-3">
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

                {/* NEXT PHASE PREVIEW - Updated UI Requirement */}
                {nextPhase && (
                    <div className="w-full max-w-sm bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-center mt-3 animate-fade-in shadow-lg">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Prossimo Blocco</span>
                            <span className={`text-[10px] font-mono font-bold ${getPhaseColor(nextPhase.type)} opacity-80`}>
                                {nextPhase.targetType === 'time' ? formatTime(nextPhase.targetValue) : `${nextPhase.targetValue}m`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${getPhaseColor(nextPhase.type).replace('text-', 'bg-')}`}></div>
                            <span className="text-sm font-bold text-white truncate">{nextPhase.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 italic mt-1 line-clamp-1 truncate opacity-80">
                            {nextPhase.description || nextPhase.instruction}
                        </p>
                    </div>
                )}

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
                        onClick={handleFinish}
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
