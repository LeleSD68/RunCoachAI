
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Track, TrackPoint, PauseSegment, TrackStats, Toast } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import ResizablePanel from './ResizablePanel';
import { mergeTracks, cutTrackSection, trimTrackToSelection, getPointsInDistanceRange, findPauses, smoothTrackData } from '../services/trackEditorUtils';
import { exportToGpx } from '../services/exportService';
import { calculateTrackStats } from '../services/trackStatsService';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile;
};

interface TrackEditorProps {
    initialTracks: Track[];
    onExit: (updatedTrack?: Track) => void;
    addToast: (message: string, type: Toast['type']) => void;
}

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) {
        return '--:--';
    }
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};


interface SelectionInfo {
    startDistance: number;
    endDistance: number;
    distance: number;
    duration: number;
}

const metricLabels: Record<YAxisMetric, string> = {
    pace: 'Ritmo',
    elevation: 'Altitudine',
    speed: 'Velocità',
    hr: 'Cardio',
    power: 'Potenza'
};

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 mr-1">
        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75v-3.75Z" clipRule="evenodd" />
    </svg>
);

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-cyan-400">
        <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
    </svg>
);

const GradientIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 mr-1.5">
        <path d="M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8Zm6 5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
        <path d="M8 3a5 5 0 1 0 0 10V3Z" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 mr-1.5">
        <path d="M8 1.75a.75.75 0 0 1 .75.75V4a.75.75 0 0 1-1.5 0V2.5a.75.75 0 0 1 .75-.75Z M3.25 3.25a.75.75 0 0 1 1.06 0L5.37 4.31a.75.75 0 0 1-1.06 1.06L3.25 4.31a.75.75 0 0 1 0-1.06ZM1.75 8a.75.75 0 0 1 .75-.75H4a.75.75 0 0 1 0 1.5H2.5a.75.75 0 0 1-.75-.75ZM4.31 10.63a.75.75 0 0 1 1.06 1.06L4.31 12.75a.75.75 0 0 1-1.06-1.06l1.06-1.06Z M8 12a.75.75 0 0 1 .75.75v1.75a.75.75 0 0 1-1.5 0V12.75a.75.75 0 0 1 .75-.75ZM10.63 11.69a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06ZM12 8a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0V8.75a.75.75 0 0 1 .75-.75ZM10.69 4.31a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Z M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
    </svg>
);

const StatItem: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string; }> = ({ title, value, subvalue }) => (
    <div className="text-center px-2">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider whitespace-nowrap">{title}</div>
      <div className="text-xl font-bold font-mono text-white">{value}</div>
      {subvalue && <div className="text-[10px] text-slate-500 whitespace-nowrap">{subvalue}</div>}
    </div>
);

const SelectionStatsDisplay: React.FC<{ stats: TrackStats }> = ({ stats }) => (
    <div className="flex-shrink-0 bg-slate-800/90 backdrop-blur-sm p-2 border-b-2 border-cyan-500 text-white flex items-center justify-around gap-2 z-10 animate-fade-in-down">
      <StatItem title="Distanza" value={`${stats.totalDistance.toFixed(2)} km`} />
      <StatItem title="Durata" value={formatDuration(stats.movingDuration)} subvalue={`Tot: ${formatDuration(stats.totalDuration)}`} />
      <StatItem title="Ritmo Medio" value={`${formatPace(stats.movingAvgPace)}/km`} />
      <StatItem title="Dislivello" value={`+${Math.round(stats.elevationGain)}m / -${Math.round(stats.elevationLoss)}m`} />
      {stats.avgHr && <StatItem title="Cardio Medio" value={`${Math.round(stats.avgHr)} bpm`} subvalue={`Min:${stats.minHr}/Max:${stats.maxHr}`} />}
      <StatItem title="Vel. Max" value={`${stats.maxSpeed.toFixed(1)} km/h`} />
    </div>
);


