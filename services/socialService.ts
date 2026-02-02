
import { supabase } from './supabaseClient';
import { UserProfile, FriendRequest, Track, DirectMessage, Reaction } from '../types';

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
    const { data: requests, error } = await supabase
        .from('friends')
        .select('id, status, created_at, user_id_1')
        .eq('user_id_2', currentUserId)
        .eq('status', 'pending');

    if (error || !requests) return [];

    const requesterIds = requests.map((r: any) => r.user_id_1);
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, last_seen_at')
        .in('id', requesterIds);
        
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));

    return requests.map((r: any) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        requester: profilesMap.get(r.user_id_1) || { id: r.user_id_1, name: 'Utente sconosciuto' }
    }));
};

export const acceptFriendRequest = async (requestId: string) => {
    const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
    if (error) throw error;
};

export const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', requestId);
    if (error) throw error;
};

export const getFriends = async (currentUserId: string): Promise<UserProfile[]> => {
    const { data, error } = await supabase
        .from('friends')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`)
        .eq('status', 'accepted');

    if (error) return [];
    const friendIds = data.map((r: any) => r.user_id_1 === currentUserId ? r.user_id_2 : r.user_id_1);
    if (friendIds.length === 0) return [];

    const { data: profiles } = await supabase.from('profiles').select('id, name, last_seen_at').in('id', friendIds);
    
    // Calculate online status here based on 5 minute threshold
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return profiles?.map((p: any) => ({
        ...p,
        isOnline: p.last_seen_at ? new Date(p.last_seen_at) > fiveMinutesAgo : false
    })) || [];
};

export const getFriendsActivityFeed = async (currentUserId: string): Promise<Track[]> => {
    // Recuperiamo le tracce pubbliche
    const { data: tracks, error } = await supabase
        .from('tracks')
        .select(`
            id, name, distance_km, duration_ms, start_time, activity_type, color, user_id, points_data, rating,
            activity_reactions (user_id, emoji)
        `)
        .neq('user_id', currentUserId)
        .eq('is_public', true)
        .order('start_time', { ascending: false })
        .limit(20);

    if (error || !tracks) return [];

    const userIds = [...new Set(tracks.map((t: any) => t.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds);
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p.name]));

    return tracks.map((t: any) => {
        let points = [];
        try {
            const allPoints = typeof t.points_data === 'string' ? JSON.parse(t.points_data) : t.points_data;
            if (Array.isArray(allPoints)) {
                // Keep minimal points for the preview, full points will be fetched or kept in state
                const step = Math.max(1, Math.floor(allPoints.length / 100));
                points = allPoints.filter((_, i) => i % step === 0).map(p => ({ ...p, time: new Date(p.time) }));
            }
        } catch (e) {}

        const reactions: Reaction[] = t.activity_reactions?.map((r: any) => ({
            userId: r.user_id,
            emoji: r.emoji
        })) || [];

        return {
            id: t.id,
            name: t.name,
            distance: t.distance_km,
            duration: t.duration_ms,
            points: points,
            color: t.color || '#3b82f6',
            activityType: t.activity_type,
            rating: t.rating,
            userDisplayName: profilesMap.get(t.user_id) || 'Runner',
            userId: t.user_id,
            startTime: t.start_time,
            reactions: reactions
        };
    });
};

export const sendDirectMessage = async (senderId: string, receiverId: string, content: string) => {
    const { error } = await supabase.from('direct_messages').insert({ sender_id: senderId, receiver_id: receiverId, content: content });
    if (error) throw error;
};

export const getDirectMessages = async (currentUserId: string, friendId: string): Promise<DirectMessage[]> => {
    const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return [];
    return data.reverse().map((msg: any) => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        createdAt: msg.created_at
    }));
};

export const toggleReaction = async (trackId: string, userId: string, emoji: string) => {
    // Check if reaction exists
    const { data } = await supabase
        .from('activity_reactions')
        .select('id')
        .eq('track_id', trackId)
        .eq('user_id', userId)
        .single();

    if (data) {
        // Remove reaction (toggle off)
        await supabase.from('activity_reactions').delete().eq('id', data.id);
        return 'removed';
    } else {
        // Add reaction
        await supabase.from('activity_reactions').insert({ track_id: trackId, user_id: userId, emoji });
        return 'added';
    }
};
