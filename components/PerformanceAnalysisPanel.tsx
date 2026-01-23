
import React, { useMemo, useState, useEffect } from 'react';
import { Track, UserProfile } from '../types';
import { calculatePerformanceMetrics, calculatePredictions, calculatePerformanceHistory, HistoryPoint } from '../services/performanceService';
import Tooltip from './Tooltip';
import SimpleLineChart from './SimpleLineChart';

interface PerformanceAnalysisPanelProps {
    tracks: Track[];
    userProfile: UserProfile;
    onClose: () => void;
}

const formatDurationFromSeconds = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatPace = (paceMinKm: number) => {
    const m = Math.floor(paceMinKm);
    const s = Math.round((paceMinKm - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}/km`;
};

const ProgressBar: React.FC<{ value: number, max?: number, colorClass: string, inverse?: boolean, showPercentLabel?: boolean }> = ({ value, max = 150, colorClass, inverse = false, showPercentLabel = false }) => {
    let width = 0;
    
    if (inverse) {
        // TSB range: usually -50 to +30. Center at 0.
        const absMax = 50;
        const clamped = Math.max(-absMax, Math.min(absMax, value));
        const percentageOffset = (clamped / absMax) * 50; // -50 to +50
        
        return (
            <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden relative border border-slate-200">
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 left-1/2 z-10"></div>
                <div 
                    className={`absolute top-0 bottom-0 ${value >= 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                    style={{ 
                        left: value >= 0 ? '50%' : `${50 + percentageOffset}%`,
                        width: `${Math.abs(percentageOffset)}%`
                    }}
                ></div>
            </div>
        );
    } else {
        width = Math.min(100, (value / max) * 100);
        return (
            <div className="flex-grow h-4 bg-slate-100 rounded-sm overflow-hidden relative border border-slate-200">
                <div className={`h-full ${colorClass}`} style={{ width: `${width}%` }}></div>
            </div>
        );
    }
};

