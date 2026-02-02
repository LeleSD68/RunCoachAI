
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment } from '../types';
import { getTrackPointAtDistance, getSmoothedPace } from '../services/trackEditorUtils';
import { getTrackSegmentColors, GradientMetric } from '../services/colorService';

declare const L: any; 

const MAP_STYLES = {
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', label: 'Dark' },
    silver: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', label: 'Light' },
    street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', label: 'Street' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', label: 'Satellite' }
};

const GRADIENT_OPTIONS: { id: string; label: string }[] = [
    { id: 'none', label: 'Nessuno' },
    { id: 'pace', label: 'Passo' },
    { id: 'elevation', label: 'Altitudine' },
    { id: 'hr', label: 'Cardio' },
    { id: 'power', label: 'Potenza' },
    { id: 'speed', label: 'Velocità' }
];

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const MapDisplay: React.FC<MapDisplayProps & { onGradientChange?: (metric: string) => void }> = ({ 
    tracks, visibleTrackIds, selectedTrackIds, raceRunners, hoveredTrackId, runnerSpeeds, 
    hoveredPoint, mapGradientMetric = 'none', animationTrack, 
    animationProgress = 0, isAnimationPlaying, fitBoundsCounter = 0,
    selectionPoints = null, onGradientChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  
  // Layers
  const polylinesRef = useRef<Map<string, any>>(new Map()); 
  const raceTrailsRef = useRef<Map<string, any>>(new Map()); 
  const trailRef = useRef<any>(null); 
  const selectionLayerRef = useRef<any>(null);
  const ghostMarkersRef = useRef<Map<string, any>>(new Map());
  
  const [localGradient, setLocalGradient] = useState<string>(mapGradientMetric);
  const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('dark');

  // Sync internal state with props if controlled
  useEffect(() => {
    setLocalGradient(mapGradientMetric);
  }, [mapGradientMetric]);

  const handleLocalGradientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setLocalGradient(val);
      if (onGradientChange) onGradientChange(val);
  };

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
      tileLayerRef.current = L.tileLayer(MAP_STYLES[currentStyle].url).addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
        tileLayerRef.current = L.tileLayer(MAP_STYLES[currentStyle].url).addTo(mapRef.current);
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
            
            const html = `
                <div style="position: relative;">
                    <div style="width: 14px; height: 14px; background-color: ${runner.color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px ${runner.color}, 0 2px 4px rgba(0,0,0,0.5); z-index: 1000;"></div>
                    <div class="bg-slate-900/90 text-white px-2 py-0.5 rounded border border-white/20 text-[9px] font-black shadow-xl whitespace-nowrap" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); pointer-events: none; border-left: 3px solid ${runner.color}">
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

            const track = tracks.find(t => t.id === runner.trackId);
            if (track) {
                const pointsDone = track.points.filter(p => p.cummulativeDistance <= runner.position.cummulativeDistance);
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
        
        const currentIds = new Set(raceRunners.map(r => r.trackId));
        ghostMarkersRef.current.forEach((v, k) => { if (!currentIds.has(k)) { map.removeLayer(v); ghostMarkersRef.current.delete(k); } });
        raceTrailsRef.current.forEach((v, k) => { if (!currentIds.has(k)) { map.removeLayer(v); raceTrailsRef.current.delete(k); } });
        return;
    } else {
        raceTrailsRef.current.forEach(l => map.removeLayer(l));
        raceTrailsRef.current.clear();
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
                <div class="bg-cyan-500 text-white px-2 py-1 rounded-full text-[10px] font-black shadow-2xl border border-white/40 whitespace-nowrap animate-pulse" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);">
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
        if (trailRef.current) { map.removeLayer(trailRef.current); trailRef.current = null; }
        if (!raceRunners) {
            ghostMarkersRef.current.forEach(m => map.removeLayer(m));
            ghostMarkersRef.current.clear();
        }
    }
  }, [animationProgress, animationTrack, isAnimationPlaying, raceRunners, tracks]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative group">
      
      {/* STATIC MAP TOOLBAR (ABOVE MAP) */}
      <div className="bg-slate-800 border-b border-slate-700 p-1.5 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 border-r border-slate-700 pr-2 mr-1">
                  <button onClick={() => mapRef.current?.zoomOut()} className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors" title="Zoom Out">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
                  </button>
                  <button onClick={() => mapRef.current?.zoomIn()} className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors" title="Zoom In">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                  </button>
              </div>
              
              <div className="relative group/grad">
                  <select 
                      value={localGradient}
                      onChange={handleLocalGradientChange}
                      className="bg-slate-900 border border-slate-700 text-[10px] font-bold text-white uppercase outline-none cursor-pointer appearance-none pl-2 pr-6 py-1 rounded hover:border-slate-500 transition-colors"
                  >
                      {GRADIENT_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-300">{opt.label}</option>)}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[8px]">▼</div>
              </div>
          </div>

          <div className="relative">
              <select 
                  value={currentStyle}
                  onChange={(e) => setCurrentStyle(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-[10px] font-bold text-white uppercase outline-none cursor-pointer appearance-none pl-2 pr-6 py-1 rounded hover:border-slate-500 transition-colors"
              >
                  {Object.entries(MAP_STYLES).map(([key, val]) => (
                      <option key={key} value={key} className="bg-slate-900 text-slate-300">{val.label}</option>
                  ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[8px]">▼</div>
          </div>
      </div>

      <div ref={mapContainerRef} className="flex-grow w-full h-full z-0 relative" />
    </div>
  );
};

export default MapDisplay;
