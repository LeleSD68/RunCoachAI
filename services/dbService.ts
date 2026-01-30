
import { Track, ChatMessage, UserProfile, PlannedWorkout } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'GpxVizDB';
const TRACKS_STORE = 'tracks';
const CHATS_STORE = 'chats';
const PROFILE_STORE = 'profile';
const PLANNED_STORE = 'planned_workouts';
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
const mapTrackToSupabase = (t: Track, userId: string) => {
    // Safety check for points
    if (!t.points || t.points.length === 0) return null;
    
    return {
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
        is_public: t.isPublic,
        has_chat: t.hasChat,
        linked_workout: t.linkedWorkout,
    };
};

const mapSupabaseToTrack = (row: any): Track | null => {
    try {
        if (!row) return null;

        let pointsData = row.points_data;
        if (typeof pointsData === 'string') {
            try {
                pointsData = JSON.parse(pointsData);
            } catch (e) {
                console.error("Error parsing points_data JSON for track:", row.id, e);
                return null;
            }
        }

        if (!pointsData || !Array.isArray(pointsData) || pointsData.length === 0) {
            console.warn("Invalid or empty points_data for track:", row.id);
            return null;
        }
        
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
    } catch (e) {
        console.error("Error mapping track from Supabase:", e);
        return null;
    }
};

// --- HELPER DEDUPLICAZIONE ---
const deduplicateTracks = (tracks: Track[]): Track[] => {
    const seen = new Set<string>();
    return tracks.filter(t => {
        if (!t.points || t.points.length === 0) return false;
        // Fingerprint: StartTime + Distance (3 decimals) + Duration
        // This allows matching a local 'strava-123' track with a cloud 'uuid-abc' track if they are the same run
        const fingerprint = `${t.points[0].time.getTime()}-${t.distance.toFixed(3)}-${t.duration}`;
        if (seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
    });
};

const deduplicateWorkouts = (workouts: PlannedWorkout[]): PlannedWorkout[] => {
    const seen = new Set<string>();
    return workouts.filter(w => {
        const dateStr = w.date instanceof Date ? w.date.toISOString().split('T')[0] : new Date(w.date).toISOString().split('T')[0];
        const fingerprint = `${dateStr}|${w.title.trim().toLowerCase()}|${w.activityType}`;
        if (seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
    });
};

// --- TRACKS ---
export const saveTracksToDB = async (tracks: Track[], options: { skipCloud?: boolean } = {}): Promise<void> => {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([TRACKS_STORE], 'readwrite');
    const store = transaction.objectStore(TRACKS_STORE);
    store.clear().onsuccess = () => {
      tracks.filter(t => !t.isExternal).forEach(t => store.put(t));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  if (!options.skipCloud) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isSupabaseConfigured()) {
          const validTracks = tracks.filter(t => !t.isExternal);
          for (const t of validTracks) {
              const payload = mapTrackToSupabase(t, session.user.id);
              if (!payload) continue;
              
              // Only upsert if it already has a UUID. New tracks are handled by syncTrackToCloud logic called explicitly
              if (t.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
                 await supabase.from('tracks').upsert({ id: t.id, ...payload });
              }
          }
      }
  }
};

const updateWorkoutReferences = async (oldTrackId: string, newTrackId: string) => {
    const db = await initDB();
    const tx = db.transaction([PLANNED_STORE], 'readwrite');
    const store = tx.objectStore(PLANNED_STORE);
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
            const workout = cursor.value as PlannedWorkout;
            if (workout.completedTrackId === oldTrackId) {
                const updated = { ...workout, completedTrackId: newTrackId };
                cursor.update(updated);
            }
            cursor.continue();
        }
    };
};

export const syncTrackToCloud = async (track: Track) => {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || track.isExternal) return;

    const payload = mapTrackToSupabase(track, session.user.id);
    if (!payload) return; // Skip invalid tracks

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(track.id);

    try {
        if (!isUUID) {
            // INSERT: Rely on DB default uuid_generate_v4()
            const { data, error } = await supabase.from('tracks').insert(payload).select().single();
            
            if (error) {
                console.error("Cloud Insert Error:", error);
                throw error;
            }

            if (data && data.id) {
                const oldId = track.id;
                track.id = data.id; // Update local object reference immediately
                
                // Update Local DB with new ID
                const db = await initDB();
                const tx = db.transaction([TRACKS_STORE], 'readwrite');
                const store = tx.objectStore(TRACKS_STORE);
                store.delete(oldId); // Remove old ID entry
                store.put(track);    // Add new ID entry
                
                // Fix references in workouts
                await updateWorkoutReferences(oldId, data.id);
            }
        } else {
            // UPSERT
            const { error } = await supabase.from('tracks').upsert({ id: track.id, ...payload });
            if (error) console.error("Cloud Upsert Error:", error);
        }
    } catch (e) {
        console.error("Sync Exception:", e);
    }
}

export const deleteTrackFromCloud = async (id: string) => {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('tracks').delete().eq('id', id);
}

