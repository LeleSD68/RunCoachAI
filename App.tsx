
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, Toast, ActivityType, RaceRunner, RaceResult, TrackStats, Commentary, TrackPoint } from './types';
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

import { 
    saveTracksToDB, loadTracksFromDB, 
    saveProfileToDB, loadProfileFromDB, 
    savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB,
    importAllData, exportAllData, syncTrackToCloud, deleteTrackFromCloud
} from './services/dbService';
import { supabase } from './services/supabaseClient';
import { fetchRecentStravaActivities, isStravaConnected, handleStravaCallback } from './services/stravaService';
import { updatePresence } from './services/socialService';
import { getTrackStateAtTime } from './services/trackEditorUtils';

const App: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    const [showGlobalChat, setShowGlobalChat] = useState(false);

    // RACE SIMULATION STATE
    const [raceState, setRaceState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
    const [raceTime, setRaceTime] = useState(0);
    const [raceSpeed, setRaceSpeed] = useState(10);
    const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
    const [raceResults, setRaceResults] = useState<RaceResult[] | null>(null);
    const [raceGaps, setRaceGaps] = useState<Map<string, number | undefined>>(new Map());
    const raceIntervalRef = useRef<number | null>(null);

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
        setViewingTrack(null);
        setShowGlobalChat(false);
    }, []);

    const toggleView = (view: 'diary' | 'explorer' | 'performance' | 'social' | 'hub' | 'profile' | 'guide') => {
        const isOpen = { diary: showDiary, explorer: showExplorer, performance: showPerformance, social: showSocial, hub: showHome, profile: showProfile, guide: showGuide }[view];
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
            if (loadedProfile) setUserProfile(loadedProfile);
            const loadedTracks = await loadTracksFromDB(forceLocal);
            setTracks(loadedTracks);
            const loadedWorkouts = await loadPlannedWorkoutsFromDB(forceLocal);
            setPlannedWorkouts(loadedWorkouts);
        } catch (e) {
            addToast("Dati caricati localmente.", "info");
        }
    };

    // RACE SIMULATION LOGIC
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
            const step = 200; // ms
            raceIntervalRef.current = window.setInterval(() => {
                setRaceTime(prev => {
                    const next = prev + (step * raceSpeed);
                    const selected = tracks.filter(t => raceSelectionIds.has(t.id));
                    
                    let allFinished = true;
                    const newRunners: RaceRunner[] = [];
                    const tempResults: RaceResult[] = [];
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
                            // Finished
                            const lastPoint = t.points[t.points.length-1];
                            newRunners.push({
                                trackId: t.id, name: t.name, position: lastPoint, color: t.color, pace: 0
                            });
                        }
                    });

                    // Update ranks/gaps
                    const sorted = [...newRunners].sort((a,b) => b.position.cummulativeDistance - a.position.cummulativeDistance);
                    const leaderDist = sorted[0].position.cummulativeDistance;
                    sorted.forEach((r, idx) => {
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

    const handleAddPlannedWorkout = async (w: PlannedWorkout) => {
        const next = [w, ...plannedWorkouts];
        setPlannedWorkouts(next);
        await savePlannedWorkoutsToDB(next);
        addToast("Salvato nel diario!", "success");
    };

    if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

    return (
        <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden bg-slate-950 text-white font-sans">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            
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
                    onClose={() => setShowHome(false)}
                    onOpenDiary={() => toggleView('diary')}
                    onOpenExplorer={() => toggleView('explorer')}
                    onOpenHelp={() => toggleView('guide')}
                    onOpenStravaConfig={() => setShowStravaSyncOptions(true)}
                    onImportBackup={async (f) => { await importAllData(f); await loadData(); addToast("Importato!", "success"); }}
                    onExportBackup={async () => { const d = await exportAllData(); const b = new Blob([JSON.stringify(d)], {type:'application/json'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='backup.json'; a.click(); }}
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

            {/* Layout Principale Responsivo */}
            {!showHome && !showAuthSelection && (
                <>
                    {/* BARRA LATERALE (LISTA + DOCK SU DESKTOP) */}
                    {isSidebarOpen && (
                        <aside className="hidden lg:flex flex-col w-80 bg-slate-900 border-r border-slate-800 shrink-0">
                            <div className="flex-grow overflow-hidden">
                                <Sidebar 
                                    tracks={tracks} 
                                    visibleTrackIds={raceSelectionIds} // Visibilità pilotata dai checkbox
                                    onFocusTrack={setFocusedTrackId} 
                                    focusedTrackId={focusedTrackId}
                                    raceSelectionIds={raceSelectionIds} 
                                    onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                    onDeselectAll={() => setRaceSelectionIds(new Set())}
                                    onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                                    onStartRace={startRace}
                                    onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                                    onDeleteTrack={async (id) => { const u = tracks.filter(t => t.id !== id); setTracks(u); await saveTracksToDB(u); }}
                                    onFileUpload={() => {}} onDeleteSelected={() => {}} onToggleArchived={() => {}}
                                />
                            </div>
                            <div className="p-2 border-t border-slate-800 bg-slate-950">
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

                    {/* AREA MAPPA / MOBILE DOCK */}
                    <main className="flex-grow relative bg-slate-950 flex flex-col min-w-0">
                        {/* Mobile Sidebar (Sovrapposta) */}
                        <div className={`lg:hidden fixed inset-x-0 top-0 z-[4500] bg-slate-900 transition-transform ${isSidebarOpen ? 'translate-y-0 h-2/3' : '-translate-y-full h-0'}`}>
                             <Sidebar 
                                tracks={tracks} visibleTrackIds={raceSelectionIds}
                                focusedTrackId={focusedTrackId} raceSelectionIds={raceSelectionIds}
                                onFocusTrack={setFocusedTrackId} onDeselectAll={() => setRaceSelectionIds(new Set())}
                                onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                onStartRace={() => { setIsSidebarOpen(false); startRace(); }}
                                onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                                onFileUpload={() => {}} onDeleteSelected={() => {}} onToggleArchived={() => {}} onDeleteTrack={() => {}} onSelectAll={() => {}}
                             />
                        </div>

                        <MapDisplay 
                            tracks={tracks} 
                            visibleTrackIds={raceSelectionIds}
                            raceRunners={raceRunners}
                            fitBoundsCounter={0}
                            runnerSpeeds={new Map()}
                            hoveredTrackId={hoveredTrackId}
                        />

                        {/* Race Overlays */}
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

                        {/* Mobile Dock */}
                        <div className="lg:hidden">
                            <NavigationDock 
                                onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onCloseSidebar={() => setIsSidebarOpen(false)}
                                onOpenExplorer={() => toggleView('explorer')} onOpenDiary={() => toggleView('diary')}
                                onOpenPerformance={() => toggleView('performance')} onOpenHub={() => toggleView('hub')}
                                onOpenSocial={() => toggleView('social')} onOpenProfile={() => toggleView('profile')}
                                onOpenGuide={() => toggleView('guide')} onExportBackup={() => {}}
                                isSidebarOpen={isSidebarOpen}
                            />
                        </div>
                    </main>
                </>
            )}

            {/* MODALI A TUTTO SCHERMO */}
            {viewingTrack && (
                <div className="fixed inset-0 z-[10000] bg-slate-900">
                    <TrackDetailView 
                        track={viewingTrack} userProfile={userProfile} onExit={() => setViewingTrack(null)} 
                        plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} 
                        onUpdateTrackMetadata={handleUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} 
                    />
                </div>
            )}

            {showDiary && (
                <div className="fixed inset-0 z-[9000] bg-slate-900">
                    <DiaryView tracks={tracks} plannedWorkouts={plannedWorkouts} userProfile={userProfile} onClose={() => setShowDiary(false)} onSelectTrack={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)} onAddPlannedWorkout={handleAddPlannedWorkout} onCheckAiAccess={onCheckAiAccess} />
                    <div className="fixed bottom-0 left-0 w-full z-[11000] bg-slate-900/80 backdrop-blur">
                        <NavigationDock onOpenSidebar={() => {}} onCloseSidebar={() => {}} onOpenExplorer={() => toggleView('explorer')} onOpenDiary={() => toggleView('diary')} onOpenPerformance={() => toggleView('performance')} onOpenHub={() => toggleView('hub')} onOpenSocial={() => toggleView('social')} onOpenProfile={() => toggleView('profile')} onOpenGuide={() => {}} onExportBackup={() => {}} isSidebarOpen={false} />
                    </div>
                </div>
            )}

            {showExplorer && <ExplorerView tracks={tracks} onClose={() => setShowExplorer(false)} onSelectTrack={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)} />}
            {showPerformance && <PerformanceAnalysisPanel tracks={tracks} userProfile={userProfile} onClose={() => setShowPerformance(false)} />}
            {showSocial && userId && <SocialHub onClose={() => setShowSocial(false)} currentUserId={userId} />}
            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {raceResults && <RaceSummary results={raceResults} racerStats={new Map()} onClose={() => setRaceResults(null)} userProfile={userProfile} tracks={tracks} />}
        </div>
    );
};

export default App;
