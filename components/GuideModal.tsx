
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
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100 p-5' : 'max-h-0 opacity-0 overflow-hidden'}`}
        >
            <div className="text-slate-300 text-sm leading-relaxed space-y-4 font-medium">
                {children}
            </div>
        </div>
    </div>
);

const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
    const [openSection, setOpenSection] = useState<string | null>('intro');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const toggle = (id: string) => setOpenSection(openSection === id ? null : id);

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[8000] flex items-center justify-center p-2 sm:p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-700/50 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                
                <header className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                            <span className="text-2xl">🎓</span>
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tighter uppercase">Manuale RunCoach AI</h2>
                            <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Guida completa alle funzionalità</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all text-2xl">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-slate-900/30">
                    
                    <GuideSection title="Benvenuto & Primi Passi" icon="🚀" isOpen={openSection === 'intro'} onToggle={() => toggle('intro')}>
                        <p><strong>RunCoach AI</strong> non è il solito tracker. È un laboratorio di analisi avanzata per runner che vogliono capire i propri dati, migliorare la tecnica e simulare gare.</p>
                        <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
                            <li><strong className="text-white">Account Cloud vs Locale:</strong> Se accedi, i tuoi dati sono sincronizzati tra dispositivi. Se usi la modalità "Ospite", tutto rimane nel browser corrente.</li>
                            <li><strong className="text-white">Importazione:</strong> Puoi caricare file <code>.gpx</code> o <code>.tcx</code> dal tuo sportwatch, oppure collegare Strava per l'importazione automatica.</li>
                            <li><strong className="text-white">Privacy:</strong> I tuoi dati sono tuoi. Puoi scaricare un backup completo (JSON) in qualsiasi momento dal menu "Dati".</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Gestione Archivio & Sidebar" icon="📂" isOpen={openSection === 'sidebar'} onToggle={() => toggle('sidebar')}>
                        <p>La barra laterale (o la lista su mobile) è il centro di comando delle tue attività.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <h4 className="text-cyan-400 font-bold mb-1">Organizzazione</h4>
                                <p className="text-xs">Usa i filtri in alto per raggruppare le corse per <strong>Data, Distanza, Tipo</strong> o <strong>Cartella</strong> personalizzata. Puoi segnare le corse migliori con la <span className="text-amber-400">Stella (Preferiti)</span>.</p>
                            </div>
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <h4 className="text-cyan-400 font-bold mb-1">Azioni Multiple</h4>
                                <p className="text-xs">Seleziona più caselle (checkbox) per far apparire la toolbar in basso. Da lì puoi: <strong>Archiviare</strong>, <strong>Cancellare</strong>, <strong>Unire</strong> o avviare una <strong>Gara</strong>.</p>
                            </div>
                        </div>
                    </GuideSection>

                    <GuideSection title="Analisi Dettagliata Attività" icon="📊" isOpen={openSection === 'analysis'} onToggle={() => toggle('analysis')}>
                        <p>Cliccando su una corsa, entri nella modalità <strong>Deep Dive</strong>. Qui trovi:</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Mappa Interattiva:</strong> Cambia lo stile (Satellite, Dark, ecc.) e colora il percorso in base a Passo, Altitudine o Cardio.</li>
                            <li><strong>Grafici Temporali:</strong> Scorri il dito/mouse sul grafico per vedere i dati istante per istante sulla mappa.</li>
                            <li><strong>Selezione Zoom:</strong> Seleziona un intervallo sul grafico per "zoomare" i dati. Apparirà una barra con le statistiche specifiche <em>solo per quel segmento</em> (es. quanto veloce ho fatto quella salita?).</li>
                            <li><strong>Coach AI:</strong> Un pannello dedicato dove l'intelligenza artificiale analizza la sessione, ti dà consigli su recupero e tecnica.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Editor Tracce (Modifica & Unione)" icon="✂️" isOpen={openSection === 'editor'} onToggle={() => toggle('editor')}>
                        <p>Hai dimenticato di fermare l'orologio? Hai fatto due registrazioni separate per un lungo?</p>
                        <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li><strong>Modifica Singola:</strong> Clicca l'icona <span className="text-white bg-slate-700 px-1 rounded">Matita</span> su una traccia. Nell'editor puoi tagliare pezzi (es. riscaldamento o coda), eliminare le pause o correggere errori GPS.</li>
                            <li><strong>Unione (Merge):</strong> Seleziona 2 o più tracce nella sidebar e premi l'icona <span className="text-white bg-blue-600 px-1 rounded">Unione</span>. Creerà un'unica attività continua, utile per gare a tappe o registrazioni interrotte.</li>
                        </ol>
                    </GuideSection>

                    <GuideSection title="Diario & Pianificazione" icon="📅" isOpen={openSection === 'diary'} onToggle={() => toggle('diary')}>
                        <p>Il Diario non serve solo a vedere cosa hai fatto, ma a pianificare il futuro con l'aiuto dell'AI.</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Pianifica con AI:</strong> Clicca "Fai scheda Allenamento". L'AI leggerà il tuo storico, i tuoi impegni segnati ("Lavoro fino alle 18") e il tuo stato fisico ("Mi sento stanco") per proporti l'allenamento ideale.</li>
                            <li><strong>Sync Calendario:</strong> Puoi esportare i tuoi allenamenti su Google Calendar o Apple Calendar con un click.</li>
                            <li><strong>Spostamenti Intelligenti:</strong> Se devi spostare un allenamento, l'AI verificherà se la nuova data crea conflitti con il recupero o altri impegni.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Modalità Gara & Ghost Runners" icon="🏁" isOpen={openSection === 'race'} onToggle={() => toggle('race')}>
                        <p>Simula una gara in tempo reale tra le tue prestazioni passate o contro amici.</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Setup:</strong> Seleziona 2+ tracce (tue o di amici) e premi "Gara".</li>
                            <li><strong>Ghost Runners:</strong> Nel Social Hub, puoi caricare il GPX di un amico o prenderlo dal feed. Diventerà un "fantasma" viola che corre contro di te nella simulazione, senza sporcare il tuo archivio personale.</li>
                            <li><strong>Replay:</strong> Puoi rivivere la gara a velocità diverse (da 1x a 50x), vedere i distacchi in tempo reale e analizzare dove hai vinto o perso terreno.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Social Hub & Amici" icon="⚡" isOpen={openSection === 'social'} onToggle={() => toggle('social')}>
                        <p>Connettiti con altri runner per confrontarti e motivarti.</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong>Feed Attività:</strong> Vedi le ultime corse (pubbliche) dei tuoi amici.</li>
                            <li><strong>Chat Diretta:</strong> Scambia messaggi privati.</li>
                            <li><strong>Sfida:</strong> Clicca "Sfida Ghost" su un'attività di un amico per importarla immediatamente nella griglia di partenza della modalità Gara.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Integrazione Strava (Guida Tecnica)" icon="🧡" isOpen={openSection === 'strava'} onToggle={() => toggle('strava')}>
                        <p className="text-cyan-400 font-bold mb-2">Come collegare il tuo account (Solo la prima volta):</p>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-3">
                            <p>Strava richiede una configurazione di sicurezza ("API Key") personale. È gratis e richiede 2 minuti.</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Vai su <a href="https://www.strava.com/settings/api" target="_blank" className="text-orange-500 underline">Strava API Settings</a> (da PC è meglio).</li>
                                <li>Crea un'app. Nome: <code>RunCoachAI</code>. Sito: <code>https://runcoachai.app</code>.</li>
                                <li><strong>Cruciale:</strong> In "Authorization Callback Domain" inserisci: <code className="bg-black px-1 text-green-400">{window.location.hostname}</code></li>
                                <li>Salva e copia il tuo <strong>Client ID</strong> e <strong>Client Secret</strong>.</li>
                                <li>Torna qui, vai su <em>Menu Analizza &rarr; Connetti Strava</em> e incolla i codici.</li>
                            </ol>
                            <p className="italic border-t border-slate-700 pt-2 mt-2">Nota: I codici vengono salvati nel tuo browser. Se cambi dispositivo, dovrai reinserirli.</p>
                        </div>
                    </GuideSection>

                    <GuideSection title="Impostazioni & Manutenzione" icon="⚙️" isOpen={openSection === 'settings'} onToggle={() => toggle('settings')}>
                        <p>Nel menu Impostazioni (icona ingranaggio nell'Hub) puoi:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Configurare le tue <strong>Zone Cardio</strong> e scarpe.</li>
                            <li>Scegliere la preferenza calendario (Google vs Apple).</li>
                            <li>Attivare la <strong>Pulizia Database</strong>: se l'app è lenta all'avvio, usa questa funzione per rimuovere le copie duplicate delle tracce dal Cloud.</li>
                        </ul>
                    </GuideSection>

                </div>

                <footer className="p-6 bg-slate-900 border-t border-slate-800 text-center shrink-0">
                    <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs py-3 px-10 rounded-xl transition-all shadow-lg active:scale-95">Ho Capito, Iniziamo!</button>
                </footer>
            </div>
        </div>
    );
};

export default GuideModal;
