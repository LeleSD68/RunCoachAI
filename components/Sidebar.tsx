
import React, { useState, useRef, useMemo } from 'react';
import { Track, UserProfile, PlannedWorkout, ApiUsageStats } from '../types';
import Tooltip from './Tooltip';
import RatingStars from './RatingStars';
import TrackPreview from './TrackPreview';

// Icons
const HomeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" /></svg>);
const GridIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" /></svg>);
const DiaryIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" /><path d="M4.75 5.5a1.25 1.25 0 0 0-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H4.75Z" /></svg>);
const ChartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v8a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 2h-1ZM9.5 6A1.5 1.5 0 0 0 8 7.5v4a1.5 1.5 0 0 0 1.5 1.5h1a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 10.5 6h-1ZM3.5 10A1.5 1.5 0 0 0 2 11.5v0A1.5 1.5 0 0 0 3.5 13h1a1.5 1.5 0 0 0 1.5-1.5v0A1.5 1.5 0 0 0 4.5 10h-1Z" /></svg>);
const UserGroupIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.38.106-.772.106-1.175 0-.537-.067-1.054-.191-1.543A7.001 7.001 0 0 1 17 18a9.952 9.952 0 0 1-2.5-2Z" /></svg>);
const UploadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414Z" clipRule="evenodd" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.1499.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149-.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>);
const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" /></svg>);
const EyeSlashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.59 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" /><path d="M10.748 13.93 5.39 8.57a10.015 10.015 0 0 0-3.39 1.42 1.651 1.651 0 0 0 0 1.186A10.004 10.004 0 0 0 9.999 17c1.9 0 3.682-.534 5.194-1.465l-2.637-2.637a3.987 3.987 0 0 1-1.808.032Z" /></svg>);
const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" /></svg>);
const CompareIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" /></svg>);
const ListBulletIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>);
const RectangleStackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.127 3.502c.2.019.4.038.598.058l.175.018a47.092 47.092 0 0 0 3.237.24c.718.036 1.439.057 2.163.064l.95.006c.65 0 1.302-.005 1.954-.015.65-.01 1.304-.025 1.957-.045.312-.01.625-.02.937-.033a1.5 1.5 0 0 1 1.55 1.433l.034.338c.026.26.046.52.062.782.03.52.046 1.04.046 1.562 0 .56-.018 1.119-.054 1.677l-.027.424a1.5 1.5 0 0 1-1.536 1.402l-1.356.027a47.457 47.457 0 0 1-3.264.025 47.472 47.472 0 0 1-3.265-.025l-1.356-.027a1.5 1.5 0 0 1-1.536-1.402l-.027-.424a47.382 47.382 0 0 1-.054-1.677c0-.522.016-1.042.046-1.562l.062-.782a1.5 1.5 0 0 1 1.535-1.393ZM2.872 7.72l.061.782a48.887 48.887 0 0 0 .047 1.562c.036.558.054 1.117.054 1.677 0 .522-.016 1.042-.046 1.562l-.062.782a1.5 1.5 0 0 1-1.535 1.393L1.216 15.46a47.094 47.094 0 0 1-3.237-.24 47.462 47.462 0 0 1-3.265-.417l-.175-.027a1.5 1.5 0 0 1-1.324-1.63l.027-.424c.036-.558.054-1.117.054-1.677 0-.522-.016 1.042-.046-1.562l-.062-.782a1.5 1.5 0 0 1 1.324-1.63l.175-.027a47.383 47.383 0 0 1 3.265-.417 47.09 47.09 0 0 1 3.237-.24l.175-.018a1.5 1.5 0 0 1 1.55 1.433Z" /></svg>);
const ArchiveBoxIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" /><path fillRule="evenodd" d="M13 9a1 1 0 1 0 0 2h-6a1 1 0 1 0 0-2h6ZM2.75 7A.75.75 0 0 0 2 7.75v8.5c0 .69.56 1.25 1.25 1.25h13.5c.69 0 1.25-.56 1.25-1.25v-8.5A.75.75 0 0 0 17.25 7H2.75Z" clipRule="evenodd" /></svg>);
const CheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>);
const XMarkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>);
const LogoutIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" /><path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" /></svg>);
const GlobeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-11-4.69v.447a3.5 3.5 0 0 0 1.025 2.475L8.293 10 8 10.293a1 1 0 0 0 0 1.414l1.06 1.06a1.5 1.5 0 0 1 .44 1.061v.363a6.5 6.5 0 0 1-5.5-2.259V10a6.5 6.5 0 0 1 12.5 0Z" clipRule="evenodd" /><path fillRule="evenodd" d="M9 2.5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM5.5 5a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM14.5 13a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1ZM12.5 16a.5.5 0 0 1 .5-.5 1 1 0 0 1 1 1 .5.5 0 0 1-.5.5h-1Z" clipRule="evenodd" /></svg>);
const LockClosedIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>);
const ChevronRightIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" /></svg>);
const ChevronDownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" /></svg>);
const ExpandAllIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clipRule="evenodd" /></svg>);
const CollapseAllIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M13.28 5.22a.75.75 0 0 0-1.06 0l-7.22 7.22v-5.69a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 .75.75h7.5a.75.75 0 0 0 0-1.5h-5.69l7.22-7.22a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" /></svg>);
const MergeTracksIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3.75 3a.75.75 0 0 0-1.5 0v4a6.5 6.5 0 0 0 6.5 6.5h4.19l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.75A5 5 0 0 1 3.75 7V3Z" clipRule="evenodd" />
    </svg>
);
const StravaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-[#fc4c02]">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0 4.177 12.173h4.172" />
    </svg>
);

