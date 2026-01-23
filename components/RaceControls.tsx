
import React from 'react';

interface RaceControlsProps {
    simulationState: 'idle' | 'running' | 'paused' | 'finished';
    simulationTime: number;
    simulationSpeed: number;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onSpeedChange: (speed: number) => void;
}

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

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
    </svg>
);

const formatRaceTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const RaceControls: React.FC<RaceControlsProps> = ({ 
    simulationState, 
    simulationTime, 
    simulationSpeed, 
    onPause, 
    onResume, 
    onStop, 
    onSpeedChange 
}) => {
    return (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-600/50 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-4 shadow-2xl animate-fade-in-down select-none whitespace-nowrap">
            {/* Timer Display */}
            <div className="font-mono text-lg sm:text-xl font-black text-white min-w-[60px] sm:min-w-[70px] text-center">
                {formatRaceTime(simulationTime)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 sm:gap-2 border-l border-r border-slate-600/50 px-2 sm:px-3">
                {simulationState === 'running' ? (
                    <button 
                        onClick={onPause} 
                        className="p-1.5 sm:p-2 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white transition-all active:scale-95"
                        title="Pausa"
                    >
                        <PauseIcon />
                    </button>
                ) : (
                    <button 
                        onClick={onResume} 
                        className="p-1.5 sm:p-2 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all active:scale-95"
                        title="Riprendi"
                    >
                        <PlayIcon />
                    </button>
                )}
                
                <button 
                    onClick={onStop} 
                    className="p-1.5 sm:p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    title="Stop & Esci"
                >
                    <StopIcon />
                </button>
            </div>

            {/* Speed Slider */}
            <div className="flex flex-col items-center w-16 sm:w-32 gap-0.5 sm:gap-1">
                <div className="flex justify-between w-full text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase">
                    <span>Speed</span>
                    <span>{simulationSpeed}x</span>
                </div>
                <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    step="5" 
                    value={simulationSpeed} 
                    onChange={(e) => onSpeedChange(parseInt(e.target.value))} 
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                />
            </div>
        </div>
    );
};

export default RaceControls;
