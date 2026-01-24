
import { Track, ChatMessage, UserProfile, PlannedWorkout } from '../types';
import { supabase } from './supabaseClient';

const DB_NAME = 'GpxVizDB';
const TRACKS_STORE = 'tracks';
const CHATS_STORE = 'chats';
const PROFILE_STORE = 'profile';
const PLANNED_STORE = 'planned_workouts';
const DB_VERSION = 3;

// --- INDEXED DB INIT ---
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CHATS_STORE)) db.createObjectStore(CHATS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PROFILE_STORE)) db.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PLANNED_STORE)) db.createObjectStore(PLANNED_STORE, { keyPath: 'id' });
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

// --- MAPPERS ---
const mapTrackToSupabase = (t: Track, userId: string) => ({
    user_id: userId,
    name: t.name,
    start_time: t.points[0].time.toISOString(),
    distance_km: t.distance,
    duration_ms: t.duration,
    activity_type: t.activityType,
    points_data: t.points, 
    color: t.color,
    folder: t.folder,
    notes: t.notes,
    shoe: t.shoe,
    rpe: t.rpe,
    rating: t.rating,
    rating_reason: t.ratingReason,
    tags: t.tags,
    is_favorite: t.isFavorite,
    is_archived: t.isArchived,
});

const mapSupabaseToTrack = (row: any): Track => ({
    id: row.id, 
    name: row.name,
    points: (row.points_data as any[]).map((p: any) => ({ ...p, time: new Date(p.time) })),
    distance: row.distance_km,
    duration: row.duration_ms,
    color: row.color,
    activityType: row.activity_type,
    folder: row.folder,
    notes: row.notes,
    shoe: row.shoe,
    rpe: row.rpe,
    rating: row.rating,
    ratingReason: row.rating_reason,
    tags: row.tags,
    isFavorite: row.is_favorite,
    isArchived: row.is_archived,
});

// --- TRACKS ---
export const saveTracksToDB = async (tracks: Track[]): Promise<void> => {
  // 1. Always save to Local IndexedDB for performance and offline fallback
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([TRACKS_STORE], 'readwrite');
    const store = transaction.objectStore(TRACKS_STORE);
    store.clear().onsuccess = () => {
      tracks.filter(t => !t.isExternal).forEach(t => store.put(t)); // Use PUT to be safe
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  // 2. If User is Logged In, Sync to Cloud
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
      const validTracks = tracks.filter(t => !t.isExternal);
      for (const t of validTracks) {
          const payload = mapTrackToSupabase(t, session.user.id);
          if (t.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
             await supabase.from('tracks').upsert({ id: t.id, ...payload });
          }
      }
  }
};

export const syncTrackToCloud = async (track: Track) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || track.isExternal) return;

    const payload = mapTrackToSupabase(track, session.user.id);
    
    if (!track.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        // Insert new
        const { data } = await supabase.from('tracks').insert(payload).select().single();
        if (data) {
            track.id = data.id; // Update ID locally
            // Update IndexedDB with new ID
            const db = await initDB();
            const tx = db.transaction([TRACKS_STORE], 'readwrite');
            tx.objectStore(TRACKS_STORE).put(track);
        }
    } else {
        // Update existing
        await supabase.from('tracks').update(payload).eq('id', track.id);
    }
}

export const deleteTrackFromCloud = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('tracks').delete().eq('id', id);
}

export const loadTracksFromDB = async (): Promise<Track[]> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
      // 1. Try Cloud First
      const { data, error } = await supabase.from('tracks').select('*').order('start_time', { ascending: false });
      if (data && !error) {
          const cloudTracks = data.map(mapSupabaseToTrack);
          saveTracksToDB(cloudTracks); 
          return cloudTracks;
      }
  }

  // 2. Fallback to Local
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TRACKS_STORE], 'readonly');
    const store = transaction.objectStore(TRACKS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const tracks = request.result as Track[];
      const revived = tracks.map(t => ({
        ...t,
        points: t.points.map(p => ({
          ...p,
          time: p.time instanceof Date ? p.time : new Date(p.time)
        }))
      }));
      resolve(revived);
    };
    request.onerror = () => reject(request.error);
  });
};

// --- PLANNED WORKOUTS ---
export const savePlannedWorkoutsToDB = async (workouts: PlannedWorkout[]): Promise<void> => {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([PLANNED_STORE], 'readwrite');
    const store = transaction.objectStore(PLANNED_STORE);
    store.clear().onsuccess = () => {
      workouts.forEach(w => store.put(w)); // Use PUT
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  