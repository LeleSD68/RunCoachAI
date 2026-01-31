
import React, { useEffect, useState } from 'react';

interface GuideModalProps {
    onClose: () => void;
}

interface GuideSectionProps {
    title: string;
    children: React.ReactNode;
    icon: string;
    isOpen: boolean;
    onToggle: () => void;
}

const GuideSection: React.FC<GuideSectionProps> = ({ title, children, icon, isOpen, onToggle }) => (
    <div className="mb-3 border border-slate-700 rounded-xl overflow-hidden bg-slate-800/40 transition-all duration-300">
        <button 
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isOpen ? 'bg-slate-700/60' : 'hover:bg-slate-700/30'}`}
        >
            <div className="flex items-center">
                <span className="text-xl mr-3">{icon}</span>
                <span className={`font-black uppercase tracking-tight text-sm ${isOpen ? 'text-cyan-400' : 'text-slate-200'}`}>{title}</span>
            </div>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            >
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
        </button>
        <div 
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1200px] opacity-100 p-5' : 'max-h-0 opacity-0 overflow-hidden'}`}
        >
            <div className="text-slate-300 text-sm leading-relaxed space-y-3 font-medium">
                {children}
            </div>
        </div>
    </div>
);

const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
    const [openSection, setOpenSection] = useState<string | null>('hub');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[8000] flex items-center justify-center p-2 sm:p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-700/50 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                
                <header className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                            <span className="text-2xl">📖</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter uppercase">Istruzioni RunCoach AI</h2>
                            <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Guida all'uso della piattaforma</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all text-2xl">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-900/30">
                    
                    <GuideSection title="Guida Strava (Per Neofiti)" icon="🧡" isOpen={openSection === 'strava'} onToggle={() => toggle('strava')}>
                        <p className="text-cyan-400 font-bold">Come collegare il tuo account per la prima volta:</p>
                        <ol className="list-decimal list-inside space-y-4">
                            <li>
                                <strong>Crea la tua Chiave API:</strong> Vai su <a href="https://www.strava.com/settings/api" target="_blank" className="text-orange-500 underline">Strava API Settings</a> (da PC è più facile).
                            </li>
                            <li>
                                <strong>Compila il modulo:</strong>
                                <ul className="list-disc list-inside ml-6 text-slate-400 mt-1">
                                    <li>Nome App: <em>RunCoachAI</em></li>
                                    <li>Sito Web: <em>https://runcoachai.app</em> (o uno a tua scelta)</li>
                                    <li>Callback Domain: <code className="bg-slate-800 px-1 text-cyan-300">{window.location.hostname}</code> <span className="text-[10px] opacity-70">(Copia questo!)</span></li>
                                </ul>
                            </li>
                            <li>
                                <strong>Copia i Codici:</strong> Una volta salvato, Strava ti mostrerà un <code className="text-white">Client ID</code> (numero) e un <code className="text-white">Client Secret</code> (codice).
                            </li>
                            <li>
                                <strong>Inserisci in RunCoachAI:</strong> Torna qui, apri <span className="text-white font-bold">Dati -> Sincronizza Strava</span> e incolla i due codici.
                            </li>
                            <li>
                                <strong>Autorizza:</strong> Premi "Connetti". Verrai mandato su Strava per confermare il permesso di leggere le tue corse. Fatto!
                            </li>
                        </ol>
                        <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 mt-4 rounded">
                            <p className="text-xs text-orange-200">
                                <strong>Perché servono questi passaggi?</strong> Strava richiede che ogni app abbia una sua "identità" per proteggere i tuoi dati. Una volta fatto questo setup di 2 minuti, non dovrai più ripeterlo!
                            </p>
                        </div>
                    </GuideSection>

                    <GuideSection title="Gestione & Backup Dati" icon="🏠" isOpen={openSection === 'hub'} onToggle={() => toggle('hub')}>
                        <p><strong>Dati nel Cloud:</strong> Se hai effettuato l'accesso con email, i tuoi dati sono salvati sui nostri server sicuri.</p>
                        <p><strong>Backup Manuale:</strong> Anche se sei connesso, ti consigliamo di scaricare periodicamente un backup locale (Dati -> Backup) per sicurezza totale.</p>
                    </GuideSection>

                    <GuideSection title="Modalità Gara & Replay" icon="🏁" isOpen={openSection === 'race'} onToggle={() => toggle('race')}>
                        <p>Puoi confrontare le tue corse attuali con i tuoi record passati.</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Seleziona più tracce nella lista laterale.</li>
                            <li>Premi <strong>"Gara"</strong> per avviare la simulazione.</li>
                            <li>Puoi anche caricare file GPX di amici per usarli come avversari "Ghost".</li>
                        </ul>
                    </GuideSection>
                </div>

                <footer className="p-6 bg-slate-900 border-t border-slate-800 text-center shrink-0">
                    <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs py-3 px-10 rounded-xl transition-all shadow-lg active:scale-95">Tutto Chiaro</button>
                </footer>
            </div>
        </div>
    );
};

export default GuideModal;
