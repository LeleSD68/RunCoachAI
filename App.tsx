import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track, UserProfile, PlannedWorkout, Toast as ToastType, ActivityType, RaceRunner, RaceGapSnapshot, LeaderStats, TrackPoint, PauseSegment, ApiUsage } from './types';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import TrackDetailView from './components/TrackDetailView';
import TrackEditor from './components/TrackEditor';
import ExplorerView from './components/ExplorerView';
import DiaryView from './components/DiaryView';
import HomeModal from './components/HomeModal';
import Chatbot from './components/Chatbot';
import ToastContainer from './components/ToastContainer';
import SplashScreen from './components/SplashScreen';
import InitialChoiceModal from './components/InitialChoiceModal';
import UserProfileModal from './components/UserProfileModal';
import SettingsModal from './components/SettingsModal';
import StravaConfigModal from './components/StravaConfigModal';
import StravaSyncModal from './components/StravaSyncModal';
import GuideModal from './components/GuideModal';
import Changelog from './components/Changelog';
import RaceSetupModal from './components/RaceSetupModal';
import RaceControls from './components/RaceControls';
import RaceGapChart from './components/RaceGapChart';
import RacePaceBar from './components/RacePaceBar';
import RaceSummary from './components/RaceSummary';
import LiveCoachScreen from './components/LiveCoachScreen';
import LiveCommentary from './components/LiveCommentary';
import VeoAnimationModal from './components/VeoAnimationModal';
import InstallPromptModal from './components/InstallPromptModal';
import NavigationDock from './components/NavigationDock';
import MobileTrackSummary from './components/MobileTrackSummary';
import SocialHub from './components/SocialHub';
import ReminderNotification from './components/ReminderNotification';
import LoginModal from './components/LoginModal';

