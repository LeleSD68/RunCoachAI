import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Track, PlannedWorkout, UserProfile, Toast, ApiUsage } from './types';
import { supabase } from './services/supabaseClient';
import { updatePresence, getFriends, getUnreadNotificationsCount, getRecentUnreadSender } from './services/socialService';
import { getApiUsage, trackUsage, addTokensToUsage } from './services/usageService';
import { loadTracksFromDB, loadPlannedWorkoutsFromDB, loadProfileFromDB, saveTracksToDB, saveProfileToDB, savePlannedWorkoutsToDB, syncTrackToCloud } from './services/dbService';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';

// Components
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import ExplorerView from './components/ExplorerView';
import DiaryView from './components/DiaryView';
import PerformanceAnalysisPanel from './components/PerformanceAnalysisPanel';
import SocialHub from './components/SocialHub';
import UserProfileModal from './components/UserProfileModal';
import SettingsModal from './components/SettingsModal';
import GuideModal from './components/GuideModal';
import Changelog from './components/Changelog';
import Chatbot from './components/Chatbot';
import ToastContainer from './components/ToastContainer';
import NavigationDock from './components/NavigationDock';
import SplashScreen from './components/SplashScreen';
import AuthSelectionModal from './components/AuthSelectionModal';
import LoginModal from './components/LoginModal';
import InstallPromptModal from './components/InstallPromptModal';
import TrackDetailView from './components/TrackDetailView';
import TrackEditor from './components/TrackEditor';
import HomeModal from './components/HomeModal';
import MobileTrackSummary from './components/MobileTrackSummary';

const INSTALL_PROMPT_DISMISSED_KEY = 'install_prompt_dismissed';
const LAYOUT_PREFS_KEY = 'layout_prefs';

