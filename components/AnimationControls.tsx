
import React, { useState } from 'react';

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
);
const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
);
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
);

interface AnimationControlsProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    progress: number;
    totalDistance: number;
    onProgressChange: (newProgress: number) => void;
    speed: number;
    onSpeedChange: (newSpeed: number) => void;
    onExit: () => void;
    visibleMetrics: Set<string>;
    onToggleMetric: (metric: string) => void;
    onToggleViewMode?: () => void;
    viewMode?: '2D' | '3D';
}

const AnimationControls: React.FC<AnimationControlsProps> = ({
    isPlaying, onTogglePlay, progress, totalDistance, onProgressChange, speed, onSpeedChange, onExit, onToggleViewMode, viewMode
}) => {
    return (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-3 flex items-center gap-4 shadow-2xl animate-fade-in-up ring-1 ring-white/10">
            <button onClick={onTogglePlay} className="w-12 h-12 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg transition-all active:scale-90">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            
            <div className="flex flex-col gap-1 min-w-[120px] sm:min-w-[200px]">
                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Avanzamento</span>
                    <span className="text-cyan-400 font-mono">{progress.toFixed(2)} / {totalDistance.toFixed(2)} km</span>
                </div>
                <input
                    type="range" min="0" max={totalDistance} step="0.01" value={progress}
                    onChange={(e) => onProgressChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>

            <div className="h-10 w-px bg-slate-800"></div>

            <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Velocità: {speed}x</span>
                <input
                    type="range" min="1" max="500" step="5" value={speed}
                    onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                    className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
            </div>

            <div className="h-10 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2">
                {onToggleViewMode && (
                    <button 
                        onClick={onToggleViewMode}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border ${viewMode === '3D' ? 'bg-purple-600 border-purple-400 text-white shadow-purple-500/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                        {viewMode}
                    </button>
                )}
                <button onClick={onExit} className="p-2.5 bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-red-900/30">
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
};

export default AnimationControls;
