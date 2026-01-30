

export type ActivityType = 'Lento' | 'Fartlek' | 'Ripetute' | 'Gara' | 'Lungo' | 'Altro' | 'Nota';

export type AiPersonality = 'pro_balanced' | 'analytic' | 'strict';

export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
  time: Date;
  cummulativeDistance: number;
  hr?: number; // Heart rate in BPM
  cad?: number; // Cadence in SPM (steps per minute)
  power?: number; // Power in Watts
}

export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  color: string;
  distance: number; // in kilometers
  duration: number; // in milliseconds
  groupId?: string;
  // Nuovi campi metadata
  activityType?: ActivityType;
  isFavorite?: boolean;
  isArchived?: boolean; // New field
  isPublic?: boolean; // NEW: Controls visibility in friends feed
  isExternal?: boolean; // Indicates if the track is a temporary external opponent (Ghost)
  tags?: string[]; // New field
  folder?: string;
  notes?: string; // Note specifiche per la corsa
  shoe?: string; // Modello di scarpa usata
  rpe?: number; // Rate of Perceived Exertion (0-10)
  rating?: number; // Valutazione da 0 a 5 stelle
  ratingReason?: string; // Motivazione della valutazione AI
  hasChat?: boolean; // Indicates if there is an existing AI chat for this track
  linkedWorkout?: { // Snapshot of the linked planned workout
      title: string;
      description: string;
      activityType: ActivityType;
  };
  userId?: string; // Owner ID for social features
  userDisplayName?: string; // Owner Name for social features
  startTime?: string; // ISO String
}

export interface MonthlyStats {
    totalDistance: number;
    totalDuration: number;
    activityCount: number;
    avgPace: number;
}

export interface PlannedWorkout {
    id: string;
    title: string;
    description: string;
    date: Date;
    activityType: ActivityType;
    isAiSuggested: boolean;
    completedTrackId?: string; // ID della traccia che ha completato questo allenamento
}

export interface RaceRunner {
  trackId: string;
  name: string; // Added name for display on map
  position: TrackPoint;
  color: string;
  pace: number; // Ritmo attuale in min/km
}

export interface RaceResult {
  rank: number;
  trackId: string;
  name: string;
  color: string;
  finishTime: number; // ms
  avgSpeed: number; // km/h
  distance: number; // km;
}

export interface PauseSegment {
    startPoint: TrackPoint;
    endPoint: TrackPoint;
    duration: number; // in seconds
}

export interface MapDisplayProps {
  tracks: Track[];
  visibleTrackIds: Set<string>;
  selectedTrackIds?: Set<string>; // New prop for highlighting
  raceRunners: RaceRunner[] | null;
  hoveredTrackId: string | null;
  runnerSpeeds: Map<string, number>;
  selectionPoints?: TrackPoint[] | null;
  hoveredPoint?: TrackPoint | null; // For editor hover
  hoveredData?: Record<string, string> | null; // Formatted data for the hover cursor
  pauseSegments?: PauseSegment[]; // For editor pause markers
  showPauses?: boolean;
  onMapHover?: (point: TrackPoint | null) => void; // For editor map hover -> chart sync
  onTrackHover?: (trackId: string | null) => void; // Callback for track hover synchronization
  onPauseClick?: (segment: PauseSegment) => void;
  mapGradientMetric?: 'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones' | 'power';
  coloredPauseSegments?: PauseSegment[];
  selectedPoint?: TrackPoint | null; // Point selected by clicking
  onPointClick?: (point: TrackPoint | null) => void; // Callback for when a point is clicked on map
  hoveredLegendValue?: number | null; // The value of the metric at the hovered point
  onTrackClick?: (trackId: string, isMultiSelect?: boolean) => void; // Callback when a track is clicked, supports modifier keys

  // Animation Props
  animationTrack?: Track | null;
  animationProgress?: number;
  animationPace?: number; // Real-time pace for animation cursor
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
  is3DMode?: boolean;
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

export interface RaceHighlight {
  title: string;
  value: string;
  trackName: string;
  trackColor: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  suggestedWorkout?: Omit<PlannedWorkout, 'id'>; // Deprecated: use suggestedWorkouts
  suggestedWorkouts?: Omit<PlannedWorkout, 'id'>[]; // Support multiple suggestions
  suggestedReplies?: string[]; // Quick replies suggestions
  timestamp?: number; // Timestamp for message grouping
}

export interface Weather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  condition: string;
}

export interface AiSegment {
  type: 'ai';
  title: string;
  description: string;
  startDistance: number;
  endDistance: number;
  // Calculated stats for display
  distance: number;
  duration: number;
  pace: number;
  elevationGain: number;
}

export type RunningGoal = 'none' | '5k' | '10k' | 'half_marathon' | 'marathon' | 'speed' | 'endurance' | 'weight_loss';

export interface WeightEntry {
    date: string; // ISO String
    weight: number;
}

export interface StravaConfig {
    clientId: string;
    clientSecret: string;
}

export interface UserProfile {
  id?: string; // ID Database
  name?: string; 
  email?: string;
  age?: number;
  weight?: number;
  height?: number; // in cm
  weightHistory?: WeightEntry[]; // Historical weight data
  gender?: 'M' | 'F' | 'Altro';
  maxHr?: number;
  restingHr?: number;
  goals?: RunningGoal[];
  aiPersonality?: AiPersonality;
  personalNotes?: string; // Note generali (infortuni, etc)
  shoes?: string[]; // Lista di scarpe possedute
  theme?: 'dark' | 'light';
  lastSeenAt?: string; // ISO String for presence
  isOnline?: boolean; // Derived state
  stravaConfig?: StravaConfig; // NEW: Strava Credentials
}

export interface FriendRequest {
    id: string;
    requester: UserProfile;
    status: 'pending' | 'accepted';
    createdAt: string;
}

export interface DirectMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
}

export interface PersonalRecord {
  distance: number; // in meters
  time: number; // in milliseconds
  trackId: string;
  trackName: string;
  date: string; // ISO string
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Added Commentary interface
export interface Commentary {
    time: number;
    text: string;
}

export interface ApiUsageStats {
    rpm: number;
    daily: number;
    limitRpm: number;
    limitDaily: number;
    totalTokens: number; // Added field for tracking tokens
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    gpxApp?: {
      addTokens: (count: number) => void;
      getDailyTokenCount: () => number; // Added for current daily token usage
      trackApiRequest: () => void; // New method to count requests
    };
    aistudio?: AIStudio;
  }
}