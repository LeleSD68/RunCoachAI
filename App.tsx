
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track, UserProfile, PlannedWorkout, ApiUsage, Toast, RaceRunner, RaceGapSnapshot, PauseSegment } from './types';
import { saveTracksToDB, loadTracksFromDB, saveProfileToDB, loadProfileFromDB, savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB, importAllData, exportAllData, deleteUserAccount } from './services/dbService';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { isDuplicateTrack, groupTracks } from './services/trackUtils';
import { mergeTracks } from './services/trackEditorUtils';
import { trackUsage, getApiUsage, addTokensToUsage, checkDailyLimit, incrementDailyLimit } from './services/usageService';
import { getUnreadNotificationsCount } from './services/socialService';
import { generateSmartTitle } from './services/titleGenerator';
import { handleStravaCallback } from './services/stravaService';

import SplashScreen from './components/SplashScreen';
import AuthSelectionModal from './components/AuthSelectionModal';
import LoginModal from './components/LoginModal';
import WelcomeModal from './components/WelcomeModal';
import HomeModal from './components/HomeModal';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import TrackDetailView from './components/TrackDetailView';
import ExplorerView from './components/ExplorerView';
import DiaryView from './components/DiaryView';
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel';
import SocialHub from './components/SocialHub';
import SettingsModal from './components/SettingsModal';
import UserProfileModal from './components/UserProfileModal';
import StravaSyncModal from './components/StravaSyncModal';
import StravaConfigModal from './components/StravaConfigModal';
import GuideModal from './components/GuideModal';
import Changelog from './components/Changelog';
import ToastContainer from './components/ToastContainer';
import NavigationDock from './components/NavigationDock';
import Chatbot from './components/Chatbot';
import AdminDashboard from './components/AdminDashboard';
import TrackEditor from './components/TrackEditor';
import RaceSetupModal from './components/RaceSetupModal';
import RaceControls from './components/RaceControls';
import RaceGapChart from './components/RaceGapChart';
import MobileTrackSummary from './components/MobileTrackSummary';
import InfographicScreen from './components/InfographicScreen';
import InstallPromptModal from './components/InstallPromptModal';
import LiveCoachScreen from './components/LiveCoachScreen';

