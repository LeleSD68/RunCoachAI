
import React from 'react';

interface UpgradeModalProps {
    onClose: () => void;
    onUpgrade: () => void;
}

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400 shrink-0">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
);

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose, onUpgrade }) => {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[15000] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative flex flex-col md:flex-row max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 z-20 text-slate-400 hover:text-white bg-black/20 rounded-full p-1">&times;</button>

                {/* Left Side: Pitch */}
                <div className="w-full md:w-2/5 bg-gradient-to-br from-indigo-900 to-slate-900 p-8 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]"></div>
                    <div className="relative z-10">
                        <div className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-amber-500/30">
                            Diventa Pro
                        </div>
                        <h2 className="text-3xl font-black text-white italic tracking-tighter mb-4">
                            Sblocca il tuo <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Vero Potenziale</span>
                        </h2>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            RunCoachAI Pro ti offre analisi illimitate, coach vocale avanzato e sincronizzazione cloud sicura.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                            <span>🔒 Pagamento Sicuro</span>
                            <span>•</span>
                            <span>📅 Disdici quando vuoi</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Plans */}
                <div className="w-full md:w-3/5 p-6 md:p-8 bg-slate-900 overflow-y-auto custom-scrollbar">
                    <div className="grid gap-4">
                        {/* Free Plan */}
                        <div className="p-4 rounded-2xl border border-slate-700 bg-slate-800/50 opacity-70 hover:opacity-100 transition-opacity">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-white text-lg">Starter</h3>
                                <span className="font-mono text-slate-400">Gratis</span>
                            </div>
                            <ul className="space-y-2 text-sm text-slate-300 mb-4">
                                <li className="flex gap-2"><CheckIcon /> Analisi base GPX</li>
                                <li className="flex gap-2"><CheckIcon /> 1 Chat AI al giorno</li>
                                <li className="flex gap-2 text-slate-500">❌ Sync Cloud Multi-device</li>
                            </ul>
                            <button onClick={onClose} className="w-full py-2 rounded-xl border border-slate-600 text-slate-300 text-xs font-bold uppercase hover:bg-slate-700">Resta Free</button>
                        </div>

                        {/* Pro Plan */}
                        <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 shadow-xl transform scale-[1.02]">
                            <div className="bg-slate-900 p-5 rounded-xl h-full">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-black text-white text-xl uppercase tracking-tight">Pro Athlete</h3>
                                        <p className="text-xs text-amber-400 font-bold uppercase">Il più popolare</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-white">€4.99</span>
                                        <span className="text-xs text-slate-400 block">/ mese</span>
                                    </div>
                                </div>
                                <ul className="space-y-3 text-sm text-white mb-6">
                                    <li className="flex gap-2"><CheckIcon /> <strong>AI Illimitata</strong> (Chat & Analisi)</li>
                                    <li className="flex gap-2"><CheckIcon /> <strong>Live Coach Vocale</strong></li>
                                    <li className="flex gap-2"><CheckIcon /> <strong>Sync Cloud</strong> automatico</li>
                                    <li className="flex gap-2"><CheckIcon /> <strong>Meteo & Previsioni</strong> avanzate</li>
                                </ul>
                                <button 
                                    onClick={onUpgrade}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-lg active:scale-95"
                                >
                                    Inizia la prova gratuita
                                </button>
                                <p className="text-[10px] text-center text-slate-500 mt-2">7 giorni gratis, poi €4.99/mese</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
