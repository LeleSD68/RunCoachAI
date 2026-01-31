
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment, TrackStats, Split, AiSegment, UserProfile } from '../types';
import { getTrackPointAtDistance, getPointsInDistanceRange } from '../services/trackEditorUtils';
import { getTrackSegmentColors, GradientMetric } from '../services/colorService';
import AnimationControls from './AnimationControls';
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
  const trailRef = useRef<Map<string, any>>(new Map());
  const runnerMarkersRef = useRef<Map<string, any>>(new Map());
  const selectionPolylineRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');

  const fitMapToBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    let bounds: any = null;
    
    const relevantTracks = tracks.filter(t => visibleTrackIds.has(t.id) || (animationTrack && t.id === animationTrack.id));
    if (relevantTracks.length > 0) {
        const allPoints = relevantTracks.flatMap(t => t.points.map(p => [p.lat, p.lon]));
        if (allPoints.length > 0) bounds = L.latLngBounds(allPoints);
    }

    if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [tracks, visibleTrackIds, animationTrack]);

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
    if (!map || viewMode === '3D') return;

    // Cleanup vecchie tracce
    polylinesRef.current.forEach(layer => map.removeLayer(layer));
    polylinesRef.current.clear();

    tracks.forEach(track => {
        if (!visibleTrackIds.has(track.id)) return;

        let layer;
        if (mapGradientMetric !== 'none') {
            const segments = getTrackSegmentColors(track, mapGradientMetric as GradientMetric);
            layer = L.featureGroup(segments.map(seg => 
                L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], {
                    color: seg.color, weight: 3, opacity: 0.5
                })
            ));
        } else {
            layer = L.polyline(track.points.map(p => [p.lat, p.lon]), {
                color: track.color, weight: 3, opacity: 0.4
            });
        }
        layer.addTo(map);
        polylinesRef.current.set(track.id, layer);
    });
  }, [tracks, visibleTrackIds, mapGradientMetric, viewMode]);

  // Gestione Animazione 2D (Runner e Scia Neon)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || viewMode === '3D') return;

    // Cleanup cursori precedenti
    runnerMarkersRef.current.forEach(m => map.removeLayer(m));
    runnerMarkersRef.current.clear();
    trailRef.current.forEach(t => map.removeLayer(t));
    trailRef.current.clear();

    const drawRunner = (tId: string, point: TrackPoint, color: string, dist: number, fullTrack: Track) => {
        // Disegna Scia Neon (trail)
        const trailPoints = fullTrack.points.filter(p => p.cummulativeDistance <= dist);
        if (trailPoints.length > 1) {
            const t = L.polyline(trailPoints.map(p => [p.lat, p.lon]), {
                color: color, weight: 5, opacity: 0.8, className: 'neon-trail'
            }).addTo(map);
            trailRef.current.set(tId, t);
        }

        // Marker Runner
        const m = L.circleMarker([point.lat, point.lon], {
            radius: 8, color: '#fff', fillColor: color, fillOpacity: 1, weight: 3, className: 'pulse-runner'
        }).addTo(map);
        runnerMarkersRef.current.set(tId, m);
    };

    if (raceRunners) {
        raceRunners.forEach(r => {
            const fullT = tracks.find(t => t.id === r.trackId);
            if (fullT) drawRunner(r.trackId, r.position, r.color, r.position.cummulativeDistance, fullT);
        });
    } else if (animationTrack) {
        const p = getTrackPointAtDistance(animationTrack, animationProgress);
        if (p) drawRunner(animationTrack.id, p, animationTrack.color, animationProgress, animationTrack);
    }
  }, [animationProgress, raceRunners, animationTrack, viewMode, mapGradientMetric]);

  // Selection Highlight Logic
  useEffect(() => {
      const map = mapRef.current;
      if (!map || viewMode === '3D') return;
      if (selectionPolylineRef.current) map.removeLayer(selectionPolylineRef.current);

      if (selectionPoints && selectionPoints.length > 1) {
          selectionPolylineRef.current = L.polyline(selectionPoints.map(p => [p.lat, p.lon]), {
              color: '#fde047', weight: 8, opacity: 0.9, lineCap: 'round', className: 'neon-selection'
          }).addTo(map);
      }
  }, [selectionPoints, viewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hoveredPoint || viewMode === '3D') {
        if (hoverMarkerRef.current) { map.removeLayer(hoverMarkerRef.current); hoverMarkerRef.current = null; }
        return;
    }
    if (hoverMarkerRef.current) map.removeLayer(hoverMarkerRef.current);
    hoverMarkerRef.current = L.circleMarker([hoveredPoint.lat, hoveredPoint.lon], {
        radius: 6, color: '#fff', fillColor: '#0ea5e9', fillOpacity: 1, weight: 2
    }).addTo(map);
  }, [hoveredPoint, viewMode]);

  return (
    <div className="relative h-full w-full bg-slate-900 overflow-hidden">
      <div ref={mapContainerRef} className={`h-full w-full ${viewMode === '3D' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
      
      {viewMode === '3D' && (
          <FlyoverMap 
            track={animationTrack} 
            tracks={tracks} 
            raceRunners={raceRunners} 
            progress={animationProgress} 
            isPlaying={isAnimationPlaying || false} 
            pace={animationPace}
          />
      )}

      {(animationTrack || raceRunners) && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[4500] flex gap-2">
               <AnimationControls 
                    isPlaying={isAnimationPlaying || false}
                    onTogglePlay={onToggleAnimationPlay || (() => {})}
                    progress={animationProgress}
                    totalDistance={raceRunners ? Math.max(...tracks.filter(t => visibleTrackIds.has(t.id)).map(t => t.distance)) : (animationTrack?.distance || 0)}
                    onProgressChange={onAnimationProgressChange || (() => {})}
                    speed={animationSpeed || 10}
                    onSpeedChange={onAnimationSpeedChange || (() => {})}
                    onExit={onExitAnimation || (() => {})}
                    visibleMetrics={new Set(['pace', 'hr', 'elevation'])}
                    onToggleMetric={() => {}}
                    onToggleViewMode={() => setViewMode(v => v === '2D' ? '3D' : '2D')}
                    viewMode={viewMode}
               />
          </div>
      )}

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
