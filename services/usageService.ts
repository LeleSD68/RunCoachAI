
import { ApiUsage, DailyCounts } from '../types';
import { hasCustomApiKey } from './aiHelper';
import { supabase } from './supabaseClient';

const USAGE_KEY = 'runcoach_api_usage';

// LIMITS FOR GUEST USERS (Using Default Key)
export const LIMITS = {
    workout: 1,
    analysis: 1,
    chat: 10 
};

export const getApiUsage = (): ApiUsage => {
    const stored = localStorage.getItem(USAGE_KEY);
    const today = new Date().toDateString();
    
    const defaultUsage: ApiUsage = { 
        requests: 0, 
        tokens: 0, 
        lastReset: today,
        dailyCounts: { workout: 0, analysis: 0, chat: 0 }
    };

    if (stored) {
        try {
            const usage = JSON.parse(stored) as ApiUsage;
            // Reset daily counts if day changed
            if (usage.lastReset !== today) {
                const resetUsage = { 
                    ...usage, 
                    lastReset: today,
                    dailyCounts: { workout: 0, analysis: 0, chat: 0 }
                };
                localStorage.setItem(USAGE_KEY, JSON.stringify(resetUsage));
                return resetUsage;
            }
            // Ensure dailyCounts structure exists for old data
            if (!usage.dailyCounts) {
                usage.dailyCounts = { workout: 0, analysis: 0, chat: 0 };
            }
            return usage;
        } catch (e) {
            return defaultUsage;
        }
    }
    return defaultUsage;
};

export const trackUsage = (tokens: number = 0) => {
    const current = getApiUsage();
    const updated = {
        ...current,
        requests: current.requests + 1,
        tokens: current.tokens + tokens
    };
    localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
    return updated;
};

export const addTokensToUsage = (tokens: number) => {
    const current = getApiUsage();
    const updated = {
        ...current,
        tokens: current.tokens + tokens
    };
    localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
    return updated;
};

export const getRemainingCredits = (): DailyCounts => {
    // If user provides their own key, they have infinite credits
    if (hasCustomApiKey()) {
        return { workout: 9999, analysis: 9999, chat: 9999 };
    }

    const usage = getApiUsage();
    return {
        workout: Math.max(0, LIMITS.workout - usage.dailyCounts.workout),
        analysis: Math.max(0, LIMITS.analysis - usage.dailyCounts.analysis),
        chat: Math.max(0, LIMITS.chat - usage.dailyCounts.chat),
    };
};

export const checkDailyLimit = (type: keyof DailyCounts): boolean => {
    // If user provides their own key, limit is always met
    if (hasCustomApiKey()) return true;

    const usage = getApiUsage();
    return usage.dailyCounts[type] < LIMITS[type];
};

export const incrementDailyLimit = (type: keyof DailyCounts) => {
    const usage = getApiUsage();
    usage.dailyCounts[type] = (usage.dailyCounts[type] || 0) + 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    return usage;
};

// Logs app access for admin analytics. 
// Uses sessionStorage to debounce (log only once per session/tab load)
export const logAppAccess = async (userId: string) => {
    if (!userId || userId === 'guest') return;
    
    const key = `logged_access_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;

    try {
        await supabase.from('access_logs').insert({ user_id: userId });
        sessionStorage.setItem(key, 'true');
    } catch (e) {
        console.warn("Log access failed", e);
    }
};
