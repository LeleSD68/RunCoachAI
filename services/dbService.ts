
import { Track, ChatMessage, UserProfile, PlannedWorkout } from '../types';
import { supabase } from './supabaseClient';

const DB_NAME = 'GpxVizDB';
const TRACKS_STORE = 'tracks';
const CHATS_STORE = 'chats';
const PROFILE_STORE = 'profile';
const PLANNED_STORE = 'planned_workouts';
// Incrementing DB version to force schema update on client browsers
// This fixes the "NotFoundError" when restoring backup on devices with old DB schema
const DB_VERSION = 4;

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

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
      for (const w of workouts) {
          const payload = {
              id: w.id.length === 36 ? w.id : undefined,
              user_id: session.user.id,
              title: w.title,
              description: w.description,
              date: w.date.toISOString(),
              activity_type: w.activityType,
              is_ai_suggested: w.isAiSuggested,
              completed_track_id: w.completedTrackId
          };
          if (payload.id) {
              await supabase.from('planned_workouts').upsert(payload);
          } else {
              await supabase.from('planned_workouts').insert(payload);
          }
      }
  }
};

export const loadPlannedWorkoutsFromDB = async (): Promise<PlannedWorkout[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
      const { data } = await supabase.from('planned_workouts').select('*');
      if (data) {
          const cloudWorkouts = data.map((w: any) => ({
              id: w.id,
              title: w.title,
              description: w.description,
              date: new Date(w.date),
              activityType: w.activity_type,
              isAiSuggested: w.is_ai_suggested,
              completedTrackId: w.completed_track_id
          }));
          return cloudWorkouts;
      }
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLANNED_STORE], 'readonly');
    const store = transaction.objectStore(PLANNED_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const workouts = request.result as PlannedWorkout[];
      const revived = workouts.map(w => ({
        ...w,
        date: w.date instanceof Date ? w.date : new Date(w.date)
      }));
      resolve(revived);
    };
    request.onerror = () => reject(request.error);
  });
};

// --- CHATS ---
export const saveChatToDB = async (id: string, messages: ChatMessage[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHATS_STORE], 'readwrite');
    const store = transaction.objectStore(CHATS_STORE);
    store.put({ id, messages, updatedAt: new Date().getTime() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadChatFromDB = async (id: string): Promise<ChatMessage[] | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHATS_STORE], 'readonly');
    const store = transaction.objectStore(CHATS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.messages || null);
    request.onerror = () => reject(request.error);
  });
};

export const deleteChatFromDB = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CHATS_STORE], 'readwrite');
        const store = transaction.objectStore(CHATS_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- PROFILE ---
export const saveProfileToDB = async (profile: UserProfile): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
      await supabase.from('profiles').upsert({
          id: session.user.id,
          name: profile.name,
          age: profile.age,
          weight: profile.weight,
          gender: profile.gender,
          max_hr: profile.maxHr,
          resting_hr: profile.restingHr,
          goals: profile.goals,
          ai_personality: profile.aiPersonality,
          personal_notes: profile.personalNotes,
          shoes: profile.shoes
      });
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], 'readwrite');
    const store = transaction.objectStore(PROFILE_STORE);
    store.put({ id: 'current', ...profile });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadProfileFromDB = async (): Promise<UserProfile | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
      const { data } = await supabase.from('profiles').select('*').single();
      if (data) {
          return {
              name: data.name,
              age: data.age,
              weight: data.weight,
              gender: data.gender,
              maxHr: data.max_hr,
              restingHr: data.resting_hr,
              goals: data.goals,
              aiPersonality: data.ai_personality,
              personalNotes: data.personal_notes,
              shoes: data.shoes
          };
      }
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], 'readonly');
    const store = transaction.objectStore(PROFILE_STORE);
    const request = store.get('current');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// --- EXPORT/IMPORT ---
export interface BackupData {
    tracks: Track[];
    plannedWorkouts: PlannedWorkout[];
    chats: any[];
    profile: UserProfile | null;
    exportedAt: string;
}

export const exportAllData = async (): Promise<BackupData> => {
    const db = await initDB();
    const transaction = db.transaction([TRACKS_STORE, CHATS_STORE, PROFILE_STORE, PLANNED_STORE], 'readonly');
    
    const tracksReq = transaction.objectStore(TRACKS_STORE).getAll();
    const plannedReq = transaction.objectStore(PLANNED_STORE).getAll();
    const chatsReq = transaction.objectStore(CHATS_STORE).getAll();
    const profileReq = transaction.objectStore(PROFILE_STORE).get('current');

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve({
                tracks: tracksReq.result,
                plannedWorkouts: plannedReq.result || [],
                chats: chatsReq.result,
                profile: profileReq.result || null,
                exportedAt: new Date().toISOString()
            });
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

export const importAllData = async (data: BackupData): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction([TRACKS_STORE, CHATS_STORE, PROFILE_STORE, PLANNED_STORE], 'readwrite');
    
    const tracksStore = transaction.objectStore(TRACKS_STORE);
    const chatsStore = transaction.objectStore(CHATS_STORE);
    const profileStore = transaction.objectStore(PROFILE_STORE);
    const plannedStore = transaction.objectStore(PLANNED_STORE);

    // Clear existing data
    // We do this via request, but we handle the 'put' in the same transaction loop
    tracksStore.clear();
    chatsStore.clear();
    profileStore.clear();
    plannedStore.clear();

    // Import Tracks with Date revival
    if (data.tracks && Array.isArray(data.tracks)) {
        data.tracks.forEach(t => {
            // Ensure points time are actual Date objects before storing
            const revivedTrack = {
                ...t,
                points: t.points.map(p => ({
                    ...p,
                    time: new Date(p.time) // Convert string to Date
                }))
            };
            tracksStore.put(revivedTrack);
        });
    }

    // Import Workouts with Date revival
    if (data.plannedWorkouts && Array.isArray(data.plannedWorkouts)) {
        data.plannedWorkouts.forEach(w => {
            const revivedWorkout = {
                ...w,
                date: new Date(w.date) // Convert string to Date
            };
            plannedStore.put(revivedWorkout);
        });
    }

    // Import Chats
    if (data.chats && Array.isArray(data.chats)) {
        data.chats.forEach(c => chatsStore.put(c));
    }

    // Import Profile
    if (data.profile) {
        profileStore.put({ id: 'current', ...data.profile });
    }

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => {
            console.error("Transaction Error during import:", e);
            reject(transaction.error);
        };
    });
};
