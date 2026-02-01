
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
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const trailRef = useRef<any>(null);
  const selectionLayerRef = useRef<any>(null);
  const ghostMarkersRef = useRef<Map<string, any>>(new Map());
  
  const [localGradient, setLocalGradient] = useState<string>(mapGradientMetric);
  const [currentStyle, setCurrentStyle] = useState<keyof typeof MAP_STYLES>('dark');

  // Sincronizza il gradiente locale se la prop cambia dall'esterno
  useEffect(() => {
    setLocalGradient(mapGradientMetric);
  }, [mapGradientMetric]);

  const fitMapToBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectionPoints && selectionPoints.length > 0) {
        try {
            const bounds = L.latLngBounds(selectionPoints.map(p => [p.lat, p.lon]));
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
                return;
            }
        } catch (e) {}
    }

    const relevantTracks = tracks.filter(t => visibleTrackIds.has(t.id));
    if (relevantTracks.length > 0) {
        try {
            const allPoints = relevantTracks.flatMap(t => t.points.map(p => [p.lat, p.lon]));
            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints);
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
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

  useEffect(() => {
    if (mapRef.current) {
        setTimeout(() => {
            mapRef.current.invalidateSize();
            fitMapToBounds();
        }, 100);
    }
  }, [visibleTrackIds, fitBoundsCounter, fitMapToBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polylinesRef.current.forEach(layer => map.removeLayer(layer));
    polylinesRef.current.clear();

    tracks.forEach(track => {
        if (!visibleTrackIds.has(track.id)) return;
        if (animationTrack && animationTrack.id === track.id && !isAnimationPlaying && animationProgress === track.distance) {
            // Keep drawing if it's the end of animation, but follow special trail logic if moving
        }

        let layer;
        const currentMetric = localGradient;
        
        if (currentMetric !== 'none') {
            const segments = getTrackSegmentColors(track, currentMetric as GradientMetric);
            layer = L.featureGroup(segments.map(seg => L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], { color: seg.color, weight: 4, opacity: 0.9 })));
        } else {
            layer = L.polyline(track.points.map(p => [p.lat, p.lon]), { color: track.color, weight: 4, opacity: 0.6 });
        }
        layer.addTo(map);
        polylinesRef.current.set(track.id, layer);
    });
  }, [tracks, visibleTrackIds, localGradient, animationTrack, isAnimationPlaying, animationProgress]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectionLayerRef.current) map.removeLayer(selectionLayerRef.current);

    if (selectionPoints && selectionPoints.length > 1) {
        if (selectionPoints[0] && (selectionPoints[0] as any).highlightColor) {
            selectionLayerRef.current = L.polyline(selectionPoints.map(p => [p.lat, p.lon]), { 
                color: (selectionPoints[0] as any).highlightColor, 
                weight: 8, 
                opacity: 0.9 
            }).addTo(map);
        } else {
            selectionLayerRef.current = L.polyline(selectionPoints.map(p => [p.lat, p.lon]), { 
                color: '#fde047', 
                weight: 10, 
                opacity: 0.7 
            }).addTo(map);
        }
    }
  }, [selectionPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !animationTrack) {
        if (trailRef.current) { map.removeLayer(trailRef.current); trailRef.current = null; }
        return;
    }

    const currentPoint = getTrackPointAtDistance(animationTrack, animationProgress);
    if (!currentPoint) return;

    const pointsDone = animationTrack.points.filter(p => p.cummulativeDistance <= animationProgress);
    if (pointsDone.length > 1) {
        if (!trailRef.current) {
            trailRef.current = L.polyline(pointsDone.map(p => [p.lat, p.lon]), { color: '#22d3ee', weight: 6, opacity: 0.9 }).addTo(map);
        } else {
            trailRef.current.setLatLngs(pointsDone.map(p => [p.lat, p.lon]));
        }
    }

    if (isAnimationPlaying) map.panTo([currentPoint.lat, currentPoint.lon], { animate: true, duration: 0.2 });

    const pace = getSmoothedPace(animationTrack, animationProgress, 100);
    const labelId = 'replay';
    if (!ghostMarkersRef.current.has(labelId)) {
        const icon = L.divIcon({
            className: 'runner-label',
            html: `<div class="bg-cyan-500 text-white px-2 py-1 rounded-full text-[10px] font-black shadow-xl border border-white/40 whitespace-nowrap">${formatPace(pace)}</div>`,
            iconSize: [40, 20], iconAnchor: [20, 20]
        });
        const m = L.marker([currentPoint.lat, currentPoint.lon], { icon }).addTo(map);
        ghostMarkersRef.current.set(labelId, m);
    } else {
        const m = ghostMarkersRef.current.get(labelId);
        m.setLatLng([currentPoint.lat, currentPoint.lon]);
        m.getElement().innerHTML = `<div class="bg-cyan-500 text-white px-2 py-1 rounded-full text-[10px] font-black shadow-xl border border-white/40 whitespace-nowrap">${formatPace(pace)}</div>`;
    }
  }, [animationProgress, animationTrack, isAnimationPlaying]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
      <div className="bg-slate-900/95 border-b border-slate-800 p-1 flex items-center justify-between z-[1001] shrink-0 gap-2 overflow-x-auto no-scrollbar shadow-lg">
        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-white/5">
            <button onClick={() => mapRef.current?.zoomIn()} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
            <button onClick={() => mapRef.current?.zoomOut()} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button onClick={() => { if(mapRef.current) { mapRef.current.invalidateSize(); fitMapToBounds(); } }} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-7h.01M9 16h.01"></path></svg>
            </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-white/5">
            {[
                {id: 'none', label: 'Base'},
                {id: 'elevation', label: 'Altitud.'},
                {id: 'pace', label: 'Passo'},
                {id: 'hr', label: 'Cardio'}
            ].map(m => (
                <button 
                    key={m.id} onClick={() => setLocalGradient(m.id)}
                    className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${localGradient === m.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    {m.label}
                </button>
            ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-white/5">
            {[
                {id: 'dark', label: 'Dark'},
                {id: 'street', label: 'Strade'},
                {id: 'satellite', label: 'Satel.'}
            ].map(s => (
                <button 
                    key={s.id} onClick={() => setCurrentStyle(s.id as any)}
                    className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${currentStyle === s.id ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    {s.label}
                </button>
            ))}
        </div>
      </div>
      <div ref={mapContainerRef} className="flex-grow w-full relative z-0" />
    </div>
  );
};

export default MapDisplay;
