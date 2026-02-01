
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, Toast, ActivityType, RaceRunner, RaceResult, TrackStats, Commentary, TrackPoint, ApiUsage, RaceGapSnapshot, LeaderStats } from './types';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import TrackEditor from './components/TrackEditor';
import TrackDetailView from './components/TrackDetailView';
import ToastContainer from './components/ToastContainer';
import AuthSelectionModal from './components/AuthSelectionModal';
import LoginModal from './components/LoginModal';
import HomeModal from './components/HomeModal';
import WelcomeModal from './components/WelcomeModal';
import UserProfileModal from './components/UserProfileModal';
import SettingsModal from './components/SettingsModal'; // New Import
import Changelog from './components/Changelog';
import NavigationDock from './components/NavigationDock';
import Chatbot from './components/Chatbot';
import StravaConfigModal from './components/StravaConfigModal';
import StravaSyncModal from './components/StravaSyncModal';
import GuideModal from './components/GuideModal';
import ExplorerView from './components/ExplorerView';
import DiaryView from './components/DiaryView';
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel';
import SocialHub from './components/SocialHub';
import SplashScreen from './components/SplashScreen';
import RaceControls from './components/RaceControls';
import RaceLeaderboard from './components/RacePaceBar';
import RaceSummary from './components/RaceSummary';
import ReminderNotification from './components/ReminderNotification';
import RaceSetupModal from './components/RaceSetupModal';
import ResizablePanel from './components/ResizablePanel';
import RaceGapChart from './components/RaceGapChart'; 

import { 
    saveTracksToDB, loadTracksFromDB, 
    saveProfileToDB, loadProfileFromDB, 
    savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB,
    importAllData, exportAllData, syncTrackToCloud, deleteTrackFromCloud,
    deletePlannedWorkoutFromCloud
} from './services/dbService';
import { supabase } from './services/supabaseClient';
import { handleStravaCallback, fetchRecentStravaActivities, isStravaConnected } from './services/stravaService';
import { getTrackStateAtTime, mergeTracks } from './services/trackEditorUtils';
import { getApiUsage, trackUsage, addTokensToUsage } from './services/usageService';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { generateSmartTitle } from './services/titleGenerator';
import { isDuplicateTrack, markStravaTrackAsDeleted, isPreviouslyDeletedStravaTrack, getTrackFingerprint } from './services/trackUtils';
import { getFriendsActivityFeed } from './services/socialService';

// Changed key to reset layout preferences for the layout fix v6
const LAYOUT_PREFS_KEY = 'runcoach_layout_prefs_v6';