export const loadTracksFromDB = async (forceLocal: boolean = false): Promise<Track[]> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!forceLocal && session && isSupabaseConfigured()) {
      const { data, error } = await supabase.from('tracks').select('*').order('start_time', { ascending: false });
      
      if (error) {
          console.error("Error fetching tracks from Supabase:", error);
          // Don't fall through to local loading if it's a real error, to avoid sync issues.
          // But here we want to at least show local data if cloud fails.
      } else if (data) {
          // Parse Cloud Tracks
          const cloudTracks = data
            .map(mapSupabaseToTrack)
            .filter((t): t is Track => t !== null);
            
          // SMART MERGE: Fetch local tracks to preserve unsynced data (e.g. Strava imports not yet pushed)
          const db = await initDB();
          const localTracks = await new Promise<Track[]>((resolve) => {
              const transaction = db.transaction([TRACKS_STORE], 'readonly');
              const store = transaction.objectStore(TRACKS_STORE);
              const request = store.getAll();
              request.onsuccess = () => resolve(request.result as Track[]);
              request.onerror = () => resolve([]);
          });

          // Identify unsynced tracks: Tracks with IDs that are NOT UUIDs (e.g. 'strava-...' or 'track-...')
          // Standard UUID regex
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const unsyncedTracks = localTracks.filter(t => !uuidRegex.test(t.id));

          // Combine Cloud tracks with Unsynced Local tracks.
          // deduplicateTracks will handle if an unsynced track is actually the same run as a cloud track (based on time/distance).
          // We put cloudTracks first so they take precedence (authoritative source).
          const combinedTracks = [...cloudTracks, ...unsyncedTracks];
          const finalTracks = deduplicateTracks(combinedTracks);
            
          // Save the merged authoritative state to local DB
          await saveTracksToDB(finalTracks, { skipCloud: true }); 
          
          return finalTracks;
      }
  }

  // Fallback: Load purely local
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
      resolve(deduplicateTracks(revived));
    };
    request.onerror = () => reject(request.error);
  });
};

// --- PLANNED WORKOUTS ---
export const savePlannedWorkoutsToDB = async (workouts: PlannedWorkout[], options: { skipCloud?: boolean } = {}): Promise<void> => {
  const db = await initDB();
  // Ensure we are saving a clean list
  const cleanWorkouts = deduplicateWorkouts(workouts);

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([PLANNED_STORE], 'readwrite');
    const store = transaction.objectStore(PLANNED_STORE);
    store.clear().onsuccess = () => {
      cleanWorkouts.forEach(w => store.put(w));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  if (!options.skipCloud) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isSupabaseConfigured()) {
          for (const w of cleanWorkouts) {
              const payload = {
                  // Only send ID if it is a valid UUID, otherwise let DB generate it
                  id: (w.id.length === 36) ? w.id : undefined,
                  user_id: session.user.id,
                  title: w.title,
                  description: w.description,
                  date: w.date.toISOString(),
                  activity_type: w.activityType,
                  is_ai_suggested: w.isAiSuggested,
                  completed_track_id: w.completedTrackId
              };
              
              const { data, error } = payload.id 
                ? await supabase.from('planned_workouts').upsert(payload)
                : await supabase.from('planned_workouts').insert(payload).select().single();

              if (error) console.error("Error saving workout:", error);
              
              // If we got a new ID from insert, update local
              if (data && data.id && !payload.id) {
                  w.id = data.id;
              }
          }
      }
  }
};

export const deletePlannedWorkoutFromCloud = async (id: string) => {
    if (!isSupabaseConfigured()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('planned_workouts').delete().eq('id', id);
};

export const loadPlannedWorkoutsFromDB = async (forceLocal: boolean = false): Promise<PlannedWorkout[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!forceLocal && session && isSupabaseConfigured()) {
      const { data, error } = await supabase.from('planned_workouts').select('*');
      if (data && !error) {
          const cloudWorkouts = data.map((w: any) => ({
              id: w.id,
              title: w.title,
              description: w.description,
              date: new Date(w.date),
              activityType: w.activity_type,
              isAiSuggested: w.is_ai_suggested,
              completedTrackId: w.completed_track_id
          }));
          
          const uniqueCloudWorkouts = deduplicateWorkouts(cloudWorkouts);
          
          await savePlannedWorkoutsToDB(uniqueCloudWorkouts, { skipCloud: true });
          return uniqueCloudWorkouts;
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
      resolve(deduplicateWorkouts(revived));
    };
    request.onerror = () => reject(request.error);
  });
};

// --- CHATS ---
export const saveChatToDB = async (id: string, messages: ChatMessage[], options: { skipCloud?: boolean } = {}): Promise<void> => {
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([CHATS_STORE], 'readwrite');
    const store = transaction.objectStore(CHATS_STORE);
    store.put({ id, messages, updatedAt: new Date().getTime() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  if (!options.skipCloud) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isSupabaseConfigured()) {
          await supabase.from('chats').upsert({
              id, 
              user_id: session.user.id,
              messages,
              updated_at: new Date().toISOString()
          });
      }
  }
};

