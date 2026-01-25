
import { Track, ChatMessage, UserProfile, PlannedWorkout } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'GpxVizDB';
const TRACKS_STORE = 'tracks';
const CHATS_STORE = 'chats';
const PROFILE_STORE = 'profile';
const PLANNED_STORE = 'planned_workouts';
// Incrementing DB version to force schema update on client browsers
const DB_VERSION = 6;

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
// Mappa da oggetto Track (App) a riga Database (Supabase)
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
    has_chat: t.hasChat, // Campo aggiunto
    linked_workout: t.linkedWorkout, // Campo aggiunto (JSONB)
});

// Mappa da riga Database (Supabase) a oggetto Track (App)
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
    hasChat: row.has_chat, // Lettura campo aggiunto
    linkedWorkout: row.linked_workout, // Lettura campo aggiunto
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

  // 2. If User is Logged In AND Supabase is Configured (not mock), Sync to Cloud
  const { data: { session } } = await supabase.auth.getSession();
  if (session && isSupabaseConfigured()) {
      const validTracks = tracks.filter(t => !t.isExternal);
      let syncCount = 0;
      for (const t of validTracks) {
          const payload = mapTrackToSupabase(t, session.user.id);
          // Simple UUID regex check to ensure we only sync valid UUIDs (not local temp IDs)
          if (t.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
             await supabase.from('tracks').upsert({ id: t.id, ...payload });
             syncCount++;
          }
      }
      if (syncCount > 0) console.log(`☁️ [Supabase] Batch save: ${syncCount} tracks synced.`);
  }
};

export const syncTrackToCloud = async (track: Track) => {
    // Only sync if configured
    if (!isSupabaseConfigured()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || track.isExternal) return;

    const payload = mapTrackToSupabase(track, session.user.id);
    
    // Check if ID looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(track.id);

    if (!isUUID) {
        // Insert new because the ID is likely from a file name (not a UUID)
        // We let Supabase generate the ID and return it
        const { data } = await supabase.from('tracks').insert(payload).select().single();
        if (data) {
            track.id = data.id; // Update ID locally to match Cloud UUID
            // Update IndexedDB with new ID to keep sync
            const db = await initDB();
            const tx = db.transaction([TRACKS_STORE], 'readwrite');
            tx.objectStore(TRACKS_STORE).put(track);
            console.log(`☁️ [Supabase] New track created: ${data.id}`);
        }
    } else {
        // Use UPSERT to handle both "update existing" and "insert missing from cloud but present in backup"
        const { error } = await supabase.from('tracks').upsert({ id: track.id, ...payload });
        if (!error) console.log(`☁️ [Supabase] Track updated: ${track.id}`);
        else console.warn(`☁️ [Supabase] Update error:`, error);
    }
}

export const deleteTrackFromCloud = async (id: string) => {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('tracks').delete().eq('id', id);
    console.log(`☁️ [Supabase] Track deleted: ${id}`);
}

