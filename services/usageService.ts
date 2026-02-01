
import { ApiUsage } from '../types';

const USAGE_KEY = 'runcoach_api_usage';

export const getApiUsage = (): ApiUsage => {
    const stored = localStorage.getItem(USAGE_KEY);
    const today = new Date().toDateString();
    
    if (stored) {
        const usage = JSON.parse(stored) as ApiUsage;
        if (usage.lastReset !== today) {
            return { requests: 0, tokens: 0, lastReset: today };
        }
        return usage;
    }
    return { requests: 0, tokens: 0, lastReset: today };
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
