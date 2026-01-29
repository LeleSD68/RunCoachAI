
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import MapDisplay from '../components/MapDisplay';
import TrackEditor from '../components/TrackEditor';
import TrackDetailView from '../components/TrackDetailView';
import DiaryView from '../components/DiaryView';
import ExplorerView from '../components/ExplorerView';
import HomeModal from '../components/HomeModal';
import WelcomeModal from '../components/WelcomeModal';
import InitialChoiceModal from '../components/InitialChoiceModal';
import GuideModal from '../components/GuideModal';
import Changelog from '../components/Changelog';
import UserProfileModal from '../components/UserProfileModal';
import ToastContainer from '../components/ToastContainer';
import Chatbot from '../components/Chatbot';
import RaceControls from '../components/RaceControls';
import RaceLeaderboard from '../components/RacePaceBar';
import RaceSummary from '../components/RaceSummary';
import { PostRaceStatsBar, PostRaceAISidebar } from '../components/PostRaceAnalysis';
import VeoAnimationModal from '../components/VeoAnimationModal';
import LiveCommentary from '../components/LiveCommentary';
import WorkoutConfirmationModal from '../components/WorkoutConfirmationModal';
import AiReviewModal from '../components/AiReviewModal';
import RaceSetupModal from '../components/RaceSetupModal';
import SplashScreen from '../components/SplashScreen';
import MobileTrackSummary from '../components/MobileTrackSummary';
import NavigationDock from '../components/NavigationDock';
import PerformanceAnalysisPanel from '../components/PerformanceAnalysisPanel';
import ComparisonModal from '../components/ComparisonModal';
import SocialHub from '../components/SocialHub';
import AuthSelectionModal from '../components/AuthSelectionModal';
import LoginModal from '../components/LoginModal';
import MiniChat from '../components/MiniChat';
import StravaConfigModal from '../components/StravaConfigModal'; // NEW

import { Track, TrackPoint, UserProfile, Toast, RaceResult, TrackStats, PlannedWorkout, ApiUsageStats, Commentary } from '../types';
import { loadTracksFromDB, saveTracksToDB, loadProfileFromDB, saveProfileToDB, loadPlannedWorkoutsFromDB, savePlannedWorkoutsToDB, exportAllData, importAllData, BackupData, syncTrackToCloud, deleteTrackFromCloud } from '../services/dbService';
import { findPersonalRecordsForTrack, updateStoredPRs } from '../services/prService';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance, getTrackStateAtTime } from '../services/trackEditorUtils';
import { parseGpx } from '../services/gpxService';
import { parseTcx } from '../services/tcxService';
import { generateSmartTitle } from '../services/titleGenerator';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { updatePresence, getFriends } from '../services/socialService';
import { handleStravaCallback, fetchRecentStravaActivities } from '../services/stravaService'; // NEW

const TRACK_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

const AiCoachButtonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
    </svg>
);

