
import React, { useState } from 'react';
import { DiaryEntryType, ActivityType, PlannedWorkout } from '../types';

interface DiaryActionModalProps {
    date: Date;
    onClose: () => void;
    onAddEntry: (entry: PlannedWorkout) => void;
    onGenerateAi: (date: Date, mode: 'today' | 'weekly', days?: number[]) => void;
}

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const DiaryActionModal: React.FC<DiaryActionModalProps> = ({ date, onClose, onAddEntry, onGenerateAi }) => {
    const [step, setStep] = useState<'choice' | 'note' | 'commitment' | 'ai-mode' | 'ai-days'>('choice');
    const [text, setText] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [selectedDays, setSelectedDays] = useState<number[]>([]);

    const handleAddNote = () => {
        const entry: PlannedWorkout = {
            id: `note-${Date.now()}`,
            title: "Nota Personale",
            description: text,
            date: date,
            activityType: 'Nota',
            isAiSuggested: false,
            entryType: 'note'
        };
        onAddEntry(entry);
        onClose();
    };

    const handleAddCommitment = () => {
        const entry: PlannedWorkout = {
            id: `comm-${Date.now()}`,
            title: `Impegno: ${text}`,
            description: `Dalle ${startTime} alle ${endTime}`,
            date: date,
            activityType: 'Impegno',
            isAiSuggested: false,
            entryType: 'commitment',
            startTime,
            endTime
        };
        onAddEntry(entry);
        onClose();
    };

    const toggleDay = (idx: number) => {
        setSelectedDays(prev => 
            prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[15000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="p-6 bg-slate-800 border-b border-slate-700">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                        {date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {step === 'ai-mode' ? 'Configurazione Coach AI' : step === 'ai-days' ? 'Seleziona giorni di corsa' : 'Cosa vuoi pianificare?'}
                    </p>
                </header>

                <div className="p-6">
                    {step === 'choice' && (
                        <div className="grid gap-3">
                            <button onClick={() => setStep('ai-mode')} className="flex items-center gap-4 p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-2xl text-left transition-all group">
                                <span className="text-2xl group-hover:scale-110 transition-transform">🧠</span>
                                <div>
                                    <div className="font-black text-purple-400 text-sm uppercase">Allenamento AI</div>
                                    <div className="text-[10px] text-slate-400">Lascia che il coach crei una sessione su misura.</div>
                                </div>
                            </button>
                            <button onClick={() => setStep('note')} className="flex items-center gap-4 p-4 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/40 rounded-2xl text-left transition-all group">
                                <span className="text-2xl group-hover:scale-110 transition-transform">📝</span>
                                <div>
                                    <div className="font-black text-cyan-400 text-sm uppercase">Aggiungi Nota</div>
                                    <div className="text-[10px] text-slate-400">Annota sensazioni o info utili per l'AI.</div>
                                </div>
                            </button>
                            <button onClick={() => setStep('commitment')} className="flex items-center gap-4 p-4 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/40 rounded-2xl text-left transition-all group">
                                <span className="text-2xl group-hover:scale-110 transition-transform">🕒</span>
                                <div>
                                    <div className="font-black text-amber-400 text-sm uppercase">Impegno Personale</div>
                                    <div className="text-[10px] text-slate-400">Segna orari in cui sarai occupato.</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {step === 'ai-mode' && (
                        <div className="space-y-3 animate-fade-in-right">
                            <button onClick={() => onGenerateAi(date, 'today')} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-left hover:border-purple-500 transition-all">
                                <div className="font-black text-white text-sm uppercase">Solo per questo giorno</div>
                                <p className="text-[10px] text-slate-500">Un singolo suggerimento mirato.</p>
                            </button>
                            <button onClick={() => setStep('ai-days')} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-left hover:border-cyan-500 transition-all">
                                <div className="font-black text-white text-sm uppercase">Pianifica Settimana</div>
                                <p className="text-[10px] text-slate-500">Crea un programma completo di più giorni.</p>
                            </button>
                            <button onClick={() => setStep('choice')} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-white uppercase mt-2">Indietro</button>
                        </div>
                    )}

                    {step === 'ai-days' && (
                        <div className="space-y-6 animate-fade-in-right">
                            <div className="grid grid-cols-4 gap-2">
                                {DAYS_SHORT.map((day, i) => (
                                    <button 
                                        key={day}
                                        onClick={() => toggleDay(i)}
                                        className={`p-2 rounded-xl border text-[10px] font-black uppercase transition-all ${selectedDays.includes(i) ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <button 
                                    onClick={() => onGenerateAi(date, 'weekly', selectedDays)}
                                    disabled={selectedDays.length === 0}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs"
                                >
                                    Genera Piano Settimanale
                                </button>
                                <button onClick={() => setStep('ai-mode')} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-white uppercase">Indietro</button>
                            </div>
                        </div>
                    )}

                    {(step === 'note' || step === 'commitment') && (
                        <div className="space-y-4 animate-fade-in-right">
                            <textarea 
                                autoFocus
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder={step === 'note' ? "Come ti senti? Hai dolori?..." : "Descrivi l'impegno (es. Lavoro, Viaggio)..."}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none h-32 resize-none"
                            />
                            
                            {step === 'commitment' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Inizio</label>
                                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Fine</label>
                                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-xs" />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setStep('choice')} className="flex-1 py-3 text-xs font-black text-slate-500 uppercase hover:text-white transition-colors">Indietro</button>
                                <button 
                                    onClick={step === 'note' ? handleAddNote : handleAddCommitment}
                                    disabled={!text.trim()}
                                    className="flex-[2] py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl shadow-lg transition-all"
                                >
                                    Salva nel Diario
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fade-in-right { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default DiaryActionModal;
