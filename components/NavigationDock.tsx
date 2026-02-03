
import React from 'react';
import Tooltip from './Tooltip';

interface NavigationDockProps {
    onOpenSidebar: () => void;
    onCloseSidebar: () => void; 
    onOpenExplorer: () => void;
    onOpenDiary: () => void;
    onOpenPerformance: () => void;
    onOpenGuide: () => void;
    onExportBackup: () => void;
    onOpenHub: () => void;
    onOpenSocial: () => void;
    onOpenProfile: () => void;
    onOpenGlobalChat?: () => void; // New prop for AI Coach
    isSidebarOpen: boolean; 
    onlineCount?: number;
    unreadCount?: number;
}

const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
    </svg>
);

const DiaryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" />
        <path d="M4.75 5.5a1.25 1.25 0 0 0-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H4.75Z" />
    </svg>
);

const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" />
    </svg>
);

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
    </svg>
);

const ListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 15.25ZM2 10a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
);

const MapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 1 1.186-.672h1.314a1.5 1.5 0 0 1 1.186.672l2.36 3.54A1.5 1.5 0 0 1 13.888 7.5H12.5V14a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 7.5 14V7.5H6.112a1.5 1.5 0 0 1-1.315-1.784l2.36-3.54Z" clipRule="evenodd" />
        <path d="M15.5 8.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-.75.75h-8a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-1.5 0v4.5A2.25 2.25 0 0 0 6 16h8a2.25 2.25 0 0 0 2.25-2.25v-4.5a.75.75 0 0 0-.75-.75Z" />
    </svg>
);

const UserGroupIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" />
    </svg>
);

const NavigationDock: React.FC<NavigationDockProps> = ({ 
    onOpenSidebar, onCloseSidebar, onOpenExplorer, onOpenDiary, onOpenPerformance, onOpenHub, isSidebarOpen, onOpenSocial, onOpenProfile, onOpenGlobalChat, onlineCount = 0, unreadCount = 0
}) => {
    return (
        <div className="w-full bg-slate-900 border-t border-slate-800">
            <div className="flex justify-around items-center w-full py-2 px-1">
                <Tooltip text="Home" subtext="Menu" position="top">
                    <button 
                        onClick={onOpenHub} 
                        className="p-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all active:scale-95"
                    >
                        <HomeIcon />
                    </button>
                </Tooltip>

                <Tooltip text="Attività" subtext="Lista" position="top">
                    <button 
                        onClick={onOpenSidebar} 
                        className={`p-3 rounded-lg hover:bg-slate-800 transition-all active:scale-95 ${isSidebarOpen ? 'text-white bg-slate-800 ring-1 ring-white/10' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ListIcon />
                    </button>
                </Tooltip>

                <Tooltip text="Mappa" subtext="Visualizza" position="top">
                    <button 
                        onClick={onCloseSidebar} 
                        className={`p-3 rounded-lg hover:bg-slate-800 transition-all active:scale-95 ${!isSidebarOpen ? 'text-white bg-slate-800 ring-1 ring-white/10' : 'text-slate-400 hover:text-white'}`}
                    >
                        <MapIcon />
                    </button>
                </Tooltip>

                <div className="w-px h-6 bg-slate-800 mx-1"></div>

                <Tooltip text="Diario" subtext="Calendario" position="top">
                    <button onClick={onOpenDiary} className="p-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-purple-400 transition-all active:scale-95">
                        <DiaryIcon />
                    </button>
                </Tooltip>
                
                <Tooltip text="Performance" subtext="Analisi Dati" position="top">
                    <button onClick={onOpenPerformance} className="p-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-green-400 transition-all active:scale-95">
                        <ChartIcon />
                    </button>
                </Tooltip>

                <Tooltip text="Social" subtext="Crew" position="top">
                    <button onClick={onOpenSocial} className="p-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-pink-400 transition-all active:scale-95 relative group">
                        <UserGroupIcon />
                        
                        {/* 1. Unread Messages Badge (Highest Priority) */}
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-slate-900 animate-pulse shadow-md z-20">
                                {unreadCount > 9 ? '!' : unreadCount}
                            </span>
                        )}

                        {/* 2. Online Friends Badge (If no messages) */}
                        {onlineCount > 0 && unreadCount === 0 && (
                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-md z-20">
                                {onlineCount}
                            </span>
                        )}

                        {/* 3. Secondary Online Indicator (If messages exist, show small dot) */}
                        {onlineCount > 0 && unreadCount > 0 && (
                            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900 z-10"></span>
                        )}
                    </button>
                </Tooltip>
                
                <Tooltip text="Esplora" subtext="Tabella" position="top">
                    <button onClick={onOpenExplorer} className="p-3 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-all active:scale-95">
                        <GridIcon />
                    </button>
                </Tooltip>

                {/* AI COACH BUTTON - Highlighted & Rightmost */}
                {onOpenGlobalChat && (
                    <>
                        <div className="w-px h-6 bg-slate-700 mx-1"></div>
                        <Tooltip text="Coach AI" subtext="Chatbot" position="top">
                            <button 
                                onClick={onOpenGlobalChat} 
                                className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 p-0.5 shadow-lg shadow-purple-900/40 hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95 group"
                            >
                                <div className="absolute inset-0 bg-white/20 rounded-xl animate-pulse"></div>
                                <div className="w-full h-full rounded-[10px] overflow-hidden relative z-10 bg-slate-900 flex items-center justify-center">
                                    <img src="/icona.png" alt="AI" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </button>
                        </Tooltip>
                    </>
                )}
            </div>
        </div>
    );
};

export default NavigationDock;
