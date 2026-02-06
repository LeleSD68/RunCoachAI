
import { supabase } from './supabaseClient';
import { UserProfile, FriendRequest, Track, DirectMessage, Reaction, SocialGroup, GroupMessage } from '../types';

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

export const getTrackById = async (trackId: string): Promise<Track | null> => {
    // Requires that the user has permission (is owner, or is shared with user/group/public)
    const { data: t, error } = await supabase.from('tracks').select('*').eq('id', trackId).single();
    
    if (error || !t) return null;

    let points = [];
    try {
        points = typeof t.points_data === 'string' ? JSON.parse(t.points_data) : t.points_data;
        if (Array.isArray(points)) {
            points = points.map((p: any) => ({ ...p, time: new Date(p.time) }));
        }
    } catch (e) {}

    return {
        id: t.id,
        name: t.name,
        distance: t.distance_km,
        duration: t.duration_ms,
        points: points,
        color: t.color || '#3b82f6',
        activityType: t.activity_type,
        rating: t.rating,
        userDisplayName: 'Shared Activity',
        userId: t.user_id,
        startTime: t.start_time,
        notes: t.notes,
        shoe: t.shoe,
        rpe: t.rpe,
        isPublic: t.is_public
    };
};

export const getFriendsActivityFeed = async (currentUserId: string, groupId?: string): Promise<Track[]> => {
    let query = supabase
        .from('tracks')
        .select(`
            id, name, distance_km, duration_ms, start_time, activity_type, color, user_id, points_data, rating,
            shared_with_users, shared_with_groups, is_public,
            activity_reactions (user_id, emoji)
        `)
        .order('start_time', { ascending: false })
        .limit(30);

    if (groupId) {
        query = query.contains('shared_with_groups', [groupId]);
    } else {
        query = query.neq('user_id', currentUserId);
    }

    const { data: tracks, error } = await query;

    if (error || !tracks) return [];

    const userIds = [...new Set(tracks.map((t: any) => t.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds);
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p.name]));

    return tracks.map((t: any) => {
        let points = [];
        try {
            const allPoints = typeof t.points_data === 'string' ? JSON.parse(t.points_data) : t.points_data;
            if (Array.isArray(allPoints)) {
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
            reactions: reactions,
            isPublic: t.is_public,
            sharedWithUsers: t.shared_with_users,
            sharedWithGroups: t.shared_with_groups
        };
    });
};

// --- GROUP MANAGEMENT ---

export const createGroup = async (name: string, description: string, ownerId: string): Promise<SocialGroup | null> => {
    const { data, error } = await supabase.from('social_groups').insert({ name, description, owner_id: ownerId }).select().single();
    if (error) throw error;
    await supabase.from('social_group_members').insert({ group_id: data.id, user_id: ownerId });
    return { ...data, memberCount: 1, isMember: true };
};

export const getGroups = async (currentUserId: string): Promise<SocialGroup[]> => {
    const { data: allGroups, error } = await supabase.from('social_groups').select('*').order('created_at', { ascending: false });
    if(error) return [];

    const { data: myMemberships } = await supabase.from('social_group_members').select('group_id').eq('user_id', currentUserId);
    const myGroupIds = new Set(myMemberships?.map((m:any) => m.group_id));

    const { data: allMembers } = await supabase.from('social_group_members').select('group_id');
    const counts = new Map();
    allMembers?.forEach((m:any) => counts.set(m.group_id, (counts.get(m.group_id)||0)+1));

    return allGroups.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        ownerId: g.owner_id,
        memberCount: counts.get(g.id) || 0,
        isMember: myGroupIds.has(g.id)
    }));
};

export const joinGroup = async (groupId: string, userId: string) => {
    const { error } = await supabase.from('social_group_members').insert({ group_id: groupId, user_id: userId });
    if (error) throw error;
};

export const leaveGroup = async (groupId: string, userId: string) => {
    const { error } = await supabase.from('social_group_members').delete().match({ group_id: groupId, user_id: userId });
    if (error) throw error;
};

export const addMemberToGroup = async (groupId: string, userId: string) => {
    const { error } = await supabase.from('social_group_members').insert({ group_id: groupId, user_id: userId });
    if (error) {
        if (error.code !== '23505') throw error; // Ignore duplicate key errors (already member)
    }
};

export const removeMemberFromGroup = async (groupId: string, userId: string) => {
    const { error } = await supabase.from('social_group_members').delete().match({ group_id: groupId, user_id: userId });
    if (error) throw error;
};

