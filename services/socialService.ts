
import { supabase } from './supabaseClient';
import { UserProfile, FriendRequest, Track, DirectMessage } from '../types';

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
    // 1. Recupera le richieste pendenti (solo gli ID)
    const { data: requests, error } = await supabase
        .from('friends')
        .select('id, status, created_at, user_id_1')
        .eq('user_id_2', currentUserId)
        .eq('status', 'pending');

    if (error) {
        console.error("Error fetching friend requests:", error);
        return [];
    }

    if (!requests || requests.length === 0) return [];

    // 2. Recupera i profili di chi ha fatto la richiesta
    const requesterIds = requests.map((r: any) => r.user_id_1);
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, last_seen_at')
        .in('id', requesterIds);

    if (profilesError) {
        console.error("Error fetching requester profiles:", profilesError);
        return [];
    }

    // 3. Unisci i dati
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));

    return requests.map((r: any) => {
        const profile = profilesMap.get(r.user_id_1);
        return {
            id: r.id,
            status: r.status,
            createdAt: r.created_at,
            requester: profile || { id: r.user_id_1, name: 'Utente sconosciuto' }
        };
    });
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

// Exported for external use in App.tsx notification handling
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
        isOnline: p.last_seen_at && (new Date().getTime() - new Date(p.last_seen_at).getTime() < 2 * 60 * 1000) // Online if seen in last 2 mins (stricter)
    })) || [];
};

export const getFriendsActivityFeed = async (currentUserId: string): Promise<Track[]> => {
    // Requires the RLS policy "Users can view own and friends tracks" to be active
    // 1. Fetch tracks raw data
    const { data: tracks, error } = await supabase
        .from('tracks')
        .select('id, name, distance_km, duration_ms, start_time, activity_type, color, user_id')
        .neq('user_id', currentUserId) // Don't show my own tracks in "Friends Feed"
        .eq('is_public', true) // NEW: Only fetch tracks marked as public
        .order('start_time', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Feed error", error);
        return [];
    }

    if (!tracks || tracks.length === 0) return [];

    // 2. Fetch profiles for these tracks
    const userIds = [...new Set(tracks.map((t: any) => t.user_id))];
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
        
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p.name]));

    return tracks.map((t: any) => ({
        id: t.id,
        name: t.name,
        distance: t.distance_km,
        duration: t.duration_ms,
        points: [{ time: new Date(t.start_time), lat: 0, lon: 0, ele: 0, cummulativeDistance: 0 }], // Minimal points for list
        color: t.color || '#3b82f6',
        activityType: t.activity_type,
        userDisplayName: profilesMap.get(t.user_id) || 'Runner'
    }));
};

export const sendDirectMessage = async (senderId: string, receiverId: string, content: string) => {
    const { error } = await supabase.from('direct_messages').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content
    });
    if (error) throw error;
};

export const getDirectMessages = async (currentUserId: string, friendId: string): Promise<DirectMessage[]> => {
    // Fetch latest 50 messages by ordering desc, then reverse for display
    const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Chat fetch error", error);
        return [];
    }

    // Reverse to show oldest first in the chat UI (chronological)
    return data.reverse().map((msg: any) => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        createdAt: msg.created_at
    }));
};
