
import React, { useState, useEffect } from 'react';
import { searchCity, SearchResult, fetchDayWeather, analyzeRunningConditions, RunConditions } from '../services/weatherService';
import { CalendarWeather } from '../types';

interface WeatherForecastModalProps {
    onClose: () => void;
}

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75ZM10 9.75a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const WeatherForecastModal: React.FC<WeatherForecastModalProps> = ({ onClose }) => {
    const [city, setCity] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedCity, setSelectedCity] = useState<SearchResult | null>(null);
    const [weather, setWeather] = useState<CalendarWeather | null>(null);
    const [analysis, setAnalysis] = useState<RunConditions | null>(null);
    const [loading, setLoading] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (city.length >= 3 && !selectedCity) {
                const res = await searchCity(city);
                setResults(res);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [city, selectedCity]);

    const handleSelectCity = (res: SearchResult) => {
        setSelectedCity(res);
        setCity(`${res.name}, ${res.country}`);
        setResults([]);
    };

    const handleFetchWeather = async () => {
        if (!selectedCity || !date) return;
        setLoading(true);
        try {
            const data = await fetchDayWeather(new Date(date), selectedCity.latitude, selectedCity.longitude);
            if (data) {
                setWeather(data);
                setAnalysis(analyzeRunningConditions(data));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isFuture = new Date(date) > new Date();
    const daysDiff = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    const isHistoricalEstimate = daysDiff > 14;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[12000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <span>☀️</span> Meteo Eventi
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </header>

                <div className="p-6 space-y-4">
                    {/* Input Section */}
                    <div className="space-y-3">
                        <div className="relative">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Città / Località</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={city} 
                                    onChange={e => { setCity(e.target.value); setSelectedCity(null); }}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 pl-10 text-white text-sm focus:border-cyan-500 outline-none"
                                    placeholder="Es. Milano, Roma, New York..."
                                />
                                <div className="absolute left-3 top-3 text-slate-400"><SearchIcon /></div>
                            </div>
                            
                            {results.length > 0 && !selectedCity && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-20 overflow-hidden">
                                    {results.map(res => (
                                        <button 
                                            key={res.id} 
                                            onClick={() => handleSelectCity(res)}
                                            className="w-full text-left p-3 hover:bg-slate-700 text-sm text-slate-200 border-b border-slate-700 last:border-0"
                                        >
                                            <span className="font-bold">{res.name}</span>
                                            <span className="text-xs text-slate-400 ml-2">{res.admin1 ? `${res.admin1}, ` : ''}{res.country}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data Evento</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={e => { setDate(e.target.value); setWeather(null); }}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 pl-10 text-white text-sm focus:border-cyan-500 outline-none"
                                />
                                <div className="absolute left-3 top-3 text-slate-400"><CalendarIcon /></div>
                            </div>
                        </div>

                        <button 
                            onClick={handleFetchWeather}
                            disabled={!selectedCity || loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all"
                        >
                            {loading ? 'Ricerca...' : 'Cerca Previsione'}
                        </button>
                    </div>

                    {/* Result Section */}
                    {weather && analysis && (
                        <div className="animate-fade-in-up mt-4">
                            <div className={`p-4 rounded-2xl border bg-gradient-to-br ${analysis.bgGradient} border-white/10 relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl pointer-events-none">{weather.icon}</div>
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-3xl font-black text-white">{weather.maxTemp}° <span className="text-lg font-normal text-white/70">/ {weather.minTemp}°</span></div>
                                            <div className={`text-sm font-bold uppercase tracking-wider mt-1 ${analysis.color}`}>{analysis.verdict}</div>
                                        </div>
                                        <div className="text-4xl">{weather.icon}</div>
                                    </div>

                                    {weather.details && (
                                        <div className="grid grid-cols-3 gap-2 my-3 bg-black/20 rounded-lg p-2">
                                            <div className="text-center">
                                                <div className="text-[8px] uppercase text-white/60 mb-1">Mattina</div>
                                                <div className="text-lg">{weather.details.morning.icon}</div>
                                                <div className="text-xs font-bold text-white">{weather.details.morning.temp}°</div>
                                            </div>
                                            <div className="text-center border-l border-white/10">
                                                <div className="text-[8px] uppercase text-white/60 mb-1">Pom.</div>
                                                <div className="text-lg">{weather.details.afternoon.icon}</div>
                                                <div className="text-xs font-bold text-white">{weather.details.afternoon.temp}°</div>
                                            </div>
                                            <div className="text-center border-l border-white/10">
                                                <div className="text-[8px] uppercase text-white/60 mb-1">Sera</div>
                                                <div className="text-lg">{weather.details.evening.icon}</div>
                                                <div className="text-xs font-bold text-white">{weather.details.evening.temp}°</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs text-white/90 font-medium italic bg-white/10 p-2 rounded-lg border border-white/5">
                                        "{analysis.advice}"
                                    </div>

                                    {isHistoricalEstimate && (
                                        <div className="mt-3 text-[9px] text-center text-white/50 uppercase tracking-widest">
                                            ⚠️ Data lontana: stima su dati storici
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeatherForecastModal;
