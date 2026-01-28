
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
import AuthSelectionModal from './components/AuthSelectionModal';
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
import LoginModal from './components/LoginModal'; 
import ResizablePanel from './components/ResizablePanel';

import { Track, TrackPoint, UserProfile, Toast, RaceResult, TrackStats, PlannedWorkout, ApiUsageStats, Commentary } from './types';
import { loadTracksFromDB, saveTracksToDB, loadProfileFromDB, saveProfileToDB, loadPlannedWorkoutsFromDB, savePlannedWorkoutsToDB, exportAllData, importAllData, syncBackupToCloud, BackupData, syncTrackToCloud, restoreAllChatsFromCloud } from './services/dbService';
import { findPersonalRecordsForTrack, updateStoredPRs } from './services/prService';
import { calculateTrackStats } from './services/trackStatsService';
import { getTrackPointAtDistance, getTrackStateAtTime, getSmoothedPace } from './services/trackEditorUtils';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { generateSmartTitle } from './services/titleGenerator';
import { generateAiRating } from './services/aiHelper';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const TRACK_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

const GUEST_AI_LIMIT = 4;
const GUEST_REPLAY_LIMIT_MS = 10000; // 10 seconds

const App: React.FC = () => {
  // --- STATE ---
  const [showSplash, setShowSplash] = useState(true);
  const [showAuthSelection, setShowAuthSelection] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalLimitMessage, setLoginModalLimitMessage] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // New state for sync loading screen

  const [isGuest, setIsGuest] = useState(true);
  const [guestAiUsage, setGuestAiUsage] = useState<number>(() => parseInt(localStorage.getItem('guest_ai_usage') || '0'));

  const [tracks, setTracks] = useState<Track[]>([]);
  const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
  const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
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
  const [simulationTime, setSimulationTime] = useState(0); // ms
  const [simulationSpeed, setSimulationSpeed] = useState(10);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [raceRanks, setRaceRanks] = useState<Map<string, number>>(new Map());
  const [runnerSpeeds, setRunnerSpeeds] = useState<Map<string, number>>(new Map()); // km/h
  const [runnerDistances, setRunnerDistances] = useState<Map<string, number>>(new Map());
  const [runnerGaps, setRunnerGaps] = useState<Map<string, number>>(new Map()); // meters to leader
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

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

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

  const loadDataAndEnter = useCallback(async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          setIsGuest(!session);

          const storedTracks = await loadTracksFromDB();
          const storedProfile = await loadProfileFromDB();
          const storedWorkouts = await loadPlannedWorkoutsFromDB();
          
          restoreAllChatsFromCloud().catch(e => console.warn("Failed to sync chats", e));
          
          setTracks(storedTracks);
          if (storedProfile) setUserProfile(storedProfile);
          if (storedWorkouts) setPlannedWorkouts(storedWorkouts);

          if (storedTracks.length > 0) {
              if (simulationState === 'idle') {
                  setVisibleTrackIds(new Set(storedTracks.map(t => t.id)));
              }
              setShowHome(true);
          } else {
              const hasVisited = localStorage.getItem('gpx-app-visited');
              if (!hasVisited) {
                  setShowInitialChoice(true);
              } else {
                  setShowHome(true);
              }
          }
          
          if (storedProfile && storedProfile.name) {
              addToast(`Bentornato ${storedProfile.name}! Profilo e dati sincronizzati.`, 'success');
          } else if (storedTracks.length > 0) {
              addToast('Profilo e Dati sincronizzati.', 'success');
          }

      } catch (error) {
          console.error("Error loading data:", error);
          setShowInitialChoice(true);
          addToast("Impossibile caricare alcuni dati dal cloud.", "error");
      }
  }, [simulationState, addToast]);

  const handleSplashFinish = async () => {
      setShowSplash(false);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
          setIsSyncing(true); // START WAITING SCREEN
          await loadDataAndEnter();
          setIsSyncing(false); // STOP WAITING SCREEN
      } else {
          setShowAuthSelection(true);
      }
  };

  const checkAiAccess = useCallback(() => {
      if (!isGuest) return true;
      if (guestAiUsage < GUEST_AI_LIMIT) {
          const newUsage = guestAiUsage + 1;
          setGuestAiUsage(newUsage);
          localStorage.setItem('guest_ai_usage', newUsage.toString());
          
          const remaining = GUEST_AI_LIMIT - newUsage;
          if (remaining > 0) {
              addToast(`AI Attivata. Ti rimangono ${remaining} utilizzi gratuiti.`, "info");
          } else {
              addToast("Hai utilizzato l'ultimo credito AI gratuito.", "info");
          }
          
          return true;
      } else {
          setLoginModalLimitMessage(true);
          setShowLoginModal(true);
          return false;
      }
  }, [isGuest, guestAiUsage, addToast]);

  // Global API Usage Setup
  useEffect(() => {
    window.gpxApp = {
      addTokens: (count) => { 
        setApiUsage(prev => ({ ...prev, totalTokens: prev.totalTokens + count }));
      },
      getDailyTokenCount: () => apiUsage.daily,
      trackApiRequest: () => {
        setApiUsage(prev => {
          const newDaily = prev.daily + 1;
          const newRpm = prev.rpm + 1;
          setTimeout(() => setApiUsage(p => ({ ...p, rpm: Math.max(0, p.rpm - 1) })), 60000);
          return { ...prev, daily: newDaily, rpm: newRpm };
        });
      }
    };
  }, []);

  const handleAutoAiRating = async (newTracks: Track[]) => {
      // Check limits before starting automatic background analysis
      // We only rate the first track if guest to prevent eating all credits instantly
      const limit = isGuest ? 1 : newTracks.length;
      const tracksToRate = newTracks.slice(0, limit);

      if (tracksToRate.length === 0) return;
      // We don't call checkAiAccess here to avoid blocking import, 
      // but we respect the logic: if out of credits, we skip silently or log.
      if (isGuest && guestAiUsage >= GUEST_AI_LIMIT) return;

      for (const t of tracksToRate) {
          try {
             // Increment usage if guest
             if (isGuest) {
                 const current = parseInt(localStorage.getItem('guest_ai_usage') || '0');
                 if (current >= GUEST_AI_LIMIT) break;
                 setGuestAiUsage(current + 1);
                 localStorage.setItem('guest_ai_usage', (current + 1).toString());
             }

             // Find planned workout for this date
             const tDate = t.points[0].time.toDateString();
             const linkedWorkout = plannedWorkouts.find(w => new Date(w.date).toDateString() === tDate);

             const ratingResult = await generateAiRating(t, tracks, userProfile, linkedWorkout);
             
             if (ratingResult) {
                 handleUpdateTrackMetadata(t.id, { 
                     rating: ratingResult.rating, 
                     ratingReason: ratingResult.reason 
                 });
                 addToast(`Valutazione AI per "${t.name}": ${ratingResult.rating}/5 ⭐`, 'success');
             }
          } catch (e) {
              console.error("Auto rating failed", e);
          }
      }
  };

  const processFilesOnMainThread = async (files: File[]) => {
      const existingFingerprints = new Set(tracks.map(t => `${t.points.length}-${t.duration}-${t.distance.toFixed(5)}`));
      const newTracks: Track[] = [];
      let skippedCount = 0;
      let failedCount = 0;
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
            }
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            failedCount++;
        }
      }

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
            syncTrackToCloud(t);
            const tDate = t.points[0].time.toDateString();
            const match = plannedWorkouts.find(w => new Date(w.date).toDateString() === tDate && !w.completedTrackId);
            if (match) {
                setWorkoutConfirmation(match);
            }
            const { newRecordsCount } = updateStoredPRs(t, findPersonalRecordsForTrack(t));
            if (newRecordsCount > 0) {
               addToast(`${newTracks.length === 1 ? 'Nuovo' : newRecordsCount + ' Nuovi'} Record Personali rilevati!`, 'success');
            }
        });

        // Trigger AI Rating in background
        handleAutoAiRating(newTracks);
      }

      if (skippedCount > 0) addToast(`${skippedCount} file ignorati (duplicati).`, 'info');
      if (failedCount > 0) addToast(`Impossibile importare ${failedCount} file.`, 'error');
  };

  const handleAddOpponent = async (files: File[]) => {
      const newTracks: Track[] = [];
      let count = 0;
      for (const file of files) {
          try {
              const fileContent = await file.text();
              const fileExtension = file.name.split('.').pop()?.toLowerCase();
              let parsedData = null;
              if (fileExtension === 'gpx') parsedData = parseGpx(fileContent, file.name);
              else if (fileExtension === 'tcx') parsedData = parseTcx(fileContent, file.name);

              if (parsedData) {
                  const newTrack: Track = {
                      id: `ghost-${Date.now()}-${count}`,
                      name: `GHOST: ${parsedData.name}`,
                      points: parsedData.points,
                      color: '#94a3b8', // Slate color for ghosts
                      distance: parsedData.distance,
                      duration: parsedData.duration,
                      isExternal: true
                  };
                  newTracks.push(newTrack);
                  count++;
              }
          } catch(e) { console.error(e); }
      }

      if (newTracks.length > 0) {
          setTracks(prev => [...prev, ...newTracks]);
          setRaceSelectionIds(prev => {
              const next = new Set(prev);
              newTracks.forEach(t => next.add(t.id));
              return next;
          });
          addToast(`${newTracks.length} avversari caricati.`, 'success');
      }
  };

  const handleRemoveRaceTrack = (id: string) => {
      setRaceSelectionIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
      });
      // If it's a ghost/external track, completely remove it from the track list
      setTracks(prev => prev.filter(t => t.id !== id || !t.isExternal));
  };

  // --- FILE HANDLING ---
  const handleFileUpload = (files: File[] | null) => {
    if (!files || files.length === 0) return;
    addToast("Elaborazione file in corso...", "info");
    processFilesOnMainThread(files);
  };

  const handleManualCloudSave = async () => {
      if (!isSupabaseConfigured()) {
          addToast("Cloud non configurato. Impossibile salvare.", "error");
          return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
          addToast("Accedi o registrati per salvare i dati.", "info");
          setLoginModalLimitMessage(false);
          setShowLoginModal(true);
          return;
      }
      
      addToast("Inizio salvataggio forzato su Database...", "info");
      
      try {
          await syncBackupToCloud(); 
          addToast("Database cloud aggiornato e sincronizzato con successo.", "success");
      } catch (e: any) {
          console.error("Manual Save Error:", e);
          addToast("Errore durante il salvataggio su database.", "error");
      }
  };

  const handleImportBackup = async (file: File) => {
    try {
      addToast('Lettura backup...', 'info');
      const text = await file.text();
      let data: BackupData;
      try {
          data = JSON.parse(text);
      } catch (e) {
          throw new Error("Il file non è un JSON valido.");
      }
      
      await importAllData(data);
      
      const [t, p, w] = await Promise.all([
          loadTracksFromDB(true), 
          loadProfileFromDB(true), 
          loadPlannedWorkoutsFromDB(true)
      ]);
      
      setTracks(t);
      if (p) setUserProfile(p);
      setPlannedWorkouts(w);
      
      setVisibleTrackIds(new Set(t.map(tr => tr.id)));
      setShowInitialChoice(false);
      setShowHome(true);
      addToast('Backup ripristinato. Sincronizzazione cloud in corso...', 'success');

      if (isSupabaseConfigured()) {
          syncBackupToCloud().then(() => {
              console.log("Cloud sync finished after restore.");
              addToast("Database Cloud sincronizzato col Backup.", "success");
          }).catch(err => {
              console.warn("Cloud sync warning:", err);
              addToast("Attenzione: Errore sincronizzazione Cloud.", "error");
          });
      }

    } catch (e: any) {
      console.error(e);
      addToast(`Errore ripristino: ${e.message}`, 'error');
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
    const updatedTracks = tracks.map(t => {
        if (t.id === id) {
            const updated = { ...t, ...meta };
            syncTrackToCloud(updated);
            return updated;
        }
        return t;
    });
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
      if (raceSelectionIds.size < 2) return;
      setShowRaceSetup(true);
  };

  const confirmRaceStart = (renamedMap: Record<string, string>) => {
      setSimulationState('running');
      setSimulationTime(0);
      setRaceResults([]);
      setShowRaceSetup(false);
      lastTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
  };

  const handleLimitReached = useCallback(() => {
      setSimulationState('paused');
      setLoginModalLimitMessage(true);
      setShowLoginModal(true);
      addToast("Anteprima ospite terminata. Registrati per continuare.", "info");
  }, [addToast]);

  const gameLoop = (time: number) => {
      if (simulationState === 'paused' || simulationState === 'finished') return;
      
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      
      setSimulationTime(prev => {
          const newTime = prev + delta * simulationSpeed;
          
          // GUEST LIMIT CHECK FOR RACE
          if (isGuest && newTime > GUEST_REPLAY_LIMIT_MS) {
              handleLimitReached();
              return GUEST_REPLAY_LIMIT_MS;
          }

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
  }, [simulationState, simulationSpeed, isGuest, handleLimitReached]);

  const raceRunners = useMemo(() => {
      if (simulationState === 'idle') return null;
      
      // Dynamic lookback for smooth pace: 50m for slower speeds, 100m for fast forward
      const lookbackMeters = simulationSpeed > 20 ? 100 : 50;

      return tracks.filter(t => raceSelectionIds.has(t.id)).map(t => {
          const state = getTrackStateAtTime(t, simulationTime);
          const point = state?.point || t.points[t.points.length - 1];
          const smoothPace = getSmoothedPace(t, point.cummulativeDistance, lookbackMeters);
          
          return {
              trackId: t.id,
              name: t.name,
              position: point,
              color: t.color,
              pace: smoothPace > 0 ? smoothPace : (state?.pace || 0) 
          };
      });
  }, [simulationState, simulationTime, tracks, raceSelectionIds, simulationSpeed]);

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

  const handleCompareSelected = () => {
      if (raceSelectionIds.size < 2) {
          addToast('Seleziona almeno 2 tracce per il confronto.', 'info');
          return;
      }
      setShowComparison(true);
  };

  const selectedDetailTrack = useMemo(() => tracks.find(t => t.id === selectedDetailTrackId), [tracks, selectedDetailTrackId]);
  const animationTrack = useMemo(() => animationTrackId ? tracks.find(t => t.id === animationTrackId) : null, [tracks, animationTrackId]);
  const mobileSelectedTrack = useMemo(() => mobileSelectedTrackId ? tracks.find(t => t.id === mobileSelectedTrackId) : null, [tracks, mobileSelectedTrackId]);
  const reviewTrack = useMemo(() => aiReviewTrackId ? tracks.find(t => t.id === aiReviewTrackId) : null, [tracks, aiReviewTrackId]);

  const isRaceMode = simulationState !== 'idle';

  return (
    <div className="h-screen w-screen bg-slate-900 text-white overflow-hidden flex flex-col">
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

        {isSyncing && (
            <div className="fixed inset-0 z-[50000] bg-slate-950 flex flex-col items-center justify-center animate-fade-in">
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2 animate-pulse">Sincronizzazione Database</h2>
                <p className="text-slate-400 text-sm">Recupero i tuoi dati dal cloud...</p>
            </div>
        )}

        {showAuthSelection && (
            <AuthSelectionModal 
                onGuest={() => {
                    setShowAuthSelection(false);
                    loadDataAndEnter();
                }}
                onLogin={() => {
                    setShowAuthSelection(false);
                    setLoginModalLimitMessage(false);
                    setShowLoginModal(true);
                }}
            />
        )}

        <div className={`flex-grow flex overflow-hidden relative ${isMobile ? 'flex-col' : 'flex-row'}`}>
            
            {!selectedDetailTrackId && !editorTracks && (
                isMobile && isSidebarMobileOpen && !isRaceMode ? (
                    <ResizablePanel direction="horizontal" initialSizeRatio={0.5} minSize={150} minSizeSecondary={150}>
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
                            onImportBackup={handleImportBackup} 
                            onCloseMobile={() => setIsSidebarMobileOpen(false)} 
                            onUpdateTrackMetadata={handleUpdateTrackMetadata}
                            onRegenerateTitles={() => {}}
                            onToggleExplorer={() => setShowExplorer(true)}
                            showExplorer={showExplorer}
                            listViewMode={'full'}
                            onListViewModeChange={() => {}}
                            onAiBulkRate={() => {}}
                            onOpenReview={(id) => checkAiAccess() && setAiReviewTrackId(id)}
                            mobileRaceMode={false}
                            monthlyStats={{ totalDistance: 0, totalDuration: 0, activityCount: 0, avgPace: 0 }}
                            plannedWorkouts={plannedWorkouts}
                            onOpenPlannedWorkout={(id) => { setSelectedWorkoutIdForDiary(id); setShowDiary(true); }}
                            apiUsageStats={apiUsage}
                            onOpenHub={() => setShowHome(true)}
                            onOpenPerformanceAnalysis={() => setShowPerformancePanel(true)}
                            onUserLogin={() => { setLoginModalLimitMessage(false); setShowLoginModal(true); }}
                            onCompareSelected={handleCompareSelected}
                            userProfile={userProfile}
                        />
                        <div className="h-full relative">
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
                            />
                        </div>
                    </ResizablePanel>
                ) : (
                    <>
                        {/* Desktop Sidebar OR Hidden if Race Mode */}
                        {!isMobile && !isRaceMode && (
                            <div className={`
                                z-20 transition-all duration-300 bg-slate-900
                                ${showHome ? 'w-0 opacity-0 overflow-hidden' : 'w-80 h-full shrink-0 border-r border-slate-800'}
                            `}>
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
                                    onImportBackup={handleImportBackup} 
                                    onCloseMobile={() => setIsSidebarMobileOpen(false)} 
                                    onUpdateTrackMetadata={handleUpdateTrackMetadata}
                                    onRegenerateTitles={() => {}}
                                    onToggleExplorer={() => setShowExplorer(true)}
                                    showExplorer={showExplorer}
                                    listViewMode={'full'}
                                    onListViewModeChange={() => {}}
                                    onAiBulkRate={() => {}}
                                    onOpenReview={(id) => checkAiAccess() && setAiReviewTrackId(id)}
                                    mobileRaceMode={false}
                                    monthlyStats={{ totalDistance: 0, totalDuration: 0, activityCount: 0, avgPace: 0 }}
                                    plannedWorkouts={plannedWorkouts}
                                    onOpenPlannedWorkout={(id) => { setSelectedWorkoutIdForDiary(id); setShowDiary(true); }}
                                    apiUsageStats={apiUsage}
                                    onOpenHub={() => setShowHome(true)}
                                    onOpenPerformanceAnalysis={() => setShowPerformancePanel(true)}
                                    onUserLogin={() => { setLoginModalLimitMessage(false); setShowLoginModal(true); }}
                                    onCompareSelected={handleCompareSelected}
                                    userProfile={userProfile}
                                />
                            </div>
                        )}

                        {/* Full Screen Map Container (when no sidebar on mobile OR race mode) */}
                        <div className={`relative transition-all duration-300 ${!selectedDetailTrackId && !editorTracks ? 'flex-grow h-full' : ''}`}>
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
                            />
                            
                            {/* Race Overlays */}
                            {simulationState !== 'idle' && (
                                <>
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
                                    <div className="absolute top-20 right-4 z-20">
                                        <RaceLeaderboard 
                                            racers={tracks.filter(t => raceSelectionIds.has(t.id))}
                                            ranks={raceRanks}
                                            gaps={runnerGaps}
                                        />
                                    </div>
                                </>
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
                        </div>
                    </>
                )
            )}

            {/* Detail and Editor Views (Overlay everything) */}
            {(selectedDetailTrackId || editorTracks) && (
                <div className="absolute inset-0 z-50 bg-slate-900 h-full w-full">
                    {selectedDetailTrack ? (
                        <TrackDetailView 
                            track={selectedDetailTrack}
                            userProfile={userProfile}
                            onExit={() => setSelectedDetailTrackId(null)}
                            allHistory={tracks}
                            onUpdateTrackMetadata={handleUpdateTrackMetadata}
                            onAddPlannedWorkout={handleAddPlannedWorkout}
                            onStartAnimation={(id) => { setAnimationTrackId(id); setIsAnimationPlaying(true); }}
                            onOpenReview={(id) => checkAiAccess() && setAiReviewTrackId(id)}
                            onCheckAiAccess={checkAiAccess}
                            isGuest={isGuest}
                            onLimitReached={handleLimitReached}
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
                    ) : null}
                </div>
            )}
        </div>

        {/* Navigation Dock */}
        {!editorTracks && !showHome && !showDiary && !showExplorer && !selectedDetailTrackId && !showAiChatbot && !isRaceMode && (
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
                onUploadOpponent={handleAddOpponent}
                onEnterRaceMode={handleStartRace}
                onManualCloudSave={handleManualCloudSave}
                onCheckAiAccess={checkAiAccess}
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
                onCheckAiAccess={checkAiAccess}
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
                    onCheckAiAccess={checkAiAccess}
                />
            </div>
        )}

        {showRaceSetup && (
            <RaceSetupModal 
                tracks={tracks.filter(t => raceSelectionIds.has(t.id))}
                onConfirm={confirmRaceStart}
                onCancel={() => setShowRaceSetup(false)}
                onAddOpponent={handleAddOpponent}
                onRemoveTrack={handleRemoveRaceTrack}
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

        {showLoginModal && (
            <LoginModal 
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={loadDataAndEnter}
                tracks={tracks}
                userProfile={userProfile}
                plannedWorkouts={plannedWorkouts}
                limitReached={loginModalLimitMessage}
            />
        )}

        <ToastContainer toasts={toasts} setToasts={setToasts} />
        {isCommentaryLoading && <LiveCommentary messages={liveCommentary} isLoading={true} />}
    </div>
  );
};

export default App;
