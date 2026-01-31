
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment, TrackStats, Split, AiSegment, UserProfile } from '../types';
import { getTrackPointAtDistance, getPointsInDistanceRange } from '../services/trackEditorUtils';
import { getTrackSegmentColors, GradientMetric } from '../services/colorService';
import FlyoverMap from './FlyoverMap';

declare const L: any; 

const MapDisplay: React.FC<MapDisplayProps> = ({ 
    tracks, visibleTrackIds, selectedTrackIds, raceRunners, hoveredTrackId, runnerSpeeds, 
    selectionPoints, hoveredPoint, hoveredData, pauseSegments, showPauses, onMapHover, onTrackHover,
    onPauseClick, mapGradientMetric = 'none', coloredPauseSegments, animationTrack, 
    animationProgress = 0, animationPace = 0, onExitAnimation, fastestSplitForAnimation, animationHighlight,
    isAnimationPlaying, onToggleAnimationPlay, onAnimationProgressChange,
    animationSpeed, onAnimationSpeedChange, fitBoundsCounter = 0,
    selectedPoint, onPointClick, hoveredLegendValue, aiSegmentHighlight,
    showSummaryMode, onTrackClick, theme
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const runnerMarkerRef = useRef<any>(null);
  const trailPolylineRef = useRef<any>(null);
  const selectionPolylineRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');

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

        let layer;
        if (mapGradientMetric !== 'none') {
            const segments = getTrackSegmentColors(track, mapGradientMetric as GradientMetric);
            layer = L.featureGroup(segments.map(seg => 
                L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], {
                    color: seg.color, weight: 3, opacity: 0.6
                })
            ));
        } else {
            layer = L.polyline(track.points.map(p => [p.lat, p.lon]), {
                color: track.color, weight: 3, opacity: 0.5
            });
        }
        layer.addTo(map);
        polylinesRef.current.set(track.id, layer);
    });
  }, [tracks, visibleTrackIds, mapGradientMetric]);

  // Gestione Animazione Runner
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !animationTrack) return;

    const currentPoint = getTrackPointAtDistance(animationTrack, animationProgress);
    if (!currentPoint) return;

    // Aggiorna o crea il marker del runner
    if (!runnerMarkerRef.current) {
        runnerMarkerRef.current = L.circleMarker([currentPoint.lat, currentPoint.lon], {
            radius: 8, color: '#fff', fillColor: animationTrack.color, fillOpacity: 1, weight: 3, className: 'pulse-runner'
        }).addTo(map);
    } else {
        runnerMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lon]);
    }

    // Aggiorna la scia progressiva
    const trailPoints = animationTrack.points.filter(p => p.cummulativeDistance <= animationProgress);
    if (trailPoints.length > 1) {
        if (!trailPolylineRef.current) {
            trailPolylineRef.current = L.polyline(trailPoints.map(p => [p.lat, p.lon]), {
                color: animationTrack.color, weight: 6, opacity: 0.8, className: 'neon-trail'
            }).addTo(map);
        } else {
            trailPolylineRef.current.setLatLngs(trailPoints.map(p => [p.lat, p.lon]));
        }
    }

    // Centra se richiesto o se esce dallo schermo
    if (isAnimationPlaying && !map.getBounds().contains([currentPoint.lat, currentPoint.lon])) {
        map.panTo([currentPoint.lat, currentPoint.lon]);
    }
  }, [animationProgress, animationTrack, isAnimationPlaying]);

  // Selection Highlight Logic
  useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      if (selectionPolylineRef.current) map.removeLayer(selectionPolylineRef.current);

      if (selectionPoints && selectionPoints.length > 1) {
          selectionPolylineRef.current = L.polyline(selectionPoints.map(p => [p.lat, p.lon]), {
              color: '#fde047', weight: 8, opacity: 0.9, lineCap: 'round', className: 'neon-selection'
          }).addTo(map);
      }
  }, [selectionPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hoveredPoint) {
        if (hoverMarkerRef.current) { map.removeLayer(hoverMarkerRef.current); hoverMarkerRef.current = null; }
        return;
    }
    if (hoverMarkerRef.current) map.removeLayer(hoverMarkerRef.current);
    hoverMarkerRef.current = L.circleMarker([hoveredPoint.lat, hoveredPoint.lon], {
        radius: 6, color: '#fff', fillColor: '#0ea5e9', fillOpacity: 1, weight: 2
    }).addTo(map);
  }, [hoveredPoint]);

  return (
    <div className="relative h-full w-full bg-slate-900 overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
      <style>{`
        .neon-selection { filter: drop-shadow(0 0 10px #fde047); stroke-dasharray: 10, 10; animation: dash 20s linear infinite; }
        .neon-trail { filter: drop-shadow(0 0 5px currentColor); }
        .pulse-runner { animation: pulse 1.5s infinite; }
        @keyframes dash { to { stroke-dashoffset: -1000; } }
        @keyframes pulse { 0% { r: 8; stroke-opacity: 1; } 100% { r: 15; stroke-opacity: 0; } }
      `}</style>
    </div>
  );
};

export default MapDisplay;