export const restoreAllChatsFromCloud = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && isSupabaseConfigured()) {
        const { data, error } = await supabase.from('chats').select('*');
        if (data && !error && data.length > 0) {
            const db = await initDB();
            const tx = db.transaction([CHATS_STORE], 'readwrite');
            const store = tx.objectStore(CHATS_STORE);
            
            for (const chat of data) {
                store.put({ 
                    id: chat.id, 
                    messages: chat.messages, 
                    updatedAt: new Date(chat.updated_at).getTime() 
                });
            }
            console.log(`☁️ [Supabase] Restored ${data.length} chats to local DB.`);
        }
    }
};

export const loadChatFromDB = async (id: string, forceLocal: boolean = false): Promise<ChatMessage[] | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!forceLocal && session && isSupabaseConfigured()) {
      const { data } = await supabase.from('chats').select('*').eq('id', id).maybeSingle();
      if (data) {
          const db = await initDB();
          const tx = db.transaction([CHATS_STORE], 'readwrite');
          tx.objectStore(CHATS_STORE).put({ id, messages: data.messages, updatedAt: new Date(data.updated_at).getTime() });
          return data.messages;
      }
  }

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
export const saveProfileToDB = async (profile: UserProfile, options: { skipCloud?: boolean } = {}): Promise<void> => {
  if (!options.skipCloud) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isSupabaseConfigured()) {
          await supabase.from('profiles').upsert({
              id: session.user.id,
              name: profile.name,
              age: profile.age,
              weight: profile.weight,
              height: profile.height || null, 
              gender: profile.gender || null,
              max_hr: profile.maxHr,
              resting_hr: profile.restingHr,
              goals: profile.goals || [], 
              ai_personality: profile.aiPersonality || null,
              personal_notes: profile.personalNotes || null,
              shoes: profile.shoes || [], 
              weight_history: profile.weightHistory || [], 
          });
      }
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

export const loadProfileFromDB = async (forceLocal: boolean = false): Promise<UserProfile | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!forceLocal && session && isSupabaseConfigured()) {
      const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
      if (data && !error) {
          const cloudProfile: UserProfile = {
              id: session.user.id,
              name: data.name,
              email: session.user.email, // Inject email from session
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
          
          await saveProfileToDB(cloudProfile, { skipCloud: true });
          return cloudProfile;
      }
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROFILE_STORE], 'readonly');
    const store = transaction.objectStore(PROFILE_STORE);
    const request = store.get('current');
    request.onsuccess = () => {
        const profile = request.result;
        if (profile && session?.user?.email) {
            profile.email = session.user.email; // Inject email locally if session exists
        }
        resolve(profile || null);
    };
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
    
    const revivedTracks: Track[] = [];
    if (data.tracks && Array.isArray(data.tracks)) {
        data.tracks.forEach(t => {
            try {
                if (!t.id) return;
                const revivedTrack = {
                    ...t,
                    points: t.points.map(p => ({
                        ...p,
                        time: new Date(p.time) 
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

        deduplicateTracks(revivedTracks).forEach(t => tracksStore.put(t));
        deduplicateWorkouts(revivedWorkouts).forEach(w => plannedStore.put(w));

        if (data.chats && Array.isArray(data.chats)) {
            data.chats.forEach(c => { if (c.id) chatsStore.put(c); });
        }

        if (data.profile) {
            profileStore.put({ id: 'current', ...data.profile });
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(transaction.error);
    });
};

export const syncBackupToCloud = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && isSupabaseConfigured()) {
        const userId = session.user.id;
        console.log("☁️ [Supabase] Wiping existing cloud data for clean restore...");

        await supabase.from('tracks').delete().eq('user_id', userId);
        await supabase.from('planned_workouts').delete().eq('user_id', userId);
        await supabase.from('chats').delete().eq('user_id', userId);

        console.log("☁️ [Supabase] Uploading backup data to empty cloud...");

        const db = await initDB();
        
        // Profile
        const profile = await loadProfileFromDB(true);
        if (profile) await saveProfileToDB(profile); 

        // Tracks - iterate carefully to handle ID generation
        const tracks = await loadTracksFromDB(true);
        for (const t of tracks) {
            if (!t.isExternal) await syncTrackToCloud(t);
        }

        // Workouts
        const workouts = await loadPlannedWorkoutsFromDB(true);
        // Use standard saving logic which now handles sync
        await savePlannedWorkoutsToDB(workouts);

        // Chats
        const tx = db.transaction([CHATS_STORE], 'readonly');
        const chats: any[] = await new Promise((resolve) => {
            const req = tx.objectStore(CHATS_STORE).getAll();
            req.onsuccess = () => resolve(req.result || []);
        });

        if (chats.length > 0) {
            for (const chat of chats) {
                await supabase.from('chats').insert({
                    id: chat.id,
                    user_id: userId,
                    messages: chat.messages,
                    updated_at: new Date(chat.updatedAt || Date.now()).toISOString()
                });
            }
        }
        console.log("☁️ [Supabase] Restore complete.");
    }
};
