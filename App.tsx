
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
import SettingsModal from './components/SettingsModal';
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
import InfographicScreen from './components/InfographicScreen';
import RaceControls from './components/RaceControls';
import RaceLeaderboard from './components/RacePaceBar';
import RaceSummary from './components/RaceSummary';
import ReminderNotification from './components/ReminderNotification';
import RaceSetupModal from './components/RaceSetupModal';
import ResizablePanel from './components/ResizablePanel';
import RaceGapChart from './components/RaceGapChart'; 
import WorkoutConfirmationModal from './components/WorkoutConfirmationModal'; 
import InstallPromptModal from './components/InstallPromptModal'; 

import { 
    saveTracksToDB, loadTracksFromDB, 
    saveProfileToDB, loadProfileFromDB, 
    savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB,
    importAllData, exportAllData, syncTrackToCloud, deleteTrackFromCloud,
    deletePlannedWorkoutFromCloud
} from './services/dbService';
import { supabase } from './services/supabaseClient';
import { handleStravaCallback, fetchStravaActivitiesMetadata, isStravaConnected } from './services/stravaService';
import { getTrackStateAtTime, mergeTracks } from './services/trackEditorUtils';
import { getApiUsage, trackUsage, addTokensToUsage } from './services/usageService';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { generateSmartTitle } from './services/titleGenerator';
import { isDuplicateTrack, markStravaTrackAsDeleted, isPreviouslyDeletedStravaTrack, getTrackFingerprint } from './services/trackUtils';
import { getFriendsActivityFeed, updatePresence, getFriends, getUnreadNotificationsCount, markMessagesAsRead } from './services/socialService';
import { calculateTrackStats } from './services/trackStatsService';

const LAYOUT_PREFS_KEY = 'runcoach_layout_prefs_v6';
const SESSION_ACTIVE_KEY = 'runcoach_session_active';
const INSTALL_PROMPT_DISMISSED_KEY = 'runcoach_install_prompt_dismissed';

