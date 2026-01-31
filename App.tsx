
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
import RaceControls from './components/RaceControls';
import RaceLeaderboard from './components/RacePaceBar';
import RaceSummary from './components/RaceSummary';
import WorkoutConfirmationModal from './components/WorkoutConfirmationModal';
import ExplorerView from './components/ExplorerView';
import DiaryView from './components/DiaryView';
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel';
import SocialHub from './components/SocialHub';
import LiveCommentary from './components/LiveCommentary';
import MobileTrackSummary from './components/MobileTrackSummary';
import SplashScreen from './components/SplashScreen';
import ComparisonModal from './components/ComparisonModal';
import LoginModal from './components/LoginModal';
import AiReviewModal from './components/AiReviewModal';

import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { 
    saveTracksToDB, loadTracksFromDB, 
    saveProfileToDB, loadProfileFromDB, 
    savePlannedWorkoutsToDB, loadPlannedWorkoutsFromDB,
    importAllData, exportAllData, syncTrackToCloud, deleteTrackFromCloud, deletePlannedWorkoutFromCloud
} from './services/dbService';
import { mergeTracks } from './services/trackEditorUtils';
import { generateSmartTitle } from './services/titleGenerator';
import { supabase } from './services/supabaseClient';
import { fetchRecentStravaActivities, isStravaConnected } from './services/stravaService';
import { SAMPLE_GPX_DATA } from './services/sampleTrackData';

