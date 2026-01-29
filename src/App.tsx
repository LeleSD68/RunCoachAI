import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { generateSmartTitle } from './services/titleGenerator';
import { supabase } from './services/supabaseClient';
import { fetchRecentStravaActivities } from './services/stravaService';
import { SAMPLE_GPX_DATA } from './services/sampleTrackData';
import { getGenAI } from './services/aiHelper';

const App: React.FC = () => {
    // --- STATE DEFINITIONS ---
    const [tracks, setTracks] = useState<Track[]>([]);
    const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    // UI State
    const [showSplash, setShowSplash] = useState(true);
    const [showAuthSelection, setShowAuthSelection] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showInitialChoice, setShowInitialChoice] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showHome, setShowHome] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showStravaConfig, setShowStravaConfig] = useState(false);
    const [showExplorer, setShowExplorer] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const [showChatbot, setShowChatbot] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    
    // Editor & Detail Views
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
    const [workoutToConfirm, setWorkoutToConfirm] = useState<PlannedWorkout | null>(null);
    const [aiReviewTrackId, setAiReviewTrackId] = useState<string | null>(null);

    // Sidebar & Map
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);
    
    // Auth State
    const [isGuest, setIsGuest] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [limitReached, setLimitReached] = useState(false);

    // Race Mode State
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
    const [raceCommentary, setRaceCommentary] = useState<Commentary[]>([]);
    
    // Single Track Animation
    const [animationTrackId, setAnimationTrackId] = useState<string | null>(null);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
    
    // API Tokens
    const [dailyTokenCount, setDailyTokenCount] = useState(0);

    // --- REFS ---
    const raceIntervalRef = useRef<number | null>(null);
    
    // --- HELPER FUNCTIONS ---
    
    const addToast = (message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    // --- INITIALIZATION ---

    useEffect(() => {
        // Global API Token Tracking
        window.gpxApp = {
            addTokens: (count: number) => setDailyTokenCount(prev => prev + count),
            getDailyTokenCount: () => dailyTokenCount,
            trackApiRequest: () => {} // Placeholder
        };
    }, [dailyTokenCount]);

    const handleSplashFinish = () => {
        setShowSplash(false);
        checkSession();
    };

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUserId(session.user.id);
            setIsGuest(false);
            loadData();
            setShowHome(true);
        } else {
            setShowAuthSelection(true);
        }
    };

    const handleGuestAccess = () => {
        setIsGuest(true);
        setUserId('guest');
        setShowAuthSelection(false);
        loadData(true); // Force local load
        
        // Check if first time guest
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            setShowInitialChoice(true);
        } else {
            setShowHome(true);
        }
    };

    const loadData = async (forceLocal = false) => {
        try {
            const loadedProfile = await loadProfileFromDB(forceLocal);
            if (loadedProfile) setUserProfile(loadedProfile);

            const loadedTracks = await loadTracksFromDB(forceLocal);
            setTracks(loadedTracks);
            setFilteredTracks(loadedTracks);

            const loadedWorkouts = await loadPlannedWorkoutsFromDB(forceLocal);
            setPlannedWorkouts(loadedWorkouts);
        } catch (e) {
            console.error("Error loading data", e);
            addToast("Errore caricamento dati.", "error");
        }
    };

    // --- FILE PROCESSING ---

    const processFilesOnMainThread = async (files: File[]) => {
        const newTracks: Track[] = [];
        let duplicateCount = 0;

        for (const file of files) {
            try {
                const text = await file.text();
                let parsed: { name: string; points: TrackPoint[]; distance: number; duration: number; } | null = null;

                if (file.name.toLowerCase().endsWith('.gpx')) {
                    parsed = parseGpx(text, file.name);
                } else if (file.name.toLowerCase().endsWith('.tcx')) {
                    parsed = parseTcx(text, file.name);
                }

                if (parsed && parsed.points.length > 0) {
                    const { title, activityType, folder } = generateSmartTitle(parsed.points, parsed.distance, parsed.name);
                    
                    // Check duplicate
                    const isDuplicate = tracks.some(t => 
                        Math.abs(t.points[0].time.getTime() - parsed!.points[0].time.getTime()) < 1000 && 
                        Math.abs(t.distance - parsed!.distance) < 0.1
                    );

                    if (isDuplicate) {
                        duplicateCount++;
                        continue;
                    }

                    const trackId = crypto.randomUUID ? crypto.randomUUID() : `track-${Date.now()}-${Math.random()}`;
                    const newTrack: Track = {
                        id: trackId,
                        name: title,
                        points: parsed.points,
                        distance: parsed.distance,
                        duration: parsed.duration, // CORRECTED
                        color: '#' + Math.floor(Math.random()*16777215).toString(16),
                        activityType,
                        folder,
                        isFavorite: false,
                        isArchived: false,
                        isPublic: true,
                        isExternal: false,
                        userId: userId || undefined
                    };
                    newTracks.push(newTrack);
                }
            } catch (e) {
                console.error(`Error parsing ${file.name}`, e);
                addToast(`Errore parsing ${file.name}`, "error");
            }
        }

        if (newTracks.length > 0) {
            const updatedTracks = [...tracks, ...newTracks].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
            setTracks(updatedTracks);
            setFilteredTracks(updatedTracks);
            await saveTracksToDB(updatedTracks);
            
            // Sync to cloud if logged in
            if (!isGuest && userId) {
                newTracks.forEach(t => syncTrackToCloud(t));
            }

            // Check for planned workouts matches for new tracks
            newTracks.forEach(t => {
                const tDate = t.points[0].time.toDateString();
                const workout = plannedWorkouts.find(w => new Date(w.date).toDateString() === tDate && !w.completedTrackId);
                if (workout) {
                    setWorkoutToConfirm(workout);
                    setViewingTrack(t); // Open detail view context
                }
            });

            addToast(`Caricate ${newTracks.length} attività.`, "success");
        }

        if (duplicateCount > 0) {
            addToast(`${duplicateCount} duplicati ignorati.`, "info");
        }
    };

    const handleFileUpload = (files: File[] | null) => {
        if (!files || files.length === 0) return;
        addToast("Elaborazione file in corso...", "info");
        processFilesOnMainThread(files);
    };

    const handleImportBackup = async (file: File) => {
        try {
            addToast("Analisi backup...", "info");
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.tracks && !data.profile) throw new Error("File non valido");
            
            await importAllData(data);
            await loadData(true);
            
            // Se l'utente è loggato, sincronizziamo il backup appena importato col cloud (opzionale, logica complessa omessa per brevità)
            
            addToast("Backup ripristinato con successo!", "success");
            setShowInitialChoice(false);
            setShowHome(true);
        } catch (e) {
            console.error(e);
            addToast("Errore importazione backup.", "error");
        }
    };

    const handleExportBackup = async () => {
        try {
            addToast("Preparazione file di backup...", "info");
            const data = await exportAllData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `runcoach_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast("Backup salvato nei download.", "success");
        } catch (e) {
            console.error(e);
            addToast("Errore durante l'esportazione.", "error");
        }
    };

    // --- WORKOUTS ---

    const handleAddPlannedWorkout = (workout: PlannedWorkout) => {
        const updated = [...plannedWorkouts, workout];
        setPlannedWorkouts(updated);
        savePlannedWorkoutsToDB(updated);
        addToast('Allenamento aggiunto.', 'success');
    };

    const handleDeletePlannedWorkout = async (id: string) => {
        const updated = plannedWorkouts.filter(w => w.id !== id);
        setPlannedWorkouts(updated);
        await savePlannedWorkoutsToDB(updated);
        if (!isGuest) await deletePlannedWorkoutFromCloud(id);
        addToast('Allenamento rimosso.', 'info');
    };

    const handleUpdatePlannedWorkout = async (workout: PlannedWorkout) => {
        const updated = plannedWorkouts.map(w => w.id === workout.id ? workout : w);
        setPlannedWorkouts(updated);
        await savePlannedWorkoutsToDB(updated);
        addToast('Allenamento aggiornato.', 'success');
    };

    const handleMassUpdatePlannedWorkouts = async (workouts: PlannedWorkout[]) => {
        let updated = [...plannedWorkouts];
        workouts.forEach(w => {
            const idx = updated.findIndex(ex => ex.id === w.id);
            if (idx >= 0) updated[idx] = w;
            else updated.push(w); // Should not happen for updates but safe
        });
        setPlannedWorkouts(updated);
        await savePlannedWorkoutsToDB(updated);
        addToast('Piano aggiornato.', 'success');
    };

    // --- RACE MODE HANDLERS ---

    const handleAddOpponent = async (files: File[]) => {
        if (!files || files.length === 0) return;
        const tempTracks: Track[] = [];
        
        for (const file of files) {
            try {
                const text = await file.text();
                let parsed = null;
                if (file.name.toLowerCase().endsWith('.gpx')) parsed = parseGpx(text, file.name);
                else if (file.name.toLowerCase().endsWith('.tcx')) parsed = parseTcx(text, file.name);
                
                if (parsed) {
                    tempTracks.push({
                        id: `ghost-${Date.now()}-${Math.random()}`,
                        name: `👻 ${parsed.name}`,
                        points: parsed.points,
                        distance: parsed.distance,
                        duration: parsed.duration,
                        color: '#' + Math.floor(Math.random()*16777215).toString(16),
                        isExternal: true,
                        activityType: 'Gara'
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        if (tempTracks.length > 0) {
            setTracks(prev => [...prev, ...tempTracks]);
            setRaceSelectionIds(prev => {
                const next = new Set(prev);
                tempTracks.forEach(t => next.add(t.id));
                return next;
            });
            addToast(`${tempTracks.length} Ghost aggiunti alla gara.`, "info");
        }
    };

    const handleRemoveRaceTrack = (id: string) => {
        setRaceSelectionIds(prev => {
            const n = new Set(prev);
            n.delete(id);
            return n;
        });
        // If it was a ghost, remove from tracks entirely
        if (id.startsWith('ghost-')) {
            setTracks(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleStartRace = (renamedMap: Record<string, string>) => {
        // Apply renames
        setTracks(prev => prev.map(t => renamedMap[t.id] ? { ...t, name: renamedMap[t.id] } : t));
        
        // Prepare runners
        const selectedTracks = tracks.filter(t => raceSelectionIds.has(t.id));
        const runners = selectedTracks.map(t => ({
            trackId: t.id,
            name: t.name,
            color: t.color,
            position: t.points[0],
            pace: 0
        }));
        
        setRaceRunners(runners);
        setSimulationTime(0);
        setSimulationState('running');
        setShowRaceSetup(false);
        setIsRaceMode(true);
        setIsSidebarOpen(false); // Maximize map
    };

    const handleExitRace = () => {
        setIsRaceMode(false);
        setSimulationState('idle');
        setRaceRunners([]);
        setRaceResults([]);
        setRaceSelectionIds(new Set());
        // Clean up ghosts
        setTracks(prev => prev.filter(t => !t.isExternal));
        setIsSidebarOpen(true);
    };

    // --- OTHER HANDLERS ---

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsGuest(false);
        setUserId(null);
        setTracks([]);
        setUserProfile({});
        setPlannedWorkouts([]);
        setShowHome(false);
        setShowAuthSelection(true);
        localStorage.removeItem('hasSeenWelcome');
    };

    const handleLogin = () => {
        setShowAuthSelection(false);
        setShowLoginModal(true);
    };

    const handleLoginSuccess = () => {
        setShowLoginModal(false);
        checkSession();
    };

    const handleOpenWorkout = (workoutId: string) => {
        setSelectedWorkoutId(workoutId);
        setShowDiary(true);
    };

    // --- RENDER ---

    if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-white font-sans">
            <ToastContainer toasts={toasts} setToasts={setToasts} />

            {showAuthSelection && (
                <AuthSelectionModal onGuest={handleGuestAccess} onLogin={handleLogin} />
            )}

            {showLoginModal && (
                <LoginModal 
                    onClose={() => { setShowLoginModal(false); setShowAuthSelection(true); }}
                    onLoginSuccess={handleLoginSuccess}
                    tracks={tracks}
                    userProfile={userProfile}
                    plannedWorkouts={plannedWorkouts}
                    limitReached={limitReached}
                />
            )}

            {showInitialChoice && (
                <InitialChoiceModal 
                    onImportBackup={handleImportBackup} 
                    onStartNew={() => { setShowInitialChoice(false); setShowWelcome(true); }}
                    onClose={() => { setShowInitialChoice(false); setShowHome(true); }}
                />
            )}

            {showWelcome && (
                <WelcomeModal onClose={() => { 
                    setShowWelcome(false); 
                    localStorage.setItem('hasSeenWelcome', 'true');
                    // Load sample track
                    processFilesOnMainThread([new File([SAMPLE_GPX_DATA], "Colosseum_Run_Example.gpx", { type: "application/gpx+xml" })]);
                    setShowHome(true); 
                }} />
            )}

            {showHome && (
                <HomeModal 
                    onClose={() => setShowHome(false)}
                    onOpenDiary={() => setShowDiary(true)}
                    onOpenExplorer={() => setShowExplorer(true)}
                    onOpenHelp={() => setShowGuide(true)}
                    onImportBackup={handleImportBackup}
                    onExportBackup={handleExportBackup}
                    onUploadTracks={handleFileUpload}
                    trackCount={tracks.length}
                    plannedWorkouts={plannedWorkouts}
                    onOpenWorkout={handleOpenWorkout}
                    onOpenProfile={() => setShowProfile(true)}
                    onOpenChangelog={() => setShowChangelog(true)}
                    onUploadOpponent={handleAddOpponent}
                    onEnterRaceMode={() => { setShowHome(false); setShowRaceSetup(true); }}
                    onLogout={handleLogout}
                    onLogin={handleLogin}
                    isGuest={isGuest}
                    onManualCloudSave={userId && !isGuest ? () => {} : undefined} // Placeholder for manual save if needed
                    onCheckAiAccess={() => { if(limitReached) { setShowLoginModal(true); return false; } return true; }}
                    onOpenStravaConfig={() => setShowStravaConfig(true)}
                />
            )}

            {/* MAIN APP UI */}
            {!showHome && !showAuthSelection && !showInitialChoice && (
                <div className="flex h-full relative">
                    {/* SIDEBAR */}
                    {(isSidebarOpen || !isMobile()) && (
                        <div className={`
                            absolute md:relative z-20 h-full bg-slate-900 border-r border-slate-800 flex-shrink-0 transition-all duration-300
                            ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0'}
                        `}>
                            <Sidebar 
                                tracks={filteredTracks}
                                onFileUpload={handleFileUpload}
                                visibleTrackIds={visibleTrackIds}
                                onToggleVisibility={(id) => setVisibleTrackIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                raceSelectionIds={raceSelectionIds}
                                onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                                onDeselectAll={() => setRaceSelectionIds(new Set())}
                                onStartRace={() => setShowRaceSetup(true)}
                                onGoToEditor={() => { if(raceSelectionIds.size === 1) setEditingTrack(tracks.find(t => t.id === Array.from(raceSelectionIds)[0]) || null); }}
                                onPauseRace={() => setSimulationState('paused')}
                                onResumeRace={() => setSimulationState('running')}
                                onResetRace={() => { setSimulationTime(0); setSimulationState('idle'); }}
                                simulationState={simulationState}
                                simulationTime={simulationTime}
                                onTrackHoverStart={setHoveredTrackId}
                                onTrackHoverEnd={() => setHoveredTrackId(null)}
                                hoveredTrackId={hoveredTrackId}
                                raceProgress={new Map()} 
                                simulationSpeed={simulationSpeed}
                                onSpeedChange={setSimulationSpeed}
                                lapTimes={new Map()}
                                sortOrder={'date_desc'} // Placeholder
                                onSortChange={() => {}}
                                onDeleteTrack={(id) => {
                                    setTracks(prev => prev.filter(t => t.id !== id));
                                    deleteTrackFromCloud(id);
                                    addToast("Traccia eliminata.", "info");
                                }}
                                onDeleteSelected={() => {
                                    raceSelectionIds.forEach(id => deleteTrackFromCloud(id));
                                    setTracks(prev => prev.filter(t => !raceSelectionIds.has(t.id)));
                                    setRaceSelectionIds(new Set());
                                    addToast("Tracce eliminate.", "info");
                                }}
                                onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                                onStartAnimation={(id) => {
                                    setAnimationTrackId(id);
                                    setIsAnimationPlaying(true);
                                }}
                                raceRanks={raceLeaderboard.ranks}
                                runnerSpeeds={new Map(raceRunners.map(r => [r.trackId, r.pace]))}
                                runnerDistances={new Map(raceRunners.map(r => [r.trackId, r.position.cummulativeDistance]))}
                                runnerGapsToLeader={new Map()}
                                collapsedGroups={new Set()}
                                onToggleGroup={() => {}}
                                onOpenChangelog={() => setShowChangelog(true)}
                                onOpenProfile={() => setShowProfile(true)}
                                onOpenGuide={() => setShowGuide(true)}
                                onOpenDiary={() => setShowDiary(true)}
                                dailyTokenUsage={{ used: dailyTokenCount, limit: 1000000 }}
                                onExportBackup={handleExportBackup}
                                onImportBackup={handleImportBackup}
                                onCloseMobile={() => setIsSidebarOpen(false)}
                                onUpdateTrackMetadata={(id, meta) => {
                                    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...meta } : t));
                                    // Should sync to cloud but simple update here
                                }}
                                onRegenerateTitles={() => {}}
                                onToggleExplorer={() => setShowExplorer(true)}
                                showExplorer={showExplorer}
                                listViewMode={'cards'}
                                onListViewModeChange={() => {}}
                                onAiBulkRate={() => {}}
                                onOpenReview={(id) => setAiReviewTrackId(id)}
                                mobileRaceMode={isMobile()}
                                monthlyStats={{}}
                                plannedWorkouts={plannedWorkouts}
                                onOpenPlannedWorkout={(id) => { setSelectedWorkoutId(id); setShowDiary(true); }}
                                apiUsageStats={{ rpm: 0, daily: 0, limitRpm: 60, limitDaily: 1000, totalTokens: dailyTokenCount }}
                                onOpenHub={() => setShowHome(true)}
                                onOpenPerformanceAnalysis={() => setShowPerformance(true)}
                                onUserLogin={handleLogin}
                                onUserLogout={handleLogout}
                                onCompareSelected={() => setShowComparison(true)}
                                userProfile={userProfile}
                                onOpenSocial={() => setShowSocial(true)}
                                onToggleArchived={(id) => setTracks(prev => prev.map(t => t.id === id ? { ...t, isArchived: !t.isArchived } : t))}
                                isGuest={isGuest}
                                onlineCount={0} // Mock
                                unreadCount={0} // Mock
                                onTogglePrivacySelected={(isPublic) => {
                                    setTracks(prev => prev.map(t => raceSelectionIds.has(t.id) ? { ...t, isPublic } : t));
                                }}
                            />
                        </div>
                    )}

                    {/* MAP AREA */}
                    <div className="flex-grow relative h-full bg-slate-900 overflow-hidden">
                        <MapDisplay 
                            tracks={tracks}
                            visibleTrackIds={visibleTrackIds}
                            selectedTrackIds={raceSelectionIds}
                            raceRunners={raceRunners}
                            hoveredTrackId={hoveredTrackId}
                            runnerSpeeds={new Map(raceRunners.map(r => [r.trackId, r.pace]))}
                            selectionPoints={null}
                            hoveredPoint={null}
                            onTrackHover={setHoveredTrackId}
                            mapGradientMetric={'none'} // Simplified
                            animationTrack={animationTrackId ? tracks.find(t => t.id === animationTrackId) : null}
                            animationProgress={animationProgress}
                            isAnimationPlaying={isAnimationPlaying}
                            onToggleAnimationPlay={() => setIsAnimationPlaying(!isAnimationPlaying)}
                            onAnimationProgressChange={setAnimationProgress}
                            animationSpeed={simulationSpeed}
                            onAnimationSpeedChange={setSimulationSpeed}
                            onExitAnimation={() => {
                                setAnimationTrackId(null);
                                setIsAnimationPlaying(false);
                            }}
                            onTrackClick={(id, multi) => {
                                if (multi) {
                                    setRaceSelectionIds(prev => {
                                        const n = new Set(prev);
                                        if (n.has(id)) n.delete(id); else n.add(id);
                                        return n;
                                    });
                                } else {
                                    setRaceSelectionIds(new Set([id]));
                                }
                            }}
                        />

                        {/* Overlays */}
                        {isRaceMode && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                                <RaceControls 
                                    simulationState={simulationState}
                                    simulationTime={simulationTime}
                                    simulationSpeed={simulationSpeed}
                                    onPause={() => setSimulationState('paused')}
                                    onResume={() => setSimulationState('running')}
                                    onStop={handleExitRace}
                                    onSpeedChange={setSimulationSpeed}
                                />
                            </div>
                        )}
                        
                        {isRaceMode && raceRunners.length > 0 && (
                            <div className="absolute top-20 left-4 z-20">
                                <RaceLeaderboard racers={tracks.filter(t => raceSelectionIds.has(t.id))} ranks={raceLeaderboard.ranks} gaps={raceLeaderboard.gaps} />
                            </div>
                        )}

                        <LiveCommentary messages={raceCommentary} isLoading={false} />

                        {/* Navigation Dock (Mobile) */}
                        {!isRaceMode && (
                            <NavigationDock 
                                onOpenSidebar={() => setIsSidebarOpen(true)}
                                onCloseSidebar={() => setIsSidebarOpen(false)}
                                onOpenExplorer={() => setShowExplorer(true)}
                                onOpenDiary={() => setShowDiary(true)}
                                onOpenPerformance={() => setShowPerformance(true)}
                                onOpenGuide={() => setShowGuide(true)}
                                onExportBackup={handleExportBackup}
                                onOpenHub={() => setShowHome(true)}
                                onOpenSocial={() => setShowSocial(true)}
                                isSidebarOpen={isSidebarOpen}
                            />
                        )}

                        {/* Global Chatbot Bubble */}
                        <div className="absolute bottom-20 right-4 z-40">
                            {!showChatbot ? (
                                <button 
                                    onClick={() => setShowChatbot(true)}
                                    className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95 border-2 border-purple-400"
                                >
                                    <span className="text-2xl">🤖</span>
                                </button>
                            ) : (
                                <div className="animate-fade-in-up">
                                    <Chatbot 
                                        tracksToAnalyze={tracks}
                                        userProfile={userProfile}
                                        onClose={() => setShowChatbot(false)}
                                        isStandalone={true}
                                        onAddPlannedWorkout={handleAddPlannedWorkout}
                                        plannedWorkouts={plannedWorkouts}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {showProfile && (
                <UserProfileModal 
                    onClose={() => setShowProfile(false)} 
                    onSave={(p) => { setUserProfile(p); saveProfileToDB(p); }} 
                    currentProfile={userProfile}
                    tracks={tracks}
                    onLogout={handleLogout}
                />
            )}

            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {showStravaConfig && <StravaConfigModal onClose={() => setShowStravaConfig(false)} />}
            
            {showExplorer && (
                <ExplorerView 
                    tracks={tracks} 
                    onClose={() => setShowExplorer(false)} 
                    onSelectTrack={(id) => {
                        const t = tracks.find(tr => tr.id === id);
                        if (t) {
                            setViewingTrack(t);
                            setShowExplorer(false);
                        }
                    }} 
                />
            )}

            {showDiary && (
                <DiaryView 
                    tracks={tracks}
                    plannedWorkouts={plannedWorkouts}
                    userProfile={userProfile}
                    onClose={() => setShowDiary(false)}
                    onSelectTrack={(id) => {
                        const t = tracks.find(tr => tr.id === id);
                        if (t) {
                            setViewingTrack(t);
                            setShowDiary(false);
                        }
                    }}
                    onDeletePlannedWorkout={handleDeletePlannedWorkout}
                    onAddPlannedWorkout={handleAddPlannedWorkout}
                    onUpdatePlannedWorkout={handleUpdatePlannedWorkout}
                    onMassUpdatePlannedWorkouts={handleMassUpdatePlannedWorkouts}
                    initialSelectedWorkoutId={selectedWorkoutId}
                    onCheckAiAccess={() => { if(limitReached) { setShowLoginModal(true); return false; } return true; }}
                    onOpenGlobalChat={() => setShowChatbot(true)}
                />
            )}

            {showPerformance && (
                <PerformanceAnalysisPanel 
                    tracks={tracks}
                    userProfile={userProfile}
                    onClose={() => setShowPerformance(false)}
                />
            )}

            {showSocial && userId && (
                <SocialHub onClose={() => setShowSocial(false)} currentUserId={userId} />
            )}

            {editingTrack && (
                <div className="fixed inset-0 z-[5000] bg-slate-900">
                    <TrackEditor 
                        initialTracks={[editingTrack]} 
                        onExit={(updated) => {
                            if (updated) {
                                setTracks(prev => prev.map(t => t.id === updated.id ? updated : t));
                                saveTracksToDB([updated]); // Update just this one
                            }
                            setEditingTrack(null);
                        }}
                        addToast={addToast}
                    />
                </div>
            )}

            {viewingTrack && (
                <div className="fixed inset-0 z-[5000] bg-slate-900">
                    <TrackDetailView 
                        track={viewingTrack}
                        userProfile={userProfile}
                        onExit={() => { setViewingTrack(null); setWorkoutToConfirm(null); }}
                        allHistory={tracks}
                        plannedWorkouts={plannedWorkouts}
                        onUpdateTrackMetadata={(id, meta) => {
                            setTracks(prev => prev.map(t => t.id === id ? { ...t, ...meta } : t));
                        }}
                        onAddPlannedWorkout={handleAddPlannedWorkout}
                        onCheckAiAccess={() => { if(limitReached) { setShowLoginModal(true); return false; } return true; }}
                        onLimitReached={() => setLimitReached(true)}
                        isGuest={isGuest}
                    />
                    {workoutToConfirm && (
                        <WorkoutConfirmationModal 
                            workout={workoutToConfirm}
                            onConfirm={() => {
                                setTracks(prev => prev.map(t => t.id === viewingTrack.id ? { ...t, linkedWorkout: workoutToConfirm } : t));
                                // Also update workout to point to track
                                const updatedW = { ...workoutToConfirm, completedTrackId: viewingTrack.id };
                                handleUpdatePlannedWorkout(updatedW);
                                setWorkoutToConfirm(null);
                                addToast("Allenamento confermato!", "success");
                            }}
                            onCancel={() => setWorkoutToConfirm(null)}
                        />
                    )}
                </div>
            )}

            {showRaceSetup && (
                <RaceSetupModal 
                    tracks={tracks.filter(t => raceSelectionIds.has(t.id))}
                    onConfirm={handleStartRace}
                    onCancel={() => setShowRaceSetup(false)}
                    onAddOpponent={handleAddOpponent}
                    onRemoveTrack={handleRemoveRaceTrack}
                />
            )}

            {showRaceSummary && (
                <RaceSummary 
                    results={raceResults}
                    racerStats={null} // Simplified
                    onClose={() => { setShowRaceSummary(false); handleExitRace(); }}
                    userProfile={userProfile}
                    tracks={tracks}
                />
            )}

            {showComparison && (
                <ComparisonModal 
                    tracks={tracks.filter(t => raceSelectionIds.has(t.id))}
                    onClose={() => setShowComparison(false)}
                />
            )}

            {aiReviewTrackId && (
                <AiReviewModal 
                    track={tracks.find(t => t.id === aiReviewTrackId)!}
                    userProfile={userProfile}
                    onClose={() => setAiReviewTrackId(null)}
                />
            )}

        </div>
    );
};

// Helper for Mobile check
const isMobile = () => window.innerWidth < 768;

export default App;
