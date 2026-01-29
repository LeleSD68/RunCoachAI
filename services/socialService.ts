
import { supabase } from './supabaseClient';
import { UserProfile, FriendRequest, Track } from '../types';

export const updatePresence = async (userId: string) => {
    if (!userId) return;
    try {
        await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
    } catch (e) {
        console.error("Presence update failed", e);
    }
};

export const searchUsers = async (query: string): Promise<UserProfile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(10);
    
    if (error) throw error;
    return data || [];
};

export const sendFriendRequest = async (toUserId: string, currentUserId: string) => {
    // Check if already friends or pending
    const { data: existing } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id_1.eq.${currentUserId},user_id_2.eq.${toUserId}),and(user_id_1.eq.${toUserId},user_id_2.eq.${currentUserId})`);
    
    if (existing && existing.length > 0) throw new Error("Richiesta già inviata o siete già amici.");

    const { error } = await supabase.from('friends').insert({
        user_id_1: currentUserId,
        user_id_2: toUserId,
        status: 'pending'
    });
    if (error) throw error;
};

export const getFriendRequests = async (currentUserId: string): Promise<FriendRequest[]> => {
    const { data, error } = await supabase
        .from('friends')
        .select(`
            id,
            status,
            created_at,
            user_id_1,
            requester:profiles!user_id_1(id, name, last_seen_at)
        `)
        .eq('user_id_2', currentUserId)
        .eq('status', 'pending');

    if (error) {
        console.error(error);
        return [];
    }

    return data.map((r: any) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        requester: r.requester
    }));
};

export const acceptFriendRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);
    if (error) throw error;
};

export const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId);
    if (error) throw error;
};

export const getFriends = async (currentUserId: string): Promise<UserProfile[]> => {
    // Get confirmed friendships
    const { data, error } = await supabase
        .from('friends')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
        .eq('status', 'accepted');

    if (error) return [];

    const friendIds = data.map((r: any) => r.user_id_1 === currentUserId ? r.user_id_2 : r.user_id_1);
    
    if (friendIds.length === 0) return [];

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, last_seen_at')
        .in('id', friendIds);

    return profiles?.map((p: any) => ({
        ...p,
        isOnline: p.last_seen_at && (new Date().getTime() - new Date(p.last_seen_at).getTime() < 5 * 60 * 1000) // Online if seen in last 5 mins
    })) || [];
};

export const getFriendsActivityFeed = async (currentUserId: string): Promise<Track[]> => {
    // Requires the RLS policy "Users can view own and friends tracks" to be active
    const { data, error } = await supabase
        .from('tracks')
        .select(`
            id, name, distance_km, duration_ms, start_time, activity_type, color,
            profiles!tracks_user_id_fkey(name)
        `)
        .neq('user_id', currentUserId) // Don't show my own tracks in "Friends Feed"
        .order('start_time', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Feed error", error);
        return [];
    }

    return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        distance: t.distance_km,
        duration: t.duration_ms,
        points: [{ time: new Date(t.start_time), lat: 0, lon: 0, ele: 0, cummulativeDistance: 0 }], // Minimal points for list
        color: t.color || '#3b82f6',
        activityType: t.activity_type,
        userDisplayName: t.profiles?.name || 'Amico'
    }));
};
