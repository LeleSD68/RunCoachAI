
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
import MergeConfirmationModal from './components/MergeConfirmationModal';
import ResizablePanel from './components/ResizablePanel';

import { 
    saveTracksToDB, loadTracksFromDB, 
    saveProfileToDB, loadProfileFromDB, 
    savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB,
    importAllData, exportAllData, syncTrackToCloud, deleteTrackFromCloud,
    deletePlannedWorkoutFromCloud
} from './services/dbService';
import { mergeTracks } from './services/trackEditorUtils';
import { supabase } from './services/supabaseClient';
import { fetchRecentStravaActivities, isStravaConnected, handleStravaCallback } from './services/stravaService';
import { updatePresence } from './services/socialService';

const App: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    const [showSplash, setShowSplash] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false); 
    const isSyncingRef = useRef(false);

    const [showAuthSelection, setShowAuthSelection] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showHome, setShowHome] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showStravaConfig, setShowStravaConfig] = useState(false);
    const [showStravaSyncOptions, setShowStravaSyncOptions] = useState(false);
    const [showExplorer, setShowExplorer] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const [showMergeConfirmation, setShowMergeConfirmation] = useState(false);
    const [showGlobalChat, setShowGlobalChat] = useState(false);
    
    const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
    const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    const [layoutUpdateCounter, setLayoutUpdateCounter] = useState(0);

    const [authLimitReached, setAuthLimitReached] = useState(false);

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
        const isOpen = {
            diary: showDiary,
            explorer: showExplorer,
            performance: showPerformance,
            social: showSocial,
            hub: showHome,
            profile: showProfile,
            guide: showGuide
        }[view];

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

    const onCheckAiAccess = useCallback(() => {
        if (isGuest) {
            setAuthLimitReached(true);
            setShowLoginModal(true);
            return false;
        }
        return true;
    }, [isGuest]);

    useEffect(() => {
        if (!userId || isGuest) return;
        updatePresence(userId);
        const interval = setInterval(() => updatePresence(userId), 60000);
        return () => clearInterval(interval);
    }, [userId, isGuest]);

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
                    handleStravaAutoSync();
                } catch (e: any) {
                    addToast("Errore Strava: " + e.message, "error");
                } finally {
                    setIsDataLoading(false);
                }
            }
        };
        checkStravaCallback();
    }, []);

    const handleStravaAutoSync = async (afterTimestamp?: number) => {
        if (!isStravaConnected() || isSyncingRef.current) return;
        isSyncingRef.current = true;
        setIsDataLoading(true);
        try {
            const newTracks = await fetchRecentStravaActivities(30, afterTimestamp);
            if (newTracks.length > 0) {
                const tracksMap = new Map<string, Track>();
                tracks.forEach(t => tracksMap.set(t.id, t));
                let addedCount = 0;
                for (const nt of newTracks) {
                    if (!tracksMap.has(nt.id)) {
                        tracksMap.set(nt.id, nt);
                        addedCount++;
                    }
                }
                if (addedCount > 0) {
                    const updated = Array.from(tracksMap.values()).sort((a, b) => 
                        new Date(b.points[0].time).getTime() - new Date(a.points[0].time).getTime()
                    );
                    setTracks(updated);
                    await saveTracksToDB(updated);
                    addToast(`Importate ${addedCount} attività!`, "success");
                }
            }
        } catch (e: any) {
            addToast("Sync fallito.", "error");
        } finally {
            setIsDataLoading(false);
            isSyncingRef.current = false;
        }
    };

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
            setVisibleTrackIds(new Set(loadedTracks.map(t => t.id)));
            const loadedWorkouts = await loadPlannedWorkoutsFromDB(forceLocal);
            setPlannedWorkouts(loadedWorkouts);
        } catch (e) {
            addToast("Dati sincronizzati.", "info");
        }
    };

    const handleAddPlannedWorkout = async (w: PlannedWorkout) => {
        const next = [w, ...plannedWorkouts];
        setPlannedWorkouts(next);
        await savePlannedWorkoutsToDB(next);
        addToast("Salvato nel diario!", "success");
    };

    const handleSaveProfile = async (profile: UserProfile) => {
        setUserProfile(profile);
        await saveProfileToDB(profile);
        addToast("Profilo aggiornato!", "success");
    };

    const handleToggleSidebar = (open: boolean) => {
        setIsSidebarOpen(open);
        setLayoutUpdateCounter(c => c + 1);
    };

    const handleDeleteTrack = async (id: string) => {
        if (confirm("Eliminare definitivamente?")) {
            const updated = tracks.filter(t => t.id !== id);
            setTracks(updated);
            await saveTracksToDB(updated);
            if (!isGuest) await deleteTrackFromCloud(id);
            addToast("Eliminata.", "success");
        }
    };

    const handleUpdateTrackMetadata = async (id: string, metadata: Partial<Track>) => {
        const updatedTracks = tracks.map(t => t.id === id ? { ...t, ...metadata } : t);
        setTracks(updatedTracks);
        await saveTracksToDB(updatedTracks);
    };

    const handleExportBackup = async () => {
        const d = await exportAllData(); 
        const b = new Blob([JSON.stringify(d)], {type:'application/json'}); 
        const u = URL.createObjectURL(b); 
        const a = document.createElement('a'); 
        a.href=u; a.download='backup.json'; 
        a.click();
    };

    if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-white font-sans">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            
            {isDataLoading && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Caricamento...</p>
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
                    onExportBackup={handleExportBackup}
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
                    onSync={(ts) => { setShowStravaSyncOptions(false); handleStravaAutoSync(ts); }} 
                    lastSyncDate={tracks.length > 0 ? new Date(tracks[0].points[0].time) : null} 
                />
            )}

            {!showHome && !showAuthSelection && (
                <div className="flex flex-col h-full relative overflow-hidden pb-16 md:pb-0">
                    {isSidebarOpen ? (
                        <ResizablePanel 
                            direction={isDesktop ? 'vertical' : 'horizontal'}
                            initialSizeRatio={isDesktop ? 0.3 : 0.6}
                            minSize={250}
                            onResizeEnd={() => setLayoutUpdateCounter(c => c + 1)}
                        >
                            <div className="h-full bg-slate-900 border-slate-800 overflow-hidden flex flex-col">
                                <Sidebar 
                                    tracks={tracks} onFileUpload={() => {}} visibleTrackIds={visibleTrackIds}
                                    onToggleVisibility={(id) => setVisibleTrackIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                    onFocusTrack={setFocusedTrackId} focusedTrackId={focusedTrackId}
                                    raceSelectionIds={raceSelectionIds} 
                                    onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                    onDeselectAll={() => setRaceSelectionIds(new Set())}
                                    onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                                    onStartRace={() => { handleToggleSidebar(false); }}
                                    onMergeSelected={() => setShowMergeConfirmation(true)}
                                    hoveredTrackId={hoveredTrackId}
                                    onTrackHoverStart={setHoveredTrackId}
                                    onTrackHoverEnd={() => setHoveredTrackId(null)}
                                    onDeleteTrack={handleDeleteTrack}
                                    onDeleteSelected={() => {}}
                                    onViewDetails={(id) => { resetNavigation(); setViewingTrack(tracks.find(t => t.id === id) || null); }}
                                    onToggleArchived={() => {}}
                                />
                            </div>

                            <div className="h-full relative bg-slate-950 flex flex-col">
                                <MapDisplay 
                                    tracks={tracks} 
                                    visibleTrackIds={focusedTrackId ? new Set([focusedTrackId]) : (raceSelectionIds.size > 0 ? raceSelectionIds : visibleTrackIds)}
                                    selectedTrackIds={raceSelectionIds}
                                    raceRunners={null} runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                    onTrackClick={() => {}}
                                    fitBoundsCounter={layoutUpdateCounter}
                                />
                            </div>
                        </ResizablePanel>
                    ) : (
                        <div className="h-full w-full relative bg-slate-950 flex flex-col">
                            <MapDisplay 
                                tracks={tracks} 
                                visibleTrackIds={focusedTrackId ? new Set([focusedTrackId]) : (raceSelectionIds.size > 0 ? raceSelectionIds : visibleTrackIds)}
                                selectedTrackIds={raceSelectionIds}
                                raceRunners={null} runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                onTrackClick={() => {}}
                                fitBoundsCounter={layoutUpdateCounter}
                            />
                        </div>
                    )}
                </div>
            )}

            <button onClick={() => setShowGlobalChat(true)} className="fixed bottom-20 lg:bottom-24 right-4 z-[9500] bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full shadow-2xl transition-all active:scale-90 border border-purple-400/50">
                <span className="text-xl">🧠</span>
            </button>

            {/* Navigation Dock rendered globally over all main sections */}
            {!showHome && !showAuthSelection && !showSplash && (
                <NavigationDock 
                    onOpenSidebar={() => handleToggleSidebar(true)} 
                    onCloseSidebar={() => handleToggleSidebar(false)}
                    onOpenExplorer={() => toggleView('explorer')} 
                    onOpenDiary={() => toggleView('diary')}
                    onOpenPerformance={() => toggleView('performance')} 
                    onOpenHub={() => toggleView('hub')}
                    onOpenGuide={() => toggleView('guide')} 
                    onExportBackup={handleExportBackup}
                    onOpenSocial={() => toggleView('social')} 
                    onOpenProfile={() => toggleView('profile')}
                    isSidebarOpen={isSidebarOpen}
                />
            )}

            {showGlobalChat && (
                <div className="fixed inset-0 z-[12000] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
                    <Chatbot onClose={() => setShowGlobalChat(false)} userProfile={userProfile} tracksToAnalyze={tracks} plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} isStandalone={true} />
                </div>
            )}

            {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} onSave={handleSaveProfile} currentProfile={userProfile} tracks={tracks} onLogout={() => { resetNavigation(); setUserId(null); setIsGuest(false); setShowAuthSelection(true); }} />}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {showExplorer && <ExplorerView tracks={tracks} onClose={() => setShowExplorer(false)} onSelectTrack={(id) => { resetNavigation(); setViewingTrack(tracks.find(t => t.id === id) || null); }} />}
            {showDiary && <DiaryView tracks={tracks} plannedWorkouts={plannedWorkouts} userProfile={userProfile} onClose={() => setShowDiary(false)} onSelectTrack={(id) => { resetNavigation(); setViewingTrack(tracks.find(t => t.id === id) || null); }} onAddPlannedWorkout={handleAddPlannedWorkout} onCheckAiAccess={onCheckAiAccess} />}
            {showPerformance && <PerformanceAnalysisPanel tracks={tracks} userProfile={userProfile} onClose={() => setShowPerformance(false)} />}
            {showSocial && userId && <SocialHub onClose={() => setShowSocial(false)} currentUserId={userId} />}
            
            {viewingTrack && (
                <div className="fixed inset-0 z-[10000] bg-slate-900">
                    <TrackDetailView track={viewingTrack} userProfile={userProfile} onExit={() => setViewingTrack(null)} plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} onUpdateTrackMetadata={handleUpdateTrackMetadata} onCheckAiAccess={onCheckAiAccess} />
                </div>
            )}
        </div>
    );
};

export default App;
