
import React, { useState } from 'react';

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
    </svg>
);

interface AnimationControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    progress: number; // in km
    totalDistance: number; // in km
    onProgressChange: (newProgress: number) => void;
    speed: number;
    onSpeedChange: (newSpeed: number) => void;
    onExit: () => void;
    visibleMetrics: Set<string>;
    onToggleMetric: (metric: string) => void;
}

const AnimationControls: React.FC<AnimationControlsProps> = ({
    isPlaying,
    onTogglePlay,
    progress,
    totalDistance,
    onProgressChange,
    speed,
    onSpeedChange,
    onExit,
    visibleMetrics,
    onToggleMetric
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const metricsList = [
        { id: 'time', label: 'Tempo' },
        { id: 'pace', label: 'Ritmo' },
        { id: 'elevation', label: 'Elevazione' },
        { id: 'hr', label: 'Freq. Cardiaca' },
    ];

    return (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[95%] sm:w-auto sm:min-w-[400px] max-w-2xl bg-slate-900/90 backdrop-blur-md rounded-full px-4 py-2 shadow-2xl flex items-center gap-4 z-[1000] border border-slate-700/50 scale-90 sm:scale-100 origin-bottom transition-all">
            <button 
                onClick={onTogglePlay} 
                className="w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shrink-0 transition-all shadow-md active:scale-95"
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            
            <div className="flex-grow flex items-center gap-3">
                <input
                    type="range"
                    min="0"
                    max={totalDistance}
                    step="0.01"
                    value={progress}
                    onChange={(e) => onProgressChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>
            
            <div className="flex items-center gap-3 shrink-0 border-l border-slate-700 pl-3">
                <div className="flex flex-col items-center w-12">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Speed</span>
                    <input
                        type="range"
                        min="1"
                        max="200"
                        step="5"
                        value={speed}
                        onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-500"
                        title={`Speed: ${speed}x`}
                    />
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className={`p-1.5 rounded-full transition-colors ${isMenuOpen ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <EyeIcon />
                    </button>
                    
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute bottom-full right-0 mb-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 z-20 animate-fade-in-up">
                                {metricsList.map(metric => (
                                    <button
                                        key={metric.id}
                                        onClick={() => onToggleMetric(metric.id)}
                                        className="w-full flex items-center px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-700 rounded transition-colors"
                                    >
                                        <div className={`w-3 h-3 mr-2 border rounded flex items-center justify-center ${visibleMetrics.has(metric.id) ? 'bg-cyan-600 border-cyan-600' : 'border-slate-500'}`}>
                                            {visibleMetrics.has(metric.id) && (
                                                <svg className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            )}
                                        </div>
                                        {metric.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                
                <button onClick={onExit} className="hidden sm:block text-slate-500 hover:text-red-400 transition-colors p-1" title="Esci">
                    <CloseIcon />
                </button>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AnimationControls;
