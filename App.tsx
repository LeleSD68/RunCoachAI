
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import TrackEditor from './components/TrackEditor';
import TrackDetailView from './components/TrackDetailView';
import DiaryView from './components/DiaryView';
import ExplorerView from './components/ExplorerView';
import HomeModal from './components/HomeModal';
import WelcomeModal from './components/WelcomeModal';
import InitialChoiceModal from './components/InitialChoiceModal';
import GuideModal from './components/GuideModal';
import Changelog from './components/Changelog';
import UserProfileModal from './components/UserProfileModal';
import ToastContainer from './components/ToastContainer';
import Chatbot from './components/Chatbot';
import RaceControls from './components/RaceControls';
import RaceLeaderboard from './components/RacePaceBar';
import RaceSummary from './components/RaceSummary';
import { PostRaceStatsBar, PostRaceAISidebar } from './components/PostRaceAnalysis';
import VeoAnimationModal from './components/VeoAnimationModal';
import LiveCommentary from './components/LiveCommentary';
import WorkoutConfirmationModal from './components/WorkoutConfirmationModal';
import AiReviewModal from './components/AiReviewModal';
import RaceSetupModal from './components/RaceSetupModal';
import SplashScreen from './components/SplashScreen'; 
import MobileTrackSummary from './components/MobileTrackSummary';
import NavigationDock from './components/NavigationDock';
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel';
import ComparisonModal from './components/ComparisonModal';

import { Track, TrackPoint, UserProfile, Toast, RaceResult, TrackStats, PlannedWorkout, ApiUsageStats, Commentary } from './types';
import { loadTracksFromDB, saveTracksToDB, loadProfileFromDB, saveProfileToDB, loadPlannedWorkoutsFromDB, savePlannedWorkoutsToDB, exportAllData, importAllData, BackupData } from './services/dbService';
import { findPersonalRecordsForTrack, updateStoredPRs } from './services/prService';
import { calculateTrackStats } from './services/trackStatsService';
import { getTrackPointAtDistance, getTrackStateAtTime } from './services/trackEditorUtils';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { generateSmartTitle } from './services/titleGenerator';

const TRACK_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