const PerformanceAnalysisPanel: React.FC<PerformanceAnalysisPanelProps> = ({ tracks, userProfile, onClose }) => {
    const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');
    const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);

    const metrics = useMemo(() => calculatePerformanceMetrics(tracks, userProfile), [tracks, userProfile]);
    const predictions = useMemo(() => calculatePredictions(tracks), [tracks]);

    useEffect(() => {
        if (viewMode === 'charts' && historyData.length === 0) {
            // Delay calculation slightly to allow UI render
            setTimeout(() => {
                const history = calculatePerformanceHistory(tracks, userProfile);
                setHistoryData(history);
            }, 50);
        }
    }, [viewMode, tracks, userProfile, historyData.length]);

    const renderCharts = () => {
        if (historyData.length === 0) return <div className="p-8 text-center text-slate-500">Generazione grafici in corso...</div>;

        // Simplify data for charts (e.g. 1 point per week if too many points? For now keep daily)
        return (
            <div className="p-3 space-y-4 bg-[#f3efea] min-h-[400px]">
                <SimpleLineChart 
                    data={historyData.map(h => ({ date: h.date, value: h.evolutionScore }))} 
                    color1="#1e3a45" 
                    title="Evoluzione Punteggio" 
                    yLabel="Score" 
                />
                <SimpleLineChart 
                    data={historyData.map(h => ({ date: h.date, value: h.ctl, value2: h.atl }))} 
                    color1="#1e6b76" 
                    color2="#e0915f" 
                    title="Fitness (CTL) & Fatica (ATL)" 
                    yLabel="Fitness" 
                    label2="Fatica"
                />
                <SimpleLineChart 
                    data={historyData.map(h => ({ date: h.date, value: h.vo2max }))} 
                    color1="#186a76" 
                    title="VO2max Stimato" 
                    yLabel="VO2" 
                />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[#fdfbf7] text-slate-800 rounded shadow-2xl w-full max-w-lg overflow-hidden border-2 border-[#8c6b4f] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header Section */}
                <div className="flex bg-[#fdfbf7] border-b border-slate-300 shrink-0">
                    <div className="px-4 py-3 font-bold text-[#a0303b] text-sm uppercase tracking-wider flex-grow">
                        PERFORMANCE
                    </div>
                    <div className="flex items-center gap-2 pr-2">
                        <button 
                            onClick={() => setViewMode('table')} 
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${viewMode === 'table' ? 'bg-[#a0303b] text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                        >
                            Tabella
                        </button>
                        <button 
                            onClick={() => setViewMode('charts')} 
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${viewMode === 'charts' ? 'bg-[#a0303b] text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                        >
                            Grafici
                        </button>
                    </div>
                    <div className="flex border-l border-slate-300">
                        <button onClick={onClose} className="px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-red-500">
                            &times;
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-grow">
                    {/* Evolution Score Header Widget (Always Visible in Table, Optional in Charts?) - Let's keep it consistent or just in table */}
                    {metrics.evolutionScore > 0 && viewMode === 'table' && (
                        <div className="bg-[#f3efea] border-b border-slate-200 p-3 flex items-center justify-between">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Punteggio Evoluzione</span>
                                    <Tooltip 
                                        text="Indice di Efficienza" 
                                        subtext="Basato su Formula di Riegel (Normalizzato 10k). ⬆️ SALE SE: Migliori il ritmo a parità di distanza O aumenti la distanza mantenendo il ritmo. ⬇️ SCENDE SE: Corri più lentamente del tuo potenziale." 
                                        position="bottom"
                                    >
                                        <div className="w-3.5 h-3.5 rounded-full border border-slate-400 text-slate-500 text-[9px] flex items-center justify-center cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-[#1e3a45]">{metrics.evolutionScore}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">pts</span>
                                </div>
                            </div>
                            <div className={`flex flex-col items-end ${metrics.evolutionTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                <div className="flex items-center font-bold text-lg">
                                    {metrics.evolutionTrend > 0 ? '▲' : metrics.evolutionTrend < 0 ? '▼' : '−'} 
                                    {Math.abs(metrics.evolutionTrend).toFixed(1)}%
                                </div>
                                <span className="text-[9px] text-slate-500 uppercase">vs 60gg prec.</span>
                            </div>
                        </div>
                    )}

                    {viewMode === 'table' ? (
                        <>
                            {/* Calculations Body */}
                            <div className="p-1 bg-[#fdfbf7] text-sm">
                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="VO2max Stimato" subtext="Stima VDOT basata sulle migliori prestazioni recenti." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">VO2max Effettivo</span>
                                    <ProgressBar value={metrics.vo2max} max={85} colorClass="bg-[#186a76]" />
                                    <span className="text-right text-slate-600 font-mono">{metrics.vo2max}</span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="Forma Maratona" subtext="Punteggio 0-100% basato sul volume e i lunghi delle ultime 10 settimane." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">Forma Maratona</span>
                                    <ProgressBar value={metrics.marathonShape} max={100} colorClass="bg-[#186a76]" />
                                    <span className="text-right text-slate-600 font-mono">{metrics.marathonShape} %</span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="Fatica (ATL)" subtext="Acute Training Load: carico medio pesato degli ultimi 7 giorni." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">Affaticamento <span className="text-xs font-normal text-slate-400">(ATL)</span></span>
                                    <ProgressBar value={metrics.atl} max={150} colorClass="bg-[#246a73]" />
                                    <span className="text-right text-slate-600 font-mono">{metrics.atl}</span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="Fitness (CTL)" subtext="Chronic Training Load: carico medio pesato degli ultimi 42 giorni." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">Fitness <span className="text-xs font-normal text-slate-400">(CTL)</span></span>
                                    <ProgressBar value={metrics.ctl} max={150} colorClass="bg-[#1e6b76]" />
                                    <span className="text-right text-slate-600 font-mono">{metrics.ctl}</span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="Training Stress Balance" subtext="TSB = CTL - ATL. Positivo indica freschezza, negativo indica carico accumulato." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">Bilanciamento stress <span className="text-xs font-normal text-slate-400">(TSB)</span></span>
                                    <ProgressBar value={metrics.tsb} inverse={true} colorClass="" />
                                    <span className={`text-right font-mono ${metrics.tsb >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {metrics.tsb > 0 ? `+${metrics.tsb}` : metrics.tsb}
                                    </span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="Rapporto A:C" subtext="ATL diviso CTL. Ottimale tra 0.8 e 1.3. Sopra 1.5 rischio infortuni." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">Rapp. Carico Lavoro <span className="text-xs font-normal text-slate-400">(A:C)</span></span>
                                    <div className="flex-grow h-4 bg-slate-100 border border-slate-200 relative">
                                         <div className="absolute top-0 bottom-0 bg-green-500 opacity-50" style={{ left: '30%', width: '40%' }}></div> {/* 0.8 to 1.5 approx scaled to 2.0 max */}
                                         <div className="absolute h-full w-0.5 bg-black" style={{ left: `${Math.min(100, (metrics.workloadRatio / 2.5) * 100)}%` }}></div>
                                    </div>
                                    <span className="text-right text-slate-600 font-mono">{metrics.workloadRatio}</span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="TRIMP" subtext="Training Impulse dell'ultima sessione." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">TRIMP (Ultimo)</span>
                                    <ProgressBar value={metrics.lastTrimp} max={300} colorClass="bg-[#5d9ca4]" />
                                    <span className="text-right text-slate-600 font-mono">{metrics.lastTrimp}</span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50">
                                    <Tooltip text="Monotonia" subtext="Indice di variabilità del carico. Sopra il 60% indica allenamenti troppo simili." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">Tasso di monotonia</span>
                                    <ProgressBar value={metrics.monotony} max={100} colorClass="bg-[#e0915f]" />
                                    <span className="text-right text-slate-600 font-mono">{metrics.monotony}%</span>
                                </div>

                                <div className="grid grid-cols-[24px_1fr_80px_50px] gap-2 items-center px-2 py-1.5 hover:bg-slate-50">
                                    <Tooltip text="Somma TRIMP Settimanale" subtext="Carico totale degli ultimi 7 giorni." position="right">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-500 font-serif cursor-help hover:bg-slate-200">?</div>
                                    </Tooltip>
                                    <span className="font-bold text-[#1e3a45]">Carico settimanale</span>
                                    <ProgressBar value={metrics.trainingLoad} max={1000} colorClass="bg-[#6dbf62]" />
                                    <span className="text-right text-slate-600 font-mono">{metrics.trainingLoad}</span>
                                </div>
                            </div>

                            {/* Predictions Header */}
                            <div className="flex bg-[#fdfbf7] border-t border-b border-[#a0303b]/30 mt-1">
                                <div className="px-4 py-2 font-bold text-[#a0303b] text-sm uppercase tracking-wider flex-grow">
                                    PREVISIONI
                                </div>
                            </div>

                            {/* Predictions Body */}
                            <div className="p-1 bg-[#fdfbf7] text-sm pb-4">
                                {predictions.length > 0 ? predictions.map((pred, i) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-2 border-b border-slate-100 hover:bg-slate-50">
                                        <span className="font-bold text-[#333333] text-base">{pred.label}</span>
                                        <div className="text-right">
                                            <span className="text-xs text-slate-500 mr-2">stima</span>
                                            <span className="font-bold text-[#333333] text-base">{formatDurationFromSeconds(pred.timeSeconds)}</span>
                                            <span className="text-xs text-slate-500 ml-2">({formatPace(pred.pace)})</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-4 text-center text-slate-500 italic">
                                        Dati storici insufficienti per generare previsioni (serve almeno una corsa {'>'} 3km recente).
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        renderCharts()
                    )}
                </div>

            </div>
        </div>
    );
};

export default PerformanceAnalysisPanel;