const App: React.FC = () => {
    // --- STATE ---
    const [view, setView] = useState<'splash' | 'auth' | 'home' | 'map' | 'details' | 'editor' | 'race' | 'explorer' | 'diary' | 'performance' | 'infographic' | 'live_coach'>('splash');
    
    // Data
    const [tracks, setTracks] = useState<Track[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    
    // UI Modals & Panels
    const [showWelcome, setShowWelcome] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showStravaConfig, setShowStravaConfig] = useState(false);
    const [showStravaSyncOptions, setShowStravaSyncOptions] = useState(false);
    const [stravaAutoModal, setStravaAutoModal] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showChatbot, setShowChatbot] = useState(false);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [showRaceSetup, setShowRaceSetup] = useState(false);

    // Map & Interaction
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    const [mobileTrackSummary, setMobileTrackSummary] = useState<Track | null>(null);
    
    // Diary Specific State
    const [diarySelectedWorkoutId, setDiarySelectedWorkoutId] = useState<string | null>(null);

    // Race Mode State
    const [raceRunners, setRaceRunners] = useState<RaceRunner[]>([]);
    const [raceState, setRaceState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
    const [raceTime, setRaceTime] = useState(0);
    const [raceSpeed, setRaceSpeed] = useState(10);
    const [raceHistory, setRaceHistory] = useState<RaceGapSnapshot[]>([]);
    const [currentRaceGaps, setCurrentRaceGaps] = useState<Map<string, number>>(new Map());
    const [friendTracks, setFriendTracks] = useState<Track[]>([]);

    // Live Coach State
    const [activeLiveWorkout, setActiveLiveWorkout] = useState<PlannedWorkout | null>(null);

    // System
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isGuest, setIsGuest] = useState(false);
    const [apiUsage, setApiUsage] = useState<ApiUsage>(getApiUsage());

    // --- EFFECTS ---

    // Initial Load & Strava Callback
    useEffect(() => {
        // 1. Handle Strava OAuth Callback
        const params = new URLSearchParams(window.location.search);
        const stravaCode = params.get('code');
        if (stravaCode) {
            window.history.replaceState({}, document.title, window.location.pathname);
            handleStravaCallback(stravaCode)
                .then(() => {
                    addToast("Strava collegato con successo!", "success");
                    setUserProfile(p => {
                        const updated = { ...p, stravaAutoSync: true };
                        saveProfileToDB(updated);
                        return updated;
                    });
                })
                .catch(err => {
                    console.error("Strava Auth Error", err);
                    addToast("Errore collegamento Strava.", "error");
                });
        }

        // 2. Setup Window API
        (window as any).gpxApp = {
            addTokens: (count: number) => {
                const u = addTokensToUsage(count);
                setApiUsage(u);
            },
            trackApiRequest: () => {
                const u = trackUsage(0);
                setApiUsage(u);
            },
            getUsage: getApiUsage
        };

        // 3. Load Data
        const loadData = async () => {
            const p = await loadProfileFromDB();
            if (p) {
                setUserProfile(p);
                setIsGuest(false);
                const t = await loadTracksFromDB();
                setTracks(t);
                setVisibleTrackIds(new Set(t.filter(x => !x.isArchived).map(x => x.id)));
                
                const w = await loadPlannedWorkoutsFromDB();
                setPlannedWorkouts(w);

                if (p.stravaAutoSync) {
                    setStravaAutoModal(true);
                    setShowStravaSyncOptions(true);
                }
            }
        };
        loadData();

        // 4. Install prompt logic
        window.addEventListener('beforeinstallprompt', (e: any) => {
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setTimeout(() => setShowInstallPrompt(true), 5000);
        });
    }, []);

    // Social Polling
    useEffect(() => {
        if (!userProfile.id) return;
        const checkNotifications = async () => {
            const count = await getUnreadNotificationsCount(userProfile.id!);
            setUnreadCount(count);
        };
        checkNotifications();
        const interval = setInterval(checkNotifications, 30000);
        return () => clearInterval(interval);
    }, [userProfile.id]);

    // --- ACTIONS ---

    const addToast = (message: string, type: Toast['type'] = 'info', action?: () => void) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, action }]);
    };

    const handleImportTracks = async (files: File[] | null) => {
        if (!files) return;
        let count = 0;
        let dups = 0;
        const newTracks: Track[] = [];

        for (const file of files) {
            const text = await file.text();
            let data = null;
            if (file.name.toLowerCase().endsWith('.gpx')) data = parseGpx(text, file.name);
            else if (file.name.toLowerCase().endsWith('.tcx')) data = parseTcx(text, file.name);

            if (data) {
                const track: Track = {
                    id: crypto.randomUUID(),
                    ...data,
                    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                    isPublic: false
                };
                
                if (isDuplicateTrack(track, tracks)) {
                    dups++;
                } else {
                    const smartInfo = generateSmartTitle(track.points, track.distance, track.name);
                    track.name = smartInfo.title;
                    track.activityType = smartInfo.activityType;
                    if (smartInfo.folder) track.folder = smartInfo.folder;

                    newTracks.push(track);
                    count++;
                }
            }
        }

        if (newTracks.length > 0) {
            const updated = [...tracks, ...newTracks].sort((a,b) => b.points[0].time.getTime() - a.points[0].time.getTime());
            setTracks(updated);
            await saveTracksToDB(updated);
            
            // Auto select new
            const newIds = new Set(visibleTrackIds);
            newTracks.forEach(t => newIds.add(t.id));
            setVisibleTrackIds(newIds);
            
            addToast(`${count} attività importate.`, "success");
        }
        
        if (dups > 0) addToast(`${dups} duplicati ignorati.`, "info");
    };

    const handleStravaImportFinished = async (imported: Track[]) => {
        if (imported.length > 0) {
            // Filter duplicates by ID (Strava activities have stable IDs)
            const existingIds = new Set(tracks.map(t => t.id));
            const uniqueImported = imported.filter(t => !existingIds.has(t.id));

            if (uniqueImported.length === 0) {
                if (!stravaAutoModal) addToast("Nessuna nuova attività trovata.", "info");
                return;
            }

            const updated = [...tracks, ...uniqueImported].sort((a,b) => b.points[0].time.getTime() - a.points[0].time.getTime());
            setTracks(updated);
            await saveTracksToDB(updated);
            addToast(`${uniqueImported.length} attività da Strava importate.`, "success");
        }
    };

    const handleTrackSelect = (id: string) => {
        const track = tracks.find(t => t.id === id);
        if (track) {
            setSelectedTrackId(id);
            if (window.innerWidth < 1024) setMobileTrackSummary(track);
            else setView('details');
        }
    };

    const handleStartRace = () => {
        if (raceSelectionIds.size < 2) return;
        setShowRaceSetup(true);
    };

    const startRaceSimulation = (namesMap: Record<string, string>) => {
        const participants = tracks.filter(t => raceSelectionIds.has(t.id));
        
        // Add ghost/friend tracks if selected in modal (they are temporarily added to 'tracks' or handled separately)
        // Here we assume RaceSetupModal managed adding opponent files to 'tracks' via 'handleImportTracks' or similar
        // For simplicity, we filter from 'tracks' list which now includes imported ghosts.
        
        const runners: RaceRunner[] = participants.map(t => ({
            trackId: t.id,
            name: namesMap[t.id] || t.name,
            position: t.points[0],
            color: t.color,
            pace: 0
        }));

        setRaceRunners(runners);
        setRaceState('running');
        setRaceTime(0);
        setRaceHistory([]);
        setCurrentRaceGaps(new Map());
        setShowRaceSetup(false);
        setView('race');
    };

    const handleStartLiveCoach = (workout: PlannedWorkout | null) => {
        setActiveLiveWorkout(workout);
        setView('live_coach');
    };

    return (
        <div className="h-[100dvh] w-full bg-slate-900 text-white font-sans overflow-hidden">
            {view === 'splash' && <SplashScreen onFinish={() => setView(userProfile.id ? 'home' : 'auth')} />}
            
            {view === 'auth' && (
                <AuthSelectionModal 
                    onGuest={() => {
                        setIsGuest(true);
                        setUserProfile({ id: 'guest', name: 'Ospite' });
                        setView('infographic');
                    }}
                    onLogin={() => setShowLogin(true)}
                />
            )}

            {view === 'infographic' && (
                <InfographicScreen 
                    isLoading={false} 
                    onNext={() => { 
                        setView('home'); 
                        if (!localStorage.getItem('welcome_shown')) setShowWelcome(true); 
                        localStorage.setItem('welcome_shown', 'true');
                    }} 
                />
            )}

            {view === 'home' && (
                <HomeModal
                    trackCount={tracks.length}
                    onOpenDiary={() => setView('diary')}
                    onOpenExplorer={() => setView('explorer')}
                    onOpenHelp={() => setShowGuide(true)}
                    onImportBackup={(f) => {
                        const r = new FileReader();
                        r.onload = async (e) => {
                            try {
                                const d = JSON.parse(e.target?.result as string);
                                await importAllData(d);
                                window.location.reload();
                            } catch(err) { alert("Backup non valido"); }
                        };
                        r.readAsText(f);
                    }}
                    onExportBackup={async () => {
                        const d = await exportAllData();
                        const b = new Blob([JSON.stringify(d)], {type:'application/json'});
                        const u = URL.createObjectURL(b);
                        const a = document.createElement('a');
                        a.href = u; a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                    }}
                    onUploadTracks={(files) => { handleImportTracks(files); }}
                    onClose={() => setView('map')}
                    onOpenList={() => { setView('map'); setIsSidebarOpen(true); }}
                    onOpenProfile={() => setShowProfile(true)}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenChangelog={() => setShowChangelog(true)}
                    onOpenStravaConfig={() => setShowStravaConfig(true)}
                    userProfile={userProfile}
                    onOpenSocial={() => setShowSocial(true)}
                    unreadCount={unreadCount}
                    isGuest={isGuest}
                    onLogout={async () => { await deleteUserAccount(); window.location.reload(); }}
                    onLogin={() => setShowLogin(true)}
                    plannedWorkouts={plannedWorkouts}
                    onOpenWorkout={(id) => { setDiarySelectedWorkoutId(id); setView('diary'); }}
                    onEnterRaceMode={() => { setView('map'); /* Logic to prep race */ }}
                    onOpenAdmin={() => setShowAdmin(true)}
                />
            )}

            {view === 'map' && (
                <div className="flex flex-col h-full relative">
                    <div className="flex-grow relative flex overflow-hidden">
                        {isSidebarOpen && (
                            <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-700 bg-slate-900 z-20 absolute md:relative h-full transition-transform">
                                <Sidebar 
                                    tracks={tracks}
                                    visibleTrackIds={visibleTrackIds}
                                    focusedTrackId={selectedTrackId}
                                    onFocusTrack={(id) => { setSelectedTrackId(id); setMobileTrackSummary(tracks.find(t=>t.id===id)||null); }}
                                    raceSelectionIds={raceSelectionIds}
                                    onToggleRaceSelection={(id) => {
                                        const next = new Set(raceSelectionIds);
                                        if(next.has(id)) next.delete(id); else next.add(id);
                                        setRaceSelectionIds(next);
                                    }}
                                    onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t=>t.id)))}
                                    onDeselectAll={() => setRaceSelectionIds(new Set())}
                                    onStartRace={handleStartRace}
                                    onViewDetails={(id) => { setSelectedTrackId(id); setView('details'); }}
                                    onEditTrack={(id) => { setEditingTrack(tracks.find(t=>t.id===id)||null); setView('editor'); }}
                                    onDeleteTrack={async (id) => {
                                        if(confirm("Eliminare?")) {
                                            const next = tracks.filter(t=>t.id!==id);
                                            setTracks(next);
                                            await saveTracksToDB(next);
                                        }
                                    }}
                                    onFileUpload={handleImportTracks}
                                    onDeleteSelected={async () => {
                                        const next = tracks.filter(t=>!raceSelectionIds.has(t.id));
                                        setTracks(next);
                                        await saveTracksToDB(next);
                                        setRaceSelectionIds(new Set());
                                    }}
                                    onToggleArchived={async (id) => {
                                        const t = tracks.find(x=>x.id===id);
                                        if(t) {
                                            t.isArchived = !t.isArchived;
                                            await saveTracksToDB([...tracks]);
                                            setTracks([...tracks]);
                                        }
                                    }}
                                    onBulkArchive={async () => {
                                        tracks.forEach(t => { if(raceSelectionIds.has(t.id)) t.isArchived = true; });
                                        await saveTracksToDB([...tracks]);
                                        setTracks([...tracks]);
                                        setRaceSelectionIds(new Set());
                                    }}
                                    onMergeSelected={(del) => {
                                        if(raceSelectionIds.size < 2) return;
                                        const toMerge = tracks.filter(t => raceSelectionIds.has(t.id));
                                        const merged = mergeTracks(toMerge);
                                        let next = [...tracks, merged];
                                        if(del) next = next.filter(t => !raceSelectionIds.has(t.id));
                                        setTracks(next);
                                        saveTracksToDB(next);
                                        setRaceSelectionIds(new Set());
                                        addToast("Tracce unite!", "success");
                                    }}
                                    onToggleFavorite={async (id) => {
                                        const t = tracks.find(x=>x.id===id);
                                        if(t) {
                                            t.isFavorite = !t.isFavorite;
                                            await saveTracksToDB([...tracks]);
                                            setTracks([...tracks]);
                                        }
                                    }}
                                    onBulkGroup={async (name) => {
                                        tracks.forEach(t => { if(raceSelectionIds.has(t.id)) t.folder = name; });
                                        await saveTracksToDB([...tracks]);
                                        setTracks([...tracks]);
                                        setRaceSelectionIds(new Set());
                                    }}
                                />
                            </div>
                        )}
                        <div className="flex-grow relative h-full">
                            <MapDisplay 
                                tracks={tracks}
                                visibleTrackIds={visibleTrackIds}
                                hoveredTrackId={hoveredTrackId}
                                raceRunners={null}
                                runnerSpeeds={new Map()}
                                isAnimationPlaying={false}
                                animationProgress={0}
                            />
                            {/* Toggle Sidebar Button (Mobile/Desktop) */}
                            <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="absolute top-4 left-4 z-30 bg-slate-800 p-2 rounded-lg text-white shadow-lg border border-slate-700"
                            >
                                {isSidebarOpen ? '←' : '→'} Lista
                            </button>
                        </div>
                    </div>
                    <NavigationDock 
                        onOpenSidebar={() => setIsSidebarOpen(true)}
                        onCloseSidebar={() => setIsSidebarOpen(false)}
                        isSidebarOpen={isSidebarOpen}
                        onOpenExplorer={() => setView('explorer')}
                        onOpenDiary={() => setView('diary')}
                        onOpenPerformance={() => setView('performance')}
                        onOpenGuide={() => setShowGuide(true)}
                        onExportBackup={() => {}}
                        onOpenHub={() => setView('home')}
                        onOpenSocial={() => setShowSocial(true)}
                        onOpenProfile={() => setShowProfile(true)}
                        onOpenGlobalChat={() => setShowChatbot(true)}
                        onlineCount={0} // To implement
                        unreadCount={unreadCount}
                    />
                </div>
            )}

            {view === 'details' && selectedTrackId && (
                <TrackDetailView 
                    track={tracks.find(t => t.id === selectedTrackId)!}
                    userProfile={userProfile}
                    onExit={() => setView('map')}
                    allHistory={tracks}
                    plannedWorkouts={plannedWorkouts}
                    onAddPlannedWorkout={async (w) => {
                        const next = [...plannedWorkouts, w];
                        setPlannedWorkouts(next);
                        await savePlannedWorkoutsToDB(next);
                        addToast("Aggiunto al diario", "success");
                    }}
                    onUpdateTrackMetadata={async (id, meta) => {
                        const t = tracks.find(x => x.id === id);
                        if(t) {
                            Object.assign(t, meta);
                            await saveTracksToDB([...tracks]);
                            setTracks([...tracks]);
                        }
                    }}
                    onCheckAiAccess={(feat) => checkDailyLimit(feat)}
                />
            )}

            {view === 'editor' && editingTrack && (
                <TrackEditor 
                    initialTracks={[editingTrack]}
                    onExit={async (updated) => {
                        if(updated) {
                            const next = tracks.map(t => t.id === editingTrack.id ? updated : t);
                            setTracks(next);
                            await saveTracksToDB(next);
                            addToast("Traccia aggiornata", "success");
                        }
                        setEditingTrack(null);
                        setView('map');
                    }}
                    addToast={addToast}
                />
            )}

            {view === 'race' && (
                <div className="flex flex-col h-full bg-slate-900">
                    <div className="flex-grow relative">
                        <MapDisplay 
                            tracks={tracks}
                            visibleTrackIds={new Set(raceRunners.map(r => r.trackId))}
                            raceRunners={raceRunners}
                            hoveredTrackId={null}
                            runnerSpeeds={new Map()}
                            isAnimationPlaying={raceState === 'running'}
                            animationProgress={0}
                        />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                            <RaceControls 
                                simulationState={raceState}
                                simulationTime={raceTime}
                                simulationSpeed={raceSpeed}
                                onPause={() => setRaceState('paused')}
                                onResume={() => setRaceState('running')}
                                onStop={() => { setRaceState('idle'); setView('map'); }}
                                onSpeedChange={setRaceSpeed}
                            />
                        </div>
                    </div>
                    <div className="h-48 shrink-0 bg-slate-900 border-t border-slate-800">
                        <RaceGapChart 
                            history={raceHistory}
                            tracks={tracks}
                            currentTime={raceTime}
                            currentGaps={currentRaceGaps}
                            runners={raceRunners}
                        />
                    </div>
                </div>
            )}

            {view === 'diary' && (
                <DiaryView 
                    tracks={tracks}
                    plannedWorkouts={plannedWorkouts}
                    userProfile={userProfile}
                    onClose={() => { setView('map'); setDiarySelectedWorkoutId(null); }}
                    onSelectTrack={handleTrackSelect}
                    onDeletePlannedWorkout={async (id) => {
                        const next = plannedWorkouts.filter(w => w.id !== id);
                        setPlannedWorkouts(next);
                        await savePlannedWorkoutsToDB(next);
                    }}
                    onAddPlannedWorkout={async (w) => {
                        const next = [...plannedWorkouts, w];
                        setPlannedWorkouts(next);
                        await savePlannedWorkoutsToDB(next);
                        addToast("Aggiunto", "success");
                    }}
                    onUpdatePlannedWorkout={async (w) => {
                        const next = plannedWorkouts.map(x => x.id === w.id ? w : x);
                        setPlannedWorkouts(next);
                        await savePlannedWorkoutsToDB(next);
                    }}
                    onMassUpdatePlannedWorkouts={async (ws) => {
                        let next = [...plannedWorkouts];
                        ws.forEach(u => {
                            next = next.map(x => x.id === u.id ? u : x);
                        });
                        setPlannedWorkouts(next);
                        await savePlannedWorkoutsToDB(next);
                    }}
                    onCheckAiAccess={(feat) => checkDailyLimit(feat)}
                    onStartWorkout={handleStartLiveCoach}
                    initialSelectedWorkoutId={diarySelectedWorkoutId}
                />
            )}

            {view === 'explorer' && (
                <ExplorerView 
                    tracks={tracks}
                    onClose={() => setView('map')}
                    onSelectTrack={handleTrackSelect}
                />
            )}

            {view === 'performance' && (
                <PerformanceAnalysisPanel 
                    tracks={tracks}
                    userProfile={userProfile}
                    onClose={() => setView('map')}
                />
            )}

            {view === 'live_coach' && (
                <LiveCoachScreen 
                    workout={activeLiveWorkout}
                    onFinish={(duration) => {
                        addToast(`Allenamento completato! Durata: ${(duration/60000).toFixed(0)} min`, "success");
                        setView('map');
                    }}
                    onExit={() => {
                        // Return to Diary with the workout open if it was a planned session
                        if (activeLiveWorkout) {
                            setDiarySelectedWorkoutId(activeLiveWorkout.id);
                            setView('diary');
                        } else {
                            setView('map');
                        }
                    }}
                />
            )}

            {/* --- MODALS --- */}
            
            {showSettings && (
                <SettingsModal 
                    userProfile={userProfile}
                    onClose={() => setShowSettings(false)}
                    onUpdateProfile={async (upd) => {
                        const next = { ...userProfile, ...upd };
                        setUserProfile(next);
                        await saveProfileToDB(next);
                    }}
                />
            )}

            {showProfile && (
                <UserProfileModal 
                    currentProfile={userProfile}
                    tracks={tracks}
                    onClose={() => setShowProfile(false)}
                    onSave={async (p) => {
                        setUserProfile(p);
                        await saveProfileToDB(p);
                        addToast("Profilo salvato", "success");
                    }}
                    onLogout={async () => { await deleteUserAccount(); window.location.reload(); }}
                />
            )}

            {showStravaConfig && <StravaConfigModal onClose={() => setShowStravaConfig(false)} />}
            
            {showStravaSyncOptions && (
                <StravaSyncModal 
                    onClose={() => { setShowStravaSyncOptions(false); setStravaAutoModal(false); }} 
                    onImportFinished={(imported) => { handleStravaImportFinished(imported); setStravaAutoModal(false); }} 
                    lastSyncDate={tracks.length > 0 ? new Date(tracks[0].points[0].time) : null}
                    autoStart={stravaAutoModal}
                    isAutoSyncEnabled={userProfile.stravaAutoSync || false}
                    onToggleAutoSync={async (enabled) => {
                        const newProfile = { ...userProfile, stravaAutoSync: enabled };
                        setUserProfile(newProfile);
                        await saveProfileToDB(newProfile);
                        addToast(enabled ? "Strava Auto-Sync Attivato" : "Strava Auto-Sync Disattivato", "info");
                    }}
                />
            )}

            {showSocial && (
                <SocialHub 
                    currentUserId={userProfile.id || 'guest'}
                    onClose={() => setShowSocial(false)}
                    onChallengeGhost={(t) => {
                        // Import ghost logic
                        const ghost: Track = { ...t, id: `ghost-${Date.now()}`, isExternal: true, color: '#a855f7' };
                        setFriendTracks([ghost]); // Simplified
                        setRaceSelectionIds(new Set([selectedTrackId!, ghost.id])); // Assume user selected one track before
                        setShowRaceSetup(true);
                    }}
                />
            )}

            {showLogin && (
                <LoginModal 
                    onClose={() => setShowLogin(false)}
                    onLoginSuccess={() => { setShowLogin(false); window.location.reload(); }}
                    tracks={tracks}
                    userProfile={userProfile}
                    plannedWorkouts={plannedWorkouts}
                />
            )}

            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
            {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
            {showInstallPrompt && (
                <InstallPromptModal 
                    onInstall={() => { (window as any).deferredPrompt?.prompt(); setShowInstallPrompt(false); }}
                    onIgnore={() => setShowInstallPrompt(false)}
                    isIOS={/iPad|iPhone|iPod/.test(navigator.userAgent)}
                />
            )}

            {showChatbot && (
                <div className="fixed inset-0 z-[12000] pointer-events-none flex items-end justify-end p-4">
                    <div className="pointer-events-auto shadow-2xl rounded-2xl overflow-hidden w-full max-w-md h-[600px] max-h-[80vh]">
                        <Chatbot 
                            userProfile={userProfile}
                            tracksToAnalyze={tracks}
                            plannedWorkouts={plannedWorkouts}
                            onClose={() => setShowChatbot(false)}
                            onAddPlannedWorkout={async (w) => {
                                const next = [...plannedWorkouts, w];
                                setPlannedWorkouts(next);
                                await savePlannedWorkoutsToDB(next);
                                addToast("Aggiunto al diario", "success");
                            }}
                            onCheckAiAccess={(feat) => checkDailyLimit(feat)}
                        />
                    </div>
                </div>
            )}

            {showRaceSetup && (
                <RaceSetupModal 
                    tracks={tracks}
                    friendTracks={friendTracks}
                    initialSelection={raceSelectionIds}
                    onSelectionChange={setRaceSelectionIds}
                    onConfirm={startRaceSimulation}
                    onCancel={() => setShowRaceSetup(false)}
                    onAddOpponent={(files) => handleImportTracks(files)}
                />
            )}

            {mobileTrackSummary && (
                <MobileTrackSummary 
                    track={mobileTrackSummary}
                    onClose={() => setMobileTrackSummary(null)}
                    onClick={() => { setView('details'); setSelectedTrackId(mobileTrackSummary.id); setMobileTrackSummary(null); }}
                />
            )}

            <ToastContainer toasts={toasts} setToasts={setToasts} />
        </div>
    );
};

export default App;