const App: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({ autoAnalyzeEnabled: true });
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [usage, setUsage] = useState<ApiUsage>({ requests: 0, tokens: 0, lastReset: '' });
    
    const [showSplash, setShowSplash] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false); 
    const [authLimitReached, setAuthLimitReached] = useState(false);

    const [showAuthSelection, setShowAuthSelection] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showHome, setShowHome] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false); // New State
    const [showChangelog, setShowChangelog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showExplorer, setShowExplorer] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const [showStravaSyncOptions, setShowStravaSyncOptions] = useState(false);
    const [showStravaConfig, setShowStravaConfig] = useState(false);
    
    const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
    const [editingTrack, setEditingTrack] = useState<Track | null>(null); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    const [showGlobalChat, setShowGlobalChat] = useState(false);
    const [fitBoundsCounter, setFitBoundsCounter] = useState(0);
    const [showRaceSetup, setShowRaceSetup] = useState(false);
    const [friendTracks, setFriendTracks] = useState<Track[]>([]);

    // Layout Preferences - Default mobile list ratio 0.7 (70% List / 30% Map)
    const [layoutPrefs, setLayoutPrefs] = useState<{ desktopSidebar: number, mobileListRatio: number }>({ desktopSidebar: 320, mobileListRatio: 0.7 });

    useEffect(() => {
        const stored = localStorage.getItem(LAYOUT_PREFS_KEY);
        if (stored) {
            try { setLayoutPrefs(JSON.parse(stored)); } catch(e) {}
        }
    }, []);

    // --- NOTIFICATION SYSTEM START ---
    useEffect(() => {
        // Request notification permission on mount
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (!userId || userId === 'guest') return;

        // Subscribe to Realtime events
        const channel = supabase.channel('global_notifications')
            // Listen for new messages
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` }, (payload) => {
                const msg = "Nuovo messaggio ricevuto!";
                addToast(msg, "info");
                if (Notification.permission === 'granted') {
                    new Notification("RunCoachAI Social", { body: "Hai ricevuto un nuovo messaggio privato.", icon: '/logo.png' });
                }
            })
            // Listen for friend requests
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friends', filter: `user_id_2=eq.${userId}` }, (payload) => {
                const msg = "Nuova richiesta di amicizia!";
                addToast(msg, "info");
                if (Notification.permission === 'granted') {
                    new Notification("RunCoachAI Crew", { body: "Qualcuno vuole aggiungerti agli amici!", icon: '/logo.png' });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);
    // --- NOTIFICATION SYSTEM END ---

    const saveLayoutPrefs = (newPrefs: Partial<{ desktopSidebar: number, mobileListRatio: number }>) => {
        const updated = { ...layoutPrefs, ...newPrefs };
        setLayoutPrefs(updated);
        localStorage.setItem(LAYOUT_PREFS_KEY, JSON.stringify(updated));
    };

    const mapVisibleIds = useMemo(() => {
        if (raceSelectionIds.size === 0) {
            // FIX: Filter out ghosts (isExternal) from default view. They only appear when explicitly selected.
            return new Set(tracks.filter(t => !t.isArchived && !t.isExternal).map(t => t.id));
        }
        return raceSelectionIds;
    }, [tracks, raceSelectionIds]);

    const todayEntries = useMemo(() => {
        const today = new Date().toDateString();
        const entries = plannedWorkouts.filter(w => 
            new Date(w.date).toDateString() === today && 
            (w.entryType === 'commitment' || w.entryType === 'note')
        );
        // Trigger notification for diary entries if loaded
        if (entries.length > 0 && Notification.permission === 'granted') {
             // Basic debounce using session storage to avoid spamming on every render/reload
             const notifiedKey = `notified_diary_${today}`;
             if (!sessionStorage.getItem(notifiedKey)) {
                 new Notification("RunCoachAI Agenda", { body: `Hai ${entries.length} note o impegni per oggi.`, icon: '/logo.png' });
                 sessionStorage.setItem(notifiedKey, 'true');
             }
        }
        return entries;
    }, [plannedWorkouts]);

    useEffect(() => {
        setUsage(getApiUsage());
        (window as any).gpxApp = {
            addTokens: (count: number) => {
                const u = addTokensToUsage(count);
                setUsage(u);
            },
            trackApiRequest: () => {
                const u = trackUsage(0);
                setUsage(u);
            },
            getUsage: () => getApiUsage()
        };
    }, []);

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    useEffect(() => {
        const handleResize = () => {
            const desk = window.innerWidth >= 1024;
            setIsDesktop(desk);
            setFitBoundsCounter(c => c + 1);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const addToast = (message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const onCheckAiAccess = useCallback(() => {
        if (isGuest) {
            setAuthLimitReached(true);
            setShowLoginModal(true);
            return false;
        }
        return true;
    }, [isGuest]);

    const resetNavigation = useCallback(() => {
        setShowHome(false);
        setShowExplorer(false);
        setShowDiary(false);
        setShowPerformance(false);
        setShowSocial(false);
        setShowProfile(false);
        setShowSettings(false);
        setShowGuide(false);
        setShowChangelog(false);
        setShowGlobalChat(false);
        setViewingTrack(null);
        setEditingTrack(null);
    }, []);

    const toggleView = (view: 'diary' | 'explorer' | 'performance' | 'social' | 'hub' | 'profile' | 'settings' | 'guide') => {
        const currentStates = {
            diary: showDiary,
            explorer: showExplorer,
            performance: showPerformance,
            social: showSocial,
            hub: showHome,
            profile: showProfile,
            settings: showSettings,
            guide: showGuide
        };
        
        const isOpen = currentStates[view];
        resetNavigation();
        
        if (!isOpen) {
            switch(view) {
                case 'diary': setShowDiary(true); break;
                case 'explorer': setShowExplorer(true); break;
                case 'performance': setShowPerformance(true); break;
                case 'social': setShowSocial(true); break;
                case 'hub': setShowHome(true); break;
                case 'profile': setShowProfile(true); break;
                case 'settings': setShowSettings(true); break;
                case 'guide': setShowGuide(true); break;
            }
        } else if (view === 'hub') {
            if (isDesktop) setIsSidebarOpen(true);
        }
    };

    useEffect(() => {
        const checkStravaCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            if (code) {
                setIsDataLoading(true);
                try {
                    await handleStravaCallback(code);
                    addToast("Strava collegato!", "success");
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (e: any) {
                    addToast("Errore Strava: " + e.message, "error");
                } finally {
                    setIsDataLoading(false);
                }
            }
        };
        checkStravaCallback();
    }, []);

    const handleSplashFinish = () => {
        setShowSplash(false);
        checkSession();
    };

    const runAutoStravaSync = async (currentTracks: Track[]) => {
        try {
            // Check last 10 activities to catch up quickly without overwhelming
            const newTracks = await fetchRecentStravaActivities(10);
            if (newTracks.length === 0) return;

            const uniqueNew = newTracks.filter(t => 
                !isDuplicateTrack(t, currentTracks) && !isPreviouslyDeletedStravaTrack(t)
            );
            
            if (uniqueNew.length > 0) {
                const updated = [...uniqueNew, ...currentTracks];
                setTracks(updated);
                await saveTracksToDB(updated);
                addToast(`Sincronizzazione Auto: importate ${uniqueNew.length} nuove corse.`, "success");
            }
        } catch (e) {
            console.error("Auto sync failed", e);
        }
    };

    const checkSession = async () => {
        setIsDataLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUserId(session.user.id);
                setIsGuest(false);
                await loadData();
                setShowHome(true);
            } else {
                setShowAuthSelection(true);
            }
        } catch (e) {
            setShowAuthSelection(true);
        } finally {
            setIsDataLoading(false);
        }
    };

    const loadData = async (forceLocal = false) => {
        try {
            const loadedProfile = await loadProfileFromDB(forceLocal);
            if (loadedProfile) setUserProfile(prev => ({ ...prev, ...loadedProfile }));
            
            const loadedTracks = await loadTracksFromDB(forceLocal);
            const uniqueTracks: Track[] = [];
            const seenFingerprints = new Set<string>();
            let duplicatesFound = 0;

            loadedTracks.forEach(t => {
                const fp = getTrackFingerprint(t);
                if (!seenFingerprints.has(fp)) {
                    seenFingerprints.add(fp);
                    uniqueTracks.push(t);
                } else {
                    duplicatesFound++;
                }
            });

            if (duplicatesFound > 0) {
                addToast(`Rimossi ${duplicatesFound} file duplicati dal database.`, "info");
                await saveTracksToDB(uniqueTracks);
            }

            setTracks(uniqueTracks);
            
            // WORKOUT DEDUPLICATION
            const loadedWorkouts = await loadPlannedWorkoutsFromDB(forceLocal);
            const uniqueWorkouts: PlannedWorkout[] = [];
            const seenWorkoutKeys = new Set<string>();
            let workoutDuplicates = 0;
            const duplicateIdsToDelete: string[] = [];

            loadedWorkouts.forEach((w: PlannedWorkout) => {
                // Key composite: Date + Title + Type
                const d = new Date(w.date);
                const dateStr = d.toDateString();
                const key = `${dateStr}|${w.title.trim().toLowerCase()}|${w.activityType}`;
                
                if (seenWorkoutKeys.has(key)) {
                    workoutDuplicates++;
                    duplicateIdsToDelete.push(w.id);
                } else {
                    seenWorkoutKeys.add(key);
                    uniqueWorkouts.push(w);
                }
            });

            if (workoutDuplicates > 0) {
                await savePlannedWorkoutsToDB(uniqueWorkouts);
                // Clean cloud duplicates in background
                duplicateIdsToDelete.forEach((id: string) => deletePlannedWorkoutFromCloud(id));
                addToast(`Rimossi ${workoutDuplicates} allenamenti doppi.`, "info");
            }

            setPlannedWorkouts(uniqueWorkouts);

            // AUTO SYNC STRAVA CHECK
            if (loadedProfile?.stravaAutoSync && isStravaConnected()) {
                // Run in background to not block UI
                runAutoStravaSync(uniqueTracks);
            }

        } catch (e) {
            addToast("Dati caricati localmente.", "info");
        }
    };

    const [raceState, setRaceState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
    const [raceTime, setRaceTime] = useState(0);
    const [raceSpeed, setRaceSpeed] = useState(10);
    const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
    const [raceResults, setRaceResults] = useState<RaceResult[] | null>(null);
    const [raceGaps, setRaceGaps] = useState<Map<string, number | undefined>>(new Map());
    const [raceHistory, setRaceHistory] = useState<RaceGapSnapshot[]>([]); 
    
    // NEW: Stats for leader tracking
    const [leadStats, setLeadStats] = useState<Record<string, LeaderStats>>({});
    
    const raceLastTimeRef = useRef<number | null>(null);
    const raceTimeRef = useRef(0);
    const lastHistoryUpdateRef = useRef(0); 

    const openRaceSetup = async () => {
        if (raceSelectionIds.size < 1 && tracks.length > 0) {
            addToast("Seleziona almeno una corsa per iniziare.", "info");
            return;
        }
        setShowRaceSetup(true);
        // Load Friend Tracks for selection
        if (userId) {
            try {
                const feed = await getFriendsActivityFeed(userId);
                setFriendTracks(feed);
            } catch (e) {
                console.warn("Could not load friend tracks for race setup", e);
            }
        }
    };

    const startRaceAnimation = (renamedMap: Record<string, string>) => {
        const selected = tracks.filter(t => raceSelectionIds.has(t.id));
        if (selected.length < 1) return;
        
        // Apply names
        selected.forEach(t => {
            if (renamedMap[t.id]) t.name = renamedMap[t.id];
        });

        setRaceResults(null);
        raceTimeRef.current = 0;
        lastHistoryUpdateRef.current = 0;
        setRaceTime(0);
        setRaceState('running');
        setRaceHistory([]);
        setLeadStats({}); // Reset Leader Stats
        
        setRaceRunners(selected.map(t => ({
            trackId: t.id,
            name: t.name,
            position: t.points[0],
            color: t.color,
            pace: 0,
            finished: false
        })));
        setShowRaceSetup(false);
    };

    useEffect(() => {
        let frame: number;
        
        const animateRace = (time: number) => {
            if (raceLastTimeRef.current !== null) {
                const delta = time - raceLastTimeRef.current; // Real time elapsed in ms
                const timeStep = delta * raceSpeed; // Simulated time elapsed in ms
                const nextTime = raceTimeRef.current + timeStep;
                raceTimeRef.current = nextTime;
                setRaceTime(nextTime);

                const selected = tracks.filter(t => raceSelectionIds.has(t.id));
                let allFinished = true;
                const newRunners: RaceRunner[] = [];
                const currentGaps = new Map<string, number>();

                selected.forEach(t => {
                    const prevState = raceRunners?.find(r => r.trackId === t.id);
                    if (prevState?.finished) {
                        // Keep finished state
                        newRunners.push(prevState);
                    } else {
                        // Calculate new state
                        const state = getTrackStateAtTime(t, nextTime);
                        if (state) {
                            let isFinished = false;
                            let finishTime = undefined;
                            
                            // Check finish condition: if we exceeded track distance or time
                            if (state.point.cummulativeDistance >= t.distance || nextTime >= t.duration) {
                                isFinished = true;
                                finishTime = t.duration;
                                // Snap to last point
                                const lastPt = t.points[t.points.length - 1];
                                newRunners.push({
                                    trackId: t.id, name: t.name, position: lastPt, color: t.color, pace: 0,
                                    finished: true, finishTime: t.duration
                                });
                            } else {
                                newRunners.push({
                                    trackId: t.id,
                                    name: t.name,
                                    position: state.point,
                                    color: t.color,
                                    pace: state.pace,
                                    finished: false
                                });
                                allFinished = false;
                            }
                        } else {
                            // Fallback if something weird happens
                             const lastPt = t.points[t.points.length - 1];
                             newRunners.push({
                                trackId: t.id, name: t.name, position: lastPt, color: t.color, pace: 0,
                                finished: true, finishTime: t.duration
                            });
                        }
                    }
                });

                // --- LEADER STATS CALCULATION ---
                const sorted = [...newRunners].sort((a,b) => b.position.cummulativeDistance - a.position.cummulativeDistance);
                if (sorted.length > 0) {
                    const leader = sorted[0];
                    const leaderDist = leader.position.cummulativeDistance;
                    
                    // Update Gaps
                    sorted.forEach((r) => {
                        currentGaps.set(r.trackId, (leaderDist - r.position.cummulativeDistance) * 1000);
                    });

                    // Update Leader Stats (Time & Distance in Lead)
                    // We only accumulate if the race is running and leader is not finished yet (or is finished but still winning)
                    if (simulationStateRef.current === 'running') {
                        setLeadStats(prev => {
                            const next = { ...prev };
                            if (!next[leader.trackId]) next[leader.trackId] = { timeInLead: 0, distanceInLead: 0 };
                            
                            // Add time
                            next[leader.trackId].timeInLead += timeStep;
                            
                            // Add distance (approx: speed * timeStep, or better: diff from last frame)
                            if (leader.pace > 0) {
                                const distAddedMeters = (timeStep / 60000) / leader.pace * 1000;
                                next[leader.trackId].distanceInLead += distAddedMeters;
                            }
                            
                            return next;
                        });
                    }

                    // Update Gap History every ~5 seconds of simulated time
                    if (nextTime - lastHistoryUpdateRef.current > 5000) {
                        const gapsObj: Record<string, number> = {};
                        sorted.forEach(r => {
                            gapsObj[r.trackId] = (leaderDist - r.position.cummulativeDistance) * 1000;
                        });
                        setRaceHistory(prev => [...prev, { time: nextTime, gaps: gapsObj }]);
                        lastHistoryUpdateRef.current = nextTime;
                    }
                }

                setRaceRunners(newRunners);
                setRaceGaps(currentGaps);

                if (allFinished) {
                    setRaceState('finished');
                    const results = selected.map(t => ({
                        trackId: t.id,
                        name: t.name,
                        finishTime: t.duration,
                        distance: t.distance,
                        rank: 0
                    })).sort((a,b) => a.finishTime - b.finishTime)
                       .map((r, i) => ({ ...r, rank: i + 1 }));
                    setRaceResults(results);
                    raceLastTimeRef.current = null;
                    return;
                }
            }
            raceLastTimeRef.current = time;
            frame = requestAnimationFrame(animateRace);
        };

        if (raceState === 'running') {
            frame = requestAnimationFrame(animateRace);
        } else {
            raceLastTimeRef.current = null;
        }

        return () => cancelAnimationFrame(frame);
    }, [raceState, raceSpeed, tracks, raceSelectionIds]);

    // Ref to access state inside animation frame without closure stale
    const simulationStateRef = useRef(raceState);
    useEffect(() => { simulationStateRef.current = raceState; }, [raceState]);

    const handleUpdateTrackMetadata = async (id: string, metadata: Partial<Track>) => {
        const updatedTracks = tracks.map(t => t.id === id ? { ...t, ...metadata } : t);
        setTracks(updatedTracks);
        await saveTracksToDB(updatedTracks);
    };

    const handleAddGhost = (friendTrack: Track) => {
        const ghostTrack: Track = {
            ...friendTrack,
            id: `ghost-${Date.now()}-${friendTrack.id}`, 
            name: `Ghost: ${friendTrack.userDisplayName || 'Amico'}`,
            isExternal: true, // IMPORTANT: Marked as external so it won't be saved to DB/Sidebar
            color: '#a855f7',
        };

        // We add to state so it renders on map/race setup, BUT we do NOT call saveTracksToDB.
        // It will be ephemeral.
        setTracks(prev => [ghostTrack, ...prev]);
        setRaceSelectionIds(prev => {
            const next = new Set(prev);
            next.add(ghostTrack.id);
            return next;
        });
        addToast(`Aggiunto ${ghostTrack.name} alla griglia di partenza!`, "success");
    };

    const handleChallengeGhost = (friendTrack: Track) => {
        handleAddGhost(friendTrack);
        setShowSocial(false);
        // Don't auto open sidebar, just let user go to race setup
        openRaceSetup();
    };

    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(raceSelectionIds);
        const tracksToDelete = tracks.filter(t => raceSelectionIds.has(t.id));
        tracksToDelete.forEach(t => markStravaTrackAsDeleted(t));
        const next = tracks.filter(t => !raceSelectionIds.has(t.id));
        setTracks(next);
        setRaceSelectionIds(new Set());
        await saveTracksToDB(next);
        for (const id of idsToDelete) {
            await deleteTrackFromCloud(id);
        }
        addToast(`${idsToDelete.length} corse eliminate.`, "info");
    };

    const handleBulkArchive = async () => {
        const next = tracks.map(t => raceSelectionIds.has(t.id) ? { ...t, isArchived: true } : t);
        setTracks(next);
        setRaceSelectionIds(new Set());
        await saveTracksToDB(next);
        addToast(`${raceSelectionIds.size} corse archiviate.`, "success");
    };

    const handleToggleFavorite = async (id: string) => {
        const updatedTracks = tracks.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t);
        setTracks(updatedTracks);
        await saveTracksToDB(updatedTracks);
        const track = updatedTracks.find(t => t.id === id);
        addToast(track?.isFavorite ? "Aggiunta ai preferiti" : "Rimossa dai preferiti", "success");
    };

    const handleBulkGroup = async (folderName: string) => {
        const next = tracks.map(t => raceSelectionIds.has(t.id) ? { ...t, folder: folderName } : t);
        setTracks(next);
        setRaceSelectionIds(new Set());
        await saveTracksToDB(next);
        addToast(`${raceSelectionIds.size} corse raggruppate in "${folderName}"`, "success");
    };

    const handleMergeSelectedTracks = async (deleteOriginals: boolean) => {
        const selected = tracks.filter(t => raceSelectionIds.has(t.id));
        if (selected.length < 2) return;
        const merged = mergeTracks(selected);
        let nextTracks = [merged, ...tracks];
        const idsToRemove = Array.from(raceSelectionIds);
        if (deleteOriginals) {
            nextTracks = nextTracks.filter(t => !raceSelectionIds.has(t.id) || t.id === merged.id);
            for (const id of idsToRemove) await deleteTrackFromCloud(id);
        }
        setTracks(nextTracks);
        setRaceSelectionIds(new Set([merged.id]));
        await saveTracksToDB(nextTracks);
        addToast("Tracce unite con successo!", "success");
    };

    const handleAddPlannedWorkout = async (w: PlannedWorkout) => {
        const next = [w, ...plannedWorkouts];
        setPlannedWorkouts(next);
        await savePlannedWorkoutsToDB(next);
        addToast("Salvato nel diario!", "success");
    };

    const handleUpdatePlannedWorkout = async (w: PlannedWorkout) => {
        const next = plannedWorkouts.map(item => item.id === w.id ? w : item);
        setPlannedWorkouts(next);
        await savePlannedWorkoutsToDB(next);
        addToast("Voce aggiornata!", "success");
    };

    const handleDeletePlannedWorkout = async (id: string) => {
        const next = plannedWorkouts.filter(w => w.id !== id);
        setPlannedWorkouts(next);
        await savePlannedWorkoutsToDB(next);
        await deletePlannedWorkoutFromCloud(id);
        addToast("Rimossa dal diario.", "info");
    };

    const handleFileUpload = async (files: File[] | null) => {
        if (!files) return;
        setIsDataLoading(true);
        let newCount = 0;
        let skipCount = 0;
        const newTracks: Track[] = [];
        for (const file of files) {
            const text = await file.text();
            let parsed = null;
            if (file.name.toLowerCase().endsWith('.gpx')) parsed = parseGpx(text, file.name);
            else if (file.name.toLowerCase().endsWith('.tcx')) parsed = parseTcx(text, file.name);
            if (parsed) {
                const { title, activityType, folder } = generateSmartTitle(parsed.points, parsed.distance, parsed.name as string);
                const tempTrack: Track = { id: crypto.randomUUID(), name: title, points: parsed.points, distance: parsed.distance, duration: parsed.duration, color: `hsl(${Math.random() * 360}, 70%, 60%)`, activityType, folder };
                if (!isDuplicateTrack(tempTrack, [...tracks, ...newTracks])) { newTracks.push(tempTrack); newCount++; } 
                else skipCount++;
            }
        }
        if (newCount > 0) { const updated = [...newTracks, ...tracks]; setTracks(updated); await saveTracksToDB(updated); addToast(`Caricate ${newCount} nuove corse.`, "success"); }
        if (skipCount > 0) addToast(`${skipCount} attività già presenti ignorate.`, "info");
        setIsDataLoading(false);
        setFitBoundsCounter(c => c + 1);
    };

    const handleStravaImportFinished = async (newTracksFromStrava: Track[]) => {
        if (newTracksFromStrava.length === 0) { addToast("Nessuna nuova attività importata da Strava.", "info"); return; }
        setIsDataLoading(true);
        let importedCount = 0; let skippedCount = 0; let previouslyDeletedCount = 0;
        const toAdd: Track[] = [];
        for (const track of newTracksFromStrava) {
            if (isDuplicateTrack(track, tracks)) skippedCount++;
            else if (isPreviouslyDeletedStravaTrack(track)) previouslyDeletedCount++;
            else { toAdd.push(track); importedCount++; }
        }
        if (importedCount > 0) { const updated = [...toAdd, ...tracks]; setTracks(updated); await saveTracksToDB(updated); addToast(`Importate con successo ${importedCount} corse da Strava.`, "success"); }
        if (skippedCount > 0) addToast(`${skippedCount} attività Strava ignorate perché già presenti.`, "info");
        if (previouslyDeletedCount > 0) addToast(`${previouslyDeletedCount} attività Strava ignorate perché eliminate in passato.`, "info");
        setIsDataLoading(false);
        setFitBoundsCounter(c => c + 1);
    };

    const handleResizeEnd = (size: number, ratio: number) => {
        if (isDesktop) {
            saveLayoutPrefs({ desktopSidebar: size });
            setFitBoundsCounter(c => c + 1);
        } else {
            saveLayoutPrefs({ mobileListRatio: ratio });
            setFitBoundsCounter(c => c + 1);
        }
    };

    const isRacing = raceState !== 'idle';

    if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-white font-sans">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            <ReminderNotification entries={todayEntries} />

            {isDataLoading && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-cyan-400 font-bold uppercase animate-pulse">Elaborazione...</p>
                </div>
            )}

            {showAuthSelection && <AuthSelectionModal onGuest={() => { setIsGuest(true); setUserId('guest'); setShowAuthSelection(false); setShowHome(true); }} onLogin={() => setShowLoginModal(true)} />}
            {showLoginModal && (
                <LoginModal 
                    onClose={() => { setShowLoginModal(false); setAuthLimitReached(false); }} 
                    onLoginSuccess={() => { setShowLoginModal(false); setAuthLimitReached(false); checkSession(); }} 
                    tracks={tracks} userProfile={userProfile} plannedWorkouts={plannedWorkouts} limitReached={authLimitReached}
                />
            )}
            
            {showHome && (
                <HomeModal 
                    onClose={() => toggleView('hub')}
                    onOpenDiary={() => toggleView('diary')}
                    onOpenExplorer={() => toggleView('explorer')}
                    onOpenHelp={() => toggleView('guide')}
                    onOpenStravaConfig={() => {
                        if (isStravaConnected()) {
                            setShowStravaSyncOptions(true);
                        } else {
                            setShowStravaConfig(true);
                        }
                    }}
                    onImportBackup={async (f) => { 
                        setIsDataLoading(true);
                        try {
                            const text = await f.text();
                            const data = JSON.parse(text);
                            if (data.tracks) {
                                const incoming = data.tracks.map((t: any) => ({ ...t, points: t.points.map((p: any) => ({ ...p, time: new Date(p.time) })) }));
                                const filteredTracks = incoming.filter((t: Track) => !isDuplicateTrack(t, tracks));
                                const merged = [...filteredTracks, ...tracks];
                                await importAllData({ ...data, tracks: merged }); 
                                await loadData(true); 
                                addToast(`Importate ${filteredTracks.length} nuove attività.`, "success"); 
                                setFitBoundsCounter(c => c + 1);
                            }
                        } catch (e) { addToast("Errore backup.", "error"); } finally { setIsDataLoading(false); }
                    }}
                    onExportBackup={async () => { 
                        try {
                            const d = await exportAllData(); 
                            const b = new Blob([JSON.stringify(d, null, 2)], {type:'application/json'}); 
                            const u = URL.createObjectURL(b); 
                            const a = document.createElement('a'); a.href=u; a.download=`RunCoachAI_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(u);
                            addToast("Backup salvato!", "success");
                        } catch (e) { addToast("Errore backup.", "error"); }
                    }}
                    onUploadTracks={handleFileUpload}
                    onOpenProfile={() => toggleView('profile')}
                    onOpenSettings={() => toggleView('settings')}
                    onOpenChangelog={() => setShowChangelog(true)} 
                    onEnterRaceMode={openRaceSetup}
                    trackCount={tracks.length}
                    userProfile={userProfile}
                />
            )}

            {showStravaConfig && (
                <StravaConfigModal 
                    onClose={() => setShowStravaConfig(false)} 
                />
            )}

            {showStravaSyncOptions && (
                <StravaSyncModal 
                    onClose={() => setShowStravaSyncOptions(false)} 
                    onImportFinished={handleStravaImportFinished} 
                    lastSyncDate={tracks.length > 0 ? new Date(tracks[0].points[0].time) : null} 
                />
            )}

            {showProfile && (
                <UserProfileModal 
                    onClose={() => toggleView('profile')} 
                    onSave={async (p) => { setUserProfile(p); await saveProfileToDB(p); addToast("Profilo salvato!", "success"); }} 
                    currentProfile={userProfile} 
                    tracks={tracks}
                />
            )}

            {showSettings && (
                <SettingsModal 
                    onClose={() => toggleView('settings')} 
                    userProfile={userProfile}
                    onUpdateProfile={async (updates) => {
                        const newProfile = { ...userProfile, ...updates };
                        setUserProfile(newProfile);
                        await saveProfileToDB(newProfile);
                        addToast("Impostazioni aggiornate!", "success");
                    }}
                />
            )}

            {!showHome && !showAuthSelection && (
                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
                    {/* CONDITIONAL LAYOUT: FULL MAP IF RACING, RESIZABLE IF IDLE */}
                    {isRacing ? (
                        // RACING LAYOUT (UPDATED: MAP TOP + CHART BOTTOM)
                        <div className="w-full h-full flex flex-col bg-slate-900">
                            {/* MAPPA - Occupa lo spazio rimanente */}
                            <div className="flex-grow relative bg-slate-900 overflow-hidden">
                                <MapDisplay 
                                    tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                                    isAnimationPlaying={raceState === 'running'} fitBoundsCounter={fitBoundsCounter}
                                    runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                />
                                {/* RACE OVERLAYS ON MAP */}
                                <div className={`absolute left-1/2 -translate-x-1/2 z-[4600] ${isDesktop ? 'top-4' : 'top-14'}`}>
                                    <RaceControls 
                                        simulationState={raceState} simulationTime={raceTime} simulationSpeed={raceSpeed}
                                        onPause={() => setRaceState('paused')} onResume={() => setRaceState('running')}
                                        onStop={() => { setRaceState('idle'); setRaceRunners(null); }}
                                        onSpeedChange={setRaceSpeed}
                                    />
                                </div>
                                <div className="absolute top-0 right-0 z-[2000] p-2">
                                    <button 
                                        onClick={() => { setRaceState('idle'); setRaceRunners(null); }} 
                                        className="bg-red-600/90 text-white px-3 py-1 rounded text-xs font-bold uppercase"
                                    >
                                        Esci
                                    </button>
                                </div>
                            </div>

                            {/* GRAFICO GAP - Altezza fissa in basso */}
                            {raceRunners && raceHistory.length > 0 && (
                                <div className="h-48 w-full border-t border-slate-700 bg-slate-950 shrink-0 z-30">
                                    <RaceGapChart 
                                        history={raceHistory} 
                                        tracks={tracks.filter(t => raceSelectionIds.has(t.id))} 
                                        currentTime={raceTime} 
                                        currentGaps={raceGaps}
                                        runners={raceRunners}
                                        leaderStats={leadStats}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        // IDLE LAYOUT
                        (!isDesktop && !isSidebarOpen) ? (
                            // MOBILE FULL SCREEN MAP
                            <div className="w-full h-full flex flex-col bg-slate-950 relative">
                                <div className="flex-grow relative bg-slate-900">
                                    <MapDisplay 
                                        tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                                        isAnimationPlaying={false} fitBoundsCounter={fitBoundsCounter}
                                        runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                    />
                                </div>
                                <div className="bg-slate-950 pb-safe border-t border-slate-800 shrink-0">
                                    <NavigationDock 
                                        onOpenSidebar={() => setIsSidebarOpen(true)} 
                                        onCloseSidebar={() => setIsSidebarOpen(false)}
                                        onOpenExplorer={() => toggleView('explorer')} onOpenDiary={() => toggleView('diary')}
                                        onOpenPerformance={() => toggleView('performance')} onOpenHub={() => toggleView('hub')}
                                        onOpenSocial={() => toggleView('social')} onOpenProfile={() => toggleView('profile')}
                                        onOpenGuide={() => toggleView('guide')} onExportBackup={() => {}} 
                                        isSidebarOpen={isSidebarOpen}
                                    />
                                </div>
                            </div>
                        ) : (
                            // STANDARD LAYOUT (RESIZABLE) - Desktop or Mobile Split
                            <ResizablePanel
                                direction={isDesktop ? 'vertical' : 'horizontal'}
                                initialSize={isDesktop ? layoutPrefs.desktopSidebar : undefined}
                                initialSizeRatio={isDesktop ? undefined : layoutPrefs.mobileListRatio}
                                minSize={250} 
                                onResizeEnd={handleResizeEnd}
                                className="w-full h-full"
                            >
                                {/* PANEL 1: SIDEBAR (Desktop) OR LIST (Mobile - Top) */}
                                {isDesktop ? (
                                    // DESKTOP: LEFT PANEL IS SIDEBAR
                                    <aside className="h-full bg-slate-900 border-r border-slate-800 flex flex-col w-full">
                                        {isSidebarOpen ? (
                                            <>
                                                <div className="flex-grow overflow-hidden">
                                                    <Sidebar 
                                                        tracks={tracks.filter(t => !t.isExternal)} 
                                                        visibleTrackIds={mapVisibleIds} 
                                                        onFocusTrack={setFocusedTrackId} focusedTrackId={focusedTrackId}
                                                        raceSelectionIds={raceSelectionIds} 
                                                        onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                                        onDeselectAll={() => setRaceSelectionIds(new Set())}
                                                        onSelectAll={() => setRaceSelectionIds(new Set(tracks.filter(t => !t.isArchived).map(t => t.id)))}
                                                        onStartRace={openRaceSetup}
                                                        onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                                                        onEditTrack={(id) => setEditingTrack(tracks.find(t => t.id === id) || null)}
                                                        onDeleteTrack={async (id) => { 
                                                            const track = tracks.find(t => t.id === id); if (track) markStravaTrackAsDeleted(track);
                                                            const u = tracks.filter(t => t.id !== id); setTracks(u); await saveTracksToDB(u); await deleteTrackFromCloud(id); 
                                                        }}
                                                        onBulkArchive={handleBulkArchive} onDeleteSelected={handleBulkDelete} onMergeSelected={handleMergeSelectedTracks} onToggleFavorite={handleToggleFavorite} onBulkGroup={handleBulkGroup} onFileUpload={handleFileUpload} onToggleArchived={async (id) => { const u = tracks.map(t => t.id === id ? {...t, isArchived: !t.isArchived} : t); setTracks(u); await saveTracksToDB(u); }}
                                                    />
                                                </div>
                                                <div className="bg-slate-950 shrink-0">
                                                    <NavigationDock 
                                                        onOpenSidebar={() => setIsSidebarOpen(true)} onCloseSidebar={() => setIsSidebarOpen(false)}
                                                        onOpenExplorer={() => toggleView('explorer')} onOpenDiary={() => toggleView('diary')}
                                                        onOpenPerformance={() => toggleView('performance')} onOpenHub={() => toggleView('hub')}
                                                        onOpenSocial={() => toggleView('social')} onOpenProfile={() => toggleView('profile')}
                                                        onOpenGuide={() => toggleView('guide')} onExportBackup={() => {}} isSidebarOpen={isSidebarOpen}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-full flex items-center justify-center bg-slate-900">
                                                <button onClick={() => setIsSidebarOpen(true)} className="p-4 text-slate-500 hover:text-white transform rotate-90 whitespace-nowrap font-bold uppercase tracking-widest text-xs">Apri Sidebar</button>
                                            </div>
                                        )}
                                    </aside>
                                ) : (
                                    // MOBILE: TOP PANEL IS LIST
                                    <div className="flex-grow overflow-hidden bg-slate-900 border-b border-slate-800 w-full h-full relative">
                                         <Sidebar 
                                            tracks={tracks.filter(t => !t.isExternal)} 
                                            visibleTrackIds={mapVisibleIds} focusedTrackId={focusedTrackId} raceSelectionIds={raceSelectionIds}
                                            onFocusTrack={setFocusedTrackId} onDeselectAll={() => setRaceSelectionIds(new Set())}
                                            onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                            onStartRace={openRaceSetup}
                                            onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                                            onEditTrack={(id) => setEditingTrack(tracks.find(t => t.id === id) || null)}
                                            onBulkArchive={handleBulkArchive} onDeleteSelected={handleBulkDelete} onMergeSelected={handleMergeSelectedTracks} onToggleFavorite={handleToggleFavorite} onBulkGroup={handleBulkGroup} onFileUpload={handleFileUpload} onToggleArchived={async (id) => { const u = tracks.map(t => t.id === id ? {...t, isArchived: !t.isArchived} : t); setTracks(u); await saveTracksToDB(u); }} onDeleteTrack={() => {}} onSelectAll={() => {}}
                                         />
                                    </div>
                                )}

                                {/* PANEL 2: MAP (Desktop) OR MAP+DOCK (Mobile) */}
                                <div className="h-full w-full relative bg-slate-950 flex flex-col overflow-hidden">
                                    {isDesktop ? (
                                        // DESKTOP: RIGHT PANEL IS MAP
                                        <>
                                            <MapDisplay 
                                                tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                                                isAnimationPlaying={false} fitBoundsCounter={fitBoundsCounter}
                                                runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                            />
                                            <button onClick={() => setShowGlobalChat(true)} className="fixed bottom-24 right-4 z-[4000] bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full shadow-2xl active:scale-90">
                                                <span className="text-xl">🧠</span>
                                            </button>
                                        </>
                                    ) : (
                                        // MOBILE: BOTTOM PANEL IS MAP + DOCK
                                        <>
                                            <div className="flex-grow relative bg-slate-900">
                                                <MapDisplay 
                                                    tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                                                    isAnimationPlaying={false} fitBoundsCounter={fitBoundsCounter}
                                                    runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                                />
                                            </div>
                                            <div className="bg-slate-950 pb-safe border-t border-slate-800 shrink-0">
                                                <NavigationDock 
                                                    onOpenSidebar={() => setIsSidebarOpen(true)} 
                                                    onCloseSidebar={() => setIsSidebarOpen(false)}
                                                    onOpenExplorer={() => toggleView('explorer')} onOpenDiary={() => toggleView('diary')}
                                                    onOpenPerformance={() => toggleView('performance')} onOpenHub={() => toggleView('hub')}
                                                    onOpenSocial={() => toggleView('social')} onOpenProfile={() => toggleView('profile')}
                                                    onOpenGuide={() => toggleView('guide')} onExportBackup={() => {}} isSidebarOpen={isSidebarOpen}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </ResizablePanel>
                        )
                    )}
                </div>
            )}

            {showRaceSetup && (
                <RaceSetupModal 
                    tracks={tracks}
                    initialSelection={raceSelectionIds}
                    onSelectionChange={setRaceSelectionIds}
                    friendTracks={friendTracks}
                    onAddGhostFromFeed={handleAddGhost}
                    onAddOpponent={(files) => handleFileUpload(files)}
                    onConfirm={startRaceAnimation}
                    onCancel={() => setShowRaceSetup(false)}
                    onRemoveTrack={(id) => {
                        if (id.startsWith('ghost-')) {
                            setTracks(prev => prev.filter(t => t.id !== id));
                        }
                    }}
                />
            )}

            {viewingTrack && (
                <div className="fixed inset-0 z-[10000] bg-slate-900">
                    <TrackDetailView 
                        track={viewingTrack} userProfile={userProfile} onExit={() => setViewingTrack(null)} 
                        plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} 
                        onUpdateTrackMetadata={handleUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} 
                    />
                </div>
            )}

            {editingTrack && (
                <div className="fixed inset-0 z-[10000] bg-slate-900">
                    <TrackEditor 
                        initialTracks={[editingTrack]} addToast={addToast}
                        onExit={async (updated) => { 
                            if (updated) { const u = tracks.map(t => t.id === updated.id ? updated : t); setTracks(u); await saveTracksToDB(u); }
                            setEditingTrack(null); 
                        }} 
                    />
                </div>
            )}

            {showDiary && (
                <div className="fixed inset-0 z-[9000] bg-slate-900 flex flex-col">
                    <div className="flex-grow overflow-hidden">
                        <DiaryView 
                            tracks={tracks} plannedWorkouts={plannedWorkouts} userProfile={userProfile} 
                            onClose={() => toggleView('diary')} onSelectTrack={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)} 
                            onAddPlannedWorkout={handleAddPlannedWorkout} onUpdatePlannedWorkout={handleUpdatePlannedWorkout} onDeletePlannedWorkout={handleDeletePlannedWorkout} onCheckAiAccess={onCheckAiAccess} 
                        />
                    </div>
                </div>
            )}

            {showExplorer && <ExplorerView tracks={tracks} onClose={() => toggleView('explorer')} onSelectTrack={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)} />}
            {showPerformance && <PerformanceAnalysisPanel tracks={tracks} userProfile={userProfile} onClose={() => toggleView('performance')} />}
            {showSocial && userId && <SocialHub onClose={() => toggleView('social')} currentUserId={userId} onChallengeGhost={handleChallengeGhost} />}
            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            {showGuide && <GuideModal onClose={() => toggleView('guide')} />}
            {raceResults && <RaceSummary results={raceResults} racerStats={new Map()} onClose={() => setRaceResults(null)} userProfile={userProfile} tracks={tracks} />}
            {showGlobalChat && <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><Chatbot onClose={() => setShowGlobalChat(false)} userProfile={userProfile} tracksToAnalyze={tracks} plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} isStandalone={true} /></div>}
        </div>
    );
};

export default App;