export const loadTracksFromDB = async (): Promise<Track[]> => {
  const { data: { session } } = await supabase.auth.getSession();

  // ONLY try cloud if session exists AND Supabase is actually configured (not mock)
  if (session && isSupabaseConfigured()) {
      // 1. Try Cloud First
      const { data, error } = await supabase.from('tracks').select('*').order('start_time', { ascending: false });
      if (data && !error) {
          console.log(`☁️ [Supabase] Loaded ${data.length} tracks from cloud.`);
          const cloudTracks = data.map(mapSupabaseToTrack);
          // Update local DB cache so offline mode has latest data
          saveTracksToDB(cloudTracks); 
          return cloudTracks;
      }
  }

  // 2. Fallback to Local (This handles Offline, Mock mode, or Cloud error)
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
      workouts.forEach(w => store.put(w));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (session && isSupabaseConfigured()) {
      for (const w of workouts) {
          const payload = {
              id: w.id.length === 36 ? w.id : undefined, // Send ID only if it looks like a UUID
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
      console.log(`☁️ [Supabase] Synced ${workouts.length} workouts.`);
  }
};

export const loadPlannedWorkoutsFromDB = async (): Promise<PlannedWorkout[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && isSupabaseConfigured()) {
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
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([CHATS_STORE], 'readwrite');
    const store = transaction.objectStore(CHATS_STORE);
    store.put({ id, messages, updatedAt: new Date().getTime() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  // Sync to Cloud
  const { data: { session } } = await supabase.auth.getSession();
  if (session && isSupabaseConfigured()) {
      await supabase.from('chats').upsert({
          id, // Can be 'global-coach' or 'track-chat-UUID'
          user_id: session.user.id,
          messages,
          updated_at: new Date().toISOString()
      });
  }
};

export const loadChatFromDB = async (id: string): Promise<ChatMessage[] | null> => {
  // 1. Try Cloud First if Online
  const { data: { session } } = await supabase.auth.getSession();
  if (session && isSupabaseConfigured()) {
      const { data } = await supabase.from('chats').select('*').eq('id', id).single();
      if (data) {
          // Update local cache
          const db = await initDB();
          const tx = db.transaction([CHATS_STORE], 'readwrite');
          tx.objectStore(CHATS_STORE).put({ id, messages: data.messages, updatedAt: new Date(data.updated_at).getTime() });
          return data.messages;
      }
  }

  // 2. Fallback Local
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
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([CHATS_STORE], 'readwrite');
        const store = transaction.objectStore(CHATS_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session && isSupabaseConfigured()) {
        await supabase.from('chats').delete().eq('id', id);
    }
};

export const syncAllChatsToCloud = async () => {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const db = await initDB();
    const chats: any[] = await new Promise((resolve, reject) => {
        const tx = db.transaction([CHATS_STORE], 'readonly');
        const req = tx.objectStore(CHATS_STORE).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    if (chats.length > 0) {
        let count = 0;
        for (const chat of chats) {
            const { error } = await supabase.from('chats').upsert({
                id: chat.id,
                user_id: session.user.id,
                messages: chat.messages,
                updated_at: new Date(chat.updatedAt || Date.now()).toISOString()
            });
            if (!error) count++;
        }
        console.log(`☁️ [Supabase] Synced ${count} chat histories.`);
    }
};

// --- PROFILE ---
export const saveProfileToDB = async (profile: UserProfile): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && isSupabaseConfigured()) {
      await supabase.from('profiles').upsert({
          id: session.user.id,
          name: profile.name,
          age: profile.age,
          weight: profile.weight,
          height: profile.height || null, // Handle optional field
          gender: profile.gender || null, // Handle optional field
          max_hr: profile.maxHr,
          resting_hr: profile.restingHr,
          goals: profile.goals || [], // Ensure array
          ai_personality: profile.aiPersonality || null,
          personal_notes: profile.personalNotes || null,
          shoes: profile.shoes || [], // Ensure array
          weight_history: profile.weightHistory || [], // Ensure array for JSONB
      });
      console.log(`☁️ [Supabase] Profile synced.`);
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
  if (session && isSupabaseConfigured()) {
      const { data } = await supabase.from('profiles').select('*').single();
      if (data) {
          return {
              name: data.name,
              age: data.age,
              weight: data.weight,
              height: data.height,
              gender: data.gender,
              maxHr: data.max_hr,
              restingHr: data.resting_hr,
              goals: data.goals,
              aiPersonality: data.ai_personality,
              personalNotes: data.personal_notes,
              shoes: data.shoes,
              weightHistory: data.weight_history
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
    
    // Revive data first to reuse objects for both local and cloud
    const revivedTracks: Track[] = [];
    if (data.tracks && Array.isArray(data.tracks)) {
        data.tracks.forEach(t => {
            try {
                if (!t.id) return;
                const revivedTrack = {
                    ...t,
                    points: t.points.map(p => ({
                        ...p,
                        time: new Date(p.time) // Convert string to Date
                    }))
                };
                revivedTracks.push(revivedTrack);
            } catch (err) {
                console.warn("Skipping bad track in import", err);
            }
        });
    }

    const revivedWorkouts: PlannedWorkout[] = [];
    if (data.plannedWorkouts && Array.isArray(data.plannedWorkouts)) {
        data.plannedWorkouts.forEach(w => {
            try {
                if (!w.id) return;
                const revivedWorkout = {
                    ...w,
                    date: new Date(w.date)
                };
                revivedWorkouts.push(revivedWorkout);
            } catch (err) {
                console.warn("Skipping bad workout in import", err);
            }
        });
    }

    // 1. Save to Local IndexedDB (First pass)
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([TRACKS_STORE, CHATS_STORE, PROFILE_STORE, PLANNED_STORE], 'readwrite');
        const tracksStore = transaction.objectStore(TRACKS_STORE);
        const chatsStore = transaction.objectStore(CHATS_STORE);
        const profileStore = transaction.objectStore(PROFILE_STORE);
        const plannedStore = transaction.objectStore(PLANNED_STORE);

        tracksStore.clear();
        chatsStore.clear();
        profileStore.clear();
        plannedStore.clear();

        revivedTracks.forEach(t => tracksStore.put(t));
        revivedWorkouts.forEach(w => plannedStore.put(w));

        if (data.chats && Array.isArray(data.chats)) {
            data.chats.forEach(c => { if (c.id) chatsStore.put(c); });
        }

        if (data.profile) {
            profileStore.put({ id: 'current', ...data.profile });
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(transaction.error);
    });

    // 2. Sync to Supabase if Logged In AND Configured
    const { data: { session } } = await supabase.auth.getSession();
    if (session && isSupabaseConfigured()) {
        const userId = session.user.id;
        
        console.log("☁️ [Supabase] Starting full import sync...");

        // Sync Profile
        if (data.profile) {
            await saveProfileToDB(data.profile);
        }

        // Sync Tracks using REVIVED tracks (Dates are objects now)
        for (const t of revivedTracks) {
            if (!t.isExternal) {
                await syncTrackToCloud(t);
            }
        }

        // Sync Workouts using REVIVED workouts
        for (const w of revivedWorkouts) {
            const payload = {
                id: w.id.length === 36 ? w.id : undefined, 
                user_id: userId,
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

        // Sync Chats
        if (data.chats && Array.isArray(data.chats)) {
            for (const chat of data.chats) {
                await supabase.from('chats').upsert({
                    id: chat.id,
                    user_id: userId,
                    messages: chat.messages,
                    updated_at: new Date(chat.updatedAt || Date.now()).toISOString()
                });
            }
        }

        console.log("☁️ [Supabase] Full import sync completed.");
    }
};
