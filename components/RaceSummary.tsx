
import React, { useState, useEffect, useCallback } from 'react';
import { RaceResult, TrackStats, UserProfile, Track, AiPersonality } from '../types';
import FormattedAnalysis from './FormattedAnalysis';
import { getGenAI, retryWithPolicy } from '../services/aiHelper';

const personalityPrompts: Record<AiPersonality, string> = {
    'pro_balanced': "Sei un analista sportivo professionista ed equilibrato.",
    'analytic': "Sei un esperto di data science applicata allo sport.",
    'strict': "Sei un giudice di gara severo.",
    'friend_coach': "Sei un commentatore sportivo entusiasta e amichevole."
};

interface RaceSummaryProps {
  results: RaceResult[];
  racerStats: Map<string, TrackStats> | null;
  onClose: () => void;
  userProfile: UserProfile;
  tracks: Track[];
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const TrophyIcon = ({ rank }: { rank: number }) => {
    const colors = { 1: 'text-amber-400', 2: 'text-slate-400', 3: 'text-amber-600' };
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${colors[rank as keyof typeof colors] || 'text-slate-500'}`}><path fillRule="evenodd" d="M5.166 2.073A8.25 8.25 0 0 1 12 1.5a8.25 8.25 0 0 1 6.834 5.573 9.75 9.75 0 0 1-13.668 0ZM12 3a6.75 6.75 0 0 0-6.138 9.914 8.213 8.213 0 0 1 3.51-2.03.75.75 0 0 1 .552 1.343 6.713 6.713 0 0 0-2.126 3.033c.041.01.082.02.124.03a.75.75 0 0 1 .537 1.305 8.25 8.25 0 0 1-3.13-1.635 6.75 6.75 0 0 0 12.443 0 8.25 8.25 0 0 1-3.13 1.635.75.75 0 0 1 .537-1.305c.042-.01.083-.02.124-.03a6.713 6.713 0 0 0-2.126-3.033.75.75 0 0 1 .552-1.343 8.213 8.213 0 0 1 3.51 2.03A6.75 6.75 0 0 0 12 3Z" clipRule="evenodd" /></svg>;
};

const RaceSummary: React.FC<RaceSummaryProps> = ({ results, racerStats, onClose, userProfile, tracks }) => {
  const [comparativeAnalysis, setComparativeAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleComparativeAnalysis = useCallback(async () => {
    if (results.length < 2 || !racerStats) return;
    setIsAiLoading(true);
    const personalityKey = userProfile.aiPersonality || 'pro_balanced';
    const personality = personalityPrompts[personalityKey] || personalityPrompts['pro_balanced'];
    const userName = userProfile.name || 'Atleta';
    try {
      const call = async () => {
          const ai = getGenAI();
          const prompt = `${personality} 
          Rivolgiti a "${userName}". Commenta questa gara virtuale tra ${results.length} corse diverse.
          
          STILE:
          - Rispondi SEMPRE E SOLO in ITALIANO.
          - Sii tecnico, analitico e dettagliato ma SINTETICO.
          - Limite parole: Massimo 450 parole.
          
          Dati gara:
          ${results.map(r => {
              const s = racerStats.get(r.trackId);
              return `- ${r.name} (Rank ${r.rank}): Tempo ${formatDuration(r.finishTime)}, Ritmo ${((r.finishTime/60000)/r.distance).toFixed(2)}/km, Dislivello +${Math.round(s?.elevationGain || 0)}m.`;
          }).join('\n')}
          
          Identifica chi ha avuto la gestione energetica migliore, chi ha sofferto di più le salite e fai un podio tecnico motivando le scelte.`;

          return await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      };

      const response = await retryWithPolicy(call);
      setComparativeAnalysis(response.text || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  }, [results, racerStats, userProfile.aiPersonality, userProfile.name]);

  useEffect(() => { handleComparativeAnalysis(); }, [handleComparativeAnalysis]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4">
      <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-tighter">Resoconto Sfida</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar space-y-8">
          <section className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-5 shadow-lg">
             <h3 className="text-purple-400 font-bold flex items-center mb-4 uppercase text-sm tracking-widest">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
                 <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
               </svg>
               Analisi AI
             </h3>
             {isAiLoading ? (
                 <div className="text-slate-400 text-sm animate-pulse">Analisi in corso...</div>
             ) : (
                 <FormattedAnalysis text={comparativeAnalysis} />
             )}
          </section>

          <div className="space-y-2">
              {results.map(r => (
                  <div key={r.trackId} className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
                      <div className="flex items-center gap-3">
                          <span className="font-bold text-lg w-6 text-center">{r.rank}</span>
                          <div>
                              <div className="font-bold">{r.name}</div>
                              <div className="text-xs text-slate-400">{formatDuration(r.finishTime)}</div>
                          </div>
                      </div>
                      <TrophyIcon rank={r.rank} />
                  </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaceSummary;
