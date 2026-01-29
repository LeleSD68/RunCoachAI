
import React, { useEffect, useState } from 'react';

// Added missing interface for GuideModalProps
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
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100 p-5' : 'max-h-0 opacity-0 overflow-hidden'}`}
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
                            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter uppercase">Istruzioni di RunCoach AI</h2>
                            <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Manuale Utente RunCoachAI v1.33</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all text-2xl">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-900/30">
                    
                    <GuideSection title="Hub & Backup Dati" icon="🏠" isOpen={openSection === 'hub'} onToggle={() => toggle('hub')}>
                        <p><strong>Hub Principale:</strong> È il tuo centro di comando. Da qui accedi alle sezioni principali: Analisi, Pianificazione e Gara.</p>
                        <p className="bg-slate-800 p-2 rounded border-l-2 border-amber-500">
                            <strong>⚠️ IMPORTANTE - I TUOI DATI:</strong><br/>
                            RunCoachAI salva tutto <em>solo nel tuo browser</em>. Se cambi dispositivo o pulisci la cache, perdi tutto.
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>Salva Backup (💾):</strong> Scarica un file <code>.json</code> con tutto il tuo storico, profilo e diario. Fallo spesso!</li>
                            <li><strong>Importa (📥):</strong> Ripristina i dati da un file di backup precedente.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Caricamento & Gestione" icon="📂" isOpen={openSection === 'import'} onToggle={() => toggle('import')}>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>Formati:</strong> Trascina file <code>.gpx</code> o <code>.tcx</code> ovunque o usa il tasto "Carica" nel menu.</li>
                            <li><strong>Rinomina:</strong> Fai <strong>doppio click</strong> sul nome di una traccia nella lista laterale per rinominarla.</li>
                            <li><strong>Gruppi:</strong> Usa il menu a tendina nella sidebar per raggruppare le corse per <em>Mese</em>, <em>Tipo</em>, <em>Distanza</em> o <em>Cartella</em>.</li>
                            <li><strong>Selezione Multipla:</strong> Clicca sulle caselle di spunta nella lista per selezionare più corse. Apparirà un menu per Gara, Confronto o Eliminazione.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Layout & Personalizzazione (v1.33)" icon="🎨" isOpen={openSection === 'layout'} onToggle={() => toggle('layout')}>
                        <p>Hai il controllo totale sull'area di lavoro (Vista Dettagli).</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>6 Layout:</strong> Clicca l'icona del layout nella barra in alto per scegliere la configurazione (es. <em>Focus Basso</em> per grafici larghi, <em>3 Colonne</em> per vedere tutto insieme).</li>
                            <li><strong>Swap Contenuti Dinamico:</strong> Ogni riquadro è interscambiabile. Passa il mouse nell'angolo in alto a sinistra di un pannello (Mappa, Dati o Grafico). Apparirà un menu a tendina: cambia la selezione e i pannelli si scambieranno automaticamente di posto.</li>
                            <li><strong>Mobile Friendly:</strong> Usa il layout "Verticale" per la migliore esperienza su smartphone.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Modalità Gara & Ghost" icon="🏁" isOpen={openSection === 'race'} onToggle={() => toggle('race')}>
                        <p>Simula una gara in tempo reale tra le tue prestazioni passate o contro avversari esterni.</p>
                        <ol className="list-decimal list-inside ml-2 space-y-1 mt-2">
                            <li>Seleziona 2 o più tracce dalla lista laterale.</li>
                            <li>Clicca su <strong>"Gara"</strong> nel menu che appare.</li>
                            <li><strong>Configurazione Griglia:</strong>
                                <ul className="list-disc list-inside ml-4 text-slate-400 text-xs mt-1 mb-1">
                                    <li>Rinomina i partecipanti per la gara.</li>
                                    <li><strong>Carica Ghost:</strong> Usa il tasto per caricare file GPX di amici/rivali. Questi "fantasmi" gareggiano ma non vengono salvati nel tuo storico.</li>
                                    <li><strong>Rimuovi:</strong> Usa l'icona del cestino per togliere qualcuno dalla griglia.</li>
                                </ul>
                            </li>
                            <li>Premi "Scendi in Pista". La mappa si centrerà automaticamente sulla partenza; dopodiché potrai zoomare e spostarti liberamente.</li>
                        </ol>
                    </GuideSection>

                    <GuideSection title="Analisi, RPE & Performance" icon="📊" isOpen={openSection === 'metrics'} onToggle={() => toggle('metrics')}>
                        <p>Clicca sul nome di una traccia per i dettagli completi.</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>RPE (Sforzo):</strong> Imposta il tuo voto di fatica (1-10) nel pannello laterale.</li>
                            <li><strong>Confronto:</strong> Seleziona più tracce nella sidebar e premi "Confronta" per vedere una tabella comparativa (Passo, FC, Potenza).</li>
                            <li><strong>Performance Panel (📈):</strong> Mostra metriche avanzate come il <strong>Punteggio Evoluzione</strong>. Questo indice sale se migliori la velocità a parità di distanza, o se estendi la distanza a parità di passo (Formula di Riegel).</li>
                            <li><strong>Segmenti AI:</strong> Clicca su "Trova i miei segmenti migliori" per far cercare all'AI i momenti salienti (es. "Salita più dura").</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Editor Traccia" icon="✂️" isOpen={openSection === 'editor'} onToggle={() => toggle('editor')}>
                        <p>Seleziona una traccia e clicca su <strong>Edit</strong>.</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                            <li><strong>Taglia/Trim:</strong> Seleziona un intervallo sul grafico per eliminarlo (es. riscaldamento) o mantenere solo quello.</li>
                            <li><strong>Fix GPS:</strong> Corregge automaticamente i punti con velocità impossibili (&gt;50km/h) dovuti a errori GPS.</li>
                            <li><strong>Unisci:</strong> Seleziona più tracce nella sidebar e premi "Unisci" per creare un'unica attività continua.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Coach AI & Diario" icon="🧠" isOpen={openSection === 'coach'} onToggle={() => toggle('coach')}>
                        <p><strong>Chatbot Globale:</strong> (Tasto in basso a destra) Parla con un coach che conosce tutto il tuo storico. Chiedi consigli su recupero o tabelle.</p>
                        <p><strong>Diario (📅):</strong> Visualizza i tuoi allenamenti passati e futuri. Puoi salvare i consigli dell'AI direttamente qui cliccando su "Aggiungi a Calendario" nella chat.</p>
                        <p><strong>Sposta Allenamenti:</strong> Se un allenamento nel diario non ti convince, aprilo e usa "Sposta con AI" per trovare una data migliore in base al tuo recupero.</p>
                    </GuideSection>

                </div>

                <footer className="p-6 bg-slate-900 border-t border-slate-800 text-center shrink-0">
                    <button 
                        onClick={onClose}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs py-3 px-10 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        Tutto Chiaro, Chiudi
                    </button>
                </footer>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default GuideModal;
