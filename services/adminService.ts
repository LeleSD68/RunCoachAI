
import { supabase } from './supabaseClient';
import { AdminUserStats, SubscriptionTier } from '../types';

export interface AdminStats {
    totalUsers: number;
    activeToday: number;
    totalTracks: number;
    totalWorkouts: number;
    usersList: AdminUserStats[];
}

export const getAdminStats = async (): Promise<AdminStats> => {
    // 1. Total Users
    const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // 2. Active Today (Users seen in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('last_seen_at', oneDayAgo);

    // 3. Total Tracks
    const { count: totalTracks } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true });

    // 4. Total Workouts
    const { count: totalWorkouts } = await supabase
        .from('planned_workouts')
        .select('*', { count: 'exact', head: true });

    // 5. Users List with Stats (Via RPC for performance)
    const { data: usersData, error } = await supabase.rpc('get_admin_users_list');
    
    if (error) {
        console.error("RPC Error", error);
        throw new Error("Failed to fetch user stats");
    }

    const usersList: AdminUserStats[] = (usersData || []).map((u: any) => ({
        id: u.id,
        name: u.name || 'Senza Nome',
        isAdmin: u.is_admin,
        subscriptionTier: u.subscription_tier as SubscriptionTier,
        lastSeenAt: u.last_seen_at,
        logins24h: u.logins_24h,
        logins7d: u.logins_7d,
        logins30d: u.logins_30d
    }));

    return {
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        totalTracks: totalTracks || 0,
        totalWorkouts: totalWorkouts || 0,
        usersList
    };
};

export const updateUserStatus = async (userId: string, tier: SubscriptionTier, isAdmin: boolean) => {
    const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: tier, is_admin: isAdmin })
        .eq('id', userId);
    
    if (error) throw error;
};
