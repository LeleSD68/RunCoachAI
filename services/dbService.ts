
import { Track, ChatMessage, UserProfile, PlannedWorkout, DirectMessage } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'GpxVizDB';
const TRACKS_STORE = 'tracks';
const CHATS_STORE = 'chats';
const PROFILE_STORE = 'profile';
const PLANNED_STORE = 'planned_workouts';
const DB_VERSION = 6;

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
    start_time: t.points[0]?.time.toISOString(),
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
    is_public: t.isPublic,
    has_chat: t.hasChat,
    linked_workout: t.linkedWorkout,
});

const mapSupabaseToTrack = (row: any): Track | null => {
    try {
        if (!row) return null;
        let pointsData = row.points_data;
        if (typeof pointsData === 'string') pointsData = JSON.parse(pointsData);
        return {
            id: row.id, 
            name: row.name,
            points: pointsData.map((p: any) => ({ ...p, time: new Date(p.time) })),
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
            isPublic: row.is_public,
            hasChat: row.has_chat,
            linkedWorkout: row.linked_workout,
        };
    } catch (e) { return null; }
};

// --- TRACKS ---
export const saveTracksToDB = async (tracks: Track[], options: { skipCloud?: boolean } = {}): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([TRACKS_STORE], 'readwrite');
  const store = tx.objectStore(TRACKS_STORE);
  await store.clear();
  tracks.filter(t => !t.isExternal).forEach(t => store.put(t));

  if (!options.skipCloud && isSupabaseConfigured()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      for (const t of tracks.filter(t => !t.isExternal)) {
        const payload = mapTrackToSupabase(t, session.user.id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);
        if (isUUID) await supabase.from('tracks').upsert({ id: t.id, ...payload });
      }
    }
  }
};

export const loadTracksFromDB = async (forceLocal: boolean = false): Promise<Track[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!forceLocal && session && isSupabaseConfigured()) {
    const { data, error } = await supabase.from('tracks').select('*').eq('user_id', session.user.id).order('start_time', { ascending: false });
    if (data && !error) {
      const cloudTracks = data.map(mapSupabaseToTrack).filter((t): t is Track => t !== null);
      await saveTracksToDB(cloudTracks, { skipCloud: true });
      return cloudTracks;
    }
  }
  const db = await initDB();
  return new Promise((resolve) => {
    const req = db.transaction([TRACKS_STORE], 'readonly').objectStore(TRACKS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
  });
};

// --- PROFILE ---
export const saveProfileToDB = async (profile: UserProfile, options: { skipCloud?: boolean } = {}): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([PROFILE_STORE], 'readwrite');
  tx.objectStore(PROFILE_STORE).put({ id: 'current', ...profile });

  if (!options.skipCloud && isSupabaseConfigured()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        name: profile.name,
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        gender: profile.gender,
        max_hr: profile.maxHr,
        resting_hr: profile.restingHr,
        goals: profile.goals || [],
        ai_personality: profile.aiPersonality,
        personal_notes: profile.personalNotes,
        shoes: profile.shoes || [],
        weight_history: profile.weightHistory || [],
        strava_auto_sync: profile.stravaAutoSync, // New Field
        updated_at: new Date().toISOString()
      });
    }
  }
};

export const loadProfileFromDB = async (forceLocal: boolean = false): Promise<UserProfile | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!forceLocal && session && isSupabaseConfigured()) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data && !error) {
      const cloudProfile: UserProfile = {
        id: session.user.id,
        name: data.name,
        email: session.user.email,
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
        weightHistory: data.weight_history,
        stravaAutoSync: data.strava_auto_sync
      };
      await saveProfileToDB(cloudProfile, { skipCloud: true });
      return cloudProfile;
    }
  }
  const db = await initDB();
  return new Promise((resolve) => {
    const req = db.transaction([PROFILE_STORE], 'readonly').objectStore(PROFILE_STORE).get('current');
    req.onsuccess = () => {
        const res = req.result;
        if (res && session?.user?.email) res.email = session.user.email;
        resolve(res || null);
    };
  });
};