interface SidebarProps {
    tracks: Track[];
    onFileUpload: (files: File[] | null) => void;
    visibleTrackIds: Set<string>;
    onToggleVisibility: (id: string) => void;
    raceSelectionIds: Set<string>;
    onToggleRaceSelection: (id: string) => void;
    onDeselectAll: () => void;
    onSelectAll: () => void;
    onStartRace: () => void;
    onGoToEditor: () => void;
    onPauseRace: () => void;
    onResumeRace: () => void;
    onResetRace: () => void;
    simulationState: 'idle' | 'running' | 'paused' | 'finished';
    simulationTime: number;
    onTrackHoverStart: (id: string) => void;
    onTrackHoverEnd: () => void;
    hoveredTrackId: string | null;
    raceProgress: Map<string, number>;
    simulationSpeed: number;
    onSpeedChange: (speed: number) => void;
    lapTimes: Map<string, number[]>;
    sortOrder: string;
    onSortChange: (order: string) => void;
    onDeleteTrack: (id: string) => void;
    onDeleteSelected: () => void;
    onViewDetails: (id: string) => void;
    onStartAnimation: (id: string) => void;
    raceRanks: Map<string, number>;
    runnerSpeeds: Map<string, number>;
    runnerDistances: Map<string, number>;
    runnerGapsToLeader: Map<string, number>;
    collapsedGroups: Set<string>;
    onToggleGroup: (group: string) => void;
    onOpenChangelog: () => void;
    onOpenProfile: () => void;
    onOpenGuide: () => void;
    onOpenDiary: () => void;
    dailyTokenUsage: { used: number; limit: number };
    onExportBackup: () => void;
    onImportBackup: (file: File) => void;
    onCloseMobile: () => void;
    onUpdateTrackMetadata: (id: string, meta: Partial<Track>) => void;
    onRegenerateTitles: () => void;
    onToggleExplorer: () => void;
    showExplorer: boolean;
    listViewMode: string;
    onListViewModeChange: (mode: string) => void;
    onAiBulkRate: () => void;
    onOpenReview: (id: string) => void;
    mobileRaceMode: boolean;
    monthlyStats: any;
    plannedWorkouts: PlannedWorkout[];
    onOpenPlannedWorkout: (id: string) => void;
    apiUsageStats: ApiUsageStats;
    onOpenHub: () => void;
    onOpenPerformanceAnalysis: () => void;
    onUserLogin: () => void;
    onUserLogout?: () => void; 
    onCompareSelected: () => void;
    userProfile: UserProfile;
    onOpenSocial: () => void;
    onToggleArchived: (id: string) => void; 
    isGuest?: boolean;
    onlineCount?: number;
    unreadCount?: number;
    onTogglePrivacySelected?: (makePublic: boolean) => void;
    onMergeSelected?: () => void; // New prop for merging
}