// Return full profile objects for members
export const getGroupMembersDetails = async (groupId: string): Promise<UserProfile[]> => {
    const { data: memberIds, error } = await supabase
        .from('social_group_members')
        .select('user_id')
        .eq('group_id', groupId);
    
    if (error || !memberIds || memberIds.length === 0) return [];
    
    const ids = memberIds.map((m: any) => m.user_id);
    
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, last_seen_at')
        .in('id', ids);
    
    return profiles || [];
};

export const getGroupMembers = async (groupId: string): Promise<string[]> => {
    const { data, error } = await supabase.from('social_group_members').select('user_id').eq('group_id', groupId);
    if(error) return [];
    return data.map((m: any) => m.user_id);
};

// --- SHARING ---

export const updateTrackSharing = async (trackId: string, isPublic: boolean, sharedUsers: string[], sharedGroups: string[]) => {
    const { error } = await supabase.from('tracks').update({
        is_public: isPublic,
        shared_with_users: sharedUsers,
        shared_with_groups: sharedGroups
    }).eq('id', trackId);
    
    if (error) throw error;
};

export const sendDirectMessage = async (senderId: string, receiverId: string, content: string) => {
    const { error } = await supabase.from('direct_messages').insert({ sender_id: senderId, receiver_id: receiverId, content: content });
    if (error) throw error;
};

export const deleteDirectMessage = async (messageId: string) => {
    const { error } = await supabase.from('direct_messages').delete().eq('id', messageId);
    if (error) throw error;
};

export const editDirectMessage = async (messageId: string, newContent: string) => {
    const { error } = await supabase.from('direct_messages').update({ content: newContent }).eq('id', messageId);
    if (error) throw error;
};

export const getDirectMessages = async (currentUserId: string, friendId: string): Promise<DirectMessage[]> => {
    const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, created_at, read_at')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return [];
    return data.reverse().map((msg: any) => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        createdAt: msg.created_at,
        readAt: msg.read_at
    }));
};

// --- GROUP MESSAGING (NEW) ---

export const sendGroupMessage = async (senderId: string, groupId: string, content: string) => {
    const { error } = await supabase.from('group_messages').insert({ 
        sender_id: senderId, 
        group_id: groupId, 
        content: content 
    });
    if (error) throw error;
};

export const getGroupMessages = async (groupId: string): Promise<GroupMessage[]> => {
    const { data, error } = await supabase
        .from('group_messages')
        .select('id, sender_id, group_id, content, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return [];
    
    // Fetch sender names
    const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', senderIds);
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p.name]));

    return data.reverse().map((msg: any) => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: profilesMap.get(msg.sender_id) || 'Unknown',
        groupId: msg.group_id,
        content: msg.content,
        createdAt: msg.created_at
    }));
};

// --- UNREAD ---

export const getUnreadSenders = async (currentUserId: string): Promise<Set<string>> => {
    const { data, error } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .is('read_at', null);
    
    if (error || !data) return new Set();
    return new Set(data.map((msg: any) => msg.sender_id));
};

export const getMostRecentUnreadSender = async (currentUserId: string): Promise<string | null> => {
    const { data } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    return data?.sender_id || null;
};

export const toggleReaction = async (trackId: string, userId: string, emoji: string) => {
    const { data } = await supabase
        .from('activity_reactions')
        .select('id')
        .eq('track_id', trackId)
        .eq('user_id', userId)
        .single();

    if (data) {
        await supabase.from('activity_reactions').delete().eq('id', data.id);
        return 'removed';
    } else {
        await supabase.from('activity_reactions').insert({ track_id: trackId, user_id: userId, emoji });
        return 'added';
    }
};

// --- NOTIFICATIONS UTILS ---

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
    if (!userId) return 0;
    
    // 1. Unread Messages
    const { count: msgCount } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .is('read_at', null);

    // 2. Pending Friend Requests
    const { count: reqCount } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id_2', userId)
        .eq('status', 'pending');

    return (msgCount || 0) + (reqCount || 0);
};

export const markMessagesAsRead = async (userId: string, senderId?: string) => {
    if (!userId) return;
    
    let query = supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .is('read_at', null);

    // If senderId provided, mark only chat with that user (Correct behavior for WhatsApp style)
    if (senderId) {
        query = query.eq('sender_id', senderId);
    }

    await query;
};
