
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, Toast, ActivityType, RaceRunner, RaceResult, TrackStats, Commentary, TrackPoint, ApiUsage } from './types';
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

import { 
    saveTracksToDB, loadTracksFromDB, 
    saveProfileToDB, loadProfileFromDB, 
    savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB,
    importAllData, exportAllData, syncTrackToCloud, deleteTrackFromCloud,
    deletePlannedWorkoutFromCloud
} from './services/dbService';
import { supabase } from './services/supabaseClient';
import { handleStravaCallback } from './services/stravaService';
import { getTrackStateAtTime, mergeTracks } from './services/trackEditorUtils';
import { getApiUsage, trackUsage, addTokensToUsage } from './services/usageService';

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
    const [showChangelog, setShowChangelog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showExplorer, setShowExplorer] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const [showStravaSyncOptions, setShowStravaSyncOptions] = useState(false);
    
    const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
    const [editingTrack, setEditingTrack] = useState<Track | null>(null); // Stato per editor
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    const [showGlobalChat, setShowGlobalChat] = useState(false);

    // DETERMINA COSA MOSTRARE IN MAPPA
    const mapVisibleIds = useMemo(() => {
        if (raceSelectionIds.size === 0) {
            return new Set(tracks.filter(t => !t.isArchived).map(t => t.id));
        }
        return raceSelectionIds;
    }, [tracks, raceSelectionIds]);

    // Notifiche Impegni
    const todayEntries = useMemo(() => {
        const today = new Date().toDateString();
        return plannedWorkouts.filter(w => 
            new Date(w.date).toDateString() === today && 
            (w.entryType === 'commitment' || w.entryType === 'note')
        );
    }, [plannedWorkouts]);

    // Initial usage load
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
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
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
        setShowGuide(false);
        setShowChangelog(false);
        setShowGlobalChat(false);
        setViewingTrack(null);
        setEditingTrack(null);
        setIsSidebarOpen(false); 
    }, []);

    const toggleView = (view: 'diary' | 'explorer' | 'performance' | 'social' | 'hub' | 'profile' | 'guide') => {
        const currentStates = {
            diary: showDiary,
            explorer: showExplorer,
            performance: showPerformance,
            social: showSocial,
            hub: showHome,
            profile: showProfile,
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
            setTracks(loadedTracks);
            const loadedWorkouts = await loadPlannedWorkoutsFromDB(forceLocal);
            setPlannedWorkouts(loadedWorkouts);
        } catch (e) {
            addToast("Dati caricati localmente.", "info");
        }
    };

    // RACE SIMULATION STATE
    const [raceState, setRaceState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
    const [raceTime, setRaceTime] = useState(0);
    const [raceSpeed, setRaceSpeed] = useState(10);
    const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
    const [raceResults, setRaceResults] = useState<RaceResult[] | null>(null);
    const [raceGaps, setRaceGaps] = useState<Map<string, number | undefined>>(new Map());
    const raceIntervalRef = useRef<number | null>(null);

    const startRace = () => {
        const selected = tracks.filter(t => raceSelectionIds.has(t.id));
        if (selected.length < 1) return;
        
        setRaceResults(null);
        setRaceTime(0);
        setRaceState('running');
        setRaceRunners(selected.map(t => ({
            trackId: t.id,
            name: t.name,
            position: t.points[0],
            color: t.color,
            pace: 0
        })));
    };

    useEffect(() => {
        if (raceState === 'running') {
            const step = 200; 
            raceIntervalRef.current = window.setInterval(() => {
                setRaceTime(prev => {
                    const next = prev + (step * raceSpeed);
                    const selected = tracks.filter(t => raceSelectionIds.has(t.id));
                    
                    let allFinished = true;
                    const newRunners: RaceRunner[] = [];
                    const currentGaps = new Map<string, number>();

                    selected.forEach(t => {
                        const state = getTrackStateAtTime(t, next);
                        if (state) {
                            newRunners.push({
                                trackId: t.id,
                                name: t.name,
                                position: state.point,
                                color: t.color,
                                pace: state.pace
                            });
                            if (state.point.cummulativeDistance < t.distance) allFinished = false;
                        } else {
                            const lastPoint = t.points[t.points.length-1];
                            newRunners.push({
                                trackId: t.id, name: t.name, position: lastPoint, color: t.color, pace: 0
                            });
                        }
                    });

                    const sorted = [...newRunners].sort((a,b) => b.position.cummulativeDistance - a.position.cummulativeDistance);
                    const leaderDist = sorted[0].position.cummulativeDistance;
                    sorted.forEach((r) => {
                        currentGaps.set(r.trackId, (leaderDist - r.position.cummulativeDistance) * 1000);
                    });

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
                        return prev;
                    }
                    return next;
                });
            }, step);
        } else {
            if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
        }
        return () => { if (raceIntervalRef.current) clearInterval(raceIntervalRef.current); };
    }, [raceState, raceSpeed, tracks, raceSelectionIds]);

    const handleUpdateTrackMetadata = async (id: string, metadata: Partial<Track>) => {
        const updatedTracks = tracks.map(t => t.id === id ? { ...t, ...metadata } : t);
        setTracks(updatedTracks);
        await saveTracksToDB(updatedTracks);
    };

    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(raceSelectionIds);
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

    const handleMergeSelectedTracks = async (deleteOriginals: boolean) => {
        const selected = tracks.filter(t => raceSelectionIds.has(t.id));
        if (selected.length < 2) return;

        const merged = mergeTracks(selected);
        let nextTracks = [merged, ...tracks];
        const idsToRemove = Array.from(raceSelectionIds);

        if (deleteOriginals) {
            nextTracks = nextTracks.filter(t => !raceSelectionIds.has(t.id) || t.id === merged.id);
            for (const id of idsToRemove) {
                await deleteTrackFromCloud(id);
            }
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

    if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

    return (
        <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-white font-sans">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            <ReminderNotification entries={todayEntries} />

            {isDataLoading && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-cyan-400 font-bold uppercase animate-pulse">Caricamento...</p>
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
                    onOpenStravaConfig={() => setShowStravaSyncOptions(true)}
                    onImportBackup={async (f) => { 
                        setIsDataLoading(true);
                        try {
                            const text = await f.text();
                            const data = JSON.parse(text);
                            await importAllData(data); 
                            await loadData(true); 
                            addToast("Importazione completata!", "success"); 
                        } catch (e) {
                            addToast("Errore durante l'importazione.", "error");
                        } finally {
                            setIsDataLoading(false);
                        }
                    }}
                    onExportBackup={async () => { 
                        try {
                            const d = await exportAllData(); 
                            const b = new Blob([JSON.stringify(d, null, 2)], {type:'application/json'}); 
                            const u = URL.createObjectURL(b); 
                            const a = document.createElement('a'); 
                            a.href=u; 
                            a.download=`RunCoachAI_Backup_${new Date().toISOString().split('T')[0]}.json`; 
                            a.click(); 
                            URL.revokeObjectURL(u);
                            addToast("Backup salvato!", "success");
                        } catch (e) {
                            addToast("Errore backup.", "error");
                        }
                    }}
                    onUploadTracks={() => {}}
                    onOpenProfile={() => toggleView('profile')}
                    onOpenChangelog={() => toggleView('profile')}
                    trackCount={tracks.length}
                    userProfile={userProfile}
                />
            )}

            {showStravaSyncOptions && (
                <StravaSyncModal 
                    onClose={() => setShowStravaSyncOptions(false)} 
                    onSync={() => { setShowStravaSyncOptions(false); }} 
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

            {!showHome && !showAuthSelection && (
                <>
                    {isSidebarOpen && (
                        <aside className="hidden lg:flex flex-col w-80 bg-slate-900 border-r border-slate-800 shrink-0">
                            <div className="flex-grow overflow-hidden">
                                <Sidebar 
                                    tracks={tracks} 
                                    visibleTrackIds={mapVisibleIds} 
                                    onFocusTrack={setFocusedTrackId} 
                                    focusedTrackId={focusedTrackId}
                                    raceSelectionIds={raceSelectionIds} 
                                    onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                    onDeselectAll={() => setRaceSelectionIds(new Set())}
                                    onSelectAll={() => setRaceSelectionIds(new Set(tracks.filter(t => !t.isArchived).map(t => t.id)))}
                                    onStartRace={startRace}
                                    onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                                    onEditTrack={(id) => setEditingTrack(tracks.find(t => t.id === id) || null)}
                                    onDeleteTrack={async (id) => { const u = tracks.filter(t => t.id !== id); setTracks(u); await saveTracksToDB(u); await deleteTrackFromCloud(id); }}
                                    onBulkArchive={handleBulkArchive}
                                    onDeleteSelected={handleBulkDelete}
                                    onMergeSelected={handleMergeSelectedTracks}
                                    onFileUpload={() => {}} onToggleArchived={async (id) => { const u = tracks.map(t => t.id === id ? {...t, isArchived: !t.isArchived} : t); setTracks(u); await saveTracksToDB(u); }}
                                />
                            </div>
                            <div className="bg-slate-950">
                                <NavigationDock 
                                    onOpenSidebar={() => setIsSidebarOpen(true)} onCloseSidebar={() => setIsSidebarOpen(false)}
                                    onOpenExplorer={() => toggleView('explorer')} onOpenDiary={() => toggleView('diary')}
                                    onOpenPerformance={() => toggleView('performance')} onOpenHub={() => toggleView('hub')}
                                    onOpenSocial={() => toggleView('social')} onOpenProfile={() => toggleView('profile')}
                                    onOpenGuide={() => toggleView('guide')} onExportBackup={() => {}}
                                    isSidebarOpen={isSidebarOpen}
                                />
                            </div>
                        </aside>
                    )}

                    <main className="flex-grow relative bg-slate-950 flex flex-col min-w-0">
                        <div className={`lg:hidden fixed inset-x-0 top-0 z-[4500] bg-slate-900 transition-transform ${isSidebarOpen ? 'translate-y-0 h-2/3' : '-translate-y-full h-0'}`}>
                             <Sidebar 
                                tracks={tracks} visibleTrackIds={mapVisibleIds}
                                focusedTrackId={focusedTrackId} raceSelectionIds={raceSelectionIds}
                                onFocusTrack={setFocusedTrackId} onDeselectAll={() => setRaceSelectionIds(new Set())}
                                onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                onStartRace={() => { setIsSidebarOpen(false); startRace(); }}
                                onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                                onEditTrack={(id) => { setIsSidebarOpen(false); setEditingTrack(tracks.find(t => t.id === id) || null); }}
                                onBulkArchive={handleBulkArchive}
                                onDeleteSelected={handleBulkDelete}
                                onMergeSelected={handleMergeSelectedTracks}
                                onFileUpload={() => {}} onToggleArchived={async (id) => { const u = tracks.map(t => t.id === id ? {...t, isArchived: !t.isArchived} : t); setTracks(u); await saveTracksToDB(u); }} onDeleteTrack={() => {}} onSelectAll={() => {}}
                             />
                        </div>

                        <MapDisplay 
                            tracks={tracks} 
                            visibleTrackIds={mapVisibleIds}
                            raceRunners={raceRunners}
                            fitBoundsCounter={0}
                            runnerSpeeds={new Map()}
                            hoveredTrackId={hoveredTrackId}
                        />

                        {raceState !== 'idle' && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[4600]">
                                <RaceControls 
                                    simulationState={raceState} simulationTime={raceTime} simulationSpeed={raceSpeed}
                                    onPause={() => setRaceState('paused')} onResume={() => setRaceState('running')}
                                    onStop={() => { setRaceState('idle'); setRaceRunners(null); }}
                                    onSpeedChange={setRaceSpeed}
                                />
                            </div>
                        )}
                        {raceRunners && (
                             <div className="absolute top-4 right-4 z-[4600] hidden md:block">
                                <RaceLeaderboard racers={tracks.filter(t => raceSelectionIds.has(t.id))} gaps={raceGaps} ranks={new Map()} />
                             </div>
                        )}

                        <button onClick={() => setShowGlobalChat(true)} className="fixed bottom-20 lg:bottom-24 right-4 z-[4000] bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full shadow-2xl active:scale-90">
                            <span className="text-xl">🧠</span>
                        </button>

                        <div className="lg:hidden fixed bottom-0 left-0 w-full z-[11000] pointer-events-none pb-safe">
                            <div className="pointer-events-auto">
                                <NavigationDock 
                                    onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onCloseSidebar={() => setIsSidebarOpen(false)}
                                    onOpenExplorer={() => toggleView('explorer')} onOpenDiary={() => toggleView('diary')}
                                    onOpenPerformance={() => toggleView('performance')} onOpenHub={() => toggleView('hub')}
                                    onOpenSocial={() => toggleView('social')} onOpenProfile={() => toggleView('profile')}
                                    onOpenGuide={() => toggleView('guide')} onExportBackup={() => {}}
                                    isSidebarOpen={isSidebarOpen}
                                />
                            </div>
                        </div>
                    </main>
                </>
            )}

            {viewingTrack && (
                <div className="fixed inset-0 z-[12000] bg-slate-900">
                    <TrackDetailView 
                        track={viewingTrack} userProfile={userProfile} onExit={() => setViewingTrack(null)} 
                        plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} 
                        onUpdateTrackMetadata={handleUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} 
                    />
                </div>
            )}

            {editingTrack && (
                <div className="fixed inset-0 z-[12000] bg-slate-900">
                    <TrackEditor 
                        initialTracks={[editingTrack]} 
                        addToast={addToast}
                        onExit={async (updated) => { 
                            if (updated) {
                                const u = tracks.map(t => t.id === updated.id ? updated : t);
                                setTracks(u);
                                await saveTracksToDB(u);
                            }
                            setEditingTrack(null); 
                        }} 
                    />
                </div>
            )}

            {showDiary && (
                <div className="fixed inset-0 z-[9000] bg-slate-900 flex flex-col">
                    <div className="flex-grow overflow-hidden">
                        <DiaryView 
                            tracks={tracks} 
                            plannedWorkouts={plannedWorkouts} 
                            userProfile={userProfile} 
                            onClose={() => toggleView('diary')} 
                            onSelectTrack={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)} 
                            onAddPlannedWorkout={handleAddPlannedWorkout} 
                            onUpdatePlannedWorkout={handleUpdatePlannedWorkout}
                            onDeletePlannedWorkout={handleDeletePlannedWorkout}
                            onCheckAiAccess={onCheckAiAccess} 
                        />
                    </div>
                    <div className="shrink-0 bg-slate-950 pb-safe">
                        <NavigationDock 
                            onOpenSidebar={() => {}} 
                            onCloseSidebar={() => {}} 
                            onOpenExplorer={() => toggleView('explorer')} 
                            onOpenDiary={() => toggleView('diary')} 
                            onOpenPerformance={() => toggleView('performance')} 
                            onOpenHub={() => toggleView('hub')} 
                            onOpenSocial={() => toggleView('social')} 
                            onOpenProfile={() => toggleView('profile')} 
                            onOpenGuide={() => {}} 
                            onExportBackup={() => {}} 
                            isSidebarOpen={false} 
                        />
                    </div>
                </div>
            )}

            {showExplorer && <ExplorerView tracks={tracks} onClose={() => toggleView('explorer')} onSelectTrack={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)} />}
            {showPerformance && <PerformanceAnalysisPanel tracks={tracks} userProfile={userProfile} onClose={() => toggleView('performance')} />}
            {showSocial && userId && <SocialHub onClose={() => toggleView('social')} currentUserId={userId} />}
            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            {showGuide && <GuideModal onClose={() => toggleView('guide')} />}
            {raceResults && <RaceSummary results={raceResults} racerStats={new Map()} onClose={() => setRaceResults(null)} userProfile={userProfile} tracks={tracks} />}
            {showGlobalChat && <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><Chatbot onClose={() => setShowGlobalChat(false)} userProfile={userProfile} tracksToAnalyze={tracks} plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} isStandalone={true} /></div>}
        </div>
    );
};

export default App;
