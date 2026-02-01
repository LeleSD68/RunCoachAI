
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment, TrackStats, Split, AiSegment, UserProfile } from '../types';
import { getTrackPointAtDistance, getPointsInDistanceRange, getSmoothedPace } from '../services/trackEditorUtils';
import { getTrackSegmentColors, GradientMetric } from '../services/colorService';

declare const L: any; 

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const m = Math.floor(pace);
    const s = Math.round((pace - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ 
    tracks, visibleTrackIds, selectedTrackIds, raceRunners, hoveredTrackId, runnerSpeeds, 
    selectionPoints, hoveredPoint, hoveredData, pauseSegments, showPauses, onMapHover, onTrackHover,
    onPauseClick, mapGradientMetric = 'none', coloredPauseSegments, animationTrack, 
    animationProgress = 0, animationPace = 0, isAnimationPlaying, fitBoundsCounter = 0,
    selectedPoint, onPointClick, hoveredLegendValue, aiSegmentHighlight
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const runnerMarkerRef = useRef<any>(null);
  const trailPolylineRef = useRef<any>(null);
  const selectionPolylineRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);

  const fitMapToBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    let bounds: any = null;
    
    const relevantTracks = tracks.filter(t => visibleTrackIds.has(t.id));
    if (relevantTracks.length > 0) {
        const allPoints = relevantTracks.flatMap(t => t.points.map(p => [p.lat, p.lon]));
        if (allPoints.length > 0) bounds = L.latLngBounds(allPoints);
    }

    if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [tracks, visibleTrackIds]);

  useEffect(() => {
    if (mapRef.current) {
        setTimeout(() => mapRef.current.invalidateSize(), 300);
    }
  }, [fitBoundsCounter]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { 
          preferCanvas: true, zoomControl: false, attributionControl: false 
      }).setView([45, 12], 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
      if (tracks.length > 0) fitMapToBounds();
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polylinesRef.current.forEach(layer => map.removeLayer(layer));
    polylinesRef.current.clear();

    tracks.forEach(track => {
        if (!visibleTrackIds.has(track.id)) return;
        
        // Durante l'animazione mostriamo solo il percorso "fatto"
        if (animationTrack && animationTrack.id === track.id) return;

        let layer;
        if (mapGradientMetric !== 'none') {
            const segments = getTrackSegmentColors(track, mapGradientMetric as GradientMetric);
            layer = L.featureGroup(segments.map(seg => 
                L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], {
                    color: seg.color, weight: 4, opacity: 0.7
                })
            ));
        } else {
            layer = L.polyline(track.points.map(p => [p.lat, p.lon]), {
                color: track.color, weight: 4, opacity: 0.6
            });
        }
        layer.addTo(map);
        polylinesRef.current.set(track.id, layer);
    });
  }, [tracks, visibleTrackIds, mapGradientMetric, animationTrack]);

  // Gestione Animazione Runner
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !animationTrack) {
        if (runnerMarkerRef.current) { map.removeLayer(runnerMarkerRef.current); runnerMarkerRef.current = null; }
        if (trailPolylineRef.current) { map.removeLayer(trailPolylineRef.current); trailPolylineRef.current = null; }
        return;
    }

    const currentPoint = getTrackPointAtDistance(animationTrack, animationProgress);
    if (!currentPoint) return;

    // Calcolo Passo Live (ultimi 80m per stabilità)
    const livePace = getSmoothedPace(animationTrack, animationProgress, 80);

    // Marker con Etichetta Passo
    if (!runnerMarkerRef.current) {
        const customIcon = L.divIcon({
            className: 'custom-runner-icon',
            html: `
                <div class="relative flex flex-col items-center">
                    <div class="bg-cyan-600 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-full border border-white/40 shadow-2xl mb-1.5 whitespace-nowrap">
                        ${formatPace(livePace)}
                    </div>
                    <div class="w-4 h-4 bg-white rounded-full border-2 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)] pulse-anim"></div>
                </div>
            `,
            iconSize: [60, 40],
            iconAnchor: [30, 40]
        });
        runnerMarkerRef.current = L.marker([currentPoint.lat, currentPoint.lon], { icon: customIcon }).addTo(map);
    } else {
        runnerMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lon]);
        runnerMarkerRef.current.getElement().innerHTML = `
            <div class="relative flex flex-col items-center">
                <div class="bg-cyan-600 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-full border border-white/40 shadow-2xl mb-1.5 whitespace-nowrap">
                    ${formatPace(livePace)}
                </div>
                <div class="w-4 h-4 bg-white rounded-full border-2 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)] pulse-anim"></div>
            </div>
        `;
    }

    // Progressive Path Reveal
    const trailPoints = animationTrack.points.filter(p => p.cummulativeDistance <= animationProgress);
    if (trailPoints.length > 1) {
        if (!trailPolylineRef.current) {
            trailPolylineRef.current = L.polyline(trailPoints.map(p => [p.lat, p.lon]), {
                color: '#22d3ee', weight: 6, opacity: 0.9, className: 'reveal-trail'
            }).addTo(map);
        } else {
            trailPolylineRef.current.setLatLngs(trailPoints.map(p => [p.lat, p.lon]));
        }
    }

    // Auto-Centering Costante
    if (isAnimationPlaying) {
        map.panTo([currentPoint.lat, currentPoint.lon], { animate: true, duration: 0.1 });
    }
  }, [animationProgress, animationTrack, isAnimationPlaying]);

  return (
    <div className="relative h-full w-full bg-slate-900 overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
      <style>{`
        .reveal-trail { filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6)); stroke-linecap: round; }
        .pulse-anim { animation: marker-pulse 2s infinite; }
        @keyframes marker-pulse { 0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(34, 211, 238, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); } }
      `}</style>
    </div>
  );
};

export default MapDisplay;