const App: React.FC = () => {
  // --- STATE ---
  const [showSplash, setShowSplash] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
  const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mapFitTrigger, setMapFitTrigger] = useState(0); // Trigger to force map centering
  
  // Modals & Views
  const [showHome, setShowHome] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showInitialChoice, setShowInitialChoice] = useState(false);
  const [selectedDetailTrackId, setSelectedDetailTrackId] = useState<string | null>(null);
  const [editorTracks, setEditorTracks] = useState<Track[] | null>(null);
  const [showAiChatbot, setShowAiChatbot] = useState(false);
  const [showVeoModal, setShowVeoModal] = useState(false);
  const [veoTrack, setVeoTrack] = useState<Track | null>(null);
  const [aiReviewTrackId, setAiReviewTrackId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // New States for Navigation Dock
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [mobileSelectedTrackId, setMobileSelectedTrackId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Race / Simulation State
  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [simulationTime, setSimulationTime] = useState(0); 
  const [simulationSpeed, setSimulationSpeed] = useState(10);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [raceRanks, setRaceRanks] = useState<Map<string, number>>(new Map());
  const [runnerSpeeds, setRunnerSpeeds] = useState<Map<string, number>>(new Map()); 
  const [runnerDistances, setRunnerDistances] = useState<Map<string, number>>(new Map());
  const [runnerGaps, setRunnerGaps] = useState<Map<string, number>>(new Map()); 
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [showRaceSetup, setShowRaceSetup] = useState(false);
  
  // Analysis / Interaction
  const [selectedWorkoutIdForDiary, setSelectedWorkoutIdForDiary] = useState<string | null>(null);
  const [workoutConfirmation, setWorkoutConfirmation] = useState<PlannedWorkout | null>(null);
  const [liveCommentary, setLiveCommentary] = useState<Commentary[]>([]);
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);
  
  // API Usage Tracking
  const [apiUsage, setApiUsage] = useState<ApiUsageStats>({ rpm: 0, daily: 0, limitRpm: 15, limitDaily: 1500, totalTokens: 0 });
  
  // Animation Replay
  const [animationTrackId, setAnimationTrackId] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  
  const simulationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Worker Reference
  const parsingWorkerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  const closeAllViews = useCallback(() => {
      setShowHome(false);
      setShowDiary(false);
      setShowExplorer(false);
      setShowGuide(false);
      setShowProfile(false);
      setShowChangelog(false);
      setShowPerformancePanel(false);
      setShowAiChatbot(false);
      setShowRaceSetup(false);
      setShowComparison(false);
  }, []);

  const handleEnterRaceMode = useCallback(() => {
      setShowHome(false);
      setIsSidebarMobileOpen(true); // Ensures sidebar opens on mobile to pick tracks
      addToast("Seleziona dalla lista le tracce per la gara", "info");
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      const storedTracks = await loadTracksFromDB();
      const storedProfile = await loadProfileFromDB();
      const storedWorkouts = await loadPlannedWorkoutsFromDB();
      
      if (storedTracks.length > 0) {
        setTracks(storedTracks);
        setVisibleTrackIds(new Set(storedTracks.map(t => t.id)));
        setShowHome(true);
      } else {
        const hasVisited = localStorage.getItem('gpx-app-visited');
        if (!hasVisited) {
          setShowInitialChoice(true);
        } else {
          setShowHome(true);
        }
      }

      if (storedProfile) setUserProfile(storedProfile);
      if (storedWorkouts) setPlannedWorkouts(storedWorkouts);
    };
    init();
  }, []);

  // Worker Initialization
  useEffect(() => {
    let worker: Worker | null = null;
    try {
        let workerUrl: string | URL;
        try {
            workerUrl = new URL('./services/parsing.worker.ts', import.meta.url);
        } catch (e) {
            workerUrl = '/services/parsing.worker.ts';
        }
        
        try {
            worker = new Worker(workerUrl, { type: 'module' });
            
            worker.onmessage = (e) => {
                handleWorkerMessage(e.data);
            };
            
            worker.onerror = (e) => {
                console.warn("Worker error", e);
                parsingWorkerRef.current = null;
                setIsWorkerReady(false);
            };

            parsingWorkerRef.current = worker;
            setIsWorkerReady(true);
        } catch (err) {
            console.warn("Worker creation failed (likely security/CORS), falling back to main thread.", err);
            setIsWorkerReady(false);
        }
    } catch (e) {
        console.warn("Worker creation failed", e);
        parsingWorkerRef.current = null;
        setIsWorkerReady(false);
    }

    return () => {
        if (worker) worker.terminate();
    };
  }, []);

  // Global API Usage Setup
  useEffect(() => {
    window.gpxApp = {
      addTokens: (count) => { 
          if (count > 0) setApiUsage(prev => ({ ...prev, totalTokens: (prev.totalTokens || 0) + count }));
      },
      getDailyTokenCount: () => apiUsage.daily,
      trackApiRequest: () => {
        setApiUsage(prev => {
            return { ...prev, daily: prev.daily + 1, rpm: prev.rpm + 1 };
        });
        setTimeout(() => {
            setApiUsage(p => ({ ...p, rpm: Math.max(0, p.rpm - 1) }));
        }, 60000);
      }
    };
  }, []);

  const addToast = (message: string, type: Toast['type']) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const handleWorkerMessage = (data: any) => {
      const { newTracks, failedCount, skippedCount, errorMessages } = data;
      
      if (newTracks.length > 0) {
        setTracks(prevTracks => {
            const updatedTracks = [...prevTracks, ...newTracks];
            saveTracksToDB(updatedTracks);
            return updatedTracks;
        });
        
        const newIds = newTracks.map((t: Track) => t.id);
        setVisibleTrackIds(prev => new Set([...prev, ...newIds]));
        addToast(`${newTracks.length} tracciati importati con successo.`, 'success');
        
        newTracks.forEach((t: Track) => {
            const tDate = t.points[0].time.toDateString();
            const match = plannedWorkouts.find(w => new Date(w.date).toDateString() === tDate && !w.completedTrackId);
            if (match) {
                setWorkoutConfirmation(match);
            }
            const { updated, newRecordsCount } = updateStoredPRs(t, findPersonalRecordsForTrack(t));
            if (newRecordsCount > 0) {
               addToast(`${newTracks.length === 1 ? 'Nuovo' : newRecordsCount + ' Nuovi'} Record Personali rilevati!`, 'success');
            }
        });
      }

      if (skippedCount > 0) addToast(`${skippedCount} file ignorati (duplicati).`, 'info');
      if (failedCount > 0) addToast(`Impossibile importare ${failedCount} file.`, 'error');
  };

  const processFilesOnMainThread = async (files: File[]) => {
      const existingFingerprints = new Set(tracks.map(t => `${t.points.length}-${t.duration}-${t.distance.toFixed(5)}`));
      const newTracks: Track[] = [];
      let skippedCount = 0;
      let failedCount = 0;
      const errorMessages: string[] = [];
      let newTracksCount = 0;

      for (const file of files) {
        try {
            const fileContent = await file.text();
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            let parsedData = null;

            if (fileExtension === 'gpx') {
                parsedData = parseGpx(fileContent, file.name);
            } else if (fileExtension === 'tcx') {
                parsedData = parseTcx(fileContent, file.name);
            }

            if (parsedData) {
                const newTrackFingerprint = `${parsedData.points.length}-${parsedData.duration}-${parsedData.distance.toFixed(5)}`;
                if (existingFingerprints.has(newTrackFingerprint)) {
                    skippedCount++;
                } else {
                    const smartData = generateSmartTitle(parsedData.points, parsedData.distance, parsedData.name);
                    const newTrack: Track = {
                        id: `${file.name}-${new Date().getTime()}`,
                        name: smartData.title,
                        points: parsedData.points,
                        color: TRACK_COLORS[(tracks.length + newTracksCount) % TRACK_COLORS.length],
                        distance: parsedData.distance,
                        duration: parsedData.duration,
                        folder: smartData.folder,
                        activityType: smartData.activityType
                    };
                    newTracks.push(newTrack);
                    existingFingerprints.add(newTrackFingerprint);
                    newTracksCount++;
                }
            } else {
                failedCount++;
                errorMessages.push(`Failed to parse: ${file.name}`);
            }
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            failedCount++;
            errorMessages.push(`Error processing ${file.name}: ${(error as Error).message}`);
        }
      }

      handleWorkerMessage({ newTracks, failedCount, skippedCount, errorMessages });
  };

  const handleUploadOpponent = async (files: File[]) => {
      const newGhostTracks: Track[] = [];
      for (const file of files) {
          try {
              const fileContent = await file.text();
              const ext = file.name.split('.').pop()?.toLowerCase();
              let parsedData = null;
              if (ext === 'gpx') parsedData = parseGpx(fileContent, file.name);
              else if (ext === 'tcx') parsedData = parseTcx(fileContent, file.name);

              if (parsedData) {
                  const ghostTrack: Track = {
                      id: `ghost-${Date.now()}-${Math.random()}`,
                      name: `GHOST: ${parsedData.name}`,
                      points: parsedData.points,
                      color: '#ffffff', // White for ghosts? Or distinct neon
                      distance: parsedData.distance,
                      duration: parsedData.duration,
                      isExternal: true, // IMPORTANT
                      activityType: 'Altro'
                  };
                  newGhostTracks.push(ghostTrack);
              }
          } catch (e) {
              console.error("Failed to load opponent", e);
              addToast(`Errore caricamento ${file.name}`, 'error');
          }
      }

      if (newGhostTracks.length > 0) {
          setTracks(prev => [...prev, ...newGhostTracks]);
          // Add to selection automatically for the race setup
          setRaceSelectionIds(prev => {
              const next = new Set(prev);
              newGhostTracks.forEach(t => next.add(t.id));
              return next;
          });
          setVisibleTrackIds(prev => {
              const next = new Set(prev);
              newGhostTracks.forEach(t => next.add(t.id));
              return next;
          });
          addToast(`${newGhostTracks.length} sfidanti aggiunti!`, 'success');
      }
  };

  const handleRemoveFromRaceSetup = (trackId: string) => {
      // Find track
      const track = tracks.find(t => t.id === trackId);
      if (!track) return;

      if (track.isExternal) {
          // If it's a ghost/external track, remove it completely from state
          setTracks(prev => prev.filter(t => t.id !== trackId));
          setRaceSelectionIds(prev => { 
              const next = new Set(prev); 
              next.delete(trackId); 
              return next; 
          });
          setVisibleTrackIds(prev => {
              const next = new Set(prev);
              next.delete(trackId);
              return next;
          });
      } else {
          // If it's a user track, just deselect it
          setRaceSelectionIds(prev => { 
              const next = new Set(prev); 
              next.delete(trackId); 
              return next; 
          });
      }
  };

  // --- FILE HANDLING ---
  const handleFileUpload = (files: File[] | null) => {
    if (!files || files.length === 0) return;
    
    if (parsingWorkerRef.current && isWorkerReady) {
        const existingFingerprints = new Set(tracks.map(t => `${t.points.length}-${t.duration}-${t.distance.toFixed(5)}`));
        parsingWorkerRef.current.postMessage({
          files,
          existingTrackFingerprints: existingFingerprints,
          colors: TRACK_COLORS,
          tracksLength: tracks.length
        });
    } else {
        addToast("Elaborazione file in corso...", "info");
        processFilesOnMainThread(files);
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data: BackupData = JSON.parse(text);
      await importAllData(data);
      
      const [t, p, w] = await Promise.all([loadTracksFromDB(), loadProfileFromDB(), loadPlannedWorkoutsFromDB()]);
      setTracks(t);
      if (p) setUserProfile(p);
      setPlannedWorkouts(w);
      
      setVisibleTrackIds(new Set(t.map(tr => tr.id)));
      setShowInitialChoice(false);
      setShowHome(true);
      addToast('Backup ripristinato correttamente.', 'success');
    } catch (e) {
      addToast('Errore durante il ripristino del backup.', 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `runcoach_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('Backup esportato.', 'success');
    } catch (e) {
      addToast('Errore esportazione.', 'error');
    }
  };

  // --- WORKOUT MANAGEMENT ---
  const handleAddPlannedWorkout = (workout: PlannedWorkout) => {
    const updated = [...plannedWorkouts, workout];
    setPlannedWorkouts(updated);
    savePlannedWorkoutsToDB(updated);
    addToast('Allenamento aggiunto al diario.', 'success');
  };

  const handleUpdatePlannedWorkout = (workout: PlannedWorkout) => {
    const updated = plannedWorkouts.map(w => w.id === workout.id ? workout : w);
    setPlannedWorkouts(updated);
    savePlannedWorkoutsToDB(updated);
    addToast('Allenamento aggiornato.', 'success');
  };

  const handleDeletePlannedWorkout = (id: string) => {
    const updated = plannedWorkouts.filter(w => w.id !== id);
    setPlannedWorkouts(updated);
    savePlannedWorkoutsToDB(updated);
    addToast('Allenamento rimosso.', 'info');
  };

  const handleMassUpdatePlannedWorkouts = (workoutsToUpdate: PlannedWorkout[]) => {
      let updated = [...plannedWorkouts];
      workoutsToUpdate.forEach(w => {
          const index = updated.findIndex(existing => existing.id === w.id);
          if (index >= 0) updated[index] = w;
          else updated.push(w);
      });
      setPlannedWorkouts(updated);
      savePlannedWorkoutsToDB(updated);
      addToast(`${workoutsToUpdate.length} allenamenti aggiornati.`, 'success');
  };

  const confirmWorkoutLink = (workoutId: string) => {
      const lastTrack = tracks[tracks.length - 1]; 
      if (lastTrack) {
          const updatedTrack = { ...lastTrack, linkedWorkout: plannedWorkouts.find(w => w.id === workoutId) };
          handleUpdateTrackMetadata(lastTrack.id, { linkedWorkout: updatedTrack.linkedWorkout });
          
          const updatedWorkouts = plannedWorkouts.map(w => w.id === workoutId ? { ...w, completedTrackId: lastTrack.id } : w);
          setPlannedWorkouts(updatedWorkouts);
          savePlannedWorkoutsToDB(updatedWorkouts);
      }
      setWorkoutConfirmation(null);
  };

  // --- TRACK METADATA ---
  const handleUpdateTrackMetadata = (id: string, meta: Partial<Track>) => {
    const updatedTracks = tracks.map(t => t.id === id ? { ...t, ...meta } : t);
    setTracks(updatedTracks);
    saveTracksToDB(updatedTracks);
  };

  const handleDeleteTrack = (id: string) => {
    const updatedTracks = tracks.filter(t => t.id !== id);
    setTracks(updatedTracks);
    saveTracksToDB(updatedTracks);
    setVisibleTrackIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    addToast('Traccia eliminata.', 'info');
  };

  // --- SIMULATION / RACE ---
  const handleStartRace = () => {
      if (raceSelectionIds.size < 2) {
          if (raceSelectionIds.size === 1) {
              setShowRaceSetup(true);
              return;
          }
          return;
      }
      setShowRaceSetup(true);
  };

  const confirmRaceStart = (renamedMap: Record<string, string>) => {
      setSimulationState('running');
      setSimulationTime(0);
      setRaceResults([]);
      setShowRaceSetup(false);
      lastTimeRef.current = performance.now();
      setMapFitTrigger(prev => prev + 1); // TRIGGER MAP FIT
      requestAnimationFrame(gameLoop);
  };

  const gameLoop = (time: number) => {
      if (simulationState === 'paused' || simulationState === 'finished') return;
      
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      setSimulationTime(prev => {
          const newTime = prev + delta * simulationSpeed;
          const selectedTracks = tracks.filter(t => raceSelectionIds.has(t.id));
          const maxDuration = Math.max(...selectedTracks.map(t => t.duration));
          
          if (newTime >= maxDuration) {
              setSimulationState('finished');
              const results: RaceResult[] = selectedTracks.map((t, i) => ({
                  rank: i + 1, 
                  trackId: t.id,
                  name: t.name,
                  color: t.color,
                  finishTime: t.duration,
                  avgSpeed: t.distance / (t.duration / 3600000),
                  distance: t.distance
              })).sort((a, b) => a.finishTime - b.finishTime);
              
              results.forEach((r, i) => r.rank = i + 1);
              setRaceResults(results);
              return maxDuration;
          }
          return newTime;
      });
      
      if (simulationState === 'running') {
          simulationRef.current = requestAnimationFrame(gameLoop);
      }
  };

  useEffect(() => {
      if (simulationState === 'running') {
          lastTimeRef.current = performance.now();
          simulationRef.current = requestAnimationFrame(gameLoop);
      } else {
          if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
      }
      return () => { if (simulationRef.current) cancelAnimationFrame(simulationRef.current); };
  }, [simulationState, simulationSpeed]);

  const raceRunners = useMemo(() => {
      if (simulationState === 'idle') return null;
      
      const selectedTracks = tracks.filter(t => raceSelectionIds.has(t.id));
      const windowMs = simulationSpeed > 20 ? 30000 : 10000; // 30s or 10s smoothing based on speed
      
      // Calculate positions and current distances
      const currentRunners = selectedTracks.map(t => {
          const currentState = getTrackStateAtTime(t, simulationTime);
          const prevState = getTrackStateAtTime(t, Math.max(0, simulationTime - windowMs));
          
          let pace = 0;
          if (currentState && prevState) {
              const distDelta = currentState.distance - prevState.distance;
              const timeDelta = windowMs / 1000 / 60; // minutes
              if (distDelta > 0.005) { // min 5m movement to avoid noise
                  pace = timeDelta / distDelta;
              }
          }

          return {
              trackId: t.id,
              position: currentState ? currentState.point : t.points[t.points.length - 1],
              distance: currentState ? currentState.distance : t.distance,
              color: t.color,
              pace
          };
      });

      // Calculate Ranks & Gaps
      // Sort by distance covered descending
      currentRunners.sort((a, b) => b.distance - a.distance);
      
      const ranks = new Map<string, number>();
      const gaps = new Map<string, number>();
      const leaderDistance = currentRunners.length > 0 ? currentRunners[0].distance : 0;

      currentRunners.forEach((r, idx) => {
          ranks.set(r.trackId, idx + 1);
          const gapMeters = (leaderDistance - r.distance) * 1000;
          gaps.set(r.trackId, gapMeters);
      });

      setRaceRanks(ranks);
      setRunnerGaps(gaps);

      return currentRunners;
  }, [simulationState, simulationTime, tracks, raceSelectionIds]);

  const handleMobileSummaryClick = () => {
      if (mobileSelectedTrackId) {
          setSelectedDetailTrackId(mobileSelectedTrackId);
          setMobileSelectedTrackId(null);
      }
  };

  const handleMobileSummaryClose = () => {
      setMobileSelectedTrackId(null);
  };

  const handleMapTrackClick = (trackId: string, isMultiSelect?: boolean) => {
        if (simulationState !== 'idle' && simulationState !== 'finished' && !isAnimationPlaying) return;

        if (isMultiSelect) {
            setRaceSelectionIds(prev => {
                const next = new Set(prev);
                if (next.has(trackId)) next.delete(trackId);
                else next.add(trackId);
                return next;
            });
            return;
        }

        if (isMobile) {
            setMobileSelectedTrackId(trackId);
            setHoveredTrackId(trackId);
        } else {
            setSelectedDetailTrackId(trackId);
            setHoveredTrackId(trackId);
        }
  };

  const selectedDetailTrack = useMemo(() => tracks.find(t => t.id === selectedDetailTrackId), [tracks, selectedDetailTrackId]);
  const animationTrack = useMemo(() => animationTrackId ? tracks.find(t => t.id === animationTrackId) : null, [tracks, animationTrackId]);
  const mobileSelectedTrack = useMemo(() => mobileSelectedTrackId ? tracks.find(t => t.id === mobileSelectedTrackId) : null, [tracks, mobileSelectedTrackId]);
  const reviewTrack = useMemo(() => aiReviewTrackId ? tracks.find(t => t.id === aiReviewTrackId) : null, [tracks, aiReviewTrackId]);

  return (
    <div className="h-screen w-screen bg-slate-900 text-white overflow-hidden flex flex-col">
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

        <div className={`flex-grow flex overflow-hidden relative ${isMobile ? 'flex-col' : 'flex-row'}`}>
            
            {(!selectedDetailTrackId && !editorTracks) && (
                <div 
                    className={`
                        z-20 transition-all duration-300 bg-slate-900
                        ${showHome ? 'w-0 opacity-0 overflow-hidden' : ''}
                        ${isMobile 
                            ? (isSidebarMobileOpen ? 'h-[70%] w-full order-1 border-b border-slate-700' : 'h-0 w-full opacity-0 overflow-hidden order-1') 
                            : 'w-80 h-full shrink-0 border-r border-slate-800 order-1'
                        }
                    `}
                >
                    <Sidebar
                        tracks={tracks}
                        onFileUpload={handleFileUpload}
                        visibleTrackIds={visibleTrackIds}
                        onToggleVisibility={(id) => setVisibleTrackIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                        raceSelectionIds={raceSelectionIds}
                        onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                        onDeselectAll={() => setRaceSelectionIds(new Set())}
                        onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                        onStartRace={handleStartRace}
                        onGoToEditor={() => {
                            const selected = tracks.filter(t => raceSelectionIds.has(t.id));
                            if (selected.length > 0) setEditorTracks(selected);
                        }}
                        onCompareSelected={() => setShowComparison(true)}
                        onPauseRace={() => setSimulationState('paused')}
                        onResumeRace={() => setSimulationState('running')}
                        onResetRace={() => { setSimulationState('idle'); setRaceResults([]); }}
                        simulationState={simulationState}
                        simulationTime={simulationTime}
                        onTrackHoverStart={setHoveredTrackId}
                        onTrackHoverEnd={() => setHoveredTrackId(null)}
                        hoveredTrackId={hoveredTrackId}
                        raceProgress={new Map()}
                        simulationSpeed={simulationSpeed}
                        onSpeedChange={setSimulationSpeed}
                        lapTimes={new Map()}
                        sortOrder={'date_desc'}
                        onSortChange={() => {}}
                        onDeleteTrack={handleDeleteTrack}
                        onDeleteSelected={() => { raceSelectionIds.forEach(id => handleDeleteTrack(id)); setRaceSelectionIds(new Set()); }}
                        onViewDetails={setSelectedDetailTrackId}
                        onStartAnimation={(id) => { setAnimationTrackId(id); setIsAnimationPlaying(true); }}
                        raceRanks={raceRanks}
                        runnerSpeeds={runnerSpeeds}
                        runnerDistances={runnerDistances}
                        runnerGapsToLeader={runnerGaps}
                        collapsedGroups={new Set()}
                        onToggleGroup={() => {}}
                        onOpenChangelog={() => setShowChangelog(true)}
                        onOpenProfile={() => setShowProfile(true)}
                        onOpenGuide={() => setShowGuide(true)}
                        onOpenDiary={() => setShowDiary(true)}
                        dailyTokenUsage={{ used: apiUsage.daily, limit: apiUsage.limitDaily }}
                        onExportBackup={handleExportBackup}
                        onImportBackup={() => {}}
                        onCloseMobile={() => setIsSidebarMobileOpen(false)} 
                        onUpdateTrackMetadata={handleUpdateTrackMetadata}
                        onRegenerateTitles={() => {}}
                        onToggleExplorer={() => setShowExplorer(true)}
                        showExplorer={showExplorer}
                        listViewMode={'full'}
                        onListViewModeChange={() => {}}
                        onAiBulkRate={() => {}}
                        onOpenReview={(id) => setAiReviewTrackId(id)}
                        mobileRaceMode={false}
                        monthlyStats={{ totalDistance: 0, totalDuration: 0, activityCount: 0, avgPace: 0 }}
                        plannedWorkouts={plannedWorkouts}
                        onOpenPlannedWorkout={(id) => { setSelectedWorkoutIdForDiary(id); setShowDiary(true); }}
                        apiUsageStats={apiUsage}
                        onOpenHub={() => setShowHome(true)}
                        onOpenPerformanceAnalysis={() => setShowPerformancePanel(true)}
                    />
                </div>
            )}

            {/* Map Area Wrapper */}
            <div className={`
                relative transition-all duration-300
                ${selectedDetailTrackId || editorTracks ? 'h-full w-full' : ''}
                ${!selectedDetailTrackId && !editorTracks 
                    ? (isMobile 
                        ? (isSidebarMobileOpen ? 'h-[30%] order-2' : 'h-full order-2') 
                        : 'flex-grow h-full order-2')
                    : ''
                }
            `}>
                {selectedDetailTrack ? (
                    <TrackDetailView 
                        track={selectedDetailTrack}
                        userProfile={userProfile}
                        onExit={() => { setSelectedDetailTrackId(null); setHoveredTrackId(null); }}
                        allHistory={tracks}
                        onUpdateTrackMetadata={handleUpdateTrackMetadata}
                        onAddPlannedWorkout={handleAddPlannedWorkout}
                        onStartAnimation={(id) => { setAnimationTrackId(id); setIsAnimationPlaying(true); }}
                        onOpenReview={setAiReviewTrackId}
                    />
                ) : editorTracks ? (
                    <TrackEditor 
                        initialTracks={editorTracks}
                        onExit={(updated) => {
                            if (updated) {
                                const newTracks = [...tracks, updated];
                                setTracks(newTracks);
                                saveTracksToDB(newTracks);
                                addToast('Traccia modificata salvata.', 'success');
                            }
                            setEditorTracks(null);
                        }}
                        addToast={addToast}
                    />
                ) : (
                    <>
                        <MapDisplay 
                            tracks={tracks}
                            visibleTrackIds={visibleTrackIds}
                            selectedTrackIds={raceSelectionIds}
                            raceRunners={raceRunners}
                            hoveredTrackId={hoveredTrackId}
                            runnerSpeeds={runnerSpeeds}
                            mapGradientMetric={'none'}
                            animationTrack={animationTrack}
                            animationProgress={animationProgress}
                            isAnimationPlaying={isAnimationPlaying}
                            onToggleAnimationPlay={() => setIsAnimationPlaying(!isAnimationPlaying)}
                            onAnimationProgressChange={setAnimationProgress}
                            animationSpeed={simulationSpeed}
                            onAnimationSpeedChange={setSimulationSpeed}
                            onExitAnimation={() => { setAnimationTrackId(null); setIsAnimationPlaying(false); setAnimationProgress(0); }}
                            onTrackClick={handleMapTrackClick}
                            fitBoundsCounter={mapFitTrigger} 
                            onTrackHover={setHoveredTrackId}
                        />
                        
                        {simulationState !== 'idle' && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                                <RaceControls 
                                    simulationState={simulationState}
                                    simulationTime={simulationTime}
                                    simulationSpeed={simulationSpeed}
                                    onPause={() => setSimulationState('paused')}
                                    onResume={() => setSimulationState('running')}
                                    onStop={() => { setSimulationState('idle'); setRaceResults([]); }}
                                    onSpeedChange={setSimulationSpeed}
                                />
                            </div>
                        )}
                        
                        {simulationState !== 'idle' && (
                            <div className="absolute top-20 right-4 z-20">
                                <RaceLeaderboard 
                                    racers={tracks.filter(t => raceSelectionIds.has(t.id))}
                                    ranks={raceRanks}
                                    gaps={runnerGaps}
                                />
                            </div>
                        )}
                        
                        {!simulationState.startsWith('run') && (
                            <div className="absolute bottom-24 right-6 md:bottom-6 md:right-6 z-30">
                                <button 
                                    onClick={() => setShowAiChatbot(true)} 
                                    className="bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center"
                                    title="Coach AI"
                                >
                                    <span className="text-2xl">🤖</span>
                                </button>
                            </div>
                        )}

                        {mobileSelectedTrack && !selectedDetailTrackId && (
                            <MobileTrackSummary 
                                track={mobileSelectedTrack}
                                onClick={handleMobileSummaryClick}
                                onClose={handleMobileSummaryClose}
                            />
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Persistent Navigation Dock */}
        {!editorTracks && !showHome && !showDiary && !showExplorer && !selectedDetailTrackId && !showAiChatbot && !simulationState.startsWith('run') && (
            <NavigationDock 
                onOpenSidebar={() => { closeAllViews(); setIsSidebarMobileOpen(true); }}
                onCloseSidebar={() => { closeAllViews(); setSelectedDetailTrackId(null); setIsSidebarMobileOpen(false); }}
                isSidebarOpen={isSidebarMobileOpen}
                onOpenExplorer={() => { closeAllViews(); setShowExplorer(true); }}
                onOpenDiary={() => { closeAllViews(); setShowDiary(true); }}
                onOpenPerformance={() => { closeAllViews(); setShowPerformancePanel(true); }}
                onOpenGuide={() => setShowGuide(true)}
                onExportBackup={handleExportBackup}
                onOpenHub={() => { closeAllViews(); setShowHome(true); }}
            />
        )}

        {/* MODALS */}
        {showInitialChoice && (
            <InitialChoiceModal 
                onImportBackup={handleImportBackup} 
                onStartNew={() => { setShowInitialChoice(false); setShowWelcome(true); }}
                onClose={() => setShowInitialChoice(false)}
            />
        )}

        {showWelcome && (
            <WelcomeModal onClose={() => { setShowWelcome(false); setShowProfile(true); }} />
        )}

        {showHome && (
            <HomeModal 
                trackCount={tracks.length}
                plannedWorkouts={plannedWorkouts}
                onOpenDiary={() => { setShowHome(false); setShowDiary(true); }}
                onOpenExplorer={() => { setShowHome(false); setShowExplorer(true); }}
                onOpenHelp={() => { setShowHome(false); setShowGuide(true); }}
                onImportBackup={handleImportBackup}
                onExportBackup={handleExportBackup}
                onUploadTracks={handleFileUpload}
                onClose={() => setShowHome(false)}
                onOpenWorkout={(workoutId) => {
                    setSelectedWorkoutIdForDiary(workoutId);
                    setShowHome(false);
                    setShowDiary(true);
                }}
                onOpenProfile={() => setShowProfile(true)}
                onOpenChangelog={() => setShowChangelog(true)}
                onUploadOpponent={handleUploadOpponent}
                onEnterRaceMode={handleEnterRaceMode}
            />
        )}

        {showDiary && (
            <DiaryView 
                tracks={tracks}
                plannedWorkouts={plannedWorkouts}
                userProfile={userProfile}
                onClose={() => setShowDiary(false)}
                onSelectTrack={(id) => { setShowDiary(false); setSelectedDetailTrackId(id); }}
                onDeletePlannedWorkout={handleDeletePlannedWorkout}
                onAddPlannedWorkout={handleAddPlannedWorkout}
                onUpdatePlannedWorkout={handleUpdatePlannedWorkout}
                onMassUpdatePlannedWorkouts={handleMassUpdatePlannedWorkouts}
                onOpenTrackChat={(id) => { setShowDiary(false); setSelectedDetailTrackId(id); }}
                onOpenGlobalChat={() => { setShowDiary(false); setShowAiChatbot(true); }}
                initialSelectedWorkoutId={selectedWorkoutIdForDiary}
            />
        )}

        {showExplorer && (
            <ExplorerView 
                tracks={tracks}
                onClose={() => setShowExplorer(false)}
                onSelectTrack={(id) => { setShowExplorer(false); setSelectedDetailTrackId(id); }}
            />
        )}

        {showProfile && (
            <UserProfileModal 
                onClose={() => setShowProfile(false)}
                onSave={(p) => { setUserProfile(p); saveProfileToDB(p); }}
                currentProfile={userProfile}
                tracks={tracks}
            />
        )}

        {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
        {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
        
        {showAiChatbot && (
            <div className={`z-[12000] ${isMobile ? '' : 'fixed bottom-20 right-6'}`}>
                <Chatbot 
                    tracksToAnalyze={tracks}
                    userProfile={userProfile}
                    onClose={() => setShowAiChatbot(false)}
                    isStandalone={true}
                    onAddPlannedWorkout={handleAddPlannedWorkout}
                />
            </div>
        )}

        {showRaceSetup && (
            <RaceSetupModal 
                tracks={tracks.filter(t => raceSelectionIds.has(t.id))}
                onConfirm={confirmRaceStart}
                onCancel={() => setShowRaceSetup(false)}
                onAddOpponent={handleUploadOpponent}
                onRemoveTrack={handleRemoveFromRaceSetup}
            />
        )}

        {raceResults.length > 0 && simulationState === 'finished' && (
            <RaceSummary 
                results={raceResults}
                racerStats={new Map(raceResults.map(r => [r.trackId, calculateTrackStats(tracks.find(t => t.id === r.trackId)!)]))}
                onClose={() => { setRaceResults([]); setSimulationState('idle'); }}
                userProfile={userProfile}
                tracks={tracks}
            />
        )}

        {workoutConfirmation && (
            <WorkoutConfirmationModal 
                workout={workoutConfirmation}
                onConfirm={() => confirmWorkoutLink(workoutConfirmation.id)}
                onCancel={() => setWorkoutConfirmation(null)}
            />
        )}

        {aiReviewTrackId && (
            <AiReviewModal 
                track={tracks.find(t => t.id === aiReviewTrackId)!}
                userProfile={userProfile}
                onClose={() => setAiReviewTrackId(null)}
            />
        )}

        {showPerformancePanel && (
            <PerformanceAnalysisPanel 
                tracks={tracks}
                userProfile={userProfile}
                onClose={() => setShowPerformancePanel(false)}
            />
        )}

        {showComparison && (
            <ComparisonModal 
                tracks={tracks.filter(t => raceSelectionIds.has(t.id))} 
                onClose={() => setShowComparison(false)} 
            />
        )}

        {/* Global Components */}
        <ToastContainer toasts={toasts} setToasts={setToasts} />
        {isCommentaryLoading && <LiveCommentary messages={liveCommentary} isLoading={true} />}
    </div>
  );
};

export default App;
