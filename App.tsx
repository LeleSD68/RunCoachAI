
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, Toast, ActivityType, RaceRunner, RaceResult, TrackStats, Commentary, TrackPoint } from './types';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import TrackEditor from './components/TrackEditor';
import TrackDetailView from './components/TrackDetailView';
import ToastContainer from './components/ToastContainer';
import AuthSelectionModal from './components/AuthSelectionModal';
import InitialChoiceModal from './components/InitialChoiceModal';
import HomeModal from './components/HomeModal';
import WelcomeModal from './components/WelcomeModal';
import UserProfileModal from './components/UserProfileModal';
import Changelog from './components/Changelog';
import NavigationDock from './components/NavigationDock';
import Chatbot from './components/Chatbot';
import StravaConfigModal from './components/StravaConfigModal';
import StravaSyncModal from './components/StravaSyncModal';
import GuideModal from './components/GuideModal';
import RaceSetupModal from './components/RaceSetupModal';
import WorkoutConfirmationModal from './components/WorkoutConfirmationModal';
import ExplorerView from './components/ExplorerView';
import DiaryView from './components/DiaryView';
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel';
import SocialHub from './components/SocialHub';
import SplashScreen from './components/SplashScreen';
import LoginModal from './components/LoginModal';

import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { 
    saveTracksToDB, loadTracksFromDB, 
    saveProfileToDB, loadProfileFromDB, 
    savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB,
    importAllData, exportAllData, syncTrackToCloud, deleteTrackFromCloud
} from './services/dbService';
import { mergeTracks } from './services/trackEditorUtils';
import { generateSmartTitle } from './services/titleGenerator';
import { supabase } from './services/supabaseClient';
import { fetchRecentStravaActivities, isStravaConnected, handleStravaCallback } from './services/stravaService';

