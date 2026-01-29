
import React from 'react';
import { Track, TrackStats, UserProfile } from '../types';
import TrackPreview from './TrackPreview';
import RatingStars from './RatingStars';

interface ShareModalProps {
    track: Track;
    stats: TrackStats;
    userProfile: UserProfile;
    onClose: () => void;
}

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '-:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const ShareModal: React.FC<ShareModalProps> = ({ track, stats, userProfile, onClose }) => {
    const dateStr = new Date(track.points[0].time).toLocaleDateString('it-IT', { 
        day: 'numeric', month: 'long', year: 'numeric' 
    });

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="flex flex-col items-center gap-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                
                {/* THE CARD */}
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-800 rounded-[2rem] border-4 border-slate-700 shadow-2xl relative overflow-hidden flex flex-col group select-none">
                    
                    {/* Background Map Effect */}
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none">
                        <TrackPreview points={track.points} color="#ffffff" className="w-full h-full object-cover blur-sm scale-110" />
                    </div>

                    {/* Header */}
                    <div className="relative z-10 p-6 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg p-1.5">
                                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <span className="font-black text-white text-lg tracking-tighter italic">RunCoach<span className="text-cyan-400">AI</span></span>
                            </div>
                            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest ml-1">{dateStr}</p>
                        </div>
                        <div className="bg-slate-800/80 backdrop-blur border border-slate-600 px-3 py-1 rounded-full">
                            <RatingStars rating={track.rating} size="sm" />
                        </div>
                    </div>

                    {/* Main Visual */}
                    <div className="relative z-10 flex-grow flex items-center justify-center p-4">
                        <div className="w-full h-48 relative">
                            <TrackPreview points={track.points} color={track.color} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="relative z-10 px-6 pb-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Distanza</p>
                                <p className="text-4xl font-black text-white tracking-tighter">{track.distance.toFixed(2)} <span className="text-sm font-normal text-slate-500">km</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tempo</p>
                                <p className="text-4xl font-black text-white tracking-tighter">{formatDuration(stats.movingDuration)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Passo</p>
                                <p className="text-2xl font-bold text-cyan-400 font-mono">{formatPace(stats.movingAvgPace)} <span className="text-xs text-slate-500">/km</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Dislivello</p>
                                <p className="text-2xl font-bold text-purple-400 font-mono">+{Math.round(stats.elevationGain)} <span className="text-xs text-slate-500">m</span></p>
                            </div>
                        </div>
                    </div>

                    {/* AI Quote Footer */}
                    <div className="relative z-10 p-6 pt-2">
                        <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                            <p className="text-xs text-slate-200 italic leading-relaxed text-center font-medium">
                                "{track.ratingReason || "Ottimo lavoro! Un'altra corsa verso i tuoi obiettivi."}"
                            </p>
                            <div className="flex justify-center mt-2">
                                <span className="text-[9px] text-cyan-500 font-bold uppercase tracking-widest">- Coach {userProfile.aiPersonality || 'AI'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors">
                        Chiudi
                    </button>
                    <div className="px-4 py-3 text-slate-400 text-xs text-center">
                        💡 Fai uno screenshot per condividere!
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
