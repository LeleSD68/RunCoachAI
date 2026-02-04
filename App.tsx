
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, RaceRunner, RaceGapSnapshot, LeaderStats, ApiUsage, Toast } from './types';
import MapDisplay from './components/MapDisplay';
import Sidebar from './components/Sidebar';
import NavigationDock from './components/NavigationDock';
import ResizablePanel from './components/ResizablePanel';
import RaceControls from './components/RaceControls';
import RaceGapChart from './components/RaceGapChart';
import TrackDetailView from './components/TrackDetailView';
import ExplorerView from './components/ExplorerView';
import DiaryView from './components/DiaryView';
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel';
import SettingsModal from './components/SettingsModal';
import GuideModal from './components/GuideModal';
import Changelog from './components/Changelog';
import InitialChoiceModal from './components/InitialChoiceModal';
import HomeModal from './components/HomeModal';
import AuthSelectionModal from './components/AuthSelectionModal';
import LoginModal from './components/LoginModal';
import SplashScreen from './components/SplashScreen';
import UserProfileModal from './components/UserProfileModal';
import TrackEditor from './components/TrackEditor';
import Chatbot from './components/Chatbot';
import SocialHub from './components/SocialHub';
import StravaConfigModal from './components/StravaConfigModal';
import StravaSyncModal from './components/StravaSyncModal';
import VeoAnimationModal from './components/VeoAnimationModal';
import InstallPromptModal from './components/InstallPromptModal';
import ToastContainer from './components/ToastContainer';
import ReminderNotification from './components/ReminderNotification';
import LiveCommentary from './components/LiveCommentary';
import RaceSetupModal from './components/RaceSetupModal';
import MergeConfirmationModal from './components/MergeConfirmationModal';

import { loadTracksFromDB, saveTracksToDB, loadProfileFromDB, saveProfileToDB, loadPlannedWorkoutsFromDB, savePlannedWorkoutsToDB, importAllData, exportAllData, deleteTrackFromCloud } from './services/dbService';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { markStravaTrackAsDeleted, groupTracks } from './services/trackUtils';
import { getApiUsage, addTokensToUsage, trackUsage } from './services/usageService';
import { getUnreadNotificationsCount } from './services/socialService';
import { getTrackPointAtDistance, mergeTracks } from './services/trackEditorUtils';

const App: React.FC = () => {
    // Application State
    const [tracks, setTracks] = useState<Track[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [viewStack, setViewStack] = useState<string[]>(['hub']);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const [viewingTrack, setViewingTrack] = useState<Track | null>(null);
    const [focusedTrackId, setFocusedTrackId] = useState<string | null>(null);
    const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
    const [mapVisibleIds, setMapVisibleIds] = useState<Set<string>>(new Set());
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [showGlobalChat, setShowGlobalChat] = useState(false);
    
    // Race Mode State
    const [isRacing, setIsRacing] = useState(false);
    const [raceState, setRaceState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
    const [raceTime, setRaceTime] = useState(0);
    const [raceSpeed, setRaceSpeed] = useState(10);
    const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
    const [raceHistory, setRaceHistory] = useState<RaceGapSnapshot[]>([]);
    const [raceGaps, setRaceGaps] = useState<Map<string, number | undefined>>(new Map());
    const [leadStats, setLeadStats] = useState<Record<string, LeaderStats>>({});
    
    // System State
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [layoutPrefs, setLayoutPrefs] = useState({ desktopSidebar: 320, mobileListRatio: 0.5 });
    const [fitBoundsCounter, setFitBoundsCounter] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);

    const addToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    };

    const handleResizeEnd = (size: number, ratio: number) => {
        if (isDesktop) setLayoutPrefs(p => ({ ...p, desktopSidebar: size }));
        else setLayoutPrefs(p => ({ ...p, mobileListRatio: ratio }));
    };

    const toggleView = (view: string) => {
        if (view === 'hub') setViewStack(['hub']);
        else setViewStack(prev => [...prev, view]);
    };

    const pushViewState = (view: string) => {
        setViewStack(prev => [...prev, view]);
    };

    const popViewState = () => {
        setViewStack(prev => prev.slice(0, -1));
    };

    const handleBulkArchive = async () => {
        const ids = Array.from(raceSelectionIds);
        const updated = tracks.map(t => ids.includes(t.id) ? { ...t, isArchived: !t.isArchived } : t);
        setTracks(updated);
        await saveTracksToDB(updated);
        setRaceSelectionIds(new Set());
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(raceSelectionIds);
        const updated = tracks.filter(t => !ids.includes(t.id));
        setTracks(updated);
        await saveTracksToDB(updated);
        setRaceSelectionIds(new Set());
    };

    const handleMergeSelectedTracks = async (deleteOriginals: boolean) => {
        const selected = tracks.filter(t => raceSelectionIds.has(t.id));
        if (selected.length < 2) return;
        const merged = mergeTracks(selected);
        let updated = [...tracks, merged];
        if (deleteOriginals) {
            updated = updated.filter(t => !raceSelectionIds.has(t.id));
        }
        setTracks(updated);
        await saveTracksToDB(updated);
        setRaceSelectionIds(new Set());
        addToast("Tracce unite con successo", "success");
    };

    const handleToggleFavorite = async (id: string) => {
        const updated = tracks.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t);
        setTracks(updated);
        await saveTracksToDB(updated);
    };

    const handleBulkGroup = async (folderName: string) => {
        const ids = Array.from(raceSelectionIds);
        const updated = tracks.map(t => ids.includes(t.id) ? { ...t, folder: folderName } : t);
        setTracks(updated);
        await saveTracksToDB(updated);
        setRaceSelectionIds(new Set());
    };

    const handleFileUpload = (files: File[] | null) => {
        if (files) console.log("Uploading", files);
    };

    const openRaceSetup = () => {
        setActiveModal('raceSetup');
    };

    const renderDock = (isMobile: boolean) => (
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
            onExportBackup={() => exportAllData()} 
            isSidebarOpen={isSidebarOpen}
            unreadCount={unreadMessages}
            onlineCount={onlineFriendsCount}
            onOpenGlobalChat={() => setShowGlobalChat(true)}
        />
    );

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        loadTracksFromDB().then(setTracks);
        loadProfileFromDB().then(p => p && setUserProfile(p));
        loadPlannedWorkoutsFromDB().then(setPlannedWorkouts);
    }, []);

    useEffect(() => {
        if (raceState !== 'idle' && raceRunners) {
            setMapVisibleIds(new Set(raceRunners.map(r => r.trackId)));
        } else if (viewingTrack) {
            setMapVisibleIds(new Set([viewingTrack.id]));
        } else {
            const visible = new Set(tracks.filter(t => !t.isArchived).map(t => t.id));
            setMapVisibleIds(visible);
        }
    }, [raceState, raceRunners, viewingTrack, tracks]);

    useEffect(() => {
        (window as any).gpxApp = {
            addTokens: addTokensToUsage,
            trackApiRequest: trackUsage,
            getUsage: getApiUsage
        };
    }, []);

    return (
        <div className="h-screen w-screen bg-slate-950 text-white overflow-hidden flex flex-col">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            
            {/* VIEW LAYER (Modals) */}
            {viewStack.includes('hub') && activeModal !== 'initial' && (
                <HomeModal 
                    onClose={() => setViewStack(viewStack.filter(v => v !== 'hub'))}
                    onOpenDiary={() => toggleView('diary')}
                    onOpenExplorer={() => toggleView('explorer')}
                    onOpenHelp={() => toggleView('guide')}
                    onImportBackup={() => {}}
                    onExportBackup={() => {}}
                    onUploadTracks={handleFileUpload}
                    onOpenList={() => setIsSidebarOpen(true)}
                    trackCount={tracks.length}
                    plannedWorkouts={plannedWorkouts}
                    onOpenProfile={() => toggleView('profile')}
                    onOpenSettings={() => setActiveModal('settings')}
                    onOpenSocial={() => toggleView('social')}
                    userProfile={userProfile}
                    isGuest={true}
                />
            )}
            {viewStack.includes('explorer') && (
                <ExplorerView 
                    tracks={tracks} 
                    onClose={popViewState} 
                    onSelectTrack={(id) => { setViewingTrack(tracks.find(t=>t.id===id)||null); pushViewState('trackDetail'); }} 
                />
            )}
            {viewStack.includes('diary') && (
                <DiaryView 
                    tracks={tracks} 
                    plannedWorkouts={plannedWorkouts} 
                    userProfile={userProfile} 
                    onClose={popViewState} 
                    onSelectTrack={(id) => { setViewingTrack(tracks.find(t=>t.id===id)||null); pushViewState('trackDetail'); }} 
                />
            )}
            {viewStack.includes('performance') && (
                <PerformanceAnalysisPanel 
                    tracks={tracks} 
                    userProfile={userProfile} 
                    onClose={popViewState} 
                />
            )}
            {viewStack.includes('social') && (
                <SocialHub 
                    onClose={popViewState} 
                    currentUserId={userProfile.id || 'guest'} 
                />
            )}
            {viewStack.includes('profile') && (
                <UserProfileModal 
                    onClose={popViewState} 
                    onSave={(p) => { setUserProfile(p); saveProfileToDB(p); }} 
                    currentProfile={userProfile}
                    tracks={tracks}
                />
            )}
            {viewStack.includes('trackDetail') && viewingTrack && (
                <div className="fixed inset-0 z-[5000]">
                    <TrackDetailView 
                        track={viewingTrack} 
                        userProfile={userProfile} 
                        onExit={popViewState}
                        allHistory={tracks}
                    />
                </div>
            )}
            {viewStack.includes('guide') && (
                <GuideModal onClose={popViewState} />
            )}
            
            {activeModal === 'settings' && (
                <SettingsModal 
                    onClose={() => setActiveModal(null)} 
                    userProfile={userProfile} 
                    onUpdateProfile={(p) => { setUserProfile({...userProfile, ...p}); saveProfileToDB({...userProfile, ...p}); }} 
                />
            )}
            {activeModal === 'raceSetup' && (
                <RaceSetupModal 
                    tracks={tracks} 
                    initialSelection={raceSelectionIds} 
                    onSelectionChange={setRaceSelectionIds} 
                    onConfirm={() => { setIsRacing(true); setRaceState('running'); setActiveModal(null); }} 
                    onCancel={() => setActiveModal(null)} 
                />
            )}

            {showGlobalChat && (
                <div className="fixed inset-0 z-[6000]">
                    <Chatbot 
                        userProfile={userProfile} 
                        onClose={() => setShowGlobalChat(false)} 
                        tracksToAnalyze={tracks}
                    />
                </div>
            )}

            {/* MAIN LAYOUT */}
            {isRacing ? (
                <div className="w-full h-full flex flex-col bg-slate-900">
                    <div className="flex-grow relative bg-slate-900 overflow-hidden">
                        <MapDisplay 
                            tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                            isAnimationPlaying={raceState === 'running'} fitBoundsCounter={fitBoundsCounter}
                            runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                        />
                        <div className={`absolute left-1/2 -translate-x-1/2 z-[4600] ${isDesktop ? 'top-4' : 'top-14'}`}>
                            <RaceControls 
                                simulationState={raceState} simulationTime={raceTime} simulationSpeed={raceSpeed}
                                onPause={() => setRaceState('paused')} onResume={() => setRaceState('running')}
                                onStop={() => { setRaceState('idle'); setRaceRunners(null); setIsRacing(false); }}
                                onSpeedChange={setRaceSpeed}
                            />
                        </div>
                        <div className="absolute top-0 right-0 z-[2000] p-2">
                            <button 
                                onClick={() => { setRaceState('idle'); setRaceRunners(null); setIsRacing(false); }} 
                                className="bg-red-600/90 text-white px-3 py-1 rounded text-xs font-bold uppercase"
                            >
                                Esci
                            </button>
                        </div>
                    </div>

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
                (!isSidebarOpen) ? (
                    <div className="w-full h-full flex flex-col bg-slate-950 relative pb-16 md:pb-0">
                        <div className="flex-grow relative bg-slate-900">
                            <MapDisplay 
                                tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                                isAnimationPlaying={false} fitBoundsCounter={fitBoundsCounter}
                                runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                onToggleFullScreen={() => setIsSidebarOpen(true)} 
                                isFullScreen={true}
                            />
                        </div>
                        {/* Mobile Dock Overlay when Fullscreen */}
                        {!isDesktop && (
                            <div className="fixed bottom-0 left-0 right-0 z-[5000]">
                                {renderDock(true)}
                            </div>
                        )}
                    </div>
                ) : (
                    <ResizablePanel
                        direction={isDesktop ? 'vertical' : 'horizontal'}
                        initialSize={isDesktop ? layoutPrefs.desktopSidebar : undefined}
                        initialSizeRatio={isDesktop ? undefined : layoutPrefs.mobileListRatio}
                        minSize={250} 
                        onResizeEnd={handleResizeEnd}
                        className="w-full h-full"
                    >
                        {isDesktop ? (
                            <aside className="h-full bg-slate-900 border-r border-slate-800 flex flex-col w-full">
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
                                        onViewDetails={(id) => { setViewingTrack(tracks.find(t => t.id === id) || null); pushViewState('trackDetail'); }}
                                        onEditTrack={(id) => setEditingTrack(tracks.find(t => t.id === id) || null)}
                                        onDeleteTrack={async (id) => { 
                                            const track = tracks.find(t => t.id === id); if (track) markStravaTrackAsDeleted(track);
                                            const u = tracks.filter(t => t.id !== id); setTracks(u); await saveTracksToDB(u); await deleteTrackFromCloud(id); 
                                        }}
                                        onBulkArchive={handleBulkArchive} onDeleteSelected={handleBulkDelete} onMergeSelected={handleMergeSelectedTracks} onToggleFavorite={handleToggleFavorite} onBulkGroup={handleBulkGroup} onFileUpload={handleFileUpload} onToggleArchived={async (id) => { const u = tracks.map(t => t.id === id ? {...t, isArchived: !t.isArchived} : t); setTracks(u); await saveTracksToDB(u); }}
                                    />
                                </div>
                                <div className="bg-slate-950 shrink-0">
                                    {renderDock(false)}
                                </div>
                            </aside>
                        ) : (
                            <div className="flex-grow overflow-hidden bg-slate-900 border-b border-slate-800 w-full h-full relative pb-16 md:pb-0">
                                    <Sidebar 
                                    tracks={tracks.filter(t => !t.isExternal)} 
                                    visibleTrackIds={mapVisibleIds} focusedTrackId={focusedTrackId} raceSelectionIds={raceSelectionIds}
                                    onFocusTrack={setFocusedTrackId} onDeselectAll={() => setRaceSelectionIds(new Set())}
                                    onToggleRaceSelection={(id) => setRaceSelectionIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; })}
                                    onStartRace={openRaceSetup}
                                    onViewDetails={(id) => { setViewingTrack(tracks.find(t => t.id === id) || null); pushViewState('trackDetail'); }}
                                    onEditTrack={(id) => setEditingTrack(tracks.find(t => t.id === id) || null)}
                                    onBulkArchive={handleBulkArchive} onDeleteSelected={handleBulkDelete} onMergeSelected={handleMergeSelectedTracks} onToggleFavorite={handleToggleFavorite} onBulkGroup={handleBulkGroup} onFileUpload={handleFileUpload} onToggleArchived={async (id) => { const u = tracks.map(t => t.id === id ? {...t, isArchived: !t.isArchived} : t); setTracks(u); await saveTracksToDB(u); }} onDeleteTrack={() => {}} onSelectAll={() => {}}
                                    />
                            </div>
                        )}

                        <div className="h-full w-full relative bg-slate-950 flex flex-col overflow-hidden">
                            {isDesktop ? (
                                <>
                                    <MapDisplay 
                                        tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                                        isAnimationPlaying={false} fitBoundsCounter={fitBoundsCounter}
                                        runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                        onToggleFullScreen={() => setIsSidebarOpen(prev => !prev)}
                                        isFullScreen={!isSidebarOpen}
                                    />
                                </>
                            ) : (
                                <>
                                    <div className="flex-grow relative bg-slate-900 pb-16 md:pb-0">
                                        <MapDisplay 
                                            tracks={tracks} visibleTrackIds={mapVisibleIds} raceRunners={raceRunners}
                                            isAnimationPlaying={false} fitBoundsCounter={fitBoundsCounter}
                                            runnerSpeeds={new Map()} hoveredTrackId={hoveredTrackId}
                                            onToggleFullScreen={() => setIsSidebarOpen(false)} 
                                            isFullScreen={false} 
                                        />
                                    </div>
                                    {/* Mobile Dock Overlay when Sidebar Open (Split View) */}
                                    <div className="fixed bottom-0 left-0 right-0 z-[5000]">
                                        {renderDock(true)}
                                    </div>
                                </>
                            )}
                        </div>
                    </ResizablePanel>
                )
            )}
        </div>
    );
};

export default App;