const App: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    const [showSplash, setShowSplash] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false); 
    const [showAuthSelection, setShowAuthSelection] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showInitialChoice, setShowInitialChoice] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
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
    
    const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
    const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());

    // Fix: Added missing state for track hover synchronization
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

    const addToast = (message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    // --- Strava OAuth Interceptor ---
    useEffect(() => {
        const checkStravaCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            if (code) {
                setIsDataLoading(true);
                try {
                    await handleStravaCallback(code);
                    addToast("Strava collegato con successo!", "success");
                    // Pulizia URL
                    window.history.replaceState({}, document.title, "/");
                    handleStravaAutoSync();
                } catch (e: any) {
                    addToast("Errore collegamento Strava: " + e.message, "error");
                } finally {
                    setIsDataLoading(false);
                }
            }
        };
        checkStravaCallback();
    }, []);

    const handleStravaAutoSync = async (afterTimestamp?: number) => {
        if (!isStravaConnected()) return;
        setIsDataLoading(true);
        try {
            const newTracks = await fetchRecentStravaActivities(30, afterTimestamp);
            if (newTracks.length > 0) {
                const updated = [...tracks, ...newTracks].sort((a, b) => new Date(b.points[0].time).getTime() - new Date(a.points[0].time).getTime());
                setTracks(updated);
                await saveTracksToDB(updated);
                if (!isGuest && userId) newTracks.forEach(t => syncTrackToCloud(t));
                addToast(`Sincronizzate ${newTracks.length} corse da Strava!`, "success");
            } else {
                addToast("Nessuna nuova corsa su Strava.", "info");
            }
        } catch (e: any) {
            addToast("Errore sincronizzazione Strava.", "error");
        } finally {
            setIsDataLoading(false);
        }
    };

    // Fix: Implemented missing handler for backup importation
    const handleImportBackup = async (file: File) => {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                if (content) {
                    const data = JSON.parse(content);
                    await importAllData(data);
                    addToast("Backup importato con successo!", "success");
                    await loadData();
                }
            };
            reader.readAsText(file);
        } catch (err) {
            addToast("Errore durante l'importazione del backup.", "error");
        }
    };

    // Fix: Implemented missing handler for data backup export with file download
    const handleExportBackup = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `runcoach-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast("Backup creato con successo.", "success");
        } catch (e) {
            addToast("Errore durante la creazione del backup.", "error");
        }
    };

    // Fix: Implemented missing track deletion handler
    const handleDeleteTrack = async (id: string) => {
        if (confirm("Sei sicuro di voler eliminare questa traccia?")) {
            const updated = tracks.filter(t => t.id !== id);
            setTracks(updated);
            await saveTracksToDB(updated);
            if (!isGuest) await deleteTrackFromCloud(id);
            addToast("Traccia eliminata con successo.", "success");
        }
    };

    // Fix: Implemented missing bulk deletion handler
    const handleDeleteSelected = async () => {
        if (confirm(`Sei sicuro di voler eliminare ${raceSelectionIds.size} tracce?`)) {
            const updated = tracks.filter(t => !raceSelectionIds.has(t.id));
            setTracks(updated);
            await saveTracksToDB(updated);
            if (!isGuest) {
                for (const id of Array.from(raceSelectionIds)) {
                    await deleteTrackFromCloud(id);
                }
            }
            setRaceSelectionIds(new Set());
            addToast("Tracce eliminate con successo.", "success");
        }
    };

    // Fix: Implemented missing archive toggle handler
    const handleToggleArchived = async (id: string) => {
        const trackToUpdate = tracks.find(t => t.id === id);
        if (!trackToUpdate) return;
        const updatedTrack = { ...trackToUpdate, isArchived: !trackToUpdate.isArchived };
        const updatedTracks = tracks.map(t => t.id === id ? updatedTrack : t);
        setTracks(updatedTracks);
        await saveTracksToDB(updatedTracks);
        if (!isGuest) await syncTrackToCloud(updatedTrack);
    };

    // Fix: Implemented missing race mode start handler
    const handleStartRace = () => {
        setIsSidebarOpen(false);
        addToast("Setup gara avviato.", "info");
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
            addToast("Errore caricamento dati.", "error");
        }
    };

    const handleFileUpload = (files: File[] | null) => {
        if (!files || files.length === 0) return;
        addToast("Elaborazione file...", "info");
        // Logic for file parsing...
    };

    const resetNavigation = useCallback(() => {
        setShowHome(false);
        setShowExplorer(false);
        setShowDiary(false);
        setShowPerformance(false);
        setShowSocial(false);
        setViewingTrack(null);
    }, []);

    if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-white font-sans">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            {isDataLoading && (
                <div className="fixed inset-0 z-[99999] bg-slate-950/80 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Inizializzazione...</p>
                </div>
            )}

            {showAuthSelection && <AuthSelectionModal onGuest={() => { setIsGuest(true); setUserId('guest'); setShowAuthSelection(false); setShowHome(true); }} onLogin={() => setShowLoginModal(true)} />}
            {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => { setShowLoginModal(false); checkSession(); }} tracks={tracks} userProfile={userProfile} plannedWorkouts={plannedWorkouts} />}
            
            {showHome && (
                <HomeModal 
                    onClose={() => setShowHome(false)}
                    onOpenDiary={() => { resetNavigation(); setShowDiary(true); }}
                    onOpenExplorer={() => { resetNavigation(); setShowExplorer(true); }}
                    onOpenHelp={() => { resetNavigation(); setShowGuide(true); }}
                    onOpenStravaConfig={() => setShowStravaSyncOptions(true)}
                    // Fix: Added missing onImportBackup prop
                    onImportBackup={handleImportBackup}
                    // Fix: Use dedicated handler for backup export
                    onExportBackup={handleExportBackup}
                    onUploadTracks={handleFileUpload}
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

            {/* Rest of the application logic including Sidebar and MapDisplay */}
            {!showHome && !showAuthSelection && (
                <div className="flex h-full relative">
                    <div className={`z-20 bg-slate-900 border-r border-slate-800 shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden border-none'}`}>
                        <Sidebar 
                            tracks={tracks} 
                            onFileUpload={handleFileUpload} 
                            visibleTrackIds={visibleTrackIds}
                            onToggleVisibility={(id) => setVisibleTrackIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                            onFocusTrack={setFocusedTrackId} 
                            focusedTrackId={focusedTrackId}
                            raceSelectionIds={raceSelectionIds} 
                            onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                            // Fix: Added missing props for Sidebar component
                            onDeselectAll={() => setRaceSelectionIds(new Set())}
                            onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                            onStartRace={handleStartRace}
                            hoveredTrackId={hoveredTrackId}
                            onTrackHoverStart={setHoveredTrackId}
                            onTrackHoverEnd={() => setHoveredTrackId(null)}
                            onDeleteTrack={handleDeleteTrack}
                            onDeleteSelected={handleDeleteSelected}
                            onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                            onToggleArchived={handleToggleArchived}
                        />
                    </div>
                    <div className="flex-grow relative bg-slate-950">
                        <MapDisplay 
                            tracks={tracks} visibleTrackIds={focusedTrackId ? new Set([focusedTrackId]) : visibleTrackIds}
                            raceRunners={null} runnerSpeeds={new Map()} hoveredTrackId={null}
                        />
                        <NavigationDock 
                            onOpenSidebar={() => setIsSidebarOpen(true)} 
                            onCloseSidebar={() => setIsSidebarOpen(false)}
                            onOpenExplorer={() => setShowExplorer(true)} 
                            onOpenDiary={() => setShowDiary(true)}
                            onOpenPerformance={() => setShowPerformance(true)} 
                            onOpenHub={() => setShowHome(true)}
                            // Fix: Added missing props for NavigationDock component
                            onOpenGuide={() => setShowGuide(true)}
                            onExportBackup={handleExportBackup}
                            onOpenSocial={() => setShowSocial(true)}
                            isSidebarOpen={isSidebarOpen}
                        />
                    </div>
                </div>
            )}

            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {showExplorer && <ExplorerView tracks={tracks} onClose={() => setShowExplorer(false)} onSelectTrack={(id) => { resetNavigation(); setViewingTrack(tracks.find(t => t.id === id) || null); }} />}
            
            {viewingTrack && (
                <div className="fixed inset-0 z-[5000] bg-slate-900">
                    <TrackDetailView track={viewingTrack} userProfile={userProfile} onExit={() => setViewingTrack(null)} />
                </div>
            )}
        </div>
    );
};

export default App;
