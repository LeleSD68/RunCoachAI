
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

// Utilizza data locale YYYY-MM-DD per evitare disallineamenti UTC
const formatDateLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

interface WeatherCache {
    [key: string]: CalendarWeather;
}

export const fetchMonthWeather = async (
    year: number, 
    month: number, 
    lat: number, 
    lon: number
): Promise<Record<string, CalendarWeather>> => {
    const results: Record<string, CalendarWeather> = {};
    
    // Range del mese richiesto
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); 
    
    // Oggi (reset ore)
    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. DATI STORICI (Dall'inizio del mese fino a ieri)
    if (monthStart < today) {
        // La storia finisce ieri o alla fine del mese (se il mese è passato)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const historyEnd = monthEnd < yesterday ? monthEnd : yesterday;
        
        if (monthStart <= historyEnd) {
            try {
                const startStr = formatDateLocal(monthStart);
                const endStr = formatDateLocal(historyEnd);
                
                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
                
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.daily && data.daily.time) {
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

    // 2. PREVISIONI (Da oggi al futuro)
    // Se il mese richiesto include giorni futuri
    if (monthEnd >= today) {
        try {
            // Calcolo orizzonte massimo previsioni (max 15 giorni da oggi per API free)
            const maxForecastDate = new Date(today);
            maxForecastDate.setDate(today.getDate() + 15);

            // L'intervallo di richiesta è l'intersezione tra [monthStart, monthEnd] e [today, maxForecastDate]
            const reqStart = monthStart > today ? monthStart : today;
            const reqEnd = monthEnd < maxForecastDate ? monthEnd : maxForecastDate;

            if (reqStart <= reqEnd) {
                const startStr = formatDateLocal(reqStart);
                const endStr = formatDateLocal(reqEnd);

                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startStr}&end_date=${endStr}`;
                
                const res = await fetch(url);
                const data = await res.json();

                if (data.daily && data.daily.time) {
                    data.daily.time.forEach((d: string, i: number) => {
                        // Sovrascrivi se esiste (il forecast è più aggiornato per oggi)
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
            }
        } catch (e) {
            console.warn("Weather forecast fetch failed", e);
        }
    }

    return results;
};