// --- PLANNED WORKOUTS ---
export const savePlannedWorkoutsToDB = async (workouts: PlannedWorkout[], options: { skipCloud?: boolean } = {}): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([PLANNED_STORE], 'readwrite');
  const store = tx.objectStore(PLANNED_STORE);
  await store.clear();
  workouts.forEach(w => store.put(w));

  if (!options.skipCloud && isSupabaseConfigured()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      for (const w of workouts) {
        await supabase.from('planned_workouts').upsert({
          id: w.id.length === 36 ? w.id : undefined,
          user_id: session.user.id,
          title: w.title,
          description: w.description,
          date: w.date.toISOString(),
          activity_type: w.activityType,
          is_ai_suggested: w.isAiSuggested,
          completed_track_id: w.completedTrackId
        });
      }
    }
  }
};

export const loadPlannedWorkoutsFromDB = async (forceLocal: boolean = false): Promise<PlannedWorkout[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!forceLocal && session && isSupabaseConfigured()) {
    const { data, error } = await supabase.from('planned_workouts').select('*').eq('user_id', session.user.id);
    if (data && !error) {
      const workouts = data.map((w: any) => ({
        id: w.id, title: w.title, description: w.description, date: new Date(w.date),
        activity_type: w.activity_type, isAiSuggested: w.is_ai_suggested, completedTrackId: w.completed_track_id
      }));
      await savePlannedWorkoutsToDB(workouts, { skipCloud: true });
      return workouts;
    }
  }
  const db = await initDB();
  return new Promise((resolve) => {
    const req = db.transaction([PLANNED_STORE], 'readonly').objectStore(PLANNED_STORE).getAll();
    req.onsuccess = () => resolve(req.result.map((w: any) => ({ ...w, date: new Date(w.date) })));
  });
};

// --- CHATS ---
export const saveChatToDB = async (id: string, messages: ChatMessage[], options: { skipCloud?: boolean } = {}): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([CHATS_STORE], 'readwrite');
  tx.objectStore(CHATS_STORE).put({ id, messages, updatedAt: Date.now() });

  if (!options.skipCloud && isSupabaseConfigured()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('chats').upsert({ id, user_id: session.user.id, messages, updated_at: new Date().toISOString() });
    }
  }
};

export const loadChatFromDB = async (id: string, forceLocal: boolean = false): Promise<ChatMessage[] | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!forceLocal && session && isSupabaseConfigured()) {
    const { data } = await supabase.from('chats').select('*').eq('id', id).maybeSingle();
    if (data) {
      await saveChatToDB(id, data.messages, { skipCloud: true });
      return data.messages;
    }
  }
  const db = await initDB();
  return new Promise((resolve) => {
    const req = db.transaction([CHATS_STORE], 'readonly').objectStore(CHATS_STORE).get(id);
    req.onsuccess = () => resolve(req.result?.messages || null);
  });
};

// --- UTILS ---
export const syncTrackToCloud = async (track: Track) => {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || track.isExternal) return;
    const payload = mapTrackToSupabase(track, session.user.id);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(track.id)) {
        await supabase.from('tracks').upsert({ id: track.id, ...payload });
    } else {
        const { data, error } = await supabase.from('tracks').insert(payload).select().single();
        if (!error && data) {
            const db = await initDB();
            const tx = db.transaction([TRACKS_STORE], 'readwrite');
            tx.objectStore(TRACKS_STORE).delete(track.id);
            track.id = data.id;
            tx.objectStore(TRACKS_STORE).put(track);
        }
    }
};

export const deleteTrackFromCloud = async (id: string) => {
    if (!isSupabaseConfigured()) return;
    await supabase.from('tracks').delete().eq('id', id);
};

export const deletePlannedWorkoutFromCloud = async (id: string) => {
    if (!isSupabaseConfigured()) return;
    await supabase.from('planned_workouts').delete().eq('id', id);
};

