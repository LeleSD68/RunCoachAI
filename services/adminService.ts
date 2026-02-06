
import { supabase } from './supabaseClient';

export interface AdminStats {
    totalUsers: number;
    activeToday: number;
    totalTracks: number;
    totalWorkouts: number;
    recentUsers: { name: string; email: string; last_seen_at: string }[];
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

    // 5. Recent Users List (Last 10)
    const { data: recentUsers } = await supabase
        .from('profiles')
        .select('name, last_seen_at') // Email might be restricted or in auth.users, stick to profiles for now
        .order('last_seen_at', { ascending: false })
        .limit(10);

    return {
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        totalTracks: totalTracks || 0,
        totalWorkouts: totalWorkouts || 0,
        recentUsers: (recentUsers || []) as any
    };
};
