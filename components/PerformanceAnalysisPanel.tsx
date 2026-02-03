
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

const ProgressBar: React.FC<{ value: number, max?: number, colorClass: string, inverse?: boolean }> = ({ value, max = 150, colorClass, inverse = false }) => {
    let width = 0;
    
    if (inverse) {
        // TSB range: usually -50 to +30. Center at 0.
        const absMax = 50;
        const clamped = Math.max(-absMax, Math.min(absMax, value));
        const percentageOffset = (clamped / absMax) * 50; // -50 to +50
        
        return (
            <div className="flex-grow h-3 bg-slate-700/50 rounded-full overflow-hidden relative border border-slate-600/50">
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 left-1/2 z-10 opacity-50"></div>
                <div 
                    className={`absolute top-0 bottom-0 rounded-full transition-all duration-500 ${value >= 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} 
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
            <div className="flex-grow h-3 bg-slate-700/50 rounded-full overflow-hidden relative border border-slate-600/50">
                <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${width}%` }}></div>
            </div>
        );
    }
};

const MetricRow: React.FC<{ 
    label: string; 
    sublabel?: string;
    value: string | number;
    unit?: string;
    progress?: React.ReactNode;
    tooltipText: string;
    tooltipSub?: string;
    tooltipHelp?: string;
    valueColor?: string;
}> = ({ label, sublabel, value, unit, progress, tooltipText, tooltipSub, tooltipHelp, valueColor = "text-white" }) => (
    <div className="grid grid-cols-[24px_1fr_90px_60px] gap-3 items-center px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors group">
        <Tooltip text={tooltipText} subtext={tooltipSub} helpText={tooltipHelp} position="right">
            <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-400 font-serif cursor-help hover:border-cyan-500 hover:text-cyan-400 transition-colors">?</div>
        </Tooltip>
        <div>
            <div className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">{label}</div>
            {sublabel && <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">{sublabel}</div>}
        </div>
        <div className="flex items-center">
            {progress}
        </div>
        <div className={`text-right font-mono font-bold ${valueColor}`}>
            {value}<span className="text-[10px] text-slate-500 ml-1 font-normal">{unit}</span>
        </div>
    </div>
);

const PerformanceAnalysisPanel: React.FC<PerformanceAnalysisPanelProps> = ({ tracks, userProfile, onClose }) => {
    const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');
    const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);

    const metrics = useMemo(() => calculatePerformanceMetrics(tracks, userProfile), [tracks, userProfile]);
    const predictions = useMemo(() => calculatePredictions(tracks), [tracks]);

    useEffect(() => {
        if (viewMode === 'charts' && historyData.length === 0) {
            setTimeout(() => {
                const history = calculatePerformanceHistory(tracks, userProfile);
                setHistoryData(history);
            }, 50);
        }
    }, [viewMode, tracks, userProfile, historyData.length]);

    const renderCharts = () => {
        if (historyData.length === 0) return <div className="p-8 text-center text-slate-500">Generazione grafici in corso...</div>;

        return (
            <div className="p-4 space-y-6 bg-slate-900 min-h-[400px]">
                <SimpleLineChart 
                    data={historyData.map(h => ({ date: h.date, value: h.evolutionScore }))} 
                    color1="#22d3ee" 
                    title="Evoluzione Punteggio" 
                    yLabel="Score" 
                />
                <SimpleLineChart 
                    data={historyData.map(h => ({ date: h.date, value: h.ctl, value2: h.atl }))} 
                    color1="#3b82f6" 
                    color2="#f97316" 
                    title="Fitness (CTL) & Fatica (ATL)" 
                    yLabel="Fitness" 
                    label2="Fatica"
                />
                <SimpleLineChart 
                    data={historyData.map(h => ({ date: h.date, value: h.vo2max }))} 
                    color1="#10b981" 
                    title="VO2max Stimato" 
                    yLabel="VO2" 
                />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[5000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700 max-h-[90vh] flex flex-col pb-16 md:pb-0" onClick={e => e.stopPropagation()}>
                
                {/* Header Section */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0ZM13.5 1.5a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 .75.75 11.25 11.25 0 0 1-16.5 0 .75.75 0 0 1 .75-.75h6.75V2.25a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                        </div>
                        <h2 className="font-black text-white text-lg uppercase tracking-tight italic">Performance</h2>
                    </div>
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setViewMode('table')} 
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Dati
                        </button>
                        <button 
                            onClick={() => setViewMode('charts')} 
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${viewMode === 'charts' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Grafici
                        </button>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                        &times;
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-grow bg-slate-900">
                    
                    {/* Evolution Score Header Widget */}
                    {metrics.evolutionScore > 0 && viewMode === 'table' && (
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700 p-5 flex items-center justify-between relative overflow-hidden">
                            {/* Decorative Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            <div className="flex flex-col relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Efficiency Score</span>
                                    <Tooltip 
                                        text="Indice di Efficienza" 
                                        subtext="Normalizzato su 10k."
                                        helpText="Il punteggio sale se migliori il ritmo a parità di distanza, o se aumenti la distanza mantenendo il ritmo. Un valore più alto indica una 'cilindrata' maggiore."
                                        position="bottom"
                                    >
                                        <div className="w-3.5 h-3.5 rounded-full border border-slate-600 text-slate-500 text-[9px] flex items-center justify-center cursor-help hover:text-white hover:border-white transition-colors">?</div>
                                    </Tooltip>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">{metrics.evolutionScore}</span>
                                    <span className="text-xs text-slate-500 font-mono uppercase">pts</span>
                                </div>
                            </div>
                            
                            <div className={`flex flex-col items-end relative z-10 ${metrics.evolutionTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <div className="flex items-center font-black text-xl">
                                    {metrics.evolutionTrend > 0 ? '▲' : metrics.evolutionTrend < 0 ? '▼' : '−'} 
                                    {Math.abs(metrics.evolutionTrend).toFixed(1)}%
                                </div>
                                <span className="text-[9px] text-slate-500 uppercase tracking-wide font-bold">vs 60gg prec.</span>
                            </div>
                        </div>
                    )}

                    {viewMode === 'table' ? (
                        <>
                            {/* Calculations Body */}
                            <div className="bg-slate-900">
                                <MetricRow 
                                    label="VO2max Stimato"
                                    value={metrics.vo2max}
                                    progress={<ProgressBar value={metrics.vo2max} max={85} colorClass="bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
                                    tooltipText="Massimo consumo ossigeno"
                                    tooltipSub="Indice aerobico."
                                    tooltipHelp="Valori rif: <30 Basso, 30-40 Medio, 40-50 Buono, 50-60 Ottimo, >60 Elite. Calcolato con metodo VDOT."
                                    valueColor="text-cyan-400"
                                />

                                <MetricRow 
                                    label="Forma Maratona"
                                    value={metrics.marathonShape}
                                    unit="%"
                                    progress={<ProgressBar value={metrics.marathonShape} max={100} colorClass="bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                                    tooltipText="Prontezza lunga distanza"
                                    tooltipSub="Basato su volume e lunghi."
                                    tooltipHelp="0-40%: Base insufficiente. 40-70%: In costruzione. 70-90%: Pronto. >90%: Picco di forma."
                                    valueColor="text-purple-400"
                                />

                                <MetricRow 
                                    label="Fitness (CTL)"
                                    sublabel="Chronic Load"
                                    value={metrics.ctl}
                                    progress={<ProgressBar value={metrics.ctl} max={150} colorClass="bg-blue-500" />}
                                    tooltipText="Carico Cronico (42gg)"
                                    tooltipSub="Quanto ti sei allenato ultimamente."
                                    tooltipHelp="Indica la tua 'cilindrata' attuale. <40 Ricreativo, 40-70 Amatore evoluto, >80 Competitivo."
                                    valueColor="text-blue-400"
                                />

                                <MetricRow 
                                    label="Fatica (ATL)"
                                    sublabel="Acute Load"
                                    value={metrics.atl}
                                    progress={<ProgressBar value={metrics.atl} max={150} colorClass="bg-amber-500" />}
                                    tooltipText="Carico Acuto (7gg)"
                                    tooltipSub="Stanchezza recente."
                                    tooltipHelp="Se ATL > CTL di molto, sei stanco. Valori sopra 100 indicano settimane molto pesanti."
                                    valueColor="text-amber-400"
                                />

                                <MetricRow 
                                    label="Bilanciamento (TSB)"
                                    sublabel="Form = CTL - ATL"
                                    value={metrics.tsb > 0 ? `+${metrics.tsb}` : metrics.tsb}
                                    progress={<ProgressBar value={metrics.tsb} inverse={true} colorClass="" />}
                                    tooltipText="Training Stress Balance"
                                    tooltipSub="Indica freschezza o stanchezza."
                                    tooltipHelp="+10 a +25: Ottimo per Gara (Tapering). -10 a +10: Zona allenamento neutrale. -30 a -10: Fase di carico. <-30: Rischio infortunio/Overreaching."
                                    valueColor={metrics.tsb >= 0 ? 'text-green-400' : 'text-red-400'}
                                />

                                <MetricRow 
                                    label="Rapporto A:C"
                                    sublabel="Acute:Chronic"
                                    value={metrics.workloadRatio}
                                    progress={
                                        <div className="flex-grow h-3 bg-slate-700/50 border border-slate-600/50 rounded-full relative overflow-hidden">
                                             <div className="absolute top-0 bottom-0 bg-green-500/30" style={{ left: '30%', width: '40%' }}></div>
                                             <div className={`absolute h-full w-1 rounded-full ${metrics.workloadRatio > 1.5 ? 'bg-red-500' : metrics.workloadRatio < 0.8 ? 'bg-amber-500' : 'bg-white'}`} style={{ left: `${Math.min(100, (metrics.workloadRatio / 2.5) * 100)}%` }}></div>
                                        </div>
                                    }
                                    tooltipText="Rischio Infortunio"
                                    tooltipSub="Rapporto tra fatica e fitness."
                                    tooltipHelp="0.8 - 1.3: Zona Ottimale (Sweet Spot). > 1.5: Danger Zone (Carico aumentato troppo in fretta). < 0.8: Detraining."
                                    valueColor={metrics.workloadRatio > 1.5 ? "text-red-400" : metrics.workloadRatio < 0.8 ? "text-amber-400" : "text-green-400"}
                                />

                                <MetricRow 
                                    label="Monotonia"
                                    value={metrics.monotony}
                                    unit="%"
                                    progress={<ProgressBar value={metrics.monotony} max={100} colorClass={metrics.monotony > 60 ? "bg-red-500" : "bg-green-500"} />}
                                    tooltipText="Indice di Variabilità"
                                    tooltipSub="Bassa variabilità = Alto rischio."
                                    tooltipHelp="< 40%: Ottimo (Vari gli allenamenti). > 60%: Attenzione, allenamenti troppo simili (Rischio stallo/overtraining)."
                                    valueColor={metrics.monotony > 60 ? "text-red-400" : "text-green-400"}
                                />

                                <MetricRow 
                                    label="Carico 7gg"
                                    sublabel="Somma TRIMP"
                                    value={metrics.trainingLoad}
                                    progress={<ProgressBar value={metrics.trainingLoad} max={1000} colorClass="bg-slate-400" />}
                                    tooltipText="Volume totale stress"
                                    tooltipSub="Ultima settimana."
                                    tooltipHelp="Non esiste un numero magico, dipende dal tuo livello. Confrontalo con le tue settimane precedenti."
                                    valueColor="text-slate-300"
                                />
                            </div>

                            {/* Predictions Header */}
                            <div className="px-5 py-3 bg-slate-800/80 border-y border-slate-700 mt-2 sticky top-0">
                                <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-lg">🔮</span> Previsioni Gara
                                </h3>
                            </div>

                            {/* Predictions Body */}
                            <div className="bg-slate-900 pb-6">
                                {predictions.length > 0 ? predictions.map((pred, i) => (
                                    <div key={i} className="flex justify-between items-center px-5 py-3 border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                        <span className="font-bold text-white text-sm">{pred.label}</span>
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-500 mr-2 uppercase tracking-wide font-bold">stima</span>
                                            <span className="font-bold text-cyan-300 text-sm font-mono tracking-tight">{formatDurationFromSeconds(pred.timeSeconds)}</span>
                                            <span className="text-[10px] text-slate-400 ml-2 font-mono">({formatPace(pred.pace)})</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-slate-500 text-xs italic border-b border-slate-800">
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
