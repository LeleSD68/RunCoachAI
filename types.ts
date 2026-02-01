

export type ActivityType = 'Lento' | 'Fartlek' | 'Ripetute' | 'Gara' | 'Lungo' | 'Altro' | 'Nota';

export type AiPersonality = 'pro_balanced' | 'analytic' | 'strict';

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
}

export interface RaceRunner {
  trackId: string;
  name: string; 
  position: TrackPoint;
  color: string;
  pace: number; 
}

export interface PauseSegment {
    startPoint: TrackPoint;
    endPoint: TrackPoint;
    duration: number; 
}

export interface MapDisplayProps {
  tracks: Track[];
  visibleTrackIds: Set<string>;
  selectedTrackIds?: Set<string>;
  raceRunners: RaceRunner[] | null;
  hoveredTrackId: string | null;
  runnerSpeeds: Map<string, number>;
  selectionPoints?: TrackPoint[] | null;
  hoveredPoint?: TrackPoint | null;
  hoveredData?: Record<string, string> | null;
  pauseSegments?: PauseSegment[];
  showPauses?: boolean;
  onMapHover?: (point: TrackPoint | null) => void;
  onTrackHover?: (trackId: string | null) => void;
  onPauseClick?: (segment: PauseSegment) => void;
  mapGradientMetric?: 'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power';
  coloredPauseSegments?: PauseSegment[];
  selectedPoint?: TrackPoint | null;
  onPointClick?: (point: TrackPoint | null) => void;
  hoveredLegendValue?: number | null;
  onTrackClick?: (trackId: string, isMultiSelect?: boolean) => void;
  animationTrack?: Track | null;
  animationProgress?: number;
  animationPace?: number;
  onExitAnimation?: () => void;
  fastestSplitForAnimation?: Split | null;
  animationHighlight?: Split | null;
  animationKmHighlight?: Split | null;
  isAnimationPlaying?: boolean;
  onToggleAnimationPlay?: () => void;
  onAnimationProgressChange?: (progress: number) => void;
  animationTrackStats?: TrackStats | null;
  animationSpeed?: number;
  onAnimationSpeedChange?: (speed: number) => void;
  fitBoundsCounter?: number;
  aiSegmentHighlight?: AiSegment | null;
  showSummaryMode?: boolean;
  theme?: 'dark' | 'light';
}

export interface Split {
    splitNumber: number;
    distance: number;
    duration: number;
    pace: number;
    elevationGain: number;
    elevationLoss: number;
    avgHr: number | null;
    avgWatts: number | null;
    isFastest: boolean;
    isSlowest: boolean;
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

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  suggestedWorkout?: Omit<PlannedWorkout, 'id'>;
  suggestedWorkouts?: Omit<PlannedWorkout, 'id'>[]; 
  suggestedReplies?: string[]; 
  timestamp?: number; 
}

export interface AiSegment {
  type: 'ai';
  title: string;
  description: string;
  startDistance: number;
  endDistance: number;
  distance: number;
  duration: number;
  pace: number;
  elevationGain: number;
}

export type RunningGoal = 'none' | '5k' | '10k' | 'half_marathon' | 'marathon' | 'speed' | 'endurance' | 'weight_loss';

// Fix Module '"../types"' has no exported member 'WeightEntry'
export interface WeightEntry {
  date: string;
  weight: number;
}

export interface UserProfile {
  id?: string;
  name?: string; 
  email?: string;
  age?: number;
  weight?: number;
  height?: number; 
  weightHistory?: WeightEntry[];
  gender?: 'M' | 'F' | 'Altro';
  maxHr?: number;
  restingHr?: number;
  goals?: RunningGoal[];
  aiPersonality?: AiPersonality;
  personalNotes?: string; 
  shoes?: string[]; 
  theme?: 'dark' | 'light';
  // Fix Property 'isOnline' does not exist on type 'UserProfile' in SocialHub.tsx and MiniChat.tsx
  isOnline?: boolean;
  last_seen_at?: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Fix Module '"../types"' has no exported member 'ApiUsageStats'
export interface ApiUsageStats {
  rpm: number;
  daily: number;
}

// Fix Module '"./types"' has no exported member 'RaceResult'
export interface RaceResult {
  trackId: string;
  name: string;
  finishTime: number;
  distance: number;
  rank: number;
}

// Fix Module '"./types"' has no exported member 'Commentary'
export interface Commentary {
  id: string;
  text: string;
  timestamp: number;
}

// Fix Module '"../types"' has no exported member 'Weather'
export interface Weather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  condition: string;
}

// Fix Module '"../types"' has no exported member 'PersonalRecord'
export interface PersonalRecord {
  distance: number;
  time: number;
  trackId: string;
  trackName: string;
  date: string;
}

// Fix Module '"../types"' has no exported member 'FriendRequest'
export interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  requester: UserProfile;
}

// Fix Module '"../types"' has no exported member 'DirectMessage'
export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

// Added AIStudio interface definition to resolve type mismatch and missing type errors
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

/**
 * Fix for: Property 'gpxApp' does not exist on type 'Window & typeof globalThis'.
 * Fix for: window.aistudio access.
 */
declare global {
  interface Window {
    gpxApp?: {
      addTokens: (count: number) => void;
      trackApiRequest: () => void;
    };
    // Fix: removed declaration of 'aistudio' on Window to avoid conflicts with global types 
    // already provided by the environment, satisfying identical modifiers and same type requirements.
  }
}