const App: React.FC = () => {
    // --- STATE DEFINITIONS ---
    const [tracks, setTracks] = useState<Track[]>([]);
    const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({});
    const [userId, setUserId] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [usage, setUsage] = useState<ApiUsage>({ requests: 0, tokens: 0, lastReset: '' });
    
    // View States
    const [showHome, setShowHome] = useState(true); // Start with Hub/Home open
    const [showExplorer, setShowExplorer] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showGlobalChat, setShowGlobalChat] = useState(false);
    
    const [viewingTrack, setViewingTrack] = useState<string | null>(null);
    const [editingTrack, setEditingTrack] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const [fitBoundsCounter, setFitBoundsCounter] = useState(0);
    const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);
    const [socialInitialUser, setSocialInitialUser] = useState<string | null>(null);
    
    // PWA & Platform
    const [isIOS, setIsIOS] = useState(false);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    const friendsIdRef = useRef<Set<string>>(new Set());

    // --- SESSION & DATA LOADING ---
    const checkSession = useCallback(async () => {
        // Simple loading logic
        const { data } = await supabase.auth.getSession();
        setUserId(data.session?.user.id || 'guest');
        
        const [loadedTracks, loadedProfile, loadedWorkouts] = await Promise.all([
            loadTracksFromDB(),
            loadProfileFromDB(),
            loadPlannedWorkoutsFromDB()
        ]);
        
        if(loadedTracks) setTracks(loadedTracks);
        if(loadedProfile) setUserProfile(loadedProfile);
        if(loadedWorkouts) setPlannedWorkouts(loadedWorkouts);
    }, []);

    // --- HELPER FUNCTIONS FOR ACTIONS ---
    const handleToggleRaceSelection = (id: string) => {
        setRaceSelectionIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        setRaceSelectionIds(new Set(tracks.map(t => t.id)));
    };

    const handleDeselectAll = () => {
        setRaceSelectionIds(new Set());
    };

    const handleFocusTrack = (id: string) => {
        // Just focus map logic if needed, or select
        setFitBoundsCounter(c => c + 1);
    };

    const handleViewDetails = (id: string) => setViewingTrack(id);
    const handleEditTrack = (id: string) => setEditingTrack(id);
    
    const handleDeleteTrack = async (id: string) => {
        const newTracks = tracks.filter(t => t.id !== id);
        setTracks(newTracks);
        await saveTracksToDB(newTracks);
    };

    const handleDeleteSelected = async () => {
        const newTracks = tracks.filter(t => !raceSelectionIds.has(t.id));
        setTracks(newTracks);
        setRaceSelectionIds(new Set());
        await saveTracksToDB(newTracks);
    };

    const handleToggleArchived = async (id: string) => {
        const newTracks = tracks.map(t => t.id === id ? { ...t, isArchived: !t.isArchived } : t);
        setTracks(newTracks);
        await saveTracksToDB(newTracks);
    };

    const handleBulkArchive = async () => {
        const newTracks = tracks.map(t => raceSelectionIds.has(t.id) ? { ...t, isArchived: true } : t);
        setTracks(newTracks);
        setRaceSelectionIds(new Set());
        await saveTracksToDB(newTracks);
    };

    const handleMergeSelected = (deleteOriginals: boolean) => {
        // Implementation of merge logic would call service
        // For now placeholder to satisfy Sidebar props
        alert("Merge functionality logic here");
    };

    const handleToggleFavorite = async (id: string) => {
        const newTracks = tracks.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t);
        setTracks(newTracks);
        await saveTracksToDB(newTracks);
    };

    const handleBulkGroup = async (folderName: string) => {
        const newTracks = tracks.map(t => raceSelectionIds.has(t.id) ? { ...t, folder: folderName } : t);
        setTracks(newTracks);
        setRaceSelectionIds(new Set());
        await saveTracksToDB(newTracks);
    };

    const handleFileUpload = async (files: File[] | null) => {
        if(!files) return;
        const newTracks: Track[] = [];
        for(const file of files) {
            const text = await file.text();
            let trackData = null;
            if(file.name.endsWith('.gpx')) trackData = parseGpx(text, file.name);
            else if(file.name.endsWith('.tcx')) trackData = parseTcx(text, file.name);
            
            if(trackData) {
                const track: Track = {
                    id: crypto.randomUUID(),
                    ...trackData,
                    color: '#3b82f6', // Default blue
                    isExternal: false
                };
                newTracks.push(track);
            }
        }
        if(newTracks.length > 0) {
            const updatedTracks = [...tracks, ...newTracks];
            setTracks(updatedTracks);
            await saveTracksToDB(updatedTracks);
            addToast(`Caricate ${newTracks.length} attività`, 'success');
        }
    };

    const handleSmartSocialOpen = async () => {
        // If guest or no user, just open social hub
        if (!userId || userId === 'guest') {
            setShowSocial(true);
            return;
        }

        // If we have unread messages, we try to be smart
        // Case 1: Is it a message from a specific person?
        const singleSenderId = await getRecentUnreadSender(userId);
        
        if (singleSenderId) {
            setSocialInitialUser(singleSenderId);
            setShowSocial(true);
        } else {
            // Case 2: Multiple senders OR General notification (like friend request) -> Go to Hub
            setSocialInitialUser(null);
            setShowSocial(true);
        }
    };

    const [layoutPrefs, setLayoutPrefs] = useState<{ desktopSidebar: number, mobileListRatio: number }>({ desktopSidebar: 320, mobileListRatio: 0.7 });

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
                case 'social': handleSmartSocialOpen(); break; // Use smart opener for social
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

    const addToast = (message: string, type: Toast['type']) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    // Derived values for UI
    const selectedTrackForSummary = useMemo(() => {
        // If sidebar is closed and no modal is open, and we selected a track via map tap or race selection?
        // For mobile summary card logic.
        if (raceSelectionIds.size === 1 && !isSidebarOpen && !viewingTrack) {
            return tracks.find(t => t.id === Array.from(raceSelectionIds)[0]);
        }
        return null;
    }, [raceSelectionIds, isSidebarOpen, viewingTrack, tracks]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-white font-sans relative">
            {/* Main Application Layout */}
            <div className="flex flex-col flex-grow h-full relative overflow-hidden">
                <div className="flex-grow relative overflow-hidden">
                    <MapDisplay
                        tracks={tracks}
                        visibleTrackIds={mapVisibleIds}
                        selectedTrackIds={raceSelectionIds}
                        raceRunners={null} 
                        hoveredTrackId={null} 
                        runnerSpeeds={new Map()}
                        onTrackClick={(id) => {
                            setRaceSelectionIds(new Set([id]));
                            if(!isDesktop) setIsSidebarOpen(false); // Mobile: show summary card
                        }}
                    />
                    
                    {/* Mobile Summary Card */}
                    {selectedTrackForSummary && !isDesktop && (
                        <MobileTrackSummary 
                            track={selectedTrackForSummary} 
                            onClick={() => setViewingTrack(selectedTrackForSummary.id)} 
                            onClose={() => setRaceSelectionIds(new Set())}
                        />
                    )}
                </div>

                {/* Navigation Dock (Mobile Bottom / Desktop Bottom) */}
                <NavigationDock
                    onOpenSidebar={() => { setIsSidebarOpen(true); pushViewState('sidebar'); }}
                    onCloseSidebar={() => setIsSidebarOpen(false)}
                    onOpenExplorer={() => toggleView('explorer')}
                    onOpenDiary={() => toggleView('diary')}
                    onOpenPerformance={() => toggleView('performance')}
                    onOpenHub={() => toggleView('hub')}
                    onOpenSocial={handleSmartSocialOpen} // Use smart opener
                    onOpenProfile={() => toggleView('profile')}
                    onOpenGuide={() => toggleView('guide')}
                    onExportBackup={() => {}} // Handle in hub
                    isSidebarOpen={isSidebarOpen}
                    unreadCount={unreadMessages}
                    onlineCount={onlineFriendsCount}
                    onOpenGlobalChat={() => setShowGlobalChat(true)}
                />
            </div>

            {/* Sidebar (Desktop) or Drawer (Mobile) */}
            {isSidebarOpen && (
                <div className={`absolute top-0 left-0 h-full bg-slate-900 z-30 transition-transform duration-300 ${isDesktop ? 'w-80 border-r border-slate-800' : 'w-full'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <Sidebar 
                        tracks={tracks}
                        visibleTrackIds={mapVisibleIds}
                        focusedTrackId={null}
                        onFocusTrack={handleFocusTrack}
                        raceSelectionIds={raceSelectionIds}
                        onToggleRaceSelection={handleToggleRaceSelection}
                        onDeselectAll={handleDeselectAll}
                        onSelectAll={handleSelectAll}
                        onStartRace={() => {/* Logic handled via RaceSetupModal usually */}}
                        onViewDetails={handleViewDetails}
                        onEditTrack={handleEditTrack}
                        onDeleteTrack={handleDeleteTrack}
                        onFileUpload={handleFileUpload}
                        onDeleteSelected={handleDeleteSelected}
                        onToggleArchived={handleToggleArchived}
                        onBulkArchive={handleBulkArchive}
                        onMergeSelected={handleMergeSelected}
                        onToggleFavorite={handleToggleFavorite}
                        onBulkGroup={handleBulkGroup}
                    />
                </div>
            )}

            {/* MODALS & VIEWS */}
            {showHome && (
                <HomeModal
                    onClose={() => setShowHome(false)}
                    onOpenDiary={() => toggleView('diary')}
                    onOpenExplorer={() => toggleView('explorer')}
                    onOpenHelp={() => setShowGuide(true)}
                    onImportBackup={() => {/* Logic */}}
                    onExportBackup={() => {/* Logic */}}
                    onUploadTracks={handleFileUpload}
                    onOpenList={handleOpenListFromHome}
                    trackCount={tracks.length}
                    plannedWorkouts={plannedWorkouts}
                    onOpenProfile={() => setShowProfile(true)}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenChangelog={() => setShowChangelog(true)}
                    onOpenSocial={handleSmartSocialOpen} // Use smart opener
                    isGuest={userId === 'guest'}
                    onLogout={() => setUserId(null)}
                    onLogin={() => setUserId('guest')} // Trigger auth modal logic usually
                    userProfile={userProfile}
                    unreadCount={unreadMessages}
                    onlineCount={onlineFriendsCount}
                />
            )}

            {showExplorer && <ExplorerView tracks={tracks} onClose={() => window.history.back()} onSelectTrack={handleViewDetails} />}
            {showDiary && (
                <DiaryView 
                    tracks={tracks} 
                    plannedWorkouts={plannedWorkouts} 
                    userProfile={userProfile} 
                    onClose={() => window.history.back()} 
                    onSelectTrack={handleViewDetails}
                    onAddPlannedWorkout={(w) => { setPlannedWorkouts(prev => [...prev, w]); savePlannedWorkoutsToDB([...plannedWorkouts, w]); }}
                    onUpdatePlannedWorkout={(w) => { /* Update logic */ }}
                    onDeletePlannedWorkout={(id) => { /* Delete logic */ }}
                />
            )}
            {showPerformance && <PerformanceAnalysisPanel tracks={tracks} userProfile={userProfile} onClose={() => window.history.back()} />}
            {showSocial && (
                <SocialHub 
                    onClose={() => window.history.back()} 
                    currentUserId={userId || 'guest'}
                    onReadMessages={fetchUnreadCount}
                    initialChatUserId={socialInitialUser} // Pass prop
                />
            )}
            
            {showProfile && (
                <UserProfileModal 
                    currentProfile={userProfile} 
                    onClose={() => setShowProfile(false)} 
                    onSave={(p) => { setUserProfile(p); saveProfileToDB(p); }} 
                    tracks={tracks}
                />
            )}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} userProfile={userProfile} onUpdateProfile={(p) => setUserProfile({...userProfile, ...p})} />}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
            
            {/* Track Detail / Editor */}
            {viewingTrack && (
                <div className="fixed inset-0 z-50 bg-slate-900">
                    <TrackDetailView 
                        track={tracks.find(t => t.id === viewingTrack)!} 
                        userProfile={userProfile} 
                        onExit={() => setViewingTrack(null)}
                        plannedWorkouts={plannedWorkouts}
                        onUpdateTrackMetadata={(id, meta) => {
                            const newTracks = tracks.map(t => t.id === id ? { ...t, ...meta } : t);
                            setTracks(newTracks);
                            saveTracksToDB(newTracks);
                        }}
                    />
                </div>
            )}
            {editingTrack && (
                <div className="fixed inset-0 z-50 bg-slate-900">
                    <TrackEditor 
                        initialTracks={[tracks.find(t => t.id === editingTrack)!]}
                        onExit={(updated) => {
                            if(updated) {
                                const newTracks = tracks.map(t => t.id === editingTrack ? updated : t);
                                setTracks(newTracks);
                                saveTracksToDB(newTracks);
                            }
                            setEditingTrack(null);
                        }}
                        addToast={addToast}
                    />
                </div>
            )}

            {/* Global Overlays */}
            {showGlobalChat && (
                <Chatbot 
                    userProfile={userProfile} 
                    onClose={() => setShowGlobalChat(false)} 
                    tracksToAnalyze={tracks}
                    plannedWorkouts={plannedWorkouts}
                    onAddPlannedWorkout={(w) => { setPlannedWorkouts(prev => [...prev, w]); savePlannedWorkoutsToDB([...plannedWorkouts, w]); }}
                />
            )}
            
            {showInstallPrompt && (
                <InstallPromptModal 
                    onInstall={handlePwaInstall} 
                    onIgnore={handlePwaIgnore} 
                    isIOS={isIOS} 
                />
            )}

            <ToastContainer toasts={toasts} setToasts={setToasts} />
        </div>
    );
};

export default App;