const App: React.FC = () => {
  // --- STATE ---
  const [showSplash, setShowSplash] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
  const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isGuest, setIsGuest] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
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
  const [showSocialHub, setShowSocialHub] = useState(false);
  const [showAuthSelection, setShowAuthSelection] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showStravaConfig, setShowStravaConfig] = useState(false); // NEW STATE
  
  // Realtime Chat & Presence
  const [activeChatFriend, setActiveChatFriend] = useState<UserProfile | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);
  
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [mobileSelectedTrackId, setMobileSelectedTrackId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ... (Race / Simulation State remains same) ...
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
  
  // ... (Analysis / Interaction remains same) ...
  const [selectedWorkoutIdForDiary, setSelectedWorkoutIdForDiary] = useState<string | null>(null);
  const [workoutConfirmation, setWorkoutConfirmation] = useState<PlannedWorkout | null>(null);
  const [liveCommentary, setLiveCommentary] = useState<Commentary[]>([]);
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);
  
  // ... (API Usage Tracking remains same) ...
  const [apiUsage, setApiUsage] = useState<ApiUsageStats>({ rpm: 0, daily: 0, limitRpm: 15, limitDaily: 1500, totalTokens: 0 });
  
  // ... (Animation Replay remains same) ...
  const [animationTrackId, setAnimationTrackId] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  
  const simulationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
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
      setShowSocialHub(false);
      setShowStravaConfig(false);
  }, []);

  const handleOpenDetailView = useCallback((trackId: string) => {
      setShowExplorer(false);
      setShowDiary(false);
      setShowHome(false);
      setIsSidebarMobileOpen(false);
      setMobileSelectedTrackId(null);
      setSelectedDetailTrackId(trackId);
  }, []);

  const checkAiAccess = useCallback(() => {
      if (apiUsage.daily > apiUsage.limitDaily) {
          addToast("Limite giornaliero API raggiunto.", "error");
          return false;
      }
      return true;
  }, [apiUsage, addToast]);

  const handleLimitReached = useCallback(() => {
      addToast("Funzionalità limitata. Aggiorna il piano.", "info");
  }, [addToast]);

  // --- STRAVA CALLBACK HANDLER ---
  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const stravaCode = urlParams.get('code');
      
      if (stravaCode) {
          // Clear query params to keep URL clean
          window.history.replaceState({}, document.title, window.location.pathname);
          
          handleStravaCallback(stravaCode)
              .then(async () => {
                  addToast("Strava connesso! Sto scaricando le corse...", "info");
                  try {
                      const newStravaTracks = await fetchRecentStravaActivities(5);
                      if (newStravaTracks.length > 0) {
                          setTracks(prev => {
                              // Avoid duplicates
                              const existingIds = new Set(prev.map(t => t.id));
                              const uniqueNew = newStravaTracks.filter(t => !existingIds.has(t.id));
                              const merged = [...prev, ...uniqueNew];
                              saveTracksToDB(merged);
                              return merged;
                          });
                          addToast(`${newStravaTracks.length} attività sincronizzate da Strava.`, "success");
                      } else {
                          addToast("Nessuna nuova attività trovata su Strava.", "info");
                      }
                  } catch (e) {
                      console.error(e);
                      addToast("Errore download attività Strava.", "error");
                  }
              })
              .catch(err => {
                  console.error(err);
                  addToast("Errore autenticazione Strava.", "error");
              });
      }
  }, []);

  // --- PRESENCE PING LOOP & REFRESH ---
  useEffect(() => {
      if (!userId || isGuest) return;
      
      const refreshFriendsStatus = async () => {
          if (!userId) return;
          const friends = await getFriends(userId);
          const online = friends.filter(f => f.isOnline).length;
          setOnlineFriendsCount(online);
      };

      const ping = () => updatePresence(userId);
      ping(); // Initial ping
      refreshFriendsStatus();
      
      const interval = setInterval(() => {
          ping();
          refreshFriendsStatus();
      }, 60000); // Ping every minute
      return () => clearInterval(interval);
  }, [userId, isGuest]);

  // --- REALTIME NOTIFICATIONS --- (Unchanged)
  useEffect(() => {
      if (!userId || isGuest || !isSupabaseConfigured()) return;

      const channel = supabase.channel('realtime-social')
          .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` },
              async (payload: any) => {
                  if (activeChatFriend && activeChatFriend.id === payload.new.sender_id) return;
                  if (showSocialHub) return;
                  setUnreadMessagesCount(prev => prev + 1);
                  try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e) {}
                  const { data: sender } = await supabase.from('profiles').select('id, name').eq('id', payload.new.sender_id).single();
                  addToast(`Nuovo messaggio da ${sender?.name || 'Un amico'}`, 'info');
              }
          )
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [userId, isGuest, activeChatFriend, showSocialHub, addToast]);

  const loadData = async (forceLocal = false) => {
      const storedTracks = await loadTracksFromDB(forceLocal);
      const storedProfile = await loadProfileFromDB(forceLocal);
      const storedWorkouts = await loadPlannedWorkoutsFromDB(forceLocal);
      
      if (storedTracks.length > 0) {
        setTracks(storedTracks);
        if (simulationState === 'idle') setVisibleTrackIds(new Set(storedTracks.map(t => t.id)));
        setShowHome(true);
      } else {
        const hasVisited = localStorage.getItem('gpx-app-visited');
        if (!hasVisited) setShowInitialChoice(true); else setShowHome(true);
      }

      if (storedProfile) setUserProfile(storedProfile);
      if (storedWorkouts) setPlannedWorkouts(storedWorkouts);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          setUserId(session.user.id);
          setIsGuest(false);
          await loadData(false);
      } else {
          setShowAuthSelection(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    window.gpxApp = {
      addTokens: (count) => { setApiUsage(prev => ({ ...prev, totalTokens: prev.totalTokens + count })); },
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

  const processFilesOnMainThread = async (files: File[]) => {
      // (Implementation mostly unchanged)
      const existingFingerprints = new Set(tracks.map(t => `${t.points.length}-${t.duration}-${t.distance.toFixed(5)}`));
      const newTracks: Track[] = [];
      let skippedCount = 0;
      let failedCount = 0;
      let newTracksCount = 0;

      for (const file of files) {
        try {
            const fileContent = await file.text();
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            let parsedData: { name: string; points: TrackPoint[]; distance: number; duration: number; } | null = null;

            if (fileExtension === 'gpx') parsedData = parseGpx(fileContent, file.name);
            else if (fileExtension === 'tcx') parsedData = parseTcx(fileContent, file.name);

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
                        activityType: smartData.activityType,
                        isPublic: false 
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
            if (match) setWorkoutConfirmation(match);
            
            const { newRecordsCount } = updateStoredPRs(t, findPersonalRecordsForTrack(t));
            if (newRecordsCount > 0) addToast(`${newTracks.length === 1 ? 'Nuovo' : newRecordsCount + ' Nuovi'} Record Personali!`, 'success');
        });
      }

      if (skippedCount > 0) addToast(`${skippedCount} file ignorati (duplicati).`, 'info');
      if (failedCount > 0) addToast(`Impossibile importare ${failedCount} file.`, 'error');
  };

  const handleAddOpponent = async (files: File[]) => { /* ... (Unchanged logic) ... */ };
  const handleRemoveRaceTrack = (id: string) => { /* ... */ };
  const handleFileUpload = (files: File[] | null) => {
    if (!files || files.length === 0) return;
    addToast("Elaborazione file in corso...", "info");
    processFilesOnMainThread(files);
  };

  const handleImportBackup = async (file: File) => { /* ... */ };
  const handleExportBackup = async () => { /* ... */ };
  const handleAddPlannedWorkout = (workout: PlannedWorkout) => {
    const updated = [...plannedWorkouts, workout];
    setPlannedWorkouts(updated);
    savePlannedWorkoutsToDB(updated);
    addToast('Allenamento aggiunto.', 'success');
  };
  const handleUpdatePlannedWorkout = (workout: PlannedWorkout) => { /* ... */ };
  const handleDeletePlannedWorkout = (id: string) => { /* ... */ };
  const handleMassUpdatePlannedWorkouts = (workoutsToUpdate: PlannedWorkout[]) => { /* ... */ };
  const confirmWorkoutLink = (workoutId: string) => { /* ... */ };
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
  const handleTogglePrivacySelected = (makePublic: boolean) => { /* ... */ };
  const handleDeleteTrack = (id: string) => {
    const updatedTracks = tracks.filter(t => t.id !== id);
    setTracks(updatedTracks);
    saveTracksToDB(updatedTracks);
    deleteTrackFromCloud(id);
    setVisibleTrackIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    addToast('Traccia eliminata.', 'info');
  };
  const handleDeleteSelected = () => { /* ... */ };
  const handleToggleArchived = (id: string) => { /* ... */ };
  const handleStartRace = () => { if (raceSelectionIds.size < 2) return; setShowRaceSetup(true); };

  // Game Loop Effect (Unchanged)
  useEffect(() => {
      if (simulationState !== 'running') return;
      let animationFrameId: number;
      const loop = (time: number) => {
          const delta = time - lastTimeRef.current;
          lastTimeRef.current = time;
          setSimulationTime(prevTime => {
              const nextTime = prevTime + delta * simulationSpeed;
              const raceTracks = tracks.filter(t => raceSelectionIds.has(t.id));
              if (raceTracks.length === 0) return nextTime;
              const allFinished = raceTracks.every(t => nextTime >= t.duration);
              if (allFinished) {
                  setSimulationState('finished');
                  const results: RaceResult[] = raceTracks.map(t => ({
                      rank: 0, trackId: t.id, name: t.name, color: t.color, finishTime: t.duration, avgSpeed: t.distance / (t.duration / 3600000), distance: t.distance
                  })).sort((a, b) => a.finishTime - b.finishTime).map((r, i) => ({ ...r, rank: i + 1 }));
                  setRaceResults(results);
                  return nextTime;
              }
              animationFrameId = requestAnimationFrame(loop);
              return nextTime;
          });
      };
      lastTimeRef.current = performance.now();
      animationFrameId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animationFrameId);
  }, [simulationState, simulationSpeed, tracks, raceSelectionIds]);

  const confirmRaceStart = (renamedMap: Record<string, string>) => { /* ... */ };
  
  // Stats Memo (Unchanged)
  const raceRunners = useMemo(() => {
      if (simulationState === 'idle') return null;
      return tracks.filter(t => raceSelectionIds.has(t.id)).map(t => {
          const state = getTrackStateAtTime(t, simulationTime);
          const point = state?.point || t.points[t.points.length - 1];
          return { trackId: t.id, name: t.name, position: point, color: t.color, pace: state?.pace || 0 };
      });
  }, [simulationState, simulationTime, tracks, raceSelectionIds]);

  // Update stats effect (Unchanged)
  useEffect(() => {
      if (simulationState === 'idle' || !raceRunners) return;
      const newSpeeds = new Map<string, number>();
      const newDistances = new Map<string, number>();
      const newRanks = new Map<string, number>();
      const newGaps = new Map<string, number>();
      const sortedRunners = [...raceRunners].sort((a, b) => b.position.cummulativeDistance - a.position.cummulativeDistance);
      const leaderDist = sortedRunners.length > 0 ? sortedRunners[0].position.cummulativeDistance : 0;
      sortedRunners.forEach((r, i) => {
          newRanks.set(r.trackId, i + 1);
          newDistances.set(r.trackId, r.position.cummulativeDistance);
          newSpeeds.set(r.trackId, r.pace > 0 ? 60 / r.pace : 0);
          newGaps.set(r.trackId, (leaderDist - r.position.cummulativeDistance) * 1000);
      });
      setRaceRanks(newRanks);
      setRunnerSpeeds(newSpeeds);
      setRunnerDistances(newDistances);
      setRunnerGaps(newGaps);
  }, [simulationTime, raceRunners, simulationState]);

  const handleMobileSummaryClick = () => { if (mobileSelectedTrackId) handleOpenDetailView(mobileSelectedTrackId); };
  const handleMobileSummaryClose = () => { setMobileSelectedTrackId(null); };
  const handleMapTrackClick = (trackId: string, isMultiSelect: boolean = false) => {
      setRaceSelectionIds(prev => {
          const newSet = new Set(isMultiSelect ? prev : []);
          if (isMultiSelect) {
              if (newSet.has(trackId)) newSet.delete(trackId);
              else newSet.add(trackId);
          } else {
              if (prev.size === 1 && prev.has(trackId)) {
                  newSet.clear();
              } else {
                  newSet.add(trackId);
              }
          }
          return newSet;
      });
  };
  const handleCompareSelected = () => {
      if (raceSelectionIds.size < 2) { addToast('Seleziona almeno 2 tracce.', 'info'); return; }
      setShowComparison(true);
  };
  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUserId(null);
      setIsGuest(true);
      setUserProfile({});
      addToast("Logout effettuato.", "info");
      setShowProfile(false); 
      setShowAuthSelection(true);
      setShowHome(false);
  };
  const handleGuestContinue = () => { setIsGuest(true); setShowAuthSelection(false); loadData(true); };
  const handleUserLoginSuccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) { setUserId(session.user.id); setIsGuest(false); addToast('Accesso effettuato.', 'success'); await loadData(false); }
  };

  const selectedDetailTrack = useMemo(() => tracks.find(t => t.id === selectedDetailTrackId), [tracks, selectedDetailTrackId]);
  const animationTrack = useMemo(() => animationTrackId ? tracks.find(t => t.id === animationTrackId) : null, [tracks, animationTrackId]);
  const mobileSelectedTrack = useMemo(() => mobileSelectedTrackId ? tracks.find(t => t.id === mobileSelectedTrackId) : null, [tracks, mobileSelectedTrackId]);

  return (
    <div className="h-screen w-screen bg-slate-900 text-white overflow-hidden flex flex-col">
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

        {/* AUTH GATES */}
        {showAuthSelection && !showSplash && (
            <AuthSelectionModal 
                onGuest={handleGuestContinue}
                onLogin={() => { setShowAuthSelection(false); setShowLoginModal(true); }}
            />
        )}

        {showLoginModal && (
            <LoginModal 
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={handleUserLoginSuccess}
                tracks={tracks}
                userProfile={userProfile}
                plannedWorkouts={plannedWorkouts}
            />
        )}

        {showStravaConfig && (
            <StravaConfigModal onClose={() => setShowStravaConfig(false)} />
        )}

        {activeChatFriend && !isGuest && (
            <MiniChat currentUser={{id: userId!, name: userProfile.name}} friend={activeChatFriend} onClose={() => { setActiveChatFriend(null); }} />
        )}

        <div className={`flex-grow flex overflow-hidden relative ${isMobile ? 'flex-col' : 'flex-row'}`}>
            
            {(!selectedDetailTrackId && !editorTracks) && (
                <div className={`z-20 transition-all duration-300 bg-slate-900 ${showHome ? 'w-0 opacity-0 overflow-hidden' : ''} ${isMobile ? (isSidebarMobileOpen ? 'h-[70%] w-full order-1 border-b border-slate-700' : 'h-0 w-full opacity-0 overflow-hidden order-1') : 'w-80 h-full shrink-0 border-r border-slate-800 order-1'}`}>
                    <Sidebar
                        tracks={tracks}
                        onFileUpload={handleFileUpload}
                        visibleTrackIds={visibleTrackIds}
                        onToggleVisibility={(id) => { if (visibleTrackIds.has(id)) setVisibleTrackIds(prev => { const n = new Set(prev); n.delete(id); return n; }); else setVisibleTrackIds(prev => { const n = new Set(prev); n.add(id); return n; }); }}
                        raceSelectionIds={raceSelectionIds}
                        onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                        onDeselectAll={() => setRaceSelectionIds(new Set())}
                        onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                        onStartRace={handleStartRace}
                        onGoToEditor={() => { const selected = tracks.filter(t => raceSelectionIds.has(t.id)); if (selected.length > 0) setEditorTracks(selected); }}
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
                        onSpeedChange={setSpeed => setSimulationSpeed(setSpeed)}
                        lapTimes={new Map()}
                        sortOrder={'date_desc'}
                        onSortChange={() => {}}
                        onDeleteTrack={handleDeleteTrack}
                        onDeleteSelected={handleDeleteSelected}
                        onViewDetails={handleOpenDetailView}
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
                        onOpenReview={(id) => setAiReviewTrackId(id)}
                        mobileRaceMode={false}
                        monthlyStats={{ totalDistance: 0, totalDuration: 0, activityCount: 0, avgPace: 0 }}
                        plannedWorkouts={plannedWorkouts}
                        onOpenPlannedWorkout={(id) => { setSelectedWorkoutIdForDiary(id); setShowDiary(true); }}
                        apiUsageStats={apiUsage}
                        onOpenHub={() => setShowHome(true)}
                        onOpenPerformanceAnalysis={() => setShowPerformancePanel(true)}
                        onUserLogin={() => setShowLoginModal(true)} 
                        onUserLogout={handleLogout}
                        isGuest={isGuest}
                        onCompareSelected={handleCompareSelected}
                        userProfile={userProfile}
                        onOpenSocial={() => { if(isGuest) addToast("Accesso Social riservato agli utenti registrati.", "info"); else setShowSocialHub(true); }}
                        onToggleArchived={handleToggleArchived}
                        onlineCount={onlineFriendsCount}
                        unreadCount={unreadMessagesCount}
                        onTogglePrivacySelected={handleTogglePrivacySelected} 
                    />
                </div>
            )}

            <div className={`relative transition-all duration-300 ${selectedDetailTrackId || editorTracks ? 'h-full w-full' : ''} ${!selectedDetailTrackId && !editorTracks ? (isMobile ? (isSidebarMobileOpen ? 'h-[30%] order-2' : 'h-full order-2') : 'flex-grow h-full order-2') : ''}`}>
                {selectedDetailTrack ? (
                    <TrackDetailView 
                        track={selectedDetailTrack}
                        userProfile={userProfile}
                        onExit={() => setSelectedDetailTrackId(null)}
                        allHistory={tracks}
                        plannedWorkouts={plannedWorkouts}
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
                        onExit={(updated) => { if (updated) { const newTracks = tracks.map(t => t.id === updated.id ? updated : t); if (!tracks.find(t => t.id === updated.id)) newTracks.push(updated); setTracks(newTracks); saveTracksToDB(newTracks); addToast('Traccia modificata salvata.', 'success'); } setEditorTracks(null); }}
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
                                    <AiCoachButtonIcon />
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
                onOpenSocial={() => { if(isGuest) addToast("Accesso Social riservato agli utenti registrati.", "info"); else setShowSocialHub(true); }}
                onlineCount={onlineFriendsCount}
                unreadCount={unreadMessagesCount}
            />
        )}

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
                onOpenWorkout={(workoutId) => { setSelectedWorkoutIdForDiary(workoutId); setShowHome(false); setShowDiary(true); }}
                onOpenProfile={() => setShowProfile(true)}
                onOpenChangelog={() => setShowChangelog(true)}
                onUploadOpponent={handleAddOpponent}
                onEnterRaceMode={handleStartRace}
                onLogout={handleLogout}
                onLogin={() => { setShowHome(false); setShowLoginModal(true); }}
                isGuest={isGuest}
                onOpenStravaConfig={() => setShowStravaConfig(true)} // NEW
            />
        )}

        {/* ... (Other Modals Unchanged) ... */}
        {showDiary && <DiaryView tracks={tracks} plannedWorkouts={plannedWorkouts} userProfile={userProfile} onClose={() => setShowDiary(false)} onSelectTrack={handleOpenDetailView} onDeletePlannedWorkout={handleDeletePlannedWorkout} onAddPlannedWorkout={handleAddPlannedWorkout} onUpdatePlannedWorkout={handleUpdatePlannedWorkout} onMassUpdatePlannedWorkouts={handleMassUpdatePlannedWorkouts} onOpenTrackChat={handleOpenDetailView} onOpenGlobalChat={() => { setShowDiary(false); setShowAiChatbot(true); }} initialSelectedWorkoutId={selectedWorkoutIdForDiary} onCheckAiAccess={checkAiAccess} />}
        {showExplorer && <ExplorerView tracks={tracks} onClose={() => setShowExplorer(false)} onSelectTrack={handleOpenDetailView} />}
        {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} onSave={(p) => { setUserProfile(p); saveProfileToDB(p); }} currentProfile={userProfile} tracks={tracks} onLogout={handleLogout} />}
        {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
        {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
        {showAiChatbot && <div className={`z-[12000] ${isMobile ? '' : 'fixed bottom-20 right-6'}`}><Chatbot tracksToAnalyze={tracks} userProfile={userProfile} onClose={() => setShowAiChatbot(false)} isStandalone={true} onAddPlannedWorkout={handleAddPlannedWorkout} plannedWorkouts={plannedWorkouts} /></div>}
        {showRaceSetup && <RaceSetupModal tracks={tracks.filter(t => raceSelectionIds.has(t.id))} onConfirm={confirmRaceStart} onCancel={() => setShowRaceSetup(false)} onAddOpponent={handleAddOpponent} onRemoveTrack={handleRemoveRaceTrack} />}
        {raceResults.length > 0 && simulationState === 'finished' && <RaceSummary results={raceResults} racerStats={new Map(raceResults.map(r => [r.trackId, calculateTrackStats(tracks.find(t => t.id === r.trackId)!)]))} onClose={() => { setRaceResults([]); setSimulationState('idle'); }} userProfile={userProfile} tracks={tracks} />}
        {workoutConfirmation && <WorkoutConfirmationModal workout={workoutConfirmation} onConfirm={() => confirmWorkoutLink(workoutConfirmation.id)} onCancel={() => setWorkoutConfirmation(null)} />}
        {aiReviewTrackId && <AiReviewModal track={tracks.find(t => t.id === aiReviewTrackId)!} userProfile={userProfile} onClose={() => setAiReviewTrackId(null)} />}
        {showPerformancePanel && <PerformanceAnalysisPanel tracks={tracks} userProfile={userProfile} onClose={() => setShowPerformancePanel(false)} />}
        {showComparison && <ComparisonModal tracks={tracks.filter(t => raceSelectionIds.has(t.id))} onClose={() => setShowComparison(false)} />}
        {showSocialHub && userId && <SocialHub currentUserId={userId} onClose={() => setShowSocialHub(false)} />}

        <ToastContainer toasts={toasts} setToasts={setToasts} />
        {isCommentaryLoading && <LiveCommentary messages={liveCommentary} isLoading={true} />}
    </div>
  );
};

export default App;
