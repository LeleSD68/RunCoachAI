
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment } from '../types';
import { getTrackPointAtDistance, getSmoothedPace } from '../services/trackEditorUtils';
import { getTrackSegmentColors, GradientMetric } from '../services/colorService';

declare const L: any; 

const MAP_STYLES = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    silver: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ 
    tracks, visibleTrackIds, selectedTrackIds, raceRunners, hoveredTrackId, runnerSpeeds, 
    hoveredPoint, mapGradientMetric = 'none', animationTrack, 
    animationProgress = 0, isAnimationPlaying, fitBoundsCounter = 0,
    selectionPoints = null 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  
  // Layers
  const polylinesRef = useRef<Map<string, any>>(new Map()); // Background tracks
  const raceTrailsRef = useRef<Map<string, any>>(new Map()); // Foreground progressive tracks (Race)
  const trailRef = useRef<any>(null); // Single animation trail
  const selectionLayerRef = useRef<any>(null);
  const ghostMarkersRef = useRef<Map<string, any>>(new Map());
  
  const [localGradient, setLocalGradient] = useState<string>(mapGradientMetric);
  const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('dark');

  useEffect(() => {
    setLocalGradient(mapGradientMetric);
  }, [mapGradientMetric]);

  const fitMapToBounds = useCallback((immediate = false) => {
    const map = mapRef.current;
    if (!map) return;

    if (selectionPoints) {
        try {
            const flatPoints = Array.isArray(selectionPoints[0]) 
                ? (selectionPoints as TrackPoint[][]).flat() 
                : (selectionPoints as TrackPoint[]);
            
            if (flatPoints.length > 0) {
                const bounds = L.latLngBounds(flatPoints.map(p => [p.lat, p.lon]));
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: !immediate });
                    return;
                }
            }
        } catch (e) {}
    }

    const relevantTracks = tracks.filter(t => visibleTrackIds.has(t.id));
    if (relevantTracks.length > 0) {
        try {
            const allPoints = relevantTracks.flatMap(t => t.points.map(p => [p.lat, p.lon]));
            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints);
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: !immediate });
            }
        } catch (e) {}
    }
  }, [tracks, visibleTrackIds, selectionPoints]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { 
        preferCanvas: true, 
        zoomControl: false, 
        attributionControl: false 
      }).setView([45, 12], 13);
      tileLayerRef.current = L.tileLayer(MAP_STYLES[currentStyle]).addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
        tileLayerRef.current = L.tileLayer(MAP_STYLES[currentStyle]).addTo(mapRef.current);
    }
  }, [currentStyle]);

  // Gestione Resize e FitBounds dinamico
  useEffect(() => {
    if (mapRef.current) {
        setTimeout(() => {
            mapRef.current.invalidateSize();
            if (!isAnimationPlaying && (!raceRunners || raceRunners.length === 0)) {
                fitMapToBounds(true);
            }
        }, 300);
    }
  }, [visibleTrackIds, fitBoundsCounter, fitMapToBounds, selectionPoints]);

  // Gestione Disegno Tracce Statiche (Sfondo)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polylinesRef.current.forEach(layer => map.removeLayer(layer));
    polylinesRef.current.clear();

    tracks.forEach(track => {
        if (!visibleTrackIds.has(track.id)) return;
        
        const isRacing = raceRunners && raceRunners.some(r => r.trackId === track.id);
        let layer;
        
        if (isRacing) {
            // In modalità gara, la traccia di sfondo è grigia/spenta per mostrare il percorso futuro
            layer = L.polyline(track.points.map(p => [p.lat, p.lon]), { color: '#334155', weight: 3, opacity: 0.3, dashArray: '5, 10' });
        } else {
            // Modalità normale
            const currentMetric = localGradient;
            if (currentMetric !== 'none') {
                const segments = getTrackSegmentColors(track, currentMetric as GradientMetric);
                layer = L.featureGroup(segments.map(seg => L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], { color: seg.color, weight: 4, opacity: 0.9 })));
            } else {
                layer = L.polyline(track.points.map(p => [p.lat, p.lon]), { color: track.color, weight: 4, opacity: 0.6 });
            }
        }
        
        layer.addTo(map);
        polylinesRef.current.set(track.id, layer);
    });
  }, [tracks, visibleTrackIds, localGradient, raceRunners]);

  // Gestione Selezione
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selectionLayerRef.current) map.removeLayer(selectionLayerRef.current);

    if (selectionPoints) {
        if (Array.isArray(selectionPoints[0])) {
            const segments = selectionPoints as TrackPoint[][];
            const group = L.featureGroup();
            segments.forEach(seg => {
                if (seg.length > 1) {
                    const color = (seg[0] as any).highlightColor || '#fde047';
                    L.polyline(seg.map(p => [p.lat, p.lon]), { color, weight: 8, opacity: 0.95 }).addTo(group);
                }
            });
            selectionLayerRef.current = group.addTo(map);
        } else {
            const seg = selectionPoints as TrackPoint[];
            if (seg.length > 1) {
                const color = (seg[0] as any).highlightColor || '#fde047';
                selectionLayerRef.current = L.polyline(seg.map(p => [p.lat, p.lon]), { color, weight: 10, opacity: 0.8 }).addTo(map);
            }
        }
    }
  }, [selectionPoints]);

  // Gestione Gara e Animazione
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // A. GESTIONE CORRIDORI (GARA MULTIPLA)
    if (raceRunners && raceRunners.length > 0) {
        const bounds = L.latLngBounds(raceRunners.map(r => [r.position.lat, r.position.lon]));
        map.fitBounds(bounds, { padding: [80, 80], animate: true, duration: 0.5, maxZoom: 17 });

        raceRunners.forEach(runner => {
            // 1. Aggiorna Marker (Cursore)
            let m = ghostMarkersRef.current.get(runner.trackId);
            const pace = runner.pace;
            
            // HTML personalizzato per il cursore: Più visibile
            const html = `
                <div style="position: relative;">
                    <div style="
                        width: 14px; 
                        height: 14px; 
                        background-color: ${runner.color}; 
                        border: 2px solid white; 
                        border-radius: 50%; 
                        box-shadow: 0 0 10px ${runner.color}, 0 2px 4px rgba(0,0,0,0.5);
                        z-index: 1000;
                    "></div>
                    <div class="bg-slate-900/90 text-white px-2 py-0.5 rounded border border-white/20 text-[9px] font-black shadow-xl whitespace-nowrap" 
                         style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); pointer-events: none; border-left: 3px solid ${runner.color}">
                        ${runner.name} • ${formatPace(pace)}
                    </div>
                </div>`;

            if (!m) {
                const icon = L.divIcon({ className: 'runner-label', html, iconSize: [20, 20], iconAnchor: [10, 10] });
                m = L.marker([runner.position.lat, runner.position.lon], { icon, zIndexOffset: 1000 }).addTo(map);
                ghostMarkersRef.current.set(runner.trackId, m);
            } else {
                m.setLatLng([runner.position.lat, runner.position.lon]);
                m.setIcon(L.divIcon({ className: 'runner-label', html, iconSize: [20, 20], iconAnchor: [10, 10] }));
                m.setZIndexOffset(1000);
            }

            // 2. Disegna la scia progressiva ("Snake Effect")
            // Trova la traccia originale
            const track = tracks.find(t => t.id === runner.trackId);
            if (track) {
                const pointsDone = track.points.filter(p => p.cummulativeDistance <= runner.position.cummulativeDistance);
                // Aggiungi il punto corrente esatto per fluidità
                if(pointsDone.length > 0) pointsDone.push(runner.position);

                let trail = raceTrailsRef.current.get(runner.trackId);
                if (pointsDone.length > 1) {
                    if (!trail) {
                        trail = L.polyline(pointsDone.map(p => [p.lat, p.lon]), { color: runner.color, weight: 5, opacity: 1 }).addTo(map);
                        raceTrailsRef.current.set(runner.trackId, trail);
                    } else {
                        trail.setLatLngs(pointsDone.map(p => [p.lat, p.lon]));
                    }
                }
            }
        });
        
        // Pulizia marker e scie di runner non più presenti
        const currentIds = new Set(raceRunners.map(r => r.trackId));
        ghostMarkersRef.current.forEach((v, k) => {
            if (!currentIds.has(k)) { map.removeLayer(v); ghostMarkersRef.current.delete(k); }
        });
        raceTrailsRef.current.forEach((v, k) => {
            if (!currentIds.has(k)) { map.removeLayer(v); raceTrailsRef.current.delete(k); }
        });

        return;
    } else {
        // Se non c'è gara, pulisci scie gara
        raceTrailsRef.current.forEach(l => map.removeLayer(l));
        raceTrailsRef.current.clear();
        
        // Non puliamo ghostMarkersRef qui se stiamo facendo single animation (sotto), 
        // ma se siamo proprio idle, puliamo tutto nel blocco else finale
    }

    // B. GESTIONE ANIMAZIONE SINGOLA (REPLAY)
    if (animationTrack) {
        const currentPoint = getTrackPointAtDistance(animationTrack, animationProgress);
        if (!currentPoint) return;

        const pointsDone = animationTrack.points.filter(p => p.cummulativeDistance <= animationProgress);
        if (pointsDone.length > 1) {
            if (!trailRef.current) trailRef.current = L.polyline(pointsDone.map(p => [p.lat, p.lon]), { color: '#22d3ee', weight: 6, opacity: 0.9 }).addTo(map);
            else trailRef.current.setLatLngs(pointsDone.map(p => [p.lat, p.lon]));
        }

        if (isAnimationPlaying) {
            map.setView([currentPoint.lat, currentPoint.lon], map.getZoom(), { animate: false });
        }

        const pace = getSmoothedPace(animationTrack, animationProgress, 100);
        const labelId = 'replay-cursor';
        let m = ghostMarkersRef.current.get(labelId);
        const html = `
            <div style="position: relative;">
                <div class="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
                <div class="bg-cyan-500 text-white px-2 py-1 rounded-full text-[10px] font-black shadow-2xl border border-white/40 whitespace-nowrap animate-pulse" 
                     style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);">
                    ${formatPace(pace)}
                </div>
            </div>`;

        if (!m) {
            const icon = L.divIcon({ className: 'runner-label', html, iconSize: [40, 20], iconAnchor: [20, 10] });
            m = L.marker([currentPoint.lat, currentPoint.lon], { icon, zIndexOffset: 2000 }).addTo(map);
            ghostMarkersRef.current.set(labelId, m);
        } else {
            m.setLatLng([currentPoint.lat, currentPoint.lon]);
            m.setIcon(L.divIcon({ className: 'runner-label', html, iconSize: [40, 20], iconAnchor: [20, 10] }));
        }
    } else {
        // Clean up animation stuff
        if (trailRef.current) { map.removeLayer(trailRef.current); trailRef.current = null; }
        // Clean up markers if NOT racing
        if (!raceRunners) {
            ghostMarkersRef.current.forEach(m => map.removeLayer(m));
            ghostMarkersRef.current.clear();
        }
    }
  }, [animationProgress, animationTrack, isAnimationPlaying, raceRunners, tracks]);

  const handleCycleStyle = () => {
    const styles: (keyof typeof MAP_STYLES)[] = ['dark', 'street', 'silver', 'satellite'];
    const nextIndex = (styles.indexOf(currentStyle) + 1) % styles.length;
    setCurrentStyle(styles[nextIndex]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative">
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-[1001] gap-1 overflow-x-auto no-scrollbar pointer-events-none">
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm p-1 rounded-xl border border-white/10 shadow-2xl pointer-events-auto shrink-0">
            <button onClick={() => mapRef.current?.zoomIn()} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
            </button>
            <button onClick={() => mapRef.current?.zoomOut()} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button onClick={() => { if(mapRef.current) { mapRef.current.invalidateSize(); fitMapToBounds(); } }} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-7h.01M9 16h.01"></path></svg>
            </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm p-1 rounded-xl border border-white/10 shadow-2xl pointer-events-auto shrink-0">
            {[{id:'none',l:'Base'},{id:'hr',l:'❤️'},{id:'pace',l:'⏱️'}].map(m=>(<button key={m.id} onClick={()=>setLocalGradient(m.id)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${localGradient===m.id?'bg-cyan-600 text-white':'text-slate-400'}`}>{m.l}</button>))}
        </div>

        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm p-1 rounded-xl border border-white/10 shadow-2xl pointer-events-auto shrink-0">
             {[{id:'dark',l:'Dark'},{id:'silver',l:'Slvr'},{id:'street',l:'OSM'},{id:'satellite',l:'Sat'}].map((s) => (
                 <button 
                    key={s.id} 
                    onClick={() => setCurrentStyle(s.id as any)} 
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${currentStyle===s.id ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
                 >
                    {s.l}
                 </button>
             ))}
        </div>
      </div>
      <div ref={mapContainerRef} className="flex-grow w-full h-full z-0" />
    </div>
  );
};

export default MapDisplay;