const App: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({ autoAnalyzeEnabled: true });
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [usage, setUsage] = useState<ApiUsage>({ requests: 0, tokens: 0, lastReset: '' });
    
    // States for startup flow
    const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(SESSION_ACTIVE_KEY));
    const [showInfographic, setShowInfographic] = useState(false); 
    const [isAppReady, setIsAppReady] = useState(false); // NEW: Tracks if background loading is done
    
    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    const [isDataLoading, setIsDataLoading] = useState(false); 
    const [authLimitReached, setAuthLimitReached] = useState(false);

    const [showAuthSelection, setShowAuthSelection] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showHome, setShowHome] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showExplorer, setShowExplorer] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const [showStravaSyncOptions, setShowStravaSyncOptions] = useState(false);
    const [stravaAutoModal, setStravaAutoModal] = useState(false);
    const [showStravaConfig, setShowStravaConfig] = useState(false);
    
    const [pendingWorkoutMatch, setPendingWorkoutMatch] = useState<{ track: Track, workout: PlannedWorkout } | null>(null);

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
    
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [onlineFriendsCount, setOnlineFriendsCount] = useState<number>(0);
    const friendsIdRef = useRef<Set<string>>(new Set());

    const [layoutPrefs, setLayoutPrefs] = useState<{ desktopSidebar: number, mobileListRatio: number }>({ desktopSidebar: 320, mobileListRatio: 0.7 });

    // --- PWA INSTALL LOGIC ---
    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return;
        if (sessionStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)) return;

        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        
        if (isIosDevice) {
            setIsIOS(true);
            setTimeout(() => setShowInstallPrompt(true), 2000);
        } else {
            const handleBeforeInstallPrompt = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setShowInstallPrompt(true);
            };
            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        }
    }, []);

    const handlePwaInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowInstallPrompt(false);
            }
        }
    };

    const handlePwaIgnore = () => {
        setShowInstallPrompt(false);
        sessionStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    };

    // --- BACKGROUND INIT & LOADING ---
    // This runs immediately on mount, in parallel with Splash/Infographics
    useEffect(() => {
        checkSession();
    }, []);

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

    useEffect(() => {
        window.history.replaceState({ view: 'map' }, '');
        const handlePopState = (event: PopStateEvent) => {
            const state = event.state;
            const view = state?.view || 'map';
            if (view === 'map') {
                resetNavigation();
                if (!isDesktop) setIsSidebarOpen(false); 
            } else {
                resetNavigation();
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [resetNavigation, isDesktop]); // Added isDesktop dependency

    const pushViewState = (viewName: string) => {
        window.history.pushState({ view: viewName }, '');
    };

    const toggleView = (view: 'diary' | 'explorer' | 'performance' | 'social' | 'hub' | 'profile' | 'settings' | 'guide') => {
        const currentStates = {
            diary: showDiary, explorer: showExplorer, performance: showPerformance,
            social: showSocial, hub: showHome, profile: showProfile,
            settings: showSettings, guide: showGuide
        };
        const isOpen = currentStates[view];
        if (!isOpen) {
            pushViewState(view);
            resetNavigation(); 
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
        } else {
            window.history.back();
        }
        if (view === 'hub' && !isOpen && isDesktop) {
            setIsSidebarOpen(true);
        }
    };

    // --- FIX FOR MOBILE LIST BUTTON ---
    const handleOpenListFromHome = useCallback(() => {
        setShowHome(false);
        setIsSidebarOpen(true);
        // Force reset any other view
        resetNavigation();
        pushViewState('sidebar');
    }, [resetNavigation]);

    useEffect(() => {
        const stored = localStorage.getItem(LAYOUT_PREFS_KEY);
        if (stored) { try { setLayoutPrefs(JSON.parse(stored)); } catch(e) {} }
    }, []);

    const sendNotification = (title: string, body: string, icon: string = '/logo.png') => {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body, icon });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') new Notification(title, { body, icon });
                });
            }
        }
    };

    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted') Notification.requestPermission();
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        if (userId && userId !== 'guest') {
            try {
                const count = await getUnreadNotificationsCount(userId);
                setUnreadMessages(count);
            } catch(e) {}
        }
    }, [userId]);

    useEffect(() => {
        if (!userId || userId === 'guest') return;
        const heartbeatAndCheckFriends = async () => {
            updatePresence(userId);
            try {
                const friends = await getFriends(userId);
                const onlineCount = friends.filter(f => f.isOnline).length;
                setOnlineFriendsCount(onlineCount);
                friendsIdRef.current = new Set(friends.map(f => f.id).filter(id => id !== undefined) as string[]);
            } catch (e) { console.error("Friend poll error", e); }
        };
        
        heartbeatAndCheckFriends();
        fetchUnreadCount();

        const interval = setInterval(heartbeatAndCheckFriends, 60 * 1000);
        return () => clearInterval(interval);
    }, [userId, fetchUnreadCount]);

    useEffect(() => {
        if (!userId || userId === 'guest') return;
        const channel = supabase.channel('global_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` }, (payload) => {
                if (!showSocial) {
                    const msg = "Nuovo messaggio ricevuto!";
                    addToast(msg, "info");
                    sendNotification("RunCoachAI Social", "Hai ricevuto un nuovo messaggio privato.");
                }
                // Refresh unread count on insert
                fetchUnreadCount();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` }, (payload) => {
                // Refresh unread count on update (when read_at changes)
                fetchUnreadCount();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friends', filter: `user_id_2=eq.${userId}` }, (payload) => {
                const msg = "Nuova richiesta di amicizia!";
                addToast(msg, "info");
                fetchUnreadCount();
                sendNotification("RunCoachAI Crew", "Qualcuno vuole aggiungerti agli amici!");
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracks' }, (payload) => {
                const newRecord = payload.new as { user_id: string; name: string };
                if (friendsIdRef.current.has(newRecord.user_id)) {
                    const msg = `Un amico ha caricato una nuova corsa: ${newRecord.name}`;
                    addToast(msg, "info");
                    sendNotification("Feed Attività", `${newRecord.name} è appena stata caricata.`);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_group_members', filter: `user_id=eq.${userId}` }, async (payload) => {
                const newMember = payload.new as any;
                const { data: groupData } = await supabase.from('social_groups').select('name').eq('id', newMember.group_id).single();
                const groupName = groupData?.name || 'un gruppo';
                const msg = `Sei stato aggiunto al gruppo: ${groupName}`;
                addToast(msg, "success");
                sendNotification("Nuovo Gruppo", msg);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, showSocial, fetchUnreadCount]);

    const saveLayoutPrefs = (newPrefs: Partial<{ desktopSidebar: number, mobileListRatio: number }>) => {
        const updated = { ...layoutPrefs, ...newPrefs };
        setLayoutPrefs(updated);
        localStorage.setItem(LAYOUT_PREFS_KEY, JSON.stringify(updated));
    };

    const mapVisibleIds = useMemo(() => {
        if (raceSelectionIds.size === 0) return new Set(tracks.filter(t => !t.isArchived && !t.isExternal).map(t => t.id));
        return raceSelectionIds;
    }, [tracks, raceSelectionIds]);

    const todayEntries = useMemo(() => {
        const today = new Date().toDateString();
        const entries = plannedWorkouts.filter(w => 
            new Date(w.date).toDateString() === today && 
            (w.entryType === 'commitment' || w.entryType === 'note' || (w.entryType === 'workout' && !w.completedTrackId))
        );
        if (entries.length > 0) {
             const notifiedKey = `notified_diary_${today}_${entries.length}`;
             if (!sessionStorage.getItem(notifiedKey)) {
                 sendNotification("RunCoachAI Agenda", `Hai ${entries.length} attività in programma per oggi.`);
                 sessionStorage.setItem(notifiedKey, 'true');
             }
        }
        return entries;
    }, [plannedWorkouts]);

    useEffect(() => {
        setUsage(getApiUsage());
        (window as any).gpxApp = {
            addTokens: (count: number) => { const u = addTokensToUsage(count); setUsage(u); },
            trackApiRequest: () => { const u = trackUsage(0); setUsage(u); },
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
        setShowInfographic(true); 
    };

    const handleInfographicNext = () => {
        setShowInfographic(false);
        sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true'); 
        
        // After Splash, determine where to go based on session state
        // If session exists, HomeModal will show. If not, AuthSelection.
        if (userId) {
            setShowHome(true);
            setShowAuthSelection(false);
        } else {
            setShowAuthSelection(true);
        }
    };

    const checkAndPromptWorkoutMatch = (newTracks: Track[]) => {
        for (const track of newTracks) {
            const trackDate = new Date(track.points[0].time).toDateString();
            const match = plannedWorkouts.find(w => 
                new Date(w.date).toDateString() === trackDate && 
                !w.completedTrackId && 
                w.entryType === 'workout'
            );
            
            if (match) {
                setPendingWorkoutMatch({ track, workout: match });
                return;
            }
        }
    };

    const confirmWorkoutMatch = async () => {
        if (!pendingWorkoutMatch) return;
        const { track, workout } = pendingWorkoutMatch;

        const updatedTrack: Track = {
            ...track,
            name: workout.title, 
            linkedWorkout: {
                title: workout.title,
                description: workout.description,
                activityType: workout.activityType
            }
        };

        const updatedWorkout: PlannedWorkout = {
            ...workout,
            completedTrackId: track.id
        };

        const nextTracks = tracks.map(t => t.id === track.id ? updatedTrack : t);
        setTracks(nextTracks);
        await saveTracksToDB(nextTracks);

        const nextWorkouts = plannedWorkouts.map(w => w.id === workout.id ? updatedWorkout : w);
        setPlannedWorkouts(nextWorkouts);
        await savePlannedWorkoutsToDB(nextWorkouts);

        setPendingWorkoutMatch(null);
        addToast(`Corsa rinominata: "${workout.title}"`, "success");
    };

    const cancelWorkoutMatch = () => {
        setPendingWorkoutMatch(null);
    };

    const runAutoStravaSync = async (currentTracks: Track[]) => {
        try {
            const lastTrack = currentTracks.length > 0 ? currentTracks[0] : null;
            const after = lastTrack ? Math.floor(lastTrack.points[0].time.getTime() / 1000) : undefined;
            const activities = await fetchStravaActivitiesMetadata(after, undefined, 10);
            const runningOnly = activities.filter((a: any) => ['Run', 'TrailRun', 'VirtualRun'].includes(a.type));
            const uniqueNew = runningOnly.filter((a: any) => {
                const stravaId = `strava-${a.id}`;
                const exists = currentTracks.some(t => t.id === stravaId);
                const isDeleted = isPreviouslyDeletedStravaTrack({ ...a, id: stravaId } as any);
                return !exists && !isDeleted;
            });

            if (uniqueNew.length > 0) {
                addToast(`Trovate ${uniqueNew.length} nuove attività su Strava.`, "info");
                setStravaAutoModal(true);
                setShowStravaSyncOptions(true);
            }
        } catch (e: any) {
            console.error("Auto check failed", e);
        }
    };

    const checkSession = async () => {
        setIsDataLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUserId(session.user.id);
                setIsGuest(false);
                // Start loading in background, show home logic will happen in handleInfographicNext or immediately if no splash
                await loadData();
            } else {
                // Not logged in yet
                setIsAppReady(true);
            }
        } catch (e) {
            // Error checking session, assume not logged in but ready to show Auth
            setIsAppReady(true);
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
                // Clean up duplicates if found
                await saveTracksToDB(uniqueTracks);
            }

            setTracks(uniqueTracks);
            
            const loadedWorkouts = await loadPlannedWorkoutsFromDB(forceLocal);
            const uniqueWorkouts: PlannedWorkout[] = [];
            const seenWorkoutKeys = new Set<string>();
            
            (loadedWorkouts as any[]).forEach((w: PlannedWorkout) => {
                const d = new Date(w.date);
                const dateStr = d.toDateString();
                const key = `${dateStr}|${w.title.trim().toLowerCase()}|${w.activityType}`;
                
                if (!seenWorkoutKeys.has(key)) {
                    seenWorkoutKeys.add(key);
                    uniqueWorkouts.push(w);
                }
            });

            setPlannedWorkouts(uniqueWorkouts);

            // Auto-Import from Strava Logic
            // Must check if profile has it enabled AND if connected
            if (loadedProfile?.stravaAutoSync && isStravaConnected()) {
                await runAutoStravaSync(uniqueTracks);
            }

        } catch (e: any) {
            // Fail silently/gracefully
        } finally {
            // Signal that background loading is complete
            setIsAppReady(true);
        }
    };

    // --- RACE LOGIC ---
    const [raceState, setRaceState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
    const [raceTime, setRaceTime] = useState(0);
    const [raceSpeed, setRaceSpeed] = useState(10);
    const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
    const [raceResults, setRaceResults] = useState<RaceResult[] | null>(null);
    const [raceGaps, setRaceGaps] = useState<Map<string, number | undefined>>(new Map());
    const [raceHistory, setRaceHistory] = useState<RaceGapSnapshot[]>([]); 
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
        if (userId) {
            try {
                const feed = await getFriendsActivityFeed(userId);
                setFriendTracks(feed);
            } catch (e: any) {
                console.warn("Could not load friend tracks for race setup", e);
            }
        }
    };

    const startRaceAnimation = (renamedMap: Record<string, string>) => {
        const selected = tracks.filter(t => raceSelectionIds.has(t.id));
        if (selected.length < 1) return;
        selected.forEach(t => { if (renamedMap[t.id]) t.name = renamedMap[t.id]; });
        setRaceResults(null);
        raceTimeRef.current = 0;
        lastHistoryUpdateRef.current = 0;
        setRaceTime(0);
        setRaceState('running');
        setRaceHistory([]);
        setLeadStats({}); 
        setRaceRunners(selected.map(t => ({ trackId: t.id, name: t.name, position: t.points[0], color: t.color, pace: 0, finished: false })));
        setShowRaceSetup(false);
    };

    useEffect(() => {
        let frame: number;
        const animateRace = (time: number) => {
            if (raceLastTimeRef.current !== null) {
                const delta = time - raceLastTimeRef.current;
                const timeStep = delta * raceSpeed;
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
                        newRunners.push(prevState);
                    } else {
                        const state = getTrackStateAtTime(t, nextTime);
                        if (state) {
                            let isFinished = false;
                            if (state.point.cummulativeDistance >= t.distance || nextTime >= t.duration) {
                                isFinished = true;
                                const lastPt = t.points[t.points.length - 1];
                                newRunners.push({ trackId: t.id, name: t.name, position: lastPt, color: t.color, pace: 0, finished: true, finishTime: t.duration });
                            } else {
                                newRunners.push({ trackId: t.id, name: t.name, position: state.point, color: t.color, pace: state.pace, finished: false });
                                allFinished = false;
                            }
                        } else {
                             const lastPt = t.points[t.points.length - 1];
                             newRunners.push({ trackId: t.id, name: t.name, position: lastPt, color: t.color, pace: 0, finished: true, finishTime: t.duration });
                        }
                    }
                });

                const sorted = [...newRunners].sort((a,b) => b.position.cummulativeDistance - a.position.cummulativeDistance);
                if (sorted.length > 0) {
                    const leader = sorted[0];
                    const leaderDist = leader.position.cummulativeDistance;
                    sorted.forEach((r) => { currentGaps.set(r.trackId, (leaderDist - r.position.cummulativeDistance) * 1000); });

                    if (simulationStateRef.current === 'running') {
                        setLeadStats(prev => {
                            const next = { ...prev };
                            if (!next[leader.trackId]) next[leader.trackId] = { timeInLead: 0, distanceInLead: 0 };
                            next[leader.trackId].timeInLead += timeStep;
                            if (leader.pace > 0) {
                                const distAddedMeters = (timeStep / 60000) / leader.pace * 1000;
                                next[leader.trackId].distanceInLead += distAddedMeters;
                            }
                            return next;
                        });
                    }

                    if (nextTime - lastHistoryUpdateRef.current > 5000) {
                        const gapsObj: Record<string, number> = {};
                        sorted.forEach(r => { gapsObj[r.trackId] = (leaderDist - r.position.cummulativeDistance) * 1000; });
                        setRaceHistory(prev => [...prev, { time: nextTime, gaps: gapsObj }]);
                        lastHistoryUpdateRef.current = nextTime;
                    }
                }

                setRaceRunners(newRunners);
                setRaceGaps(currentGaps);

                if (allFinished) {
                    setRaceState('finished');
                    const results = selected.map(t => ({ trackId: t.id, name: t.name, finishTime: t.duration, distance: t.distance, rank: 0 })).sort((a,b) => a.finishTime - b.finishTime).map((r, i) => ({ ...r, rank: i + 1 }));
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
            isExternal: true, 
            color: '#a855f7',
        };
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
        await deletePlannedWorkoutFromCloud(String(id));
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
            let parsed: { name: string; points: TrackPoint[]; distance: number; duration: number; } | null = null;
            if (file.name.toLowerCase().endsWith('.gpx')) parsed = parseGpx(text, file.name);
            else if (file.name.toLowerCase().endsWith('.tcx')) parsed = parseTcx(text, file.name);
            if (parsed) {
                const { title, activityType, folder } = generateSmartTitle(parsed.points, parsed.distance, String(parsed.name));
                const tempTrack: Track = { id: crypto.randomUUID(), name: title, points: parsed.points, distance: parsed.distance, duration: parsed.duration, color: `hsl(${Math.random() * 360}, 70%, 60%)`, activityType, folder };
                if (!isDuplicateTrack(tempTrack, [...tracks, ...newTracks])) { newTracks.push(tempTrack); newCount++; } 
                else skipCount++;
            }
        }
        if (newCount > 0) { 
            const updated = [...newTracks, ...tracks]; 
            setTracks(updated); 
            await saveTracksToDB(updated); 
            addToast(`Caricate ${newCount} nuove corse.`, "success"); 
            checkAndPromptWorkoutMatch(newTracks); 
        }
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
        if (importedCount > 0) { 
            const updated = [...toAdd, ...tracks]; 
            setTracks(updated); 
            await saveTracksToDB(updated); 
            addToast(`Importate con successo ${importedCount} corse da Strava.`, "success");
            checkAndPromptWorkoutMatch(toAdd); 
        }
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
    
    // PWA INSTALL MODAL (Shown before infographics if needed)
    if (showInstallPrompt) return (
        <InstallPromptModal 
            onInstall={handlePwaInstall} 
            onIgnore={handlePwaIgnore} 
            isIOS={isIOS} 
        />
    );

    // Pass 'isReady' prop to control button appearance
    if (showInfographic) return <InfographicScreen isLoading={!isAppReady} onNext={handleInfographicNext} />;

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-white font-sans">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            <ReminderNotification entries={todayEntries} />

            {/* General Loading Overlay (Non-blocking usually, but for specific actions) */}
            {isDataLoading && !showInfographic && (
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
                    onOpenList={handleOpenListFromHome} // Pass explicit handler for mobile
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
                        } catch (e: any) { addToast("Errore backup.", "error"); } finally { setIsDataLoading(false); }
                    }}
                    onExportBackup={async () => { 
                        try {
                            const d = await exportAllData(); 
                            const b = new Blob([JSON.stringify(d, null, 2)], {type:'application/json'}); 
                            const u = URL.createObjectURL(b); 
                            const a = document.createElement('a'); a.href=u; a.download=`RunCoachAI_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(u);
                            addToast("Backup salvato!", "success");
                        } catch (e: any) { addToast("Errore backup.", "error"); }
                    }}
                    onUploadTracks={handleFileUpload}
                    onOpenProfile={() => toggleView('profile')}
                    onOpenSettings={() => toggleView('settings')}
                    onOpenChangelog={() => setShowChangelog(true)} 
                    onEnterRaceMode={openRaceSetup}
                    trackCount={tracks.length}
                    userProfile={userProfile}
                    // Passaggio props per Social Hub
                    onOpenSocial={() => toggleView('social')}
                    unreadCount={unreadMessages}
                    onlineCount={onlineFriendsCount}
                />
            )}

            {showProfile && (
                <UserProfileModal
                    onClose={() => toggleView('profile')}
                    onSave={async (p) => {
                        setUserProfile(p);
                        await saveProfileToDB(p);
                        addToast("Profilo aggiornato", "success");
                    }}
                    currentProfile={userProfile}
                    tracks={tracks}
                    onLogout={async () => {
                        await supabase.auth.signOut();
                        window.location.reload();
                    }}
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
                    }}
                />
            )}

            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            
            {showStravaConfig && <StravaConfigModal onClose={() => setShowStravaConfig(false)} />}
            
            {(showStravaSyncOptions || stravaAutoModal) && (
                <StravaSyncModal 
                    onClose={() => { setShowStravaSyncOptions(false); setStravaAutoModal(false); }}
                    onImportFinished={handleStravaImportFinished}
                    lastSyncDate={tracks.length > 0 ? new Date(Math.max(...tracks.map(t => new Date(t.points[0].time).getTime()))) : null}
                    autoStart={stravaAutoModal}
                />
            )}

            {showExplorer && (
                <ExplorerView 
                    tracks={tracks}
                    onClose={() => toggleView('explorer')}
                    onSelectTrack={(id) => {
                        const t = tracks.find(tr => tr.id === id);
                        if (t) { setViewingTrack(t); toggleView('explorer'); }
                    }}
                />
            )}

            {showDiary && (
                <DiaryView 
                    tracks={tracks}
                    plannedWorkouts={plannedWorkouts}
                    userProfile={userProfile}
                    onClose={() => toggleView('diary')}
                    onSelectTrack={(id) => {
                        const t = tracks.find(tr => tr.id === id);
                        if (t) { setViewingTrack(t); toggleView('diary'); }
                    }}
                    onAddPlannedWorkout={handleAddPlannedWorkout}
                    onUpdatePlannedWorkout={handleUpdatePlannedWorkout}
                    onDeletePlannedWorkout={handleDeletePlannedWorkout}
                    onMassUpdatePlannedWorkouts={async (updated) => {
                        const next = plannedWorkouts.map(w => {
                            const up = updated.find(u => u.id === w.id);
                            return up || w;
                        });
                        setPlannedWorkouts(next);
                        await savePlannedWorkoutsToDB(next);
                        addToast("Diario aggiornato", "success");
                    }}
                    onOpenTrackChat={(id) => {
                        // TODO: Implement direct chat open from diary if needed
                    }}
                    onCheckAiAccess={onCheckAiAccess}
                />
            )}

            {showPerformance && (
                <PerformanceAnalysisPanel 
                    tracks={tracks}
                    userProfile={userProfile}
                    onClose={() => toggleView('performance')}
                />
            )}

            {showSocial && (
                <SocialHub 
                    onClose={() => toggleView('social')}
                    currentUserId={userId || 'guest'}
                    onChallengeGhost={handleChallengeGhost}
                    onReadMessages={() => setUnreadMessages(0)}
                />
            )}

            {/* RACE SETUP */}
            {showRaceSetup && (
                <RaceSetupModal 
                    tracks={tracks}
                    friendTracks={friendTracks}
                    initialSelection={raceSelectionIds}
                    onSelectionChange={setRaceSelectionIds}
                    onConfirm={startRaceAnimation}
                    onCancel={() => setShowRaceSetup(false)}
                    onAddOpponent={handleFileUpload}
                    onAddGhostFromFeed={handleAddGhost}
                    onRemoveTrack={(id) => {
                        setRaceSelectionIds(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                    }}
                />
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-grow flex overflow-hidden relative">
                
                {/* Editing View */}
                {editingTrack ? (
                    <TrackEditor 
                        initialTracks={[editingTrack]} 
                        onExit={(updated) => {
                            if (updated) {
                                const next = tracks.map(t => t.id === editingTrack.id ? updated : t);
                                setTracks(next);
                                saveTracksToDB(next);
                            }
                            setEditingTrack(null);
                        }}
                        addToast={addToast}
                    />
                ) : viewingTrack ? (
                    <TrackDetailView 
                        track={viewingTrack}
                        userProfile={userProfile}
                        onExit={() => setViewingTrack(null)}
                        allHistory={tracks}
                        plannedWorkouts={plannedWorkouts}
                        onUpdateTrackMetadata={handleUpdateTrackMetadata}
                        onAddPlannedWorkout={handleAddPlannedWorkout}
                        onCheckAiAccess={onCheckAiAccess}
                    />
                ) : (
                    /* Default Dashboard Layout */
                    <ResizablePanel 
                        direction={isDesktop ? 'horizontal' : 'vertical'}
                        initialSize={isDesktop ? layoutPrefs.desktopSidebar : undefined}
                        initialSizeRatio={!isDesktop ? layoutPrefs.mobileListRatio : undefined}
                        minSize={200}
                        onResizeEnd={handleResizeEnd}
                        className="w-full h-full"
                    >
                        {/* Panel 1: Sidebar / List */}
                        {isSidebarOpen ? (
                            <Sidebar 
                                tracks={tracks}
                                visibleTrackIds={mapVisibleIds}
                                focusedTrackId={focusedTrackId}
                                onFocusTrack={setFocusedTrackId}
                                raceSelectionIds={raceSelectionIds}
                                onToggleRaceSelection={(id) => {
                                    setRaceSelectionIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(id)) next.delete(id); else next.add(id);
                                        return next;
                                    });
                                }}
                                onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                                onDeselectAll={() => setRaceSelectionIds(new Set())}
                                onStartRace={openRaceSetup}
                                onViewDetails={(id) => {
                                    const t = tracks.find(tr => tr.id === id);
                                    if(t) setViewingTrack(t);
                                }}
                                onEditTrack={(id) => {
                                    const t = tracks.find(tr => tr.id === id);
                                    if(t) setEditingTrack(t);
                                }}
                                onDeleteTrack={async (id) => {
                                    if(confirm("Eliminare questa corsa?")) {
                                        const t = tracks.find(tr => tr.id === id);
                                        if(t) markStravaTrackAsDeleted(t);
                                        const next = tracks.filter(t => t.id !== id);
                                        setTracks(next);
                                        await saveTracksToDB(next);
                                        await deleteTrackFromCloud(id);
                                        addToast("Corsa eliminata", "info");
                                    }
                                }}
                                onDeleteSelected={handleBulkDelete}
                                onFileUpload={handleFileUpload}
                                onBulkArchive={handleBulkArchive}
                                onToggleArchived={async (id) => {
                                    const t = tracks.find(tr => tr.id === id);
                                    if(t) {
                                        await handleUpdateTrackMetadata(id, { isArchived: !t.isArchived });
                                        addToast(t.isArchived ? "Ripristinata" : "Archiviata", "info");
                                    }
                                }}
                                onMergeSelected={handleMergeSelectedTracks}
                                onToggleFavorite={handleToggleFavorite}
                                onBulkGroup={handleBulkGroup}
                            />
                        ) : (
                            <div className="hidden"></div> 
                        )}

                        {/* Panel 2: Map */}
                        <div className="relative w-full h-full">
                            <MapDisplay 
                                tracks={tracks}
                                visibleTrackIds={mapVisibleIds}
                                raceRunners={raceRunners}
                                hoveredTrackId={hoveredTrackId}
                                runnerSpeeds={new Map()}
                                fitBoundsCounter={fitBoundsCounter}
                                isAnimationPlaying={raceState === 'running'}
                                onTrackClick={(id) => {
                                    setFocusedTrackId(id);
                                    if(!isSidebarOpen) setIsSidebarOpen(true);
                                }}
                            />
                            
                            {/* Race Overlays */}
                            {raceState !== 'idle' && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                                    <RaceControls 
                                        simulationState={raceState}
                                        simulationTime={raceTime}
                                        simulationSpeed={raceSpeed}
                                        onPause={() => setRaceState('paused')}
                                        onResume={() => setRaceState('running')}
                                        onStop={() => { setRaceState('idle'); setRaceRunners(null); }}
                                        onSpeedChange={setRaceSpeed}
                                    />
                                </div>
                            )}
                            
                            {raceRunners && (
                                <div className="absolute top-20 left-4 z-[1000]">
                                    <RaceLeaderboard 
                                        racers={tracks.filter(t => raceSelectionIds.has(t.id))}
                                        ranks={new Map(raceResults?.map(r => [r.trackId, r.rank]) || [])}
                                        gaps={raceGaps}
                                    />
                                </div>
                            )}

                            {raceHistory.length > 0 && raceState !== 'idle' && (
                                <div className="absolute bottom-20 left-0 right-0 h-40 z-[900] pointer-events-none">
                                    {/* Optional Race Gap Chart Overlay */}
                                </div>
                            )}

                            {/* Navigation Dock */}
                            <div className="absolute bottom-0 left-0 right-0 z-[1100]">
                                <NavigationDock 
                                    onOpenSidebar={() => setIsSidebarOpen(true)}
                                    onCloseSidebar={() => setIsSidebarOpen(false)}
                                    onOpenExplorer={() => toggleView('explorer')}
                                    onOpenDiary={() => toggleView('diary')}
                                    onOpenPerformance={() => toggleView('performance')}
                                    onOpenHub={() => toggleView('hub')}
                                    onOpenSocial={() => toggleView('social')}
                                    onOpenProfile={() => toggleView('profile')}
                                    onOpenGuide={() => toggleView('guide')}
                                    onExportBackup={() => {}} 
                                    isSidebarOpen={isSidebarOpen}
                                    onOpenGlobalChat={() => setShowGlobalChat(true)}
                                    onlineCount={onlineFriendsCount}
                                    unreadCount={unreadMessages}
                                />
                            </div>
                        </div>
                    </ResizablePanel>
                )}
            </div>

            {/* GLOBAL ELEMENTS */}
            {showGlobalChat && (
                <div className="fixed bottom-20 right-4 z-[12000]">
                    <Chatbot 
                        userProfile={userProfile}
                        onClose={() => setShowGlobalChat(false)}
                        tracksToAnalyze={tracks}
                        plannedWorkouts={plannedWorkouts}
                        onAddPlannedWorkout={handleAddPlannedWorkout}
                        isStandalone={true}
                    />
                </div>
            )}

            {raceResults && raceState === 'finished' && (
                <RaceSummary 
                    results={raceResults}
                    racerStats={new Map(tracks.filter(t => raceSelectionIds.has(t.id)).map(t => [t.id, calculateTrackStats(t)]))}
                    onClose={() => { setRaceResults(null); setRaceState('idle'); }}
                    userProfile={userProfile}
                    tracks={tracks}
                />
            )}

            {pendingWorkoutMatch && (
                <WorkoutConfirmationModal 
                    workout={pendingWorkoutMatch.workout}
                    onConfirm={confirmWorkoutMatch}
                    onCancel={cancelWorkoutMatch}
                />
            )}

        </div>
    );
};

export default App;
