
import React, { useEffect } from 'react';

interface ChangelogProps {
    onClose: () => void;
}

const changelogData = [
    {
        version: 'v1.40',
        date: '2026-01-29',
        changes: [
            '🗺️ **Mappa Pulita**: Le tracce "Ghost" (sfidanti esterni) ora sono visibili sulla mappa SOLO durante la configurazione o l\'esecuzione di una gara. Nella vista normale, vedrai solo le tue corse.',
            '👻 **Gestione Migliorata**: I file GPX caricati come avversari non intasano più la visualizzazione predefinita.',
            '🧹 **Bugfix**: Corretta la persistenza visiva delle tracce temporanee dopo aver deselezionato tutto.'
        ]
    },
    {
        version: 'v1.39',
        date: '2026-01-29',
        changes: [
            '🔔 **Notifiche Realtime**: Ora ricevi avvisi immediati per nuovi messaggi dagli amici e richieste di amicizia direttamente nel browser o su Android.',
            '📅 **Alert Diario**: Le scadenze e gli impegni giornalieri ti avvisano all\'apertura dell\'app.',
            '🛠️ **Fix Navigazione**: Corretto il pulsante del numero di versione che apriva erroneamente il profilo invece del changelog.'
        ]
    },
    {
        version: 'v1.38',
        date: '2026-01-29',
        changes: [
            '🔄 **Layout Corretto**: Ripristinata la visualizzazione ottimale (Desktop: Affiancato, Mobile: Impilato).',
            '👻 **Ghost Mode Pulita**: Le sfide Ghost non sporcano più la tua lista attività.',
            '🧹 **Pulizia Dati**: Ottimizzazione gestione duplicati.'
        ]
    },
    {
        version: 'v1.37',
        date: '2026-01-29',
        changes: [
            '👻 **Sfida Ghost "Effimera"**: Le tracce dei tuoi amici importate dal Social Feed per le gare ora sono temporanee. Rimangono disponibili per la sessione di gara corrente ma non vengono salvate permanentemente nella tua lista personale o nel database, mantenendo il tuo archivio pulito.',
            '🔄 **Fix Layout**: Corretta la direzione dello split verticale/orizzontale su Desktop e Mobile per una migliore usabilità.',
            '🧹 **Deduplicazione Intelligente**: Migliorato il sistema di pulizia dei duplicati nel diario degli allenamenti per evitare voci ridondanti.'
        ]
    },
    {
        version: 'v1.34',
        date: '2026-01-28',
        changes: [
            '📱 **Mobile Vertical Stack**: Il layout su smartphone è stato rivoluzionato. Ora utilizza uno "Smart Stack" con una sezione superiore fissa (ridimensionabile) e una inferiore a scorrimento infinito.',
            '📐 **Adattamento Dinamico**: Mappe e Grafici ottengono automaticamente un\'altezza minima garantita quando sono nella zona di scorrimento, evitando di apparire schiacciati.',
            '👆 **Interfaccia Touch-First**: I menu per scambiare i pannelli (Swap) e le maniglie di ridimensionamento sono stati ingranditi per un uso più comodo con le dita.',
            '💾 **Memoria Layout**: Le tue preferenze (es. "Mappa sopra, Dati sotto") vengono salvate e ricordate al prossimo avvio.'
        ]
    },
    {
        version: 'v1.33',
        date: '2026-01-27',
        changes: [
            '🎨 Layout Matrix: Introdotto un sistema di layout a 6 configurazioni (Classico, Mappa Estesa, Dati a Destra, Verticale, Focus Basso, 3 Colonne).',
            '🔄 Slot Dinamici: Ogni riquadro dell\'interfaccia ora ha un menu contestuale (visibile al passaggio del mouse) per scambiare rapidamente Dati, Mappa e Grafici.',
            '🧩 Preset Intelligenti: Cambiando layout, i contenuti si riorganizzano automaticamente nella posizione ottimale.',
        ]
    },
    {
        version: 'v1.32',
        date: '2026-01-26',
        changes: [
            '☁️ Sincronizzazione Cloud Blindata: Risolto un problema critico per cui i dati potevano non apparire dopo il login. Migliorato il parsing dei dati e aggiunto il pulsante manuale "Salva su Database" nell\'Hub.',
            '👁️ Nuove Modalità di Visualizzazione: La Sidebar e l\'Explorer ora supportano le viste "Lista Compatta", "Scheda Media" e "Scheda Grande".',
            '🗂️ Raggruppamento Avanzato: Ora puoi raggruppare le tue corse per Distanza (<5k, 10k, ecc.), Cartella, Tag o Tipo di attività, oltre che per Data.',
            '📥 Ripristino Backup Totale: L\'importazione di un file di backup ora sostituisce e sincronizza immediatamente il database Cloud, garantendo un ripristino fedele al 100%.',
            '🗄️ Gestione Archivio & Selezione: Aggiunto filtro per mostrare/nascondere le corse archiviate e pulsanti rapidi per selezionare/deselezionare tutto.'
        ]
    },
    {
        version: 'v1.31',
        date: '2026-01-25',
        changes: [
            '💾 Salvataggio Intelligente AI: Ora quando salvi un allenamento dal Coach, tutte le istruzioni dettagliate della chat vengono copiate direttamente nelle note del diario, eliminando la necessità di riaprire la conversazione.',
            '📋 Gestione Tabelle Multiple: Migliorato il supporto per la generazione di piani settimanali. Il sistema riconosce e formatta correttamente liste di allenamenti multiple in un\'unica risposta.',
            '✨ Pulizia Automatica: Rimossi i codici tecnici dai testi salvati per una lettura più chiara nel calendario.'
        ]
    },
    {
        version: 'v1.30',
        date: '2026-01-24',
        changes: [
            '🏁 Gestione Griglia Gara Avanzata: Rimuovi partecipanti e carica "Ghost Runners" multipli.',
            '🗺️ Smart Map Centering: La mappa ora inquadra automaticamente i corridori al via, lasciando poi totale libertà di zoom.',
            '📈 Performance Insight: Aggiunte spiegazioni dettagliate sul Punteggio Evoluzione (logica Up/Down basata su Riegel).',
            '🛠️ Fix UX Analisi & Guida Aggiornata: Migliore stabilità dello scroll e manuale utente espanso.'
        ]
    },
    {
        version: 'v1.29',
        date: '2026-01-23',
        changes: [
            'Risolto un bug per cui le notifiche (Toast) di caricamento file non scomparivano correttamente.',
            'Fix critico: Risolto il loop infinito durante l\'unione delle tracce nell\'Editor.',
            'Esportazione GPX Migliorata: Ora il file esportato include correttamente i dati di frequenza cardiaca (hr) e cadenza (cad) per compatibilità con Strava/Garmin.',
            'Fix Chatbot: Risolto un errore di visualizzazione dello storico chat.',
            'Restyling Home Hub: Il menu principale ha ora un design più pulito con il logo posizionato sopra il titolo.'
        ]
    },
    {
        version: 'v1.28',
        date: '2026-01-22',
        changes: [
            'Migliorata la stabilità dell\'applicazione durante il caricamento dei file GPX.',
            'Risolto un problema di compatibilità con i Web Worker in alcuni ambienti che causava errori di caricamento.',
            'Include tutte le migliorie AI della versione v1.27.'
        ]
    },
    {
        version: 'v1.27',
        date: '2026-01-22',
        changes: [
            'Analisi AI Estesa (Deep Dive): Il limite di risposta dell\'AI è stato aumentato a 600 parole per garantire analisi tecniche più approfondite ed esaustive, mantenendo rigore e concisione.',
            'Riconoscimento Struttura Allenamento: Il Coach AI ora analizza la varianza del passo per capire automaticamente se hai corso un Fartlek, delle Ripetute o un Lungo costante, adattando il giudizio di conseguenza.',
            'Coerenza Neurale: Unificata la "persona" dell\'AI attraverso Chat, Analisi e Pianificazione. Ora il coach ha una memoria coerente e risponde sempre rigorosamente in italiano tecnico.'
        ]
    },
    {
        version: 'v1.26',
        date: '2026-01-21',
        changes: [
            'Layout Mobile Flessibile: Ora puoi ridimensionare le sezioni Dati, Grafico e Mappa trascinando i divisori direttamente con le dita.',
            'Ottimizzazione Spazi: Di default su mobile i Dati occupano il 50%, il Grafico il 18% e la Mappa il 32% dello schermo per un\'esperienza bilanciata.',
            'Migliore interazione touch sui pannelli ridimensionabili.'
        ]
    },
    {
        version: 'v1.25',
        date: '2026-01-20',
        changes: [
            'Analisi AI Full Screen: La chat con il Coach AI ora si apre in modalità "Cinema" a tutto schermo per una lettura più chiara e senza distrazioni.',
            'Nuovo Design RPE: I selettori dello sforzo percepito sono ora circolari, più compatti e distribuiti meglio per evitare errori di tocco.',
            'Layout Ottimizzato: Spostata la sezione "Tags & Categorie" sopra le scarpe per una compilazione più fluida del diario post-corsa.'
        ]
    },
    {
        version: 'v1.24',
        date: '2026-01-19',
        changes: [
            'Riorganizzazione Menu Hub: Spostati i controlli "Profilo Utente" e "Versione App" dalla barra laterale al menu Hub principale per una maggiore pulizia.',
            'Accesso centralizzato: Ora puoi gestire le impostazioni dell\'atleta e visualizzare le novità direttamente dalla schermata di benvenuto.',
            'Pulizia Interfaccia: La barra laterale delle liste è ora dedicata esclusivamente alla gestione e al filtraggio delle tracce.'
        ]
    },
    {
        version: 'v1.23',
        date: '2026-01-18',
        changes: [
            'Nuovo Layout Mobile "Split View": In modalità lista, lo schermo è ora diviso (3/4 Lista, 1/4 Mappa) per mantenere il contesto geografico durante la navigazione.',
            'Navigation Dock Permanente: La barra strumenti inferiore è ora fissa su mobile, garantendo accesso rapido a tutte le sezioni (Home, Mappa, Diario, Analisi).',
            'Ottimizzazione UX: Spostato il controllo Mappa/Lista nel Dock inferiore e rimossi i pulsanti ridondanti dall\'intestazione per una maggiore pulizia.'
        ]
    },
    {
        version: 'v1.22',
        date: '2026-01-17',
        changes: [
            'Nuova personalità AI "PT Ironico & Pro": Un coach competente sui numeri ma dal sarcasmo pungente per motivarti (o prenderti in giro).',
            'Supporto Multi-touch Mobile: Ora è possibile selezionare intervalli sui grafici usando due dita, come nelle app native.',
            'Fix Grafici Performance: Corretto l\'allineamento del cursore del mouse per una lettura precisa dei dati fino all\'ultimo punto.',
        ]
    },
    {
        version: 'v1.21',
        date: '2026-01-15',
        changes: [
            'Ripristinata icona Hub (Home) nella barra degli strumenti laterale desktop come primo elemento.',
            'Il badge del numero di versione nella testata è ora cliccabile per visualizzare rapidamente le novità.',
            'Ottimizzazione del layout del dock di navigazione per una migliore usabilità.',
            'Miglioramenti minori all\'interfaccia utente.'
        ]
    },
    {
        version: 'v1.20',
        date: '2026-01-12',
        changes: [
            'Nuovo sistema di monitoraggio API: Contatori per richieste al minuto (RPM) e giornaliere per evitare limiti del piano gratuito.',
            'Aggiunto il pulsante "Salva Backup" direttamente nel Menu Hub principale per un accesso più rapido.',
            'Ottimizzata la modalità Gara con nuovi controlli e una classifica più reattiva.',
            'Miglioramenti generali all\'interfaccia utente e correzioni di bug minori.'
        ]
    },
     {
        version: 'v1.17',
        date: '2025-12-28',
        changes: [
            'Unificato il sistema "Aggiungi Promemoria" tra il Chatbot globale e il pannello di analisi della sessione.',
            'Risolto un bug nel passaggio delle props che impediva il salvataggio dei programmi AI nel calendario dalla vista dettagliata.',
            'Migliorato il parsing delle date suggerite dall\'AI per una sincronizzazione perfetta con il calendario.',
            'Ottimizzata la reattività dei pulsanti di pianificazione su dispositivi mobile.'
        ]
    },
     {
        version: 'v1.16',
        date: '2025-12-20',
        changes: [
            'Migliorata la vista "Esplora Attività" con supporto a griglie da 1 a 6 colonne.',
            'Aggiunta toolbar sticky nell\'explorer per ordinamento (Data, Distanza, Nome) e raggruppamento dinamico.',
            'Riprogettata la Modalità Gara: ora i cursori dei runner mostrano il ritmo calcolato sugli ultimi 200 metri.',
            'Effetto visivo "Percorso Dinamico": il tracciato si colora progressivamente al passaggio del runner virtuale.'
        ]
    },
     {
        version: 'v1.11',
        date: '2025-12-15',
        changes: [
            'Introdotta una nuova, elegante modalità di benvenuto per i nuovi utenti, che illustra le funzionalità principali.',
            'Aggiunto un tracciato di esempio pre-caricato (una corsa intorno al Colosseo) per consentire agli utenti di esplorare immediatamente l\'app.',
            'Sostituiti tutti gli avvisi del browser (`alert`) con un sistema di notifiche "toast" moderno e non bloccante.',
            'Tutto il parsing dei file GPX/TCX è stato spostato in un Web Worker in background per evitare il blocco dell\'interfaccia utente con file di grandi dimensioni.',
            'Migliorata l\'accessibilità con l\'aggiunta di attributi ARIA e la possibilità di chiudere le finestre modali con il tasto \'Esc\'.',
        ]
    },
    {
        version: 'v1.10',
        date: '2025-12-10',
        changes: [
            'Aggiunto il pannello di analisi della zona di frequenza cardiaca nella vista dettagliata dell\'attività.',
            'Introdotto il tracciamento automatico dei Record Personali (PR) per distanze standard (1k, 5k, 10k, ecc.).',
            'I nuovi PR vengono evidenziati nella vista dettagliata e tutti i record vengono salvati e visualizzati nel Profilo Utente.',
            'L\'analisi AI ora utilizza i dati del profilo utente (età, FC massima) per fornire approfondimenti più personalizzati.'
        ]
    },
    {
        version: 'v1.9',
        date: '2025-12-05',
        changes: [
            'L\'Assistente AI è ora un pannello globale accessibile da qualsiasi schermata tramite un pulsante fluttuante.',
            'Il contesto del chatbot AI si aggiorna automaticamente in base alle tracce selezionate o alla vista corrente (editor/dettagli).',
            'Aggiunta la nuova funzione "Segmenti Chiave (AI)" nella vista dettagli, che identifica e analizza le parti più importanti di una corsa.',
            'I segmenti identificati dall\'AI possono essere cliccati per evidenziarli istantaneamente sulla mappa e sul grafico della timeline.',
        ]
    },
     {
        version: 'v1.8',
        date: '2025-12-01',
        changes: [
            'L\'applicazione ora rileva e impedisce il caricamento di file di tracciati duplicati.',
            'Viene mostrato un avviso se alcuni file vengono saltati durante il caricamento perché sono duplicati.',
        ]
    },
     {
        version: 'v1.7',
        date: '2025-11-28',
        changes: [
            'L\'interfaccia ora passa a una visualizzazione a schermo intero per l\'editor e i dettagli della traccia, nascondendo la dashboard principale per una maggiore concentrazione.',
        ]
    },
     {
        version: 'v1.6',
        date: '2025-11-25',
        changes: [
            'È ora possibile ridimensionare il pannello laterale e la visualizzazione della mappa trascinando il divisore.',
            'La barra laterale ora entra in una "modalità focus", nascondendo i controlli non necessari quando si visualizzano i dettagli o si modifica una traccia.',
        ]
    },
     {
        version: 'v1.5',
        date: '2025-11-20',
        changes: [
            'Il grafico della timeline ora mostra un riempimento e una linea colorati a gradiente quando è attiva una metrica di visualizzazione della mappa (es. altitudine, passo).',
        ]
    },
     {
        version: 'v1.4',
        date: '2025-11-15',
        changes: [
            'Aggiunta la possibilità di sovrapporre più metriche (passo, altitudine, velocità, FC) sul grafico della timeline per un confronto diretto.',
            'Aggiunto un indicatore sulla legenda della mappa che si sincronizza con il mouse sul grafico o sulla mappa.'
        ]
    },
    {
        version: 'v1.3',
        date: '2025-11-10',
        changes: [
            'Le visualizzazioni heatmap (per altitudine, passo, ecc.) sono ora applicate anche al grafico della timeline, colorando sia la linea che l\'area sottostante.',
        ]
    },
     {
        version: 'v1.2',
        date: '2025-11-05',
        changes: [
            'Aggiunta la sezione "Profilo Utente" per inserire dati personali (età, peso, FC, ecc.).',
            'I dati del profilo e i tracciati caricati vengono ora salvati in memoria per le sessioni future.',
        ]
    },
    {
        version: 'v1.1',
        date: '2025-11-01',
        changes: [
            'Aggiunta la finestra "Registro Modifiche" per visualizzare la cronologia degli aggiornamenti.',
        ]
    },
    {
        version: 'v1.0',
        date: '2025-10-25',
        changes: [
            'Creazione del punto di ripristino iniziale.',
            'Aggiunto il numero di versione accanto al titolo dell\'applicazione.',
        ]
    }
];

const Changelog: React.FC<ChangelogProps> = ({ onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="changelog-title"
                className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0 bg-slate-900">
                    <h2 id="changelog-title" className="text-xl font-bold text-cyan-400">Registro Modifiche</h2>
                    <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-slate-700" aria-label="Close changelog">&times;</button>
                </header>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    {changelogData.map(entry => (
                        <div key={entry.version} className="relative pl-6 border-l-2 border-slate-700">
                            <div className="absolute -left-[9px] top-1 w-4 h-4 bg-cyan-500 rounded-full border-4 border-slate-800"></div>
                            <h3 className="text-lg font-bold text-slate-100">{entry.version}</h3>
                            <p className="text-xs text-slate-500 mb-2">{entry.date}</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                                {entry.changes.map((change, index) => (
                                    <li key={index}>
                                        {change.includes('**') ? (
                                            <span dangerouslySetInnerHTML={{ __html: change.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-400">$1</strong>') }} />
                                        ) : (
                                            change
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Changelog;
