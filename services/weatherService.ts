
import { CalendarWeather } from '../types';

// Mappa codici WMO a Emoji
export const getWeatherIcon = (code: number): string => {
    // 0: Clear sky
    if (code === 0) return '☀️';
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    // 45, 48: Fog
    if (code === 45 || code === 48) return '🌫️';
    // 51, 53, 55: Drizzle
    if (code >= 51 && code <= 55) return '🌦️';
    // 61, 63, 65: Rain
    if (code >= 61 && code <= 67) return '🌧️';
    // 71, 73, 75: Snow fall
    if (code >= 71 && code <= 77) return '🌨️';
    // 80, 81, 82: Rain showers
    if (code >= 80 && code <= 82) return '🌦️';
    // 85, 86: Snow showers
    if (code === 85 || code === 86) return '🌨️';
    // 95, 96, 99: Thunderstorm
    if (code >= 95 && code <= 99) return '⛈️';
    
    return '❓';
};

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

interface WeatherCache {
    [key: string]: CalendarWeather;
}

// Simple in-memory cache to avoid rate limits
const weatherCache: WeatherCache = {};

export const fetchMonthWeather = async (
    year: number, 
    month: number, 
    lat: number, 
    lon: number
): Promise<Record<string, CalendarWeather>> => {
    const results: Record<string, CalendarWeather> = {};
    
    // Calculate date range for the month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month
    
    const today = new Date();
    today.setHours(0,0,0,0);

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    const todayStr = formatDate(today);

    // 1. HISTORICAL DATA (Past -> Yesterday)
    // Open-Meteo Historical API is free
    if (startDate < today) {
        const historyEnd = endDate < today ? endDate : new Date(today.getTime() - 86400000);
        const historyEndStr = formatDate(historyEnd);
        
        // Only fetch if range is valid
        if (startDate <= historyEnd) {
            try {
                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${historyEndStr}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
                
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.daily) {
                    data.daily.time.forEach((d: string, i: number) => {
                        results[d] = {
                            dateStr: d,
                            maxTemp: data.daily.temperature_2m_max[i],
                            minTemp: data.daily.temperature_2m_min[i],
                            weatherCode: data.daily.weather_code[i],
                            icon: getWeatherIcon(data.daily.weather_code[i]),
                            isForecast: false
                        };
                    });
                }
            } catch (e) {
                console.warn("Weather history fetch failed", e);
            }
        }
    }

    // 2. FORECAST DATA (Today -> Future)
    // Open-Meteo Forecast API (up to 16 days usually free)
    if (endDate >= today) {
        try {
            // Fetch forecast from today
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${todayStr}&end_date=${endStr}`;
            
            const res = await fetch(url);
            const data = await res.json();

            if (data.daily) {
                data.daily.time.forEach((d: string, i: number) => {
                    // Only overwrite if we don't have it (though forecast should take priority for today/future)
                    results[d] = {
                        dateStr: d,
                        maxTemp: data.daily.temperature_2m_max[i],
                        minTemp: data.daily.temperature_2m_min[i],
                        weatherCode: data.daily.weather_code[i],
                        icon: getWeatherIcon(data.daily.weather_code[i]),
                        isForecast: true
                    };
                });
            }
        } catch (e) {
            console.warn("Weather forecast fetch failed", e);
        }
    }

    return results;
};
