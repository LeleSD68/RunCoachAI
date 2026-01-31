
import { Track, TrackPoint } from '../types';
import { smoothElevation } from './dataProcessingService';

const STRAVA_TOKEN_KEY = 'strava_access_token';
const STRAVA_REFRESH_TOKEN_KEY = 'strava_refresh_token';
const STRAVA_EXPIRES_AT_KEY = 'strava_expires_at';
const STRAVA_CLIENT_ID_KEY = 'strava_client_id';
const STRAVA_CLIENT_SECRET_KEY = 'strava_client_secret';

// Haversine formula to calculate distance
const haversineDistance = (p1: {lat: number, lon: number}, p2: {lat: number, lon: number}): number => {
  const R = 6371; 
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export const saveStravaConfig = (clientId: string, clientSecret: string) => {
    localStorage.setItem(STRAVA_CLIENT_ID_KEY, clientId);
    localStorage.setItem(STRAVA_CLIENT_SECRET_KEY, clientSecret);
};

export const getStravaConfig = () => {
    return {
        clientId: localStorage.getItem(STRAVA_CLIENT_ID_KEY),
        clientSecret: localStorage.getItem(STRAVA_CLIENT_SECRET_KEY)
    };
};

export const isStravaConnected = () => {
    return !!localStorage.getItem(STRAVA_TOKEN_KEY);
};

export const disconnectStrava = () => {
    localStorage.removeItem(STRAVA_TOKEN_KEY);
    localStorage.removeItem(STRAVA_REFRESH_TOKEN_KEY);
    localStorage.removeItem(STRAVA_EXPIRES_AT_KEY);
};

export const initiateStravaAuth = () => {
    const { clientId } = getStravaConfig();
    if (!clientId) throw new Error("Strava Client ID mancante.");
    
    const redirectUri = window.location.origin;
    const scope = 'activity:read_all,activity:write,read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    window.location.href = authUrl;
};

export const handleStravaCallback = async (code: string) => {
    const { clientId, clientSecret } = getStravaConfig();
    if (!clientId || !clientSecret) throw new Error("Credenziali Strava non configurate.");

    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code'
        })
    });

    if (!response.ok) throw new Error("Errore scambio token Strava.");

    const data = await response.json();
    saveTokens(data);
    return data;
};

const saveTokens = (data: any) => {
    localStorage.setItem(STRAVA_TOKEN_KEY, data.access_token);
    localStorage.setItem(STRAVA_REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(STRAVA_EXPIRES_AT_KEY, data.expires_at);
};

const getValidAccessToken = async () => {
    let accessToken = localStorage.getItem(STRAVA_TOKEN_KEY);
    const expiresAt = parseInt(localStorage.getItem(STRAVA_EXPIRES_AT_KEY) || '0');
    const now = Math.floor(Date.now() / 1000);

    if (accessToken && now < expiresAt) {
        return accessToken;
    }

    const refreshToken = localStorage.getItem(STRAVA_REFRESH_TOKEN_KEY);
    const { clientId, clientSecret } = getStravaConfig();

    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error("AUTH_REQUIRED");
    }

    try {
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) throw new Error("Errore refresh token.");

        const data = await response.json();
        saveTokens(data);
        return data.access_token;
    } catch (e) {
        throw new Error("AUTH_REQUIRED");
    }
};

/**
 * Carica un file GPX direttamente su Strava.
 */
export const uploadGpxToStrava = async (gpxContent: string, name: string, activityType: string = 'run') => {
    const token = await getValidAccessToken();
    
    const formData = new FormData();
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    formData.append('file', blob, 'activity.gpx');
    formData.append('data_type', 'gpx');
    formData.append('name', name);
    formData.append('activity_type', activityType.toLowerCase() === 'corsa' || activityType.toLowerCase() === 'run' ? 'run' : 'run');

    const response = await fetch('https://www.strava.com/api/v3/uploads', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Errore durante il caricamento su Strava.");
    }

    return await response.json();
};

const mapStravaToTrack = async (activity: any, token: string): Promise<Track | null> => {
    const streamUrl = `https://www.strava.com/api/v3/activities/${activity.id}/streams?keys=time,latlng,altitude,heartrate,watts,cadence,velocity_smooth&key_by_type=true`;
    
    const streamRes = await fetch(streamUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!streamRes.ok) return null;
    const streams = await streamRes.json();

    if (!streams.latlng || !streams.time) return null;

    const points: TrackPoint[] = [];
    const startTime = new Date(activity.start_date);
    let totalDistance = 0;

    const rawPoints: Omit<TrackPoint, 'cummulativeDistance'>[] = [];
    
    for (let i = 0; i < streams.time.data.length; i++) {
        const latlng = streams.latlng.data[i];
        const timeOffset = streams.time.data[i];
        const ele = streams.altitude ? streams.altitude.data[i] : 0;
        const hr = streams.heartrate ? streams.heartrate.data[i] : undefined;
        const cad = streams.cadence ? streams.cadence.data[i] : undefined;
        const power = streams.watts ? streams.watts.data[i] : undefined;

        rawPoints.push({
            lat: latlng[0],
            lon: latlng[1],
            ele: ele,
            time: new Date(startTime.getTime() + timeOffset * 1000),
            hr,
            cad,
            power
        });
    }

    const smoothed = smoothElevation(rawPoints);

    smoothed.forEach((p, i) => {
        if (i > 0) {
            totalDistance += haversineDistance(smoothed[i-1], p);
        }
        points.push({ ...p, cummulativeDistance: totalDistance });
    });

    return {
        id: `strava-${activity.id}`,
        name: activity.name,
        points: points,
        distance: totalDistance,
        duration: activity.moving_time * 1000,
        color: '#fc4c02',
        activityType: 'Lento', 
        startTime: activity.start_date,
        isPublic: false,
        tags: ['Strava']
    };
};

export const fetchRecentStravaActivities = async (limit: number = 30, afterTimestamp?: number): Promise<Track[]> => {
    const token = await getValidAccessToken();
    
    let url = `https://www.strava.com/api/v3/athlete/activities?per_page=${limit}`;
    if (afterTimestamp) {
        url += `&after=${afterTimestamp}`;
    }
    
    const activitiesRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!activitiesRes.ok) throw new Error("Errore download attività.");

    const activities = await activitiesRes.json();
    const tracks: Track[] = [];

    for (const act of activities) {
        // Filtriamo esplicitamente per includere solo corse (Run), Trail (TrailRun) e Virtual (VirtualRun)
        // Strava supporta anche Walk, Hike, Ride, ecc. che vogliamo escludere.
        const isRunningType = ['Run', 'TrailRun', 'VirtualRun'].includes(act.type);
        
        if (isRunningType) {
            try {
                const track = await mapStravaToTrack(act, token);
                if (track) tracks.push(track);
            } catch (e) {
                console.warn(`Failed to import Strava activity ${act.id}`, e);
            }
        }
    }

    return tracks;
};