export const importAllData = async (data: any): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const tx = db.transaction([TRACKS_STORE, CHATS_STORE, PROFILE_STORE, PLANNED_STORE], 'readwrite');
            
            // Non puliamo più tutto ciecamente se stiamo facendo un merge dal chiamante
            // Ma per un restore totale il chiamante deve decidere se passare il set completo.
            tx.objectStore(TRACKS_STORE).clear();
            tx.objectStore(CHATS_STORE).clear();
            tx.objectStore(PROFILE_STORE).clear();
            tx.objectStore(PLANNED_STORE).clear();
            
            if (data.tracks) {
                data.tracks.forEach((t: any) => {
                    tx.objectStore(TRACKS_STORE).put({ 
                        ...t, 
                        points: t.points.map((p: any) => ({ ...p, time: new Date(p.time) })) 
                    });
                });
            }
            
            if (data.chats) {
                data.chats.forEach((c: any) => {
                    tx.objectStore(CHATS_STORE).put(c);
                });
            }
            
            if (data.profile) {
                tx.objectStore(PROFILE_STORE).put({ id: 'current', ...data.profile });
            }
            
            if (data.plannedWorkouts) {
                data.plannedWorkouts.forEach((w: any) => {
                    tx.objectStore(PLANNED_STORE).put({ ...w, date: new Date(w.date) });
                });
            }
            
            tx.oncomplete = () => {
                console.log("Database import completed successfully.");
                resolve();
            };
            
            tx.onerror = (e) => reject(e);
        } catch (err) {
            reject(err);
        }
    });
};

export const exportAllData = async (): Promise<any> => {
    const db = await initDB();
    const tx = db.transaction([TRACKS_STORE, CHATS_STORE, PROFILE_STORE, PLANNED_STORE], 'readonly');
    
    const [tracks, chats, profile, plannedWorkouts] = await Promise.all([
        new Promise(r => tx.objectStore(TRACKS_STORE).getAll().onsuccess = (e: any) => r(e.target.result)),
        new Promise(r => tx.objectStore(CHATS_STORE).getAll().onsuccess = (e: any) => r(e.target.result)),
        new Promise(r => tx.objectStore(PROFILE_STORE).get('current').onsuccess = (e: any) => r(e.target.result)),
        new Promise(r => tx.objectStore(PLANNED_STORE).getAll().onsuccess = (e: any) => r(e.target.result))
    ]);

    return { 
        tracks, 
        chats, 
        profile, 
        plannedWorkouts, 
        exportedAt: new Date().toISOString(),
        app: "RunCoachAI"
    };
};

export const syncAllChatsToCloud = async () => {};

export const cleanUpRemoteDuplicates = async (userId: string): Promise<number> => {
    if (!isSupabaseConfigured() || !userId) return 0;

    // Fetch light metadata ONLY (not full points)
    const { data, error } = await supabase
        .from('tracks')
        .select('id, start_time, distance_km, duration_ms')
        .eq('user_id', userId);

    if (error || !data) throw new Error("Failed to fetch tracks for cleanup");

    const fingerprints = new Set<string>();
    const idsToDelete: string[] = [];

    data.forEach((t: any) => {
        // Fingerprint: Time + Distance (rounded) + Duration (rounded)
        const time = new Date(t.start_time).getTime();
        const dist = Math.round(Number(t.distance_km) * 1000); // meters
        const dur = Math.round(Number(t.duration_ms) / 1000); // seconds
        
        const fp = `${time}_${dist}_${dur}`;
        
        if (fingerprints.has(fp)) {
            idsToDelete.push(t.id);
        } else {
            fingerprints.add(fp);
        }
    });

    if (idsToDelete.length > 0) {
        const { error: delError } = await supabase.from('tracks').delete().in('id', idsToDelete);
        if (delError) throw delError;
    }

    return idsToDelete.length;
};
