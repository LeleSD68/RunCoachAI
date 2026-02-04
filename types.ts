
export type ActivityType = 'Lento' | 'Fartlek' | 'Ripetute' | 'Gara' | 'Lungo' | 'Altro' | 'Nota' | 'Impegno' | 'Recupero';

export type DiaryEntryType = 'workout' | 'note' | 'commitment';

export type AiPersonality = 'pro_balanced' | 'analytic' | 'strict' | 'friend_coach';

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

export interface PauseSegment {
  startPoint: TrackPoint;
  endPoint: TrackPoint;
  duration: number; // in seconds
}

export interface Reaction {
    userId: string;
    emoji: string;
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
  reactions?: Reaction[]; 
  // Sharing fields
  sharedWithUsers?: string[]; // Array of User IDs
  sharedWithGroups?: string[]; // Array of Group IDs
}

export interface SocialGroup {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    memberCount: number;
    isMember?: boolean;
}

export interface PlannedWorkout {
    id: string;
    title: string;
    description: string;
    date: Date;
    activityType: ActivityType;
    isAiSuggested: boolean;
    completedTrackId?: string; 
    entryType?: DiaryEntryType;
    startTime?: string; 
    endTime?: string; 
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
  calendarPreference?: CalendarPreference;
  stravaAutoSync?: boolean;
  weightHistory?: {date: string, weight: number}[];
  powerSaveMode?: boolean;
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

export type ApiUsageStats = ApiUsage;

export interface RaceResult {
  trackId: string;
  name: string;
  finishTime: number;
  distance: number;
  rank: number;
}

export interface RaceGapSnapshot {
    time: number; // Simulation time in ms
    gaps: Record<string, number>; // trackId -> meters behind leader
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
  avgCadence: number | null;
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
    selectionPoints?: TrackPoint[] | TrackPoint[][] | null;
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

export interface RaceRunner {
  trackId: string;
  name: string;
  position: TrackPoint;
  color: string;
  pace: number;
  finished?: boolean;
  finishTime?: number;
}

export interface LeaderStats {
    timeInLead: number; // ms
    distanceInLead: number; // meters
}

export interface Commentary {
  id: string;
  text: string;
  timestamp: number;
}

export interface Weather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  condition: string;
}

export interface DayPartForecast {
    label: string; // Mattina, Pomeriggio, Sera
    temp: number;
    icon: string;
}

export interface CalendarWeather {
    dateStr: string; // YYYY-MM-DD
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    icon: string; // Emoji
    isForecast: boolean;
    details?: {
        morning: DayPartForecast;
        afternoon: DayPartForecast;
        evening: DayPartForecast;
    };
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
  id?: string; 
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  suggestedReplies?: string[];
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
}

export interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  requester: UserProfile;
}

declare global {
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
    aistudio?: AIStudio;
  }
}