const App: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    const [showSplash, setShowSplash] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false); 
    const [loadingMessage, setLoadingMessage] = useState('Caricamento...');
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
    const [showChatbot, setShowChatbot] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    
    const [editingTracks, setEditingTracks] = useState<Track[] | null>(null); 
    const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
    const [workoutToConfirm, setWorkoutToConfirm] = useState<PlannedWorkout | null>(null);
    const [aiReviewTrackId, setAiReviewTrackId] = useState<string | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    
    const [isGuest, setIsGuest] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [limitReached, setLimitReached] = useState(false);

    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [showRaceSetup, setShowRaceSetup] = useState(false);
    const [isRaceMode, setIsRaceMode] = useState(false);
    const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
    const [raceRunners, setRaceRunners] = useState<RaceRunner[]>([]);
    const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
    const [showRaceSummary, setShowRaceSummary] = useState(false);
    const [simulationTime, setSimulationTime] = useState(0);
    const [simulationSpeed, setSimulationSpeed] = useState(20);
    const [raceLeaderboard, setRaceLeaderboard] = useState<{ ranks: Map<string, number>, gaps: Map<string, number | undefined> }>({ ranks: new Map(), gaps: new Map() });
    
    const [animationTrackId, setAnimationTrackId] = useState<string | null>(null);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
    
    const [dailyTokenCount, setDailyTokenCount] = useState(0);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const resetNavigation = useCallback(() => {
        setShowHome(false);
        setShowExplorer(false);
        setShowDiary(false);
        setShowPerformance(false);
        setShowSocial(false);
        setShowGuide(false);
        setShowProfile(false);
        setShowChangelog(false);
        setViewingTrack(null);
        setEditingTracks(null);
        setShowComparison(false);
        setAiReviewTrackId(null);
    }, []);

    const addToast = (message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const handleTrackUpdate = (id: string, meta: Partial<Track>) => {
        let updatedTrackObj: Track | undefined;
        setTracks(prev => {
            const index = prev.findIndex(t => t.id === id);
            if (index === -1) return prev;
            updatedTrackObj = { ...prev[index], ...meta };
            
            if (!updatedTrackObj.isExternal) {
                saveTracksToDB([updatedTrackObj]);
                if (!isGuest && userId) syncTrackToCloud(updatedTrackObj);
            }
            
            const next = [...prev];
            next[index] = updatedTrackObj;
            return next;
        });

        if (viewingTrack && viewingTrack.id === id && updatedTrackObj) {
            setViewingTrack(updatedTrackObj);
        }
    };

    const handleMergeSelection = () => {
        const selectedCount = raceSelectionIds.size;
        if (selectedCount < 2) {
            addToast("Seleziona almeno 2 tracce per unirle.", "info");
            return;
        }
        const confirmMerge = window.confirm(`Vuoi unire queste ${selectedCount} attività in un'unica traccia continua?`);
        if (!confirmMerge) return;
        
        const selectedTracksToMerge = tracks.filter(t => raceSelectionIds.has(t.id));
        const merged = mergeTracks(selectedTracksToMerge);
        
        const updatedTracks = [merged, ...tracks];
        setTracks(updatedTracks);
        saveTracksToDB([merged]);
        if (!isGuest && userId) syncTrackToCloud(merged);
        
        setRaceSelectionIds(new Set());
        addToast("Tracce unite correttamente!", "success");
        setViewingTrack(merged);
    };

    const handleDeleteSelected = () => {
        const selectedIds = Array.from(raceSelectionIds);
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Sei sicuro di voler eliminare definitivamente queste ${selectedIds.length} attività?`)) return;

        const newTracks = tracks.filter(t => !raceSelectionIds.has(t.id));
        setTracks(newTracks);
        saveTracksToDB(newTracks);
        selectedIds.forEach(id => deleteTrackFromCloud(id));
        setRaceSelectionIds(new Set());
        addToast(`${selectedIds.length} attività eliminate.`, "info");
    };

    useEffect(() => {
        window.gpxApp = {
            addTokens: (count: number) => setDailyTokenCount(prev => prev + count),
            getDailyTokenCount: () => dailyTokenCount,
            trackApiRequest: () => {} 
        };
    }, [dailyTokenCount]);

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

    const handleGuestAccess = () => {
        setIsGuest(true);
        setUserId('guest');
        setShowAuthSelection(false);
        loadData(true); 
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) setShowInitialChoice(true);
        else setShowHome(true);
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

    const processFilesOnMainThread = async (files: File[]) => {
        const newTracks: Track[] = [];
        let duplicateCount = 0;

        for (const file of files) {
            try {
                const text = await file.text();
                let parsed = null;
                if (file.name.toLowerCase().endsWith('.gpx')) parsed = parseGpx(text, file.name);
                else if (file.name.toLowerCase().endsWith('.tcx')) parsed = parseTcx(text, file.name);

                if (parsed && parsed.points.length > 0) {
                    const { title, activityType, folder } = generateSmartTitle(parsed.points, parsed.distance, parsed.name);
                    const isDuplicate = tracks.some(t => 
                        Math.abs(t.points[0].time.getTime() - parsed!.points[0].time.getTime()) < 1000 && 
                        Math.abs(t.distance - parsed!.distance) < 0.1
                    );

                    if (isDuplicate) {
                        duplicateCount++;
                        continue;
                    }

                    const trackId = crypto.randomUUID ? crypto.randomUUID() : `track-${Date.now()}`;
                    const newTrack: Track = {
                        id: trackId, name: title, points: parsed.points, distance: parsed.distance, duration: parsed.duration,
                        color: '#' + Math.floor(Math.random()*16777215).toString(16),
                        activityType, folder, isFavorite: false, isArchived: false, isPublic: true, isExternal: false, userId: userId || undefined
                    };
                    newTracks.push(newTrack);
                }
            } catch (e) {
                addToast(`Errore parsing ${file.name}`, "error");
            }
        }

        if (newTracks.length > 0) {
            const updated = [...tracks, ...newTracks].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
            setTracks(updated);
            setVisibleTrackIds(prev => { const n = new Set(prev); newTracks.forEach(t => n.add(t.id)); return n; });
            await saveTracksToDB(updated);
            if (!isGuest && userId) newTracks.forEach(t => syncTrackToCloud(t));
            addToast(`Caricate ${newTracks.length} attività.`, "success");
        }
        if (duplicateCount > 0) addToast(`${duplicateCount} duplicati ignorati.`, "info");
    };

    const handleFileUpload = (files: File[] | null) => {
        if (!files || files.length === 0) return;
        addToast("Elaborazione file...", "info");
        processFilesOnMainThread(files);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsGuest(false);
        setUserId(null);
        setTracks([]);
        resetNavigation();
        setShowAuthSelection(true);
    };

    const handleImportBackup = async (file: File) => {
        try {
            addToast("Analisi backup...", "info");
            const text = await file.text();
            const data = JSON.parse(text);
            await importAllData(data);
            await loadData(true);
            addToast("Backup ripristinato!", "success");
            setShowInitialChoice(false);
            setShowHome(true);
        } catch (e) {
            addToast("Errore importazione backup.", "error");
        }
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

            {showAuthSelection && <AuthSelectionModal onGuest={handleGuestAccess} onLogin={() => setShowLoginModal(true)} />}
            {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => { setShowLoginModal(false); checkSession(); }} tracks={tracks} userProfile={userProfile} plannedWorkouts={plannedWorkouts} />}
            {showInitialChoice && <InitialChoiceModal onImportBackup={handleImportBackup} onStartNew={() => { setShowInitialChoice(false); setShowWelcome(true); }} onClose={() => setShowHome(true)} />}
            {showWelcome && <WelcomeModal onClose={() => { setShowWelcome(false); localStorage.setItem('hasSeenWelcome', 'true'); setShowHome(true); }} />}

            {showHome && (
                <HomeModal 
                    onClose={() => setShowHome(false)}
                    onOpenDiary={() => { resetNavigation(); setShowDiary(true); }}
                    onOpenExplorer={() => { resetNavigation(); setShowExplorer(true); }}
                    onOpenHelp={() => { resetNavigation(); setShowGuide(true); }}
                    onImportBackup={handleImportBackup}
                    onExportBackup={exportAllData}
                    onUploadTracks={handleFileUpload}
                    trackCount={tracks.length}
                    plannedWorkouts={plannedWorkouts}
                    onOpenWorkout={(id) => { resetNavigation(); setSelectedWorkoutId(id); setShowDiary(true); }}
                    onOpenProfile={() => { resetNavigation(); setShowProfile(true); }}
                    onOpenChangelog={() => { resetNavigation(); setShowChangelog(true); }}
                    onEnterRaceMode={() => setShowRaceSetup(true)}
                    onLogout={handleLogout}
                    onLogin={() => setShowLoginModal(true)}
                    isGuest={isGuest}
                    userProfile={userProfile}
                />
            )}

            {!showHome && !showAuthSelection && !showInitialChoice && (
                <div className={`flex h-full relative ${isMobileView ? 'flex-col' : 'flex-row'}`}>
                    {/* Pannello Liste: Sopra su Mobile, Sinistra su Desktop */}
                    <div className={`z-20 bg-slate-900 border-slate-800 flex-shrink-0 transition-all duration-500 ease-in-out ${
                        isMobileView 
                        ? `w-full ${isSidebarOpen ? 'h-[60vh] border-b' : 'h-0 overflow-hidden border-none'} relative` 
                        : `absolute md:relative h-full border-r ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0'}`
                    }`}>
                        <Sidebar 
                            tracks={tracks}
                            onFileUpload={handleFileUpload}
                            visibleTrackIds={visibleTrackIds}
                            onToggleVisibility={(id) => setVisibleTrackIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                            raceSelectionIds={raceSelectionIds}
                            onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                            onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                            onDeselectAll={() => setRaceSelectionIds(new Set())}
                            onStartRace={() => setShowRaceSetup(true)}
                            onMergeSelected={handleMergeSelection}
                            simulationState={simulationState}
                            simulationTime={simulationTime}
                            onTrackHoverStart={setHoveredTrackId}
                            onTrackHoverEnd={() => setHoveredTrackId(null)}
                            hoveredTrackId={hoveredTrackId}
                            onDeleteTrack={(id) => { const n = tracks.filter(t => t.id !== id); setTracks(n); saveTracksToDB(n); deleteTrackFromCloud(id); }}
                            onDeleteSelected={handleDeleteSelected}
                            onViewDetails={(id) => { resetNavigation(); setViewingTrack(tracks.find(t => t.id === id) || null); }}
                            onUpdateTrackMetadata={handleTrackUpdate}
                            onToggleArchived={(id) => handleTrackUpdate(id, { isArchived: !tracks.find(t => t.id === id)?.isArchived })}
                            userProfile={userProfile}
                            isGuest={isGuest}
                            onOpenHub={() => { resetNavigation(); setShowHome(true); }}
                            onOpenDiary={() => { resetNavigation(); setShowDiary(true); }}
                            onOpenExplorer={() => { resetNavigation(); setShowExplorer(true); }}
                            onOpenSocial={() => { resetNavigation(); setShowSocial(true); }}
                            onOpenPerformanceAnalysis={() => { resetNavigation(); setShowPerformance(true); }}
                            onUserLogin={() => setShowLoginModal(true)}
                            onUserLogout={handleLogout}
                            onCompareSelected={() => { resetNavigation(); setShowComparison(true); }}
                            apiUsageStats={{ rpm: 0, daily: 0, limitRpm: 60, limitDaily: 1000, totalTokens: dailyTokenCount }}
                            onOpenChangelog={() => { resetNavigation(); setShowChangelog(true); }}
                            onOpenProfile={() => { resetNavigation(); setShowProfile(true); }}
                            onOpenGuide={() => { resetNavigation(); setShowGuide(true); }}
                            onExportBackup={exportAllData}
                            onImportBackup={handleImportBackup}
                            onCloseMobile={() => setIsSidebarOpen(false)}
                            onToggleExplorer={() => { resetNavigation(); setShowExplorer(true); }}
                            showExplorer={showExplorer}
                            plannedWorkouts={plannedWorkouts}
                            onOpenPlannedWorkout={(id) => { resetNavigation(); setSelectedWorkoutId(id); setShowDiary(true); }}
                        />
                    </div>

                    {/* Mappa: Sotto su Mobile, Destra su Desktop */}
                    <div className="flex-grow relative h-full bg-slate-900 overflow-hidden">
                        <MapDisplay 
                            tracks={tracks}
                            visibleTrackIds={visibleTrackIds}
                            raceRunners={raceRunners}
                            hoveredTrackId={hoveredTrackId}
                            runnerSpeeds={new Map()}
                            onTrackHover={setHoveredTrackId}
                            onTrackClick={(id, multi) => {
                                if (multi) setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; });
                                else setRaceSelectionIds(new Set([id]));
                            }}
                        />

                        {/* NavigationDock posizionato in modo fisso rispetto all'area visuale */}
                        {!isRaceMode && (
                            <div className="absolute bottom-0 left-0 w-full z-[1000]">
                                <NavigationDock 
                                    onOpenSidebar={() => { resetNavigation(); setIsSidebarOpen(true); }}
                                    onCloseSidebar={() => { resetNavigation(); setIsSidebarOpen(false); }}
                                    onOpenExplorer={() => { resetNavigation(); setShowExplorer(true); }}
                                    onOpenDiary={() => { resetNavigation(); setShowDiary(true); }}
                                    onOpenPerformance={() => { resetNavigation(); setShowPerformance(true); }}
                                    onOpenGuide={() => { resetNavigation(); setShowGuide(true); }}
                                    onExportBackup={exportAllData}
                                    onOpenHub={() => { resetNavigation(); setShowHome(true); }}
                                    onOpenSocial={() => { resetNavigation(); setShowSocial(true); }}
                                    isSidebarOpen={isSidebarOpen}
                                />
                            </div>
                        )}

                        <div className="absolute bottom-24 right-4 z-40">
                            {!showChatbot ? (
                                <button onClick={() => setShowChatbot(true)} className="bg-purple-600 p-3 rounded-full shadow-2xl border-2 border-purple-400 active:scale-95 transition-transform">🤖</button>
                            ) : (
                                <Chatbot tracksToAnalyze={tracks} userProfile={userProfile} onClose={() => setShowChatbot(false)} isStandalone={true} onAddPlannedWorkout={setPlannedWorkouts as any} plannedWorkouts={plannedWorkouts} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} onSave={(p) => { setUserProfile(p); saveProfileToDB(p); }} currentProfile={userProfile} tracks={tracks} onLogout={handleLogout} />}
            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {showExplorer && <ExplorerView tracks={tracks} onClose={() => setShowExplorer(false)} onSelectTrack={(id) => { resetNavigation(); setViewingTrack(tracks.find(t => t.id === id) || null); setShowExplorer(false); }} />}
            {showDiary && (
                <DiaryView 
                    tracks={tracks} plannedWorkouts={plannedWorkouts} userProfile={userProfile} 
                    onClose={() => setShowDiary(false)} onSelectTrack={(id) => { resetNavigation(); setViewingTrack(tracks.find(t => t.id === id) || null); setShowDiary(false); }}
                    onDeletePlannedWorkout={deletePlannedWorkoutFromCloud} onAddPlannedWorkout={(w) => setPlannedWorkouts(p => [...p, w])}
                />
            )}
            {showPerformance && <PerformanceAnalysisPanel tracks={tracks} userProfile={userProfile} onClose={() => setShowPerformance(false)} />}
            {showSocial && userId && <SocialHub onClose={() => setShowSocial(false)} currentUserId={userId} />}

            {viewingTrack && (
                <div className="fixed inset-0 z-[5000] bg-slate-900">
                    <TrackDetailView 
                        track={viewingTrack} userProfile={userProfile} onExit={() => setViewingTrack(null)}
                        allHistory={tracks} plannedWorkouts={plannedWorkouts} 
                        onUpdateTrackMetadata={handleTrackUpdate} onOpenProfile={() => { resetNavigation(); setShowProfile(true); }}
                    />
                </div>
            )}
        </div>
    );
};

export default App;