const TrackEditor: React.FC<TrackEditorProps> = ({ initialTracks, onExit, addToast }) => {
    const [editedTrack, setEditedTrack] = useState<Track | null>(null);
    const [trackName, setTrackName] = useState('');
    const [history, setHistory] = useState<Track[]>([]);
    const [selection, setSelection] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
    const [selectionPoints, setSelectionPoints] = useState<TrackPoint[] | null>(null);
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [showPauses, setShowPauses] = useState(false);
    const [mapGradientMetric, setMapGradientMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power'>('none');
    const [selectionStats, setSelectionStats] = useState<TrackStats | null>(null);
    const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);
    const [hoveredMetricValue, setHoveredMetricValue] = useState<number | null>(null);
    const isMobile = useIsMobile();
    const nameInputRef = useRef<HTMLInputElement>(null);
    
    const hasInitialized = useRef(false);

    const trackStats = useMemo(() => {
        if (editedTrack) {
            return calculateTrackStats(editedTrack);
        }
        return null;
    }, [editedTrack]);

    useEffect(() => {
        if (initialTracks.length > 0 && !hasInitialized.current) {
            hasInitialized.current = true;
            let trackToEdit;
            if (initialTracks.length > 1) {
                trackToEdit = mergeTracks(initialTracks);
                addToast(`Unite ${initialTracks.length} tracce in una linea continua.`, "info");
            } else {
                trackToEdit = { ...initialTracks[0] };
            }
            setEditedTrack(trackToEdit);
            setTrackName(trackToEdit.name);
            setHistory([trackToEdit]);
        }
    }, [initialTracks, addToast]);

    useEffect(() => {
        if (selection && editedTrack) {
            const points = getPointsInDistanceRange(editedTrack, selection.startDistance, selection.endDistance);
            if(points.length > 1) {
                const duration = points[points.length-1].time.getTime() - points[0].time.getTime();
                const distance = selection.endDistance - selection.startDistance;
                
                setSelectionInfo({
                    ...selection,
                    distance: distance,
                    duration: duration,
                });
                setSelectionPoints(points);

                const tempTrackForStats: Track = {
                    id: 'selection-stats',
                    name: 'Selezione',
                    color: '#fde047',
                    points: points,
                    distance: distance,
                    duration: duration,
                };
                const stats = calculateTrackStats(tempTrackForStats);
                setSelectionStats(stats);
                setFitBoundsTrigger(c => c + 1);

            } else {
                setSelectionInfo(null);
                setSelectionPoints(null);
                setSelectionStats(null);
            }
        } else {
            setSelectionInfo(null);
            setSelectionPoints(null);
            setSelectionStats(null);
            if (editedTrack?.points.length) {
                setFitBoundsTrigger(c => c + 1);
            }
        }

    }, [selection, editedTrack]);
    
    const hasHrData = useMemo(() => {
        return editedTrack?.points.some(p => p.hr !== undefined && p.hr > 0) ?? false;
    }, [editedTrack]);

    const pauseSegments = useMemo((): PauseSegment[] => {
        if (editedTrack) {
            return findPauses(editedTrack);
        }
        return [];
    }, [editedTrack]);
    
    useEffect(() => {
        if (hoveredPoint && editedTrack && mapGradientMetric !== 'none' && mapGradientMetric !== 'hr_zones') {
            let value: number | null = null;
            if (mapGradientMetric === 'elevation') value = hoveredPoint.ele;
            else if (mapGradientMetric === 'hr') value = hoveredPoint.hr ?? null;
            else if (mapGradientMetric === 'power') value = hoveredPoint.power ?? null;
            else if (mapGradientMetric === 'speed' || mapGradientMetric === 'pace') {
                const pointIndex = editedTrack.points.findIndex(p => p.time.getTime() === hoveredPoint.time.getTime());
                if (pointIndex > 0) {
                    const p1 = editedTrack.points[pointIndex - 1];
                    const p2 = hoveredPoint;
                    const dist = p2.cummulativeDistance - p1.cummulativeDistance;
                    const timeHours = (p2.time.getTime() - p1.time.getTime()) / 3600000;
                    if (timeHours > 1e-6) {
                        const speed = dist / timeHours;
                        if (mapGradientMetric === 'speed') value = speed;
                        else if (speed > 0.1) value = 60 / speed;
                    } else {
                        value = mapGradientMetric === 'pace' ? 99 : 0;
                    }
                }
            }
            setHoveredMetricValue(value);
        } else {
            setHoveredMetricValue(null);
        }
    }, [hoveredPoint, editedTrack, mapGradientMetric]);

    const handleHoverChange = useCallback((point: TrackPoint | null) => {
        setHoveredPoint(point);
    }, []);

    const updateTrack = useCallback((newTrack: Track) => {
        const trackToSave = { ...newTrack, name: trackName };
        setEditedTrack(trackToSave);
        setHistory(prev => [...prev, trackToSave]);
        setSelection(null);
        setSelectedPoint(null);
    }, [trackName]);
    
    const toggleYAxisMetric = useCallback((metric: YAxisMetric) => {
        setYAxisMetrics(prev => {
            const newMetrics = new Set(prev);
            if (newMetrics.has(metric)) {
                if (newMetrics.size > 1) {
                    newMetrics.delete(metric);
                }
            } else {
                newMetrics.add(metric);
            }
            return Array.from(newMetrics);
        });
    }, []);

    const handleUndo = useCallback(() => {
        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            setHistory(newHistory);
            const prevTrack = newHistory[newHistory.length - 1];
            setEditedTrack(prevTrack);
            setTrackName(prevTrack.name); 
            setSelection(null);
            setSelectedPoint(null);
            addToast("Ultima azione annullata.", "info");
        }
    }, [history, addToast]);

    const handlePointSelect = useCallback((point: TrackPoint | null) => {
        setSelectedPoint(point);
        if (point) setSelection(null);
    }, []);
    
    const handleDelete = useCallback(() => {
        if (editedTrack && selection) {
            const newTrack = cutTrackSection(editedTrack, selection.startDistance, selection.endDistance);
            updateTrack(newTrack);
            addToast("Tratto eliminato dal percorso.", "success");
        }
    }, [editedTrack, selection, updateTrack, addToast]);

    const handleTrim = useCallback(() => {
        if (editedTrack && selection) {
            const newTrack = trimTrackToSelection(editedTrack, selection.startDistance, selection.endDistance);
            updateTrack(newTrack);
            addToast("Percorso tagliato alla selezione.", "success");
        }
    }, [editedTrack, selection, updateTrack, addToast]);

    const handleSaveSelection = useCallback(() => {
        if (editedTrack && selectionPoints && selectionPoints.length > 1) {
            const firstPoint = selectionPoints[0];
            const startTime = firstPoint.time.getTime();
            const startDist = firstPoint.cummulativeDistance;

            const normalizedPoints = selectionPoints.map(p => ({
                ...p,
                time: new Date(p.time.getTime() - startTime),
                cummulativeDistance: p.cummulativeDistance - startDist
            }));

            const newTrack: Track = {
                ...editedTrack,
                id: `edited-selection-${Date.now()}`,
                points: normalizedPoints,
                distance: normalizedPoints[normalizedPoints.length - 1].cummulativeDistance,
                duration: normalizedPoints[normalizedPoints.length - 1].time.getTime(),
                name: `${trackName} (Estratto)`,
            };
            
            setEditedTrack(newTrack);
            setTrackName(newTrack.name);
            setHistory(prev => [...prev, newTrack]);
            setSelection(null);
            setSelectedPoint(null);
            
            addToast("Selezione salvata come nuova traccia.", "success");
        }
    }, [editedTrack, selectionPoints, trackName, addToast]);

    const handleExport = useCallback(() => {
        if (editedTrack) {
            exportToGpx({ ...editedTrack, name: trackName });
             addToast(`Esportato "${trackName}.gpx"`, "success");
        }
    }, [editedTrack, trackName, addToast]);

    const handlePauseClick = useCallback((segment: PauseSegment) => {
        setSelection({
            startDistance: segment.startPoint.cummulativeDistance,
            endDistance: segment.endPoint.cummulativeDistance,
        });
    }, []);

    const handleFixGpsErrors = useCallback(() => {
        if (editedTrack) {
            const { newTrack, correctedCount } = smoothTrackData(editedTrack);
            if (correctedCount > 0) {
                updateTrack(newTrack);
                addToast(`${correctedCount} potenziali errori GPS corretti.`, "success");
            } else {
                addToast("Nessun errore GPS significativo rilevato.", "info");
            }
        }
    }, [editedTrack, updateTrack, addToast]);
    
    const visibleTrackIds = useMemo(() => {
        return new Set(editedTrack ? [editedTrack.id] : []);
    }, [editedTrack]);

    const handleSaveAndExit = () => {
        if (editedTrack) {
            onExit({ ...editedTrack, name: trackName });
        } else {
            onExit();
        }
    };

    if (!editedTrack) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="uppercase font-black text-xs tracking-widest">Preparazione Editor...</div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full w-full font-sans text-white">
            <header className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0 z-10 gap-4">
                <button onClick={() => onExit()} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors whitespace-nowrap text-sm">
                    &larr; Annulla
                </button>
                
                <div className="flex-grow max-w-lg relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <PencilIcon />
                    </div>
                    <input 
                        ref={nameInputRef}
                        type="text" 
                        value={trackName}
                        onChange={(e) => setTrackName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 focus:border-cyan-500 rounded px-3 py-1.5 pl-10 text-center font-bold text-white outline-none transition-colors hover:bg-slate-700 focus:bg-slate-800"
                        placeholder="Nome Traccia"
                        title="Clicca per modificare il nome"
                    />
                </div>

                <div className="flex items-center space-x-2">
                     <div className="relative hidden sm:block">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                           <GradientIcon />
                        </div>
                        <select
                            value={mapGradientMetric}
                            onChange={(e) => setMapGradientMetric(e.target.value as any)}
                            className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 pl-9 pr-4 rounded-md transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                        >
                            <option value="none">Gradiente: No</option>
                            <option value="elevation">Altitudine</option>
                            <option value="pace">Passo</option>
                            <option value="speed">Velocità</option>
                            <option value="power">Potenza (Stima)</option>
                            <option value="hr" disabled={!hasHrData}>Frequenza Cardiaca</option>
                            <option value="hr_zones" disabled={!hasHrData}>Zone Cardio</option>
                        </select>
                    </div>
                     <button onClick={handleSaveAndExit} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md transition-colors whitespace-nowrap text-sm uppercase">
                        Salva
                    </button>
                </div>
            </header>

            <div className="flex flex-grow overflow-hidden">
                <ResizablePanel 
                    direction={isMobile ? 'horizontal' : 'vertical'}
                    initialSize={isMobile ? 350 : 256}
                    minSize={isMobile ? 250 : 200}
                >
                    <aside className="bg-slate-800 p-4 flex flex-col space-y-4 h-full overflow-y-auto custom-scrollbar">
                        <div>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-1">Info Percorso</h2>
                            <div className="text-sm space-y-1 text-slate-300 font-mono">
                                <p>Distanza: <span className="font-bold text-white">{editedTrack.distance.toFixed(2)} km</span></p>
                                <p>Tempo: <span className="font-bold text-white">{formatDuration(editedTrack.duration)}</span></p>
                                <p>Punti: <span className="font-bold text-white">{editedTrack.points.length}</span></p>
                                {trackStats && (
                                    <div className="border-t border-slate-700 my-2 pt-2">
                                        <p>Ritmo Medio: <span className="font-bold text-white">{formatPace(trackStats.movingAvgPace)} /km</span></p>
                                        <p>Velocità Media: <span className="font-bold text-white">{trackStats.avgSpeed.toFixed(1)} km/h</span></p>
                                        {trackStats.avgHr && <p>FC Media: <span className="font-bold text-white">{Math.round(trackStats.avgHr)} bpm</span></p>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border-t border-slate-700 pt-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-700 pb-1">Strumenti Editing</h2>
                            <div className="space-y-2">
                                <button onClick={handleSaveSelection} disabled={!selection} className="w-full text-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors text-xs uppercase">
                                    Crea Nuova Traccia
                                </button>
                                <button onClick={handleDelete} disabled={!selection} className="w-full text-center bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors text-xs uppercase">
                                    Elimina Selezione
                                </button>
                                <button onClick={handleTrim} disabled={!selection} className="w-full text-center bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors text-xs uppercase">
                                    Tieni solo Selezione
                                </button>

                                <div className="border-t border-slate-600 !my-3"></div>

                                <button onClick={handleFixGpsErrors} className="w-full flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors text-xs uppercase">
                                    <SparklesIcon />
                                    Ripara Errori GPS
                                </button>
                                
                                <button onClick={handleExport} className="w-full text-center bg-slate-500 hover:bg-slate-400 text-white font-bold py-2 px-4 rounded-md transition-colors text-xs uppercase">
                                    Esporta in GPX
                                </button>

                                <div className="border-t border-slate-600 !my-3"></div>

                                <button onClick={handleUndo} disabled={history.length <= 1} className="w-full text-center bg-slate-500 hover:bg-slate-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors text-xs uppercase">
                                    Annulla Ultima Azione
                                </button>
                            </div>
                        </div>
                        {selectionInfo && (
                            <div className="border-t border-slate-700 pt-4 text-[10px] text-slate-400 font-mono animate-fade-in">
                                <h3 className="text-xs font-black text-slate-200 mb-2 uppercase">Selezione Attuale</h3>
                                <p>Inizio: <span className="text-white">{selectionInfo.startDistance.toFixed(2)} km</span></p>
                                <p>Fine: <span className="text-white">{selectionInfo.endDistance.toFixed(2)} km</span></p>
                                <p>Distanza: <span className="text-white">{selectionInfo.distance.toFixed(2)} km</span></p>
                                <p>Tempo: <span className="text-white">{formatDuration(selectionInfo.duration)}</span></p>
                            </div>
                        )}
                    </aside>

                    <main className="flex-grow flex flex-col h-full">
                         <div className="flex flex-col-reverse flex-grow overflow-hidden h-full">
                            <ResizablePanel direction="horizontal" initialSize={192} minSize={120}>
                                <div className="bg-slate-800 p-4 relative h-full overflow-hidden">
                                    <div className="absolute top-2 left-12 z-10 flex items-center bg-slate-700/50 p-1 rounded-md overflow-x-auto no-scrollbar max-w-[calc(100%-60px)]">
                                        <div className="flex space-x-1 shrink-0">
                                            {(['pace', 'elevation', 'speed', 'hr', 'power'] as const).map(metric => {
                                                const isDisabled = metric === 'hr' && !hasHrData;
                                                const isActive = yAxisMetrics.includes(metric);
                                                return (
                                                    <button
                                                        key={metric}
                                                        onClick={() => toggleYAxisMetric(metric)}
                                                        disabled={isDisabled}
                                                        className={`px-3 py-1 text-[10px] rounded-md transition-colors font-bold uppercase tracking-tight ${
                                                            isActive
                                                                ? 'bg-sky-500 text-white'
                                                                : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {metricLabels[metric]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="border-l border-slate-600 h-5 mx-2 shrink-0"></div>
                                        <button
                                            onClick={() => setShowPauses(p => !p)}
                                            className={`flex items-center px-3 py-1 text-[10px] rounded-md transition-colors font-bold uppercase tracking-tight shrink-0 ${
                                                showPauses
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                            }`}
                                        >
                                            <ClockIcon />
                                            Pause
                                        </button>
                                    </div>
                                    <TimelineChart 
                                        track={editedTrack} 
                                        onSelectionChange={setSelection}
                                        yAxisMetrics={yAxisMetrics}
                                        onChartHover={handleHoverChange}
                                        hoveredPoint={hoveredPoint}
                                        pauseSegments={pauseSegments}
                                        showPauses={showPauses}
                                        selectedPoint={selectedPoint}
                                    />
                                </div>
                                <div className="h-full relative flex flex-col">
                                    {selectionStats && <SelectionStatsDisplay stats={selectionStats} />}
                                    <div className="flex-grow min-h-0">
                                        <MapDisplay
                                            tracks={[editedTrack]}
                                            visibleTrackIds={visibleTrackIds}
                                            raceRunners={null}
                                            hoveredTrackId={null}
                                            runnerSpeeds={new Map()}
                                            selectionPoints={selectionPoints}
                                            hoveredPoint={hoveredPoint}
                                            pauseSegments={pauseSegments}
                                            showPauses={showPauses}
                                            onMapHover={handleHoverChange}
                                            onPauseClick={handlePauseClick}
                                            mapGradientMetric={mapGradientMetric}
                                            coloredPauseSegments={showPauses ? pauseSegments : undefined}
                                            animationTrack={null}
                                            animationProgress={0}
                                            onExitAnimation={() => {}}
                                            fastestSplitForAnimation={null}
                                            animationHighlight={null}
                                            fitBoundsCounter={fitBoundsTrigger}
                                            selectedPoint={selectedPoint}
                                            onPointClick={handlePointSelect}
                                            hoveredLegendValue={hoveredMetricValue}
                                        />
                                    </div>
                                </div>
                            </ResizablePanel>
                        </div>
                    </main>
                </ResizablePanel>
            </div>
             <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default TrackEditor;
