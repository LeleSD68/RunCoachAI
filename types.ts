

export type ActivityType = 'Lento' | 'Fartlek' | 'Ripetute' | 'Gara' | 'Lungo' | 'Altro' | 'Nota' | 'Impegno' | 'Recupero';

export type DiaryEntryType = 'workout' | 'note' | 'commitment';

export type AiPersonality = 'pro_balanced' | 'analytic' | 'strict';

export type CalendarPreference = 'google' | 'apple';

export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
  time: Date;
  cummulativeDistance: number;
  hr?: number; 
  cad?: number; 
  power?: number; 
}

// Added PauseSegment interface used in TrackStats
export interface PauseSegment {
  startPoint: TrackPoint;
  endPoint: TrackPoint;
  duration: number; // in seconds
}

export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  color: string;
  distance: number; 
  duration: number; 
  groupId?: string;
  activityType?: ActivityType;
  isFavorite?: boolean;
  isArchived?: boolean; 
  isPublic?: boolean; 
  isExternal?: boolean; 
  tags?: string[]; 
  folder?: string;
  notes?: string; 
  shoe?: string; 
  rpe?: number; 
  rating?: number; 
  ratingReason?: string; 
  hasChat?: boolean; 
  linkedWorkout?: { 
      title: string;
      description: string;
      activityType: ActivityType;
  };
  userId?: string; 
  userDisplayName?: string; 
  startTime?: string; 
}

export interface PlannedWorkout {
    id: string;
    title: string;
    description: string;
    date: Date;
    activityType: ActivityType;
    isAiSuggested: boolean;
    completedTrackId?: string; 
    entryType?: DiaryEntryType; // 'workout', 'note', 'commitment'
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    isGoogleSynced?: boolean;
}

export interface UserProfile {
  id?: string;
  name?: string; 
  email?: string;
  age?: number;
  weight?: number;
  height?: number; 
  gender?: 'M' | 'F' | 'Altro';
  maxHr?: number;
  restingHr?: number;
  goals?: RunningGoal[];
  aiPersonality?: AiPersonality;
  personalNotes?: string; 
  shoes?: string[]; 
  autoAnalyzeEnabled?: boolean;
  googleCalendarSyncEnabled?: boolean;
  calendarPreference?: CalendarPreference; // 'google' | 'apple'
  weightHistory?: {date: string, weight: number}[];
  powerSaveMode?: boolean;
  /* Added isOnline to fix type errors in SocialHub and MiniChat */
  isOnline?: boolean;
}

export type RunningGoal = 'none' | '5k' | '10k' | 'half_marathon' | 'marathon' | 'speed' | 'endurance' | 'weight_loss';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ApiUsage {
    requests: number;
    tokens: number;
    lastReset: string;
}

export interface RaceResult {
  trackId: string;
  name: string;
  finishTime: number;
  distance: number;
  rank: number;
}

// Added missing types to fix module export errors
export interface Split {
  splitNumber: number;
  distance: number;
  duration: number;
  pace: number;
  elevationGain: number;
  elevationLoss: number;
  avgHr: number | null;
  avgWatts: number | null;
  isFastest?: boolean;
  isSlowest?: boolean;
}

export interface TrackStats {
  totalDistance: number;
  totalDuration: number;
  movingDuration: number;
  elevationGain: number;
  elevationLoss: number;
  avgPace: number;
  movingAvgPace: number;
  maxSpeed: number;
  avgSpeed: number;
  avgHr: number | null;
  maxHr: number | null;
  minHr: number | null;
  avgWatts: number | null;
  splits: Split[];
  pauses: PauseSegment[];
}

export interface AiSegment extends Partial<TrackStats> {
  type: 'ai';
  title: string;
  description: string;
  startDistance: number;
  endDistance: number;
  distance: number;
  duration: number;
  elevationGain: number;
  pace: number;
}

export interface ApiUsageStats extends ApiUsage {}

export interface Commentary {
  text: string;
  timestamp: number;
}

export interface PersonalRecord {
  distance: number;
  time: number;
  trackId: string;
  trackName: string;
  date: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  suggestedReplies?: string[];
}

export interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  requester: UserProfile;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export interface Weather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  condition: string;
}

// Added RaceRunner interface for race simulations
export interface RaceRunner {
  trackId: string;
  name: string;
  position: TrackPoint;
  color: string;
  pace: number;
}

// Added MapDisplayProps interface for the map component
export interface MapDisplayProps {
    tracks: Track[];
    visibleTrackIds: Set<string>;
    selectedTrackIds?: Set<string>;
    raceRunners: RaceRunner[] | null;
    hoveredTrackId: string | null;
    runnerSpeeds: Map<string, number>;
    hoveredPoint?: TrackPoint | null;
    mapGradientMetric?: string;
    animationTrack?: Track | null;
    animationProgress?: number;
    isAnimationPlaying?: boolean;
    fitBoundsCounter?: number;
    selectionPoints?: TrackPoint[] | null;
    pauseSegments?: PauseSegment[];
    showPauses?: boolean;
    onMapHover?: (point: TrackPoint | null) => void;
    onPauseClick?: (segment: PauseSegment) => void;
    coloredPauseSegments?: PauseSegment[];
    onExitAnimation?: () => void;
    fastestSplitForAnimation?: any;
    animationHighlight?: any;
    selectedPoint?: TrackPoint | null;
    onPointClick?: (point: TrackPoint | null) => void;
    hoveredLegendValue?: number | null;
}

// Global declaration to handle gpxApp and aistudio window properties
declare global {
  /* Fix: Moved AIStudio inside global to resolve type identity mismatch errors and made window.aistudio optional */
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    gpxApp?: {
      addTokens: (count: number) => void;
      trackApiRequest: () => void;
      getUsage: () => ApiUsage;
    };
    /* Fix: ensure identical modifiers (optional) and same type identity as existing global declarations */
    aistudio?: AIStudio;
  }
}