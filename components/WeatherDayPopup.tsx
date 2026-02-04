
import React from 'react';
import { CalendarWeather } from '../types';

interface WeatherDayPopupProps {
    weather: CalendarWeather;
    onClose: () => void;
    date: Date;
}

const WeatherDayPopup: React.FC<WeatherDayPopupProps> = ({ weather, onClose, date }) => {
    if (!weather.details) return null;

    const { morning, afternoon, evening } = weather.details;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[20000] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm relative"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">&times;</button>
                
                <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tight">
                    {date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Previsioni Dettagliate</p>

                <div className="space-y-4">
                    {/* Morning */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{morning.icon}</span>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{morning.label}</div>
                                <div className="text-white font-bold">~09:00</div>
                            </div>
                        </div>
                        <div className="text-xl font-mono font-bold text-cyan-300">{morning.temp}°</div>
                    </div>

                    {/* Afternoon */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{afternoon.icon}</span>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{afternoon.label}</div>
                                <div className="text-white font-bold">~15:00</div>
                            </div>
                        </div>
                        <div className="text-xl font-mono font-bold text-amber-300">{afternoon.temp}°</div>
                    </div>

                    {/* Evening */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{evening.icon}</span>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{evening.label}</div>
                                <div className="text-white font-bold">~21:00</div>
                            </div>
                        </div>
                        <div className="text-xl font-mono font-bold text-purple-300">{evening.temp}°</div>
                    </div>
                </div>

                <div className="mt-6 flex justify-between items-center text-xs text-slate-500 border-t border-slate-800 pt-4">
                    <span>Min: <strong className="text-white">{weather.minTemp}°</strong></span>
                    <span>Max: <strong className="text-white">{weather.maxTemp}°</strong></span>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default WeatherDayPopup;