import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { loadTracksFromDB, saveTracksToDB, loadProfileFromDB, saveProfileToDB, loadPlannedWorkoutsFromDB, savePlannedWorkoutsToDB, importAllData, exportAllData } from './services/dbService';
import { checkDailyLimit, incrementDailyLimit, trackUsage, addTokensToUsage, getApiUsage } from './services/usageService';
import { generateSmartTitle } from './services/titleGenerator';
import { getUnreadNotificationsCount } from './services/socialService';
import { isStravaConnected } from './services/stravaService';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [toasts, setToasts] = useState<ToastType[]>([]);
  
  // Navigation & Modals
  const [showSplash, setShowSplash] = useState(true);
  const [showInitialChoice, setShowInitialChoice] = useState(false);
  const [showHome, setShowHome] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showStravaConfig, setShowStravaConfig] = useState(false);
  const [showStravaSync, setShowStravaSync] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showVeoModal, setShowVeoModal] = useState(false);
  const [veoTrack, setVeoTrack] = useState<Track | null>(null);
  
  // Views
  const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [liveCoachWorkout, setLiveCoachWorkout] = useState<PlannedWorkout | null>(null);
  
  // Race Mode
  const [raceMode, setRaceMode] = useState(false);
  const [raceSetupOpen, setRaceSetupOpen] = useState(false);
  const [raceRunners, setRaceRunners] = useState<RaceRunner[]>([]);
  // ... (race state simplified for reconstruction)

  // Sidebar / Map
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
  const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
  const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());

  // Other
  const [targetWorkoutId, setTargetWorkoutId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  // Load Data
  useEffect(() => {
    const init = async () => {
      const p = await loadProfileFromDB();
      if (p) setUserProfile(p);
      else setTimeout(() => setShowInitialChoice(true), 4600); // After splash

      const t = await loadTracksFromDB();
      setTracks(t);
      const pw = await loadPlannedWorkoutsFromDB();
      setPlannedWorkouts(pw);
    };
    init();
  }, []);

  // Helpers
  const addToast = (message: string, type: ToastType['type']) => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  };

  const onCheckAiAccess = (feature: 'workout' | 'analysis' | 'chat') => {
    if (!checkDailyLimit(feature)) {
      addToast("Limite giornaliero raggiunto per questa funzione.", "error");
      return false;
    }
    incrementDailyLimit(feature);
    return true;
  };

  const handleUpdateTrackMetadata = async (id: string, metadata: Partial<Track>) => {
    const updated = tracks.map(t => t.id === id ? { ...t, ...metadata } : t);
    setTracks(updated);
    await saveTracksToDB(updated);
  };

  const handleAddPlannedWorkout = async (workout: PlannedWorkout) => {
    const updated = [...plannedWorkouts, workout];
    setPlannedWorkouts(updated);
    await savePlannedWorkoutsToDB(updated);
    addToast("Allenamento aggiunto al diario.", "success");
  };

  const handleUpdatePlannedWorkout = async (workout: PlannedWorkout) => {
    const updated = plannedWorkouts.map(w => w.id === workout.id ? workout : w);
    setPlannedWorkouts(updated);
    await savePlannedWorkoutsToDB(updated);
    addToast("Allenamento aggiornato.", "success");
  };

  const handleDeletePlannedWorkout = async (id: string) => {
    const updated = plannedWorkouts.filter(w => w.id !== id);
    setPlannedWorkouts(updated);
    await savePlannedWorkoutsToDB(updated);
    addToast("Allenamento rimosso.", "success");
  };

  const startLiveCoach = (workout: PlannedWorkout) => {
    setLiveCoachWorkout(workout);
    setShowDiary(false);
  };

  const toggleView = (view: string) => {
    if (view === 'diary') setShowDiary(!showDiary);
    // ... handle others
  };

  const pushViewState = (view: string) => {
    // Simplified navigation
    if (view === 'trackDetail') {
        // Logic handled by rendering TrackDetailView when viewingTrack is set
    }
  };

  // Expose methods to window for AI usage tracking
  useEffect(() => {
    window.gpxApp = {
      addTokens: addTokensToUsage,
      trackApiRequest: () => trackUsage(),
      getUsage: getApiUsage
    };
  }, []);

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;

  if (liveCoachWorkout) {
      return (
          <LiveCoachScreen 
            workout={liveCoachWorkout} 
            onFinish={(duration) => { 
                addToast(`Allenamento completato! Durata: ${(duration/1000/60).toFixed(0)} min`, "success"); 
                setLiveCoachWorkout(null); 
            }} 
            onExit={() => setLiveCoachWorkout(null)} 
          />
      );
  }

  if (viewingTrack) {
      return (
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
      );
  }

  if (editingTrack) {
      return (
          <TrackEditor 
            initialTracks={[editingTrack]} 
            onExit={(updated) => {
                if (updated) {
                    const newTracks = tracks.map(t => t.id === editingTrack.id ? updated : t);
                    setTracks(newTracks);
                    saveTracksToDB(newTracks);
                }
                setEditingTrack(null);
            }} 
            addToast={addToast} 
          />
      );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-900 text-white font-sans">
      <div className="flex-grow flex overflow-hidden relative">
        {/* Sidebar */}
        {isSidebarOpen && (
            <div className="w-80 flex-shrink-0 border-r border-slate-800 z-20 bg-slate-900 absolute md:relative h-full">
                <Sidebar 
                    tracks={tracks}
                    visibleTrackIds={visibleTrackIds}
                    focusedTrackId={focusedTrackId}
                    onFocusTrack={setFocusedTrackId}
                    raceSelectionIds={raceSelectionIds}
                    onToggleRaceSelection={(id) => {
                        const newSet = new Set(raceSelectionIds);
                        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                        setRaceSelectionIds(newSet);
                    }}
                    onDeselectAll={() => setRaceSelectionIds(new Set())}
                    onSelectAll={() => setRaceSelectionIds(new Set(tracks.map(t => t.id)))}
                    onStartRace={() => setRaceSetupOpen(true)}
                    onViewDetails={(id) => setViewingTrack(tracks.find(t => t.id === id) || null)}
                    onEditTrack={(id) => setEditingTrack(tracks.find(t => t.id === id) || null)}
                    onDeleteTrack={async (id) => {
                        const newTracks = tracks.filter(t => t.id !== id);
                        setTracks(newTracks);
                        await saveTracksToDB(newTracks);
                    }}
                    onFileUpload={() => { /* Implement file upload logic */ }}
                    onDeleteSelected={async () => {
                        const newTracks = tracks.filter(t => !raceSelectionIds.has(t.id));
                        setTracks(newTracks);
                        await saveTracksToDB(newTracks);
                        setRaceSelectionIds(new Set());
                    }}
                    onToggleArchived={(id) => handleUpdateTrackMetadata(id, { isArchived: !tracks.find(t => t.id === id)?.isArchived })}
                    onBulkArchive={() => {
                        const newTracks = tracks.map(t => raceSelectionIds.has(t.id) ? { ...t, isArchived: true } : t);
                        setTracks(newTracks);
                        saveTracksToDB(newTracks);
                        setRaceSelectionIds(new Set());
                    }}
                    onMergeSelected={() => { /* Implement merge logic */ }}
                    onToggleFavorite={(id) => handleUpdateTrackMetadata(id, { isFavorite: !tracks.find(t => t.id === id)?.isFavorite })}
                    onBulkGroup={(folder) => {
                        const newTracks = tracks.map(t => raceSelectionIds.has(t.id) ? { ...t, folder } : t);
                        setTracks(newTracks);
                        saveTracksToDB(newTracks);
                    }}
                />
            </div>
        )}

        {/* Map Area */}
        <div className="flex-grow relative h-full">
            <MapDisplay 
                tracks={tracks}
                visibleTrackIds={visibleTrackIds.size > 0 ? visibleTrackIds : new Set(tracks.map(t => t.id))}
                raceRunners={null}
                hoveredTrackId={focusedTrackId}
                runnerSpeeds={new Map()}
            />
            
            {/* Global Buttons */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
                <button onClick={() => setShowChatbot(true)} className="p-3 bg-purple-600 rounded-full shadow-lg text-white hover:bg-purple-500">
                    AI
                </button>
            </div>
        </div>
      </div>

      {/* Navigation Dock */}
      <NavigationDock 
        onOpenSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        onOpenExplorer={() => setShowExplorer(true)}
        onOpenDiary={() => setShowDiary(true)}
        onOpenPerformance={() => { /* Performance view */ }}
        onOpenGuide={() => setShowHelp(true)}
        onExportBackup={() => { /* Export logic */ }}
        onOpenHub={() => setShowHome(true)}
        onOpenSocial={() => setShowSocial(true)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenGlobalChat={() => setShowChatbot(true)}
        isSidebarOpen={isSidebarOpen}
        unreadCount={unreadCount}
        onlineCount={onlineCount}
      />

      {/* Modals */}
      {showHome && (
          <HomeModal 
            onClose={() => setShowHome(false)}
            onOpenDiary={() => { setShowHome(false); setShowDiary(true); }}
            onOpenExplorer={() => { setShowHome(false); setShowExplorer(true); }}
            onOpenHelp={() => setShowHelp(true)}
            onImportBackup={() => { /* Import logic */ }}
            onExportBackup={() => { /* Export logic */ }}
            onUploadTracks={() => { /* Upload logic */ }}
            trackCount={tracks.length}
            plannedWorkouts={plannedWorkouts}
            onOpenWorkout={(id) => { setShowHome(false); setShowDiary(true); setTargetWorkoutId(id); }}
            onOpenProfile={() => setShowProfile(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenChangelog={() => setShowChangelog(true)}
            onOpenSocial={() => setShowSocial(true)}
            onOpenStravaConfig={() => setShowStravaConfig(true)}
            userProfile={userProfile}
            isGuest={false} // logic needed
            onLogout={() => { /* logout logic */ }}
            onLogin={() => setShowLogin(true)}
          />
      )}

      {showDiary && (
        <div className="fixed inset-0 z-[9000] bg-slate-900 flex flex-col">
            <div className="flex-grow overflow-hidden">
                <DiaryView 
                    tracks={tracks} plannedWorkouts={plannedWorkouts} userProfile={userProfile} 
                    onClose={() => setShowDiary(false)} 
                    onSelectTrack={(id) => { setViewingTrack(tracks.find(t => t.id === id) || null); setShowDiary(false); }} 
                    onAddPlannedWorkout={handleAddPlannedWorkout} 
                    onUpdatePlannedWorkout={handleUpdatePlannedWorkout} 
                    onDeletePlannedWorkout={handleDeletePlannedWorkout}
                    onCheckAiAccess={onCheckAiAccess}
                    onStartWorkout={startLiveCoach} 
                    initialSelectedWorkoutId={targetWorkoutId}
                    onUpdateTrack={handleUpdateTrackMetadata} // Passed the update function
                />
            </div>
        </div>
      )}

      {showExplorer && <ExplorerView tracks={tracks} onClose={() => setShowExplorer(false)} onSelectTrack={(id) => { setViewingTrack(tracks.find(t => t.id === id) || null); setShowExplorer(false); }} />}
      {showChatbot && <Chatbot userProfile={userProfile} tracksToAnalyze={tracks} plannedWorkouts={plannedWorkouts} onAddPlannedWorkout={handleAddPlannedWorkout} onClose={() => setShowChatbot(false)} onCheckAiAccess={onCheckAiAccess} />}
      {showProfile && <UserProfileModal currentProfile={userProfile} onSave={async (p) => { setUserProfile(p); await saveProfileToDB(p); }} onClose={() => setShowProfile(false)} tracks={tracks} />}
      {showSettings && <SettingsModal userProfile={userProfile} onUpdateProfile={async (p) => { const np = { ...userProfile, ...p }; setUserProfile(np); await saveProfileToDB(np); }} onClose={() => setShowSettings(false)} />}
      {showInitialChoice && <InitialChoiceModal onStartNew={() => setShowInitialChoice(false)} onImportBackup={() => { /* import */ }} onClose={() => setShowInitialChoice(false)} />}
      {showHelp && <GuideModal onClose={() => setShowHelp(false)} />}
      {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
      {showStravaConfig && <StravaConfigModal onClose={() => setShowStravaConfig(false)} />}
      {showStravaSync && <StravaSyncModal onClose={() => setShowStravaSync(false)} onImportFinished={(newTracks) => { setTracks([...tracks, ...newTracks]); saveTracksToDB([...tracks, ...newTracks]); }} lastSyncDate={null} />}
      {showSocial && <SocialHub onClose={() => setShowSocial(false)} currentUserId={userProfile.id || 'guest'} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={() => { setShowLogin(false); /* reload data */ }} tracks={tracks} userProfile={userProfile} plannedWorkouts={plannedWorkouts} />}
      
      <ToastContainer toasts={toasts} setToasts={setToasts} />
    </div>
  );
};

export default App;
