
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment, TrackStats, Split, AiSegment, UserProfile } from '../types';
import { getTrackPointAtDistance, getSmoothedPace } from '../services/trackEditorUtils';
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
    hoveredPoint, mapGradientMetric = 'none', animationTrack, 
    animationProgress = 0, isAnimationPlaying, fitBoundsCounter = 0
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const trailRef = useRef<any>(null);
  const ghostMarkersRef = useRef<Map<string, any>>(new Map());

  const fitMapToBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const relevantTracks = tracks.filter(t => visibleTrackIds.has(t.id));
    if (relevantTracks.length > 0) {
        const allPoints = relevantTracks.flatMap(t => t.points.map(p => [p.lat, p.lon]));
        if (allPoints.length > 0) map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
    }
  }, [tracks, visibleTrackIds]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { preferCanvas: true, zoomControl: false, attributionControl: false }).setView([45, 12], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
      fitMapToBounds();
    }
  }, []);

  useEffect(() => {
    if (mapRef.current) setTimeout(() => mapRef.current.invalidateSize(), 300);
  }, [fitBoundsCounter]);

  // Gestione Tracciati (Default e Progressive)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polylinesRef.current.forEach(layer => map.removeLayer(layer));
    polylinesRef.current.clear();

    tracks.forEach(track => {
        if (!visibleTrackIds.has(track.id)) return;
        if (animationTrack && animationTrack.id === track.id) return; // Gestito da trailRef

        let layer;
        if (mapGradientMetric !== 'none') {
            const segments = getTrackSegmentColors(track, mapGradientMetric as GradientMetric);
            layer = L.featureGroup(segments.map(seg => L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], { color: seg.color, weight: 4, opacity: 0.6 })));
        } else {
            layer = L.polyline(track.points.map(p => [p.lat, p.lon]), { color: track.color, weight: 4, opacity: 0.5 });
        }
        layer.addTo(map);
        polylinesRef.current.set(track.id, layer);
    });
  }, [tracks, visibleTrackIds, mapGradientMetric, animationTrack]);

  // Animazione Cursore & Trail Progressivo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !animationTrack) {
        if (trailRef.current) { map.removeLayer(trailRef.current); trailRef.current = null; }
        return;
    }

    const currentPoint = getTrackPointAtDistance(animationTrack, animationProgress);
    if (!currentPoint) return;

    // Rivelazione progressiva
    const pointsDone = animationTrack.points.filter(p => p.cummulativeDistance <= animationProgress);
    if (pointsDone.length > 1) {
        if (!trailRef.current) {
            trailRef.current = L.polyline(pointsDone.map(p => [p.lat, p.lon]), { color: '#22d3ee', weight: 6, opacity: 0.9 }).addTo(map);
        } else {
            trailRef.current.setLatLngs(pointsDone.map(p => [p.lat, p.lon]));
        }
    }

    // Auto-centering
    if (isAnimationPlaying) map.panTo([currentPoint.lat, currentPoint.lon], { animate: true, duration: 0.2 });

    // Marker con Passo Live
    const pace = getSmoothedPace(animationTrack, animationProgress, 100);
    if (!ghostMarkersRef.current.has('replay')) {
        const icon = L.divIcon({
            className: 'runner-label',
            html: `<div class="bg-cyan-500 text-white px-2 py-1 rounded-full text-[10px] font-black shadow-xl border border-white/40 whitespace-nowrap">${formatPace(pace)}</div>`,
            iconSize: [40, 20], iconAnchor: [20, 20]
        });
        const m = L.marker([currentPoint.lat, currentPoint.lon], { icon }).addTo(map);
        ghostMarkersRef.current.set('replay', m);
    } else {
        const m = ghostMarkersRef.current.get('replay');
        m.setLatLng([currentPoint.lat, currentPoint.lon]);
        m.getElement().innerHTML = `<div class="bg-cyan-500 text-white px-2 py-1 rounded-full text-[10px] font-black shadow-xl border border-white/40 whitespace-nowrap">${formatPace(pace)}</div>`;
    }
  }, [animationProgress, animationTrack, isAnimationPlaying]);

  // Gestione Ghost Runners (Modalità Gara)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !raceRunners) {
        ghostMarkersRef.current.forEach(m => map.removeLayer(m));
        ghostMarkersRef.current.clear();
        return;
    }

    raceRunners.forEach(r => {
        let m = ghostMarkersRef.current.get(r.trackId);
        if (!m) {
            const icon = L.divIcon({
                className: 'runner-label',
                html: `<div style="background-color:${r.color}" class="text-white px-2 py-1 rounded-full text-[9px] font-black shadow-lg border border-white/30 whitespace-nowrap">${formatPace(r.pace)}</div>`,
                iconSize: [40, 20], iconAnchor: [20, 20]
            });
            m = L.marker([r.position.lat, r.position.lon], { icon }).addTo(map);
            ghostMarkersRef.current.set(r.trackId, m);
        } else {
            m.setLatLng([r.position.lat, r.position.lon]);
            m.getElement().innerHTML = `<div style="background-color:${r.color}" class="text-white px-2 py-1 rounded-full text-[9px] font-black shadow-lg border border-white/30 whitespace-nowrap">${formatPace(r.pace)}</div>`;
        }
    });
  }, [raceRunners]);

  return (
    <div className="relative h-full w-full bg-slate-900 overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};

export default MapDisplay;