type SortOption = 'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc' | 'time_desc' | 'time_asc';

const Sidebar: React.FC<SidebarProps> = (props) => {
    const { 
        tracks, onFileUpload, visibleTrackIds, onToggleVisibility, 
        raceSelectionIds, onToggleRaceSelection, onSelectAll, onDeselectAll, 
        onStartRace, onGoToEditor, onDeleteTrack, onDeleteSelected, onViewDetails, 
        hoveredTrackId, onTrackHoverStart, onTrackHoverEnd, simulationState, 
        onOpenDiary, showExplorer, onToggleExplorer,
        onOpenHub, onOpenPerformanceAnalysis, onOpenSocial, onCompareSelected,
        onUpdateTrackMetadata, onToggleArchived, onTogglePrivacySelected, onMergeSelected,
        userProfile, onUserLogin, onUserLogout, isGuest, onlineCount = 0, unreadCount = 0
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [grouping, setGrouping] = useState<'date' | 'month' | 'folder' | 'type' | 'tag' | 'distance'>('month');
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const [showArchived, setShowArchived] = useState(false);
    
    // Grouping collapse state
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Inline Renaming State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileUpload(Array.from(e.target.files));
        }
    };

    const isSimulationInProgress = simulationState === 'running' || simulationState === 'paused' || simulationState === 'finished';

    const filteredTracks = useMemo(() => {
        return tracks.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            // Updated Logic:
            // If showArchived is TRUE -> Show ONLY archived tracks
            // If showArchived is FALSE -> Show ONLY non-archived tracks (default)
            // This ensures "Archived" tracks disappear from the main list immediately.
            const matchesArchive = showArchived ? t.isArchived : !t.isArchived;
            return matchesSearch && matchesArchive;
        });
    }, [tracks, searchTerm, showArchived]);

    const sortedTracks = useMemo(() => {
        return [...filteredTracks].sort((a, b) => {
            switch (sortOption) {
                case 'date_desc': return b.points[0].time.getTime() - a.points[0].time.getTime();
                case 'date_asc': return a.points[0].time.getTime() - b.points[0].time.getTime();
                case 'distance_desc': return b.distance - a.distance;
                case 'distance_asc': return a.distance - b.distance;
                case 'time_desc': return b.duration - a.duration;
                case 'time_asc': return a.duration - b.duration;
                default: return 0;
            }
        });
    }, [filteredTracks, sortOption]);

    const groupedTracks = useMemo(() => {
        const groups: Record<string, Track[]> = {};
        // Use sortedTracks instead of filteredTracks to maintain order within groups
        sortedTracks.forEach(t => {
            let key = 'Other';
            if (grouping === 'month') {
                key = new Date(t.points[0].time).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
            } else if (grouping === 'type') {
                key = t.activityType || 'Run';
            } else if (grouping === 'folder') {
                key = t.folder || 'Uncategorized';
            } else if (grouping === 'tag') {
                // Group by first tag if available, else 'No Tags'
                key = (t.tags && t.tags.length > 0) ? `#${t.tags[0].toUpperCase()}` : 'Nessun Tag';
            } else if (grouping === 'distance') {
                const d = t.distance;
                if (d < 5) key = '< 5 km';
                else if (d < 10) key = '5 - 10 km';
                else if (d < 21.1) key = '10 - 21 km';
                else if (d < 42.2) key = '21 - 42 km';
                else key = '> 42 km (Ultra)';
            } else {
                key = 'All';
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });
        return groups;
    }, [sortedTracks, grouping]);

    // Renaming handlers
    const startRenaming = (track: Track) => {
        setEditingId(track.id);
        setEditName(track.name);
    };

    const saveRename = () => {
        if (editingId && editName.trim()) {
            onUpdateTrackMetadata(editingId, { name: editName.trim() });
        }
        setEditingId(null);
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveRename();
        if (e.key === 'Escape') cancelRename();
    };

    const handleEditClick = (trackId: string) => {
        onDeselectAll(); 
        onToggleRaceSelection(trackId); 
        setTimeout(() => onGoToEditor(), 50);
    };

    const handleToggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName);
            else next.add(groupName);
            return next;
        });
    };

    const handleExpandAll = () => {
        setCollapsedGroups(new Set());
    };

    const handleCollapseAll = () => {
        setCollapsedGroups(new Set(Object.keys(groupedTracks)));
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 shrink-0 flex items-center justify-between">
                <h2 className="text-lg font-bold text-cyan-400">{showArchived ? 'Archivio' : 'Attività'}</h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-xs text-white flex items-center gap-1 transition-colors"
                        title="Carica GPX/TCX"
                    >
                        <UploadIcon />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept=".gpx,.tcx" onChange={handleFileChange} />
                </div>
            </div>

            {/* Controls */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/50 space-y-3 shrink-0">
                <input 
                    type="text" 
                    placeholder="Cerca..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                />
                
                <div className="flex items-center gap-2">
                    <div className="grid grid-cols-2 gap-2 text-xs flex-grow">
                        <select 
                            value={grouping} 
                            onChange={(e) => setGrouping(e.target.value as any)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none w-full"
                        >
                            <option value="month">Raggruppa: Mese</option>
                            <option value="type">Raggruppa: Tipo</option>
                            <option value="folder">Raggruppa: Cartella</option>
                            <option value="tag">Raggruppa: Tag</option>
                            <option value="distance">Raggruppa: Distanza</option>
                        </select>
                        
                        <select 
                            value={sortOption} 
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none w-full"
                        >
                            <option value="date_desc">Data ↓</option>
                            <option value="date_asc">Data ↑</option>
                            <option value="distance_desc">Dist. ↓</option>
                            <option value="distance_asc">Dist. ↑</option>
                            <option value="time_desc">Tempo ↓</option>
                            <option value="time_asc">Tempo ↑</option>
                        </select>
                    </div>

                    {/* Grouping Toggle Buttons */}
                    <div className="flex gap-1 bg-slate-800 p-0.5 rounded border border-slate-700">
                         <button 
                            onClick={handleCollapseAll} 
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                            title="Comprimi Tutto"
                        >
                            <CollapseAllIcon />
                        </button>
                        <button 
                            onClick={handleExpandAll} 
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                            title="Espandi Tutto"
                        >
                            <ExpandAllIcon />
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}
                            className={`p-1.5 rounded border ${viewMode === 'list' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                            title="Cambia Vista (Elenco/Schede)"
                        >
                            {viewMode === 'cards' ? <RectangleStackIcon /> : <ListBulletIcon />}
                        </button>

                        <button 
                            onClick={() => setShowArchived(!showArchived)}
                            className={`p-1.5 rounded border ${showArchived ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                            title={showArchived ? "Torna alla lista principale" : "Mostra Archivio"}
                        >
                            <ArchiveBoxIcon />
                        </button>
                    </div>
                    
                    <div className="flex gap-2 text-[10px]">
                        <button onClick={onSelectAll} className="text-cyan-400 hover:text-cyan-300">Tutti</button>
                        <button onClick={onDeselectAll} className="text-slate-400 hover:text-slate-200">Nessuno</button>
                    </div>
                </div>

                {raceSelectionIds.size > 0 && (
                    <div className="flex flex-col gap-1 animate-fade-in">
                        <div className="flex gap-1">
                            <button onClick={onStartRace} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded">
                                Gara ({raceSelectionIds.size})
                            </button>
                            {raceSelectionIds.size >= 2 && onMergeSelected && (
                                <button onClick={onMergeSelected} className="bg-cyan-700 hover:bg-cyan-600 text-cyan-100 px-2 rounded flex items-center justify-center" title="Unisci Tracce">
                                    <MergeTracksIcon />
                                </button>
                            )}
                            <button onClick={onCompareSelected} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 rounded" title="Confronta">
                                <CompareIcon />
                            </button>
                            <button onClick={onDeleteSelected} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-2 rounded" title="Elimina selezionati">
                                <TrashIcon />
                            </button>
                        </div>
                        {/* Privacy Controls */}
                        {onTogglePrivacySelected && !isGuest && (
                            <div className="flex gap-1 mt-1">
                                <button 
                                    onClick={() => onTogglePrivacySelected(false)} 
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1"
                                    title="Nascondi agli amici"
                                >
                                    <LockClosedIcon /> Rendi Privato
                                </button>
                                <button 
                                    onClick={() => onTogglePrivacySelected(true)} 
                                    className="flex-1 bg-slate-700 hover:bg-green-700 text-slate-300 hover:text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1"
                                    title="Condividi nel feed"
                                >
                                    <GlobeIcon /> Rendi Pubblico
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
                {(Object.entries(groupedTracks) as [string, Track[]][]).map(([group, groupTracks]) => {
                     const isCollapsed = collapsedGroups.has(group);
                     
                     return (
                        <div key={group} className="transition-all duration-300">
                            <div 
                                className="sticky top-0 bg-slate-900 z-10 py-1.5 px-2 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 rounded transition-colors group"
                                onClick={() => handleToggleGroup(group)}
                            >
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300">{group}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-600 font-mono bg-slate-800 px-1.5 rounded border border-slate-700">{groupTracks.length}</span>
                                    <span className={`text-slate-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                                        <ChevronRightIcon />
                                    </span>
                                </div>
                            </div>
                            
                            {!isCollapsed && (
                                <div className={`space-y-1 mt-1 ${viewMode === 'list' ? 'space-y-0' : ''} animate-fade-in`}>
                                    {groupTracks.map(track => (
                                        <div 
                                            key={track.id} 
                                            className={`
                                                flex flex-col p-2 rounded hover:bg-slate-800 transition-colors group relative 
                                                ${hoveredTrackId === track.id ? 'bg-slate-800' : ''} 
                                                ${viewMode === 'list' ? 'border-b border-slate-800/50 py-2' : 'bg-slate-800/20 mb-2 border border-slate-700/30'}
                                            `}
                                            onMouseEnter={() => onTrackHoverStart(track.id)}
                                            onMouseLeave={onTrackHoverEnd}
                                        >
                                            <div className="flex items-center w-full">
                                                <div className="flex items-center h-full mr-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={raceSelectionIds.has(track.id)} 
                                                        onChange={() => onToggleRaceSelection(track.id)}
                                                        className="accent-cyan-500 cursor-pointer"
                                                    />
                                                </div>
                                                
                                                {viewMode === 'cards' && (
                                                    <div 
                                                        className="mr-3 w-16 h-12 bg-slate-900 rounded overflow-hidden relative cursor-pointer group-inner flex-shrink-0 border border-slate-700"
                                                        onClick={() => onViewDetails(track.id)}
                                                    >
                                                        <TrackPreview points={track.points} color={track.color} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        {track.id.startsWith('strava-') && (
                                                            <div className="absolute top-0.5 right-0.5 bg-black/60 rounded p-0.5">
                                                                <StravaIcon />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex-grow min-w-0">
                                                    {editingId === track.id ? (
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <input 
                                                                type="text" 
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                onKeyDown={handleRenameKeyDown}
                                                                className="w-full bg-slate-950 text-white text-xs border border-cyan-500 rounded px-1 py-0.5 outline-none"
                                                                autoFocus
                                                                onBlur={saveRename}
                                                            />
                                                            <button onClick={saveRename} className="text-green-400 hover:text-green-300"><CheckIcon /></button>
                                                            <button onClick={cancelRename} className="text-red-400 hover:text-red-300"><XMarkIcon /></button>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className="cursor-pointer"
                                                            onClick={() => onViewDetails(track.id)}
                                                            onDoubleClick={(e) => { e.stopPropagation(); startRenaming(track); }}
                                                            title="Doppio clic per rinominare"
                                                        >
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <span className={`text-sm font-medium text-white truncate ${viewMode === 'list' ? 'text-xs' : ''}`}>
                                                                    {track.name}
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    {/* Show Strava icon in List Mode too */}
                                                                    {(viewMode === 'list' && (track.id.startsWith('strava-') || (track.tags && track.tags.includes('Strava')))) && <StravaIcon />}
                                                                    {track.isPublic && <GlobeIcon />} 
                                                                    {track.rating && <RatingStars rating={track.rating} size="xs" />}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                                <span>{new Date(track.points[0].time).toLocaleDateString()}</span>
                                                                <span className="font-mono">{track.distance.toFixed(2)}km</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => onToggleArchived(track.id)} 
                                                        className={`p-1 rounded ${visibleTrackIds.has(track.id) ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
                                                        title={track.isArchived ? "Ripristina" : "Nascondi e Archivia"}
                                                    >
                                                        {track.isArchived ? <UploadIcon /> : (visibleTrackIds.has(track.id) ? <EyeIcon /> : <EyeSlashIcon />)}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEditClick(track.id)}
                                                        className="p-1 text-slate-500 hover:text-white"
                                                        title="Modifica"
                                                    >
                                                        <PencilIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredTracks.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-8">
                        {showArchived ? 'Nessuna attività in archivio.' : 'Nessuna attività trovata.'}
                    </div>
                )}
            </div>

            {/* User Status Bar - REDESIGNED */}
            <div className="bg-slate-900 border-t border-slate-800 p-3 shrink-0">
                <div className={`flex items-center justify-between rounded-xl p-3 border shadow-inner ${
                    isGuest 
                        ? 'bg-amber-900/10 border-amber-500/30' 
                        : 'bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/30'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 ${
                                isGuest ? 'bg-slate-700 border-amber-500/50' : 'bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-400/50'
                            }`}>
                                {userProfile.name ? userProfile.name.substring(0, 1).toUpperCase() : (isGuest ? '?' : 'O')}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                isGuest ? 'bg-amber-500' : 'bg-green-500 animate-pulse'
                            }`} title={isGuest ? "Ospite (Offline)" : "Connesso al Cloud"}></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white leading-tight truncate max-w-[120px]">
                                {userProfile.name || (isGuest ? 'Ospite' : 'Utente')}
                            </span>
                            <span className={`text-[9px] uppercase font-black tracking-wider leading-tight ${
                                isGuest ? 'text-amber-400' : 'text-cyan-400'
                            }`}>
                                {isGuest ? '⚠️ Salvataggio Locale' : '☁️ Cloud Attivo'}
                            </span>
                        </div>
                    </div>
                    
                    {isGuest ? (
                        <button 
                            onClick={onUserLogin}
                            className="text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg active:scale-95 uppercase tracking-wide"
                        >
                            Accedi
                        </button>
                    ) : (
                        <button 
                            onClick={onUserLogout}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-800/50 rounded-lg border border-slate-700 hover:border-red-500/50"
                            title="Logout"
                        >
                            <LogoutIcon />
                        </button>
                    )}
                </div>
            </div>

            {/* Footer Navigation */}
            {!isSimulationInProgress && (
                <div className="bg-slate-950 border-t border-slate-800 shrink-0 hidden md:block">
                    <div className="p-2 flex justify-around items-center">
                        <Tooltip text="Home" subtext="Menu Hub" position="top">
                            <button onClick={onOpenHub} className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all">
                                <HomeIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Explorer" subtext="Galleria attività" position="top">
                            <button 
                                onClick={onToggleExplorer} 
                                className={`p-2.5 rounded-xl transition-all ${showExplorer ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-400'}`}
                            >
                                <GridIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Diario" subtext="Calendario allenamenti" position="top">
                            <button onClick={onOpenDiary} className="p-2.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-xl transition-all">
                                <DiaryIcon />
                            </button>
                        </Tooltip>
                        <Tooltip text="Social" subtext="Amici & Feed" position="top">
                            <button onClick={onOpenSocial} className="p-2.5 text-slate-400 hover:text-pink-400 hover:bg-slate-800 rounded-xl transition-all relative">
                                <UserGroupIcon />
                                {onlineCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-green-500 text-slate-900 text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-slate-900">{onlineCount}</span>
                                )}
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 left-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950"></span>
                                )}
                            </button>
                        </Tooltip>
                        <Tooltip text="Performance" subtext="Analisi & Previsioni" position="top">
                            <button onClick={onOpenPerformanceAnalysis} className="p-2.5 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded-xl transition-all">
                                <ChartIcon />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
