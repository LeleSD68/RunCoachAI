
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

export interface RunConditions {
    score: number; // 0-100
    verdict: 'Perfetto' | 'Buono' | 'Accettabile' | 'Difficile' | 'Estremo';
    color: string; // Tailwind text color class
    bgGradient: string; // Tailwind gradient class
    advice: string;
    bestPhase?: string; // 'Mattina', 'Pomeriggio', 'Sera'
}

export const analyzeRunningConditions = (weather: CalendarWeather): RunConditions => {
    let score = 100;
    const penalties: string[] = [];
    
    // 1. Analisi Pioggia/Neve (Codici WMO)
    const badWeatherCodes = [95, 96, 99, 66, 67, 56, 57]; // Temporali, Freezing Rain
    const rainCodes = [61, 63, 65, 80, 81, 82]; // Pioggia
    const snowCodes = [71, 73, 75, 85, 86]; // Neve

    if (badWeatherCodes.includes(weather.weatherCode)) {
        score -= 40;
        penalties.push("Temporali o ghiaccio");
    } else if (rainCodes.includes(weather.weatherCode)) {
        score -= 20;
        penalties.push("Pioggia");
    } else if (snowCodes.includes(weather.weatherCode)) {
        score -= 15; // Correre con la neve può essere bello ma faticoso
        penalties.push("Neve");
    }

    // 2. Analisi Temperatura
    // Ideale corsa: 8°C - 15°C
    const maxTemp = weather.maxTemp;
    const minTemp = weather.minTemp;

    if (maxTemp > 30) {
        score -= 35;
        penalties.push("Caldo estremo");
    } else if (maxTemp > 25) {
        score -= 20;
        penalties.push("Molto caldo");
    } else if (maxTemp > 18) {
        score -= 5; // Un po' caldino
    }

    if (minTemp < -5) {
        score -= 25;
        penalties.push("Gelo intenso");
    } else if (minTemp < 2) {
        score -= 10; // Freddo
    }

    // 3. Determinazione Fase Migliore
    let bestPhase = '';
    const details = weather.details;
    if (details) {
        // Logica semplice: 
        // Se fa caldo (>20), meglio la fase più fresca (di solito mattina o sera)
        // Se fa freddo (<5), meglio la fase più calda (pomeriggio)
        const temps = [
            { label: 'Mattina', val: details.morning.temp },
            { label: 'Pomeriggio', val: details.afternoon.temp },
            { label: 'Sera', val: details.evening.temp }
        ];

        if (maxTemp > 22) {
            // Cerca il più fresco
            const best = temps.reduce((prev, curr) => prev.val < curr.val ? prev : curr);
            bestPhase = best.label;
        } else if (maxTemp < 10) {
            // Cerca il più caldo
            const best = temps.reduce((prev, curr) => prev.val > curr.val ? prev : curr);
            bestPhase = best.label;
        } else {
            // Temperature miti: evita pioggia se possibile, altrimenti indifferente
            bestPhase = 'Qualsiasi';
        }
    }

    // Costruzione Verdetto
    let verdict: RunConditions['verdict'] = 'Perfetto';
    let color = 'text-green-400';
    let bgGradient = 'from-green-600/20 to-emerald-600/20';
    let advice = "Condizioni ideali per correre!";

    if (score < 40) {
        verdict = 'Estremo';
        color = 'text-red-500';
        bgGradient = 'from-red-600/20 to-orange-600/20';
        advice = penalties.length > 0 ? `Attenzione: ${penalties.join(', ')}.` : "Condizioni molto difficili.";
    } else if (score < 60) {
        verdict = 'Difficile';
        color = 'text-orange-400';
        bgGradient = 'from-orange-600/20 to-amber-600/20';
        advice = penalties.length > 0 ? `Sfida: ${penalties.join(', ')}.` : "Giornata impegnativa.";
    } else if (score < 80) {
        verdict = 'Accettabile';
        color = 'text-yellow-400';
        bgGradient = 'from-yellow-600/20 to-lime-600/20';
        advice = penalties.length > 0 ? `Occhio a: ${penalties.join(', ')}.` : "Buone condizioni generali.";
    } else if (score < 95) {
        verdict = 'Buono';
        color = 'text-cyan-400';
        bgGradient = 'from-cyan-600/20 to-blue-600/20';
        advice = "Ottima giornata per allenarsi.";
    }

    // Aggiungi consiglio fase
    if (bestPhase && bestPhase !== 'Qualsiasi' && score > 40) {
        advice += ` Fase consigliata: ${bestPhase}.`;
    }

    return { score, verdict, color, advice, bestPhase, bgGradient };
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

export interface SearchResult {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
}

export const searchCity = async (query: string): Promise<SearchResult[]> => {
    if (query.length < 3) return [];
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=it&format=json`);
        const data = await res.json();
        return data.results || [];
    } catch (e) {
        console.error("Geocoding failed", e);
        return [];
    }
};

export const fetchDayWeather = async (
    date: Date, 
    lat: number, 
    lon: number
): Promise<CalendarWeather | null> => {
    const dateStr = formatDateLocal(date);
    const today = new Date();
    today.setHours(0,0,0,0);
    const isFuture = date >= today;
    
    // Per il futuro, OpenMeteo forecast arriva a 14-16 giorni. 
    // Per date più lontane non c'è forecast preciso, usiamo archive (storia dell'anno scorso) o limitiamo?
    // Usiamo forecast API se entro 14 giorni, altrimenti archive API per "stima storica".
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    let url = '';
    
    if (diffDays >= 0 && diffDays <= 14) {
        // Forecast
        url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
    } else {
        // Archive (o troppo nel futuro -> usiamo l'anno scorso come stima statistica?)
        // Se è futuro lontano, prendiamo l'anno scorso stessa data
        let queryDateStr = dateStr;
        if (diffDays > 14) {
            const lastYear = new Date(date);
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            queryDateStr = formatDateLocal(lastYear);
        }
        
        url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${queryDateStr}&end_date=${queryDateStr}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.daily && data.daily.time && data.daily.time.length > 0) {
            const i = 0; // Primo (e unico) giorno richiesto
            
            const morningIdx = 9;  // 09:00
            const afternoonIdx = 15; // 15:00
            const eveningIdx = 21;   // 21:00

            const details = {
                morning: {
                    label: 'Mattino',
                    temp: data.hourly.temperature_2m[morningIdx],
                    icon: getWeatherIcon(data.hourly.weather_code[morningIdx])
                },
                afternoon: {
                    label: 'Pomeriggio',
                    temp: data.hourly.temperature_2m[afternoonIdx],
                    icon: getWeatherIcon(data.hourly.weather_code[afternoonIdx])
                },
                evening: {
                    label: 'Sera',
                    temp: data.hourly.temperature_2m[eveningIdx],
                    icon: getWeatherIcon(data.hourly.weather_code[eveningIdx])
                }
            };

            return {
                dateStr: dateStr,
                maxTemp: data.daily.temperature_2m_max[i],
                minTemp: data.daily.temperature_2m_min[i],
                weatherCode: data.daily.weather_code[i],
                icon: getWeatherIcon(data.daily.weather_code[i]),
                isForecast: diffDays >= 0 && diffDays <= 14,
                details: details
            };
        }
    } catch (e) {
        console.warn("Single day weather fetch failed", e);
    }
    return null;
};

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
                
                // Richiediamo anche hourly per i dettagli
                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto`;
                
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.daily && data.daily.time) {
                    data.daily.time.forEach((d: string, i: number) => {
                        // Estrai dettagli orari per il giorno corrente
                        const morningIdx = i * 24 + 9;  // 09:00
                        const afternoonIdx = i * 24 + 15; // 15:00
                        const eveningIdx = i * 24 + 21;   // 21:00

                        const details = {
                            morning: {
                                label: 'Mattino',
                                temp: data.hourly.temperature_2m[morningIdx],
                                icon: getWeatherIcon(data.hourly.weather_code[morningIdx])
                            },
                            afternoon: {
                                label: 'Pomeriggio',
                                temp: data.hourly.temperature_2m[afternoonIdx],
                                icon: getWeatherIcon(data.hourly.weather_code[afternoonIdx])
                            },
                            evening: {
                                label: 'Sera',
                                temp: data.hourly.temperature_2m[eveningIdx],
                                icon: getWeatherIcon(data.hourly.weather_code[eveningIdx])
                            }
                        };

                        results[d] = {
                            dateStr: d,
                            maxTemp: data.daily.temperature_2m_max[i],
                            minTemp: data.daily.temperature_2m_min[i],
                            weatherCode: data.daily.weather_code[i],
                            icon: getWeatherIcon(data.daily.weather_code[i]),
                            isForecast: false,
                            details: details
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

                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto&start_date=${startStr}&end_date=${endStr}`;
                
                const res = await fetch(url);
                const data = await res.json();

                if (data.daily && data.daily.time) {
                    data.daily.time.forEach((d: string, i: number) => {
                        // Estrai dettagli orari
                        const morningIdx = i * 24 + 9;
                        const afternoonIdx = i * 24 + 15;
                        const eveningIdx = i * 24 + 21;

                        const details = {
                            morning: {
                                label: 'Mattino',
                                temp: data.hourly.temperature_2m[morningIdx],
                                icon: getWeatherIcon(data.hourly.weather_code[morningIdx])
                            },
                            afternoon: {
                                label: 'Pomeriggio',
                                temp: data.hourly.temperature_2m[afternoonIdx],
                                icon: getWeatherIcon(data.hourly.weather_code[afternoonIdx])
                            },
                            evening: {
                                label: 'Sera',
                                temp: data.hourly.temperature_2m[eveningIdx],
                                icon: getWeatherIcon(data.hourly.weather_code[eveningIdx])
                            }
                        };

                        // Sovrascrivi se esiste (il forecast è più aggiornato per oggi)
                        results[d] = {
                            dateStr: d,
                            maxTemp: data.daily.temperature_2m_max[i],
                            minTemp: data.daily.temperature_2m_min[i],
                            weatherCode: data.daily.weather_code[i],
                            icon: getWeatherIcon(data.daily.weather_code[i]),
                            isForecast: true,
                            details: details
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
