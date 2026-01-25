
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment, TrackStats, Split, AiSegment } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance, getPointsInDistanceRange } from '../services/trackEditorUtils';
import { getTrackSegmentColors, ColoredSegment, GradientMetric } from '../services/colorService';
import AnimationControls from './AnimationControls';
import Tooltip from './Tooltip';

declare const L: any; 

const FitBoundsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2.5 3.5A1 1 0 0 1 3.5 2.5h2.25a.75.75 0 0 0 0-1.5H3.5A2.5 2.5 0 0 0 1 3.5v2.25a.75.75 0 0 0 1.5 0V3.5ZM17.5 3.5V5.75a.75.75 0 0 0 1.5 0V3.5A2.5 2.5 0 0 0 16.5 1h-2.25a.75.75 0 0 0 0 1.5H16.5A1 1 0 0 1 17.5 3.5ZM2.5 16.5A1 1 0 0 1 3.5 17.5h2.25a.75.75 0 0 0 0-1.5H3.5A2.5 2.5 0 0 0 1 16.5v-2.25a.75.75 0 0 0-1.5 0V16.5a1 1 0 0 1-1 1h-2.25a.75.75 0 0 0 0 1.5H16.5Z" />
    </svg>
);

const LayersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Zm6.94 3.7a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Zm-6.94 3.7a.75.75 0 0 0 1.06-.04l1.95-2.1 1.95 2.1a.75.75 0 1 0 1.1-1.02l-2.5-2.7a.75.75 0 0 0-1.1 0l-2.5 2.7a.75.75 0 0 0 .04 1.06Z" clipRule="evenodd" />
        <path d="M12.25 5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm0 3.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm0 3.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" />
    </svg>
);

const ZoomInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.25 10a.75.75 0 0 1 .75-.75h10a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
);

interface AnimationStats {
    time: string;
    pace: string;
    elevation: number;
    hr: number | null;
    distance: number;
}

const StatsDisplay: React.FC<{ stats: AnimationStats, splits: Split[], currentDistance: number, visibleMetrics: Set<string> }> = ({ stats, splits, currentDistance, visibleMetrics }) => {
    const showHr = visibleMetrics.has('hr') && stats.hr !== null;
    const showTime = visibleMetrics.has('time');
    const showPace = visibleMetrics.has('pace');
    const showElevation = visibleMetrics.has('elevation');
    const activeMetricsCount = 1 + (showTime ? 1 : 0) + (showPace ? 1 : 0) + (showElevation ? 1 : 0) + (showHr ? 1 : 0);

    return (
        <div className="absolute top-0 left-0 right-0 sm:top-4 sm:left-auto sm:right-4 bg-slate-800/95 sm:bg-slate-800/90 backdrop-blur-md p-3 sm:p-4 rounded-b-xl sm:rounded-xl shadow-2xl text-white z-[1000] border-b sm:border border-slate-600 w-full sm:w-auto sm:max-w-lg transition-all duration-300">
            <div className="grid gap-x-4 gap-y-2" style={{ gridTemplateColumns: `repeat(${activeMetricsCount}, minmax(0, 1fr))` }}>
                <div>
                    <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Distanza</div>
                    <div className="text-base sm:text-xl font-bold font-mono">{stats.distance.toFixed(2)} <span className="text-[10px] sm:text-sm text-slate-500">km</span></div>
                </div>
                {showTime && (
                    <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Tempo</div>
                        <div className="text-base sm:text-xl font-bold font-mono">{stats.time}</div>
                    </div>
                )}
                {showPace && (
                    <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Ritmo</div>
                        <div className="text-base sm:text-xl font-bold font-mono">{stats.pace}</div>
                    </div>
                )}
                {showElevation && (
                    <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Elev.</div>
                        <div className="text-base sm:text-xl font-bold font-mono">{stats.elevation} m</div>
                    </div>
                )}
                {showHr && (
                     <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">FC</div>
                        <div className="text-base sm:text-xl font-bold font-mono text-red-400">{Math.round(stats.hr!)} <span className="text-[10px] sm:text-sm text-slate-500">bpm</span></div>
                    </div>
                )}
            </div>
        </div>
    );
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const isValidLatLng = (lat: any, lng: any) => typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

const MapDisplay: React.FC<MapDisplayProps> = ({ 
    tracks, visibleTrackIds, selectedTrackIds, raceRunners, hoveredTrackId, runnerSpeeds, 
    selectionPoints, hoveredPoint, hoveredData, pauseSegments, showPauses, onMapHover, onTrackHover,
    onPauseClick, mapGradientMetric = 'none', coloredPauseSegments, animationTrack, 
    animationProgress = 0, animationPace = 0, onExitAnimation, fastestSplitForAnimation, animationHighlight,
    isAnimationPlaying, onToggleAnimationPlay, onAnimationProgressChange,
    animationSpeed, onAnimationSpeedChange, fitBoundsCounter = 0,
    selectedPoint, onPointClick, hoveredLegendValue, aiSegmentHighlight,
    showSummaryMode, onTrackClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const raceFaintPolylinesRef = useRef<Map<string, any>>(new Map());
  const raceRunnerMarkersRef = useRef<Map<string, any>>(new Map());
  const kmMarkersLayerGroupRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);
  const animationMarkerRef = useRef<any>(null);
  const aiSegmentPolylineRef = useRef<any>(null);
  const selectionPolylineRef = useRef<any>(null);
  
  const [isAutoFitEnabled, setIsAutoFitEnabled] = useState(true);
  
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'satellite' | 'silver' | 'midnight'>(() => {
      const saved = localStorage.getItem('gpx-map-theme');
      return (saved as any) || 'light';
  });

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(['time', 'pace', 'elevation', 'hr']));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const passedKmsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
      localStorage.setItem('gpx-map-theme', mapTheme);
  }, [mapTheme]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const animationTrackStats = useMemo(() => animationTrack ? calculateTrackStats(animationTrack) : null, [animationTrack]);

  const animationStats = useMemo((): AnimationStats => {
    if (!animationTrack) return { time: '00:00:00', pace: '--:-- /km', elevation: 0, hr: null, distance: 0 };
    const point = getTrackPointAtDistance(animationTrack, animationProgress);
    if (!point) return { time: '00:00:00', pace: '--:-- /km', elevation: 0, hr: null, distance: animationProgress };
    const elapsedMs = point.time.getTime() - animationTrack.points[0].time.getTime();
    return { time: formatDuration(elapsedMs), pace: animationPace > 0 ? `${formatPace(animationPace)} /km` : '--:-- /km', elevation: Math.round(point.ele), hr: point.hr || null, distance: animationProgress };
  }, [animationTrack, animationProgress, animationPace]);

  const handleToggleMetric = useCallback((metric: string) => {
      setVisibleMetrics(prev => {
          const next = new Set(prev);
          if (next.has(metric)) next.delete(metric);
          else next.add(metric);
          return next;
      });
  }, []);

  const fitMapToBounds = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      let bounds: any = null;
      
      const safeVisibleIds = visibleTrackIds instanceof Set ? visibleTrackIds : new Set();
      const safeSelectedIds = selectedTrackIds instanceof Set ? selectedTrackIds : new Set();

      if (animationTrack) {
        const allPoints = animationTrack.points.filter(p => isValidLatLng(p.lat, p.lon)).map(p => [p.lat, p.lon]);
        if (allPoints.length > 0) bounds = L.latLngBounds(allPoints);
      } else if (raceRunners && raceRunners.length > 0) {
          const points = raceRunners.map(r => r.position).filter(p => isValidLatLng(p.lat, p.lon)).map(p => [p.lat, p.lon]);
          if (points.length > 0) {
                bounds = L.latLngBounds(points);
                if (bounds.getNorth() === bounds.getSouth() && bounds.getEast() === bounds.getWest()) {
                    map.setView(points[0], 16, { animate: true });
                    return;
                }
          }
      } else if (aiSegmentHighlight && tracks[0]) {
          const points = getPointsInDistanceRange(tracks[0], aiSegmentHighlight.startDistance, aiSegmentHighlight.endDistance).filter(p => isValidLatLng(p.lat, p.lon));
          if (points.length > 1) bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      } else if (selectionPoints && selectionPoints.length > 1) {
          bounds = L.latLngBounds(selectionPoints.filter(p => isValidLatLng(p.lat, p.lon)).map(p => [p.lat, p.lon]));
      } else {
          const hasSelection = safeSelectedIds.size > 0;
          const targetIds = hasSelection ? safeSelectedIds : safeVisibleIds;
          
          const relevantTracks = tracks.filter(t => targetIds.has(t.id));
          if (relevantTracks.length > 0) {
              const allPoints = relevantTracks.flatMap(t => t.points.filter(p => isValidLatLng(p.lat, p.lon)).map(p => [p.lat, p.lon]));
              if (allPoints.length > 0) bounds = L.latLngBounds(allPoints);
          }
      }
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [selectionPoints, tracks, visibleTrackIds, selectedTrackIds, animationTrack, aiSegmentHighlight, raceRunners]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { 
          preferCanvas: true, 
          zoomControl: false,
          attributionControl: false 
      }).setView([45.60, 12.88], 13);

      L.control.attribution({ prefix: false }).addTo(mapRef.current);

      mapRef.current.on('dragstart zoomstart', () => setIsAutoFitEnabled(false));
      kmMarkersLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
      
      const resizeObserver = new ResizeObserver(() => { 
          if (mapRef.current) { 
              mapRef.current.invalidateSize(); 
              if (isAutoFitEnabled) fitMapToBounds(); 
          } 
      });
      resizeObserver.observe(mapContainerRef.current);

      if (tracks.length > 0) {
          fitMapToBounds();
      }

      return () => {
          if (mapRef.current) {
              mapRef.current.remove();
              mapRef.current = null;
          }
          resizeObserver.disconnect();
      };
    }
  }, []);

  useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (tileLayerRef.current) {
          map.removeLayer(tileLayerRef.current);
      }

      let tileUrl = '';
      let attribution = '';
      let options: any = { maxZoom: 19 };

      if (mapTheme === 'satellite') {
          tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
          attribution = 'Tiles &copy; Esri';
      } else if (mapTheme === 'silver') {
          tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
          attribution = '&copy; OpenStreetMap';
      } else if (mapTheme === 'midnight') {
          tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
          attribution = '&copy; OpenStreetMap';
      } else {
          tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
          attribution = '&copy; OpenStreetMap';
          
          if (mapTheme === 'dark') {
              options.className = 'map-tiles-dark';
          }
      }
      
      options.attribution = attribution;

      tileLayerRef.current = L.tileLayer(tileUrl, options).addTo(map);

  }, [mapTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polylinesRef.current.forEach(layer => map.removeLayer(layer));
    polylinesRef.current.clear();
    raceFaintPolylinesRef.current.forEach(layer => map.removeLayer(layer));
    raceFaintPolylinesRef.current.clear();
    if (!animationTrack) kmMarkersLayerGroupRef.current?.clearLayers();

    if (animationTrack) {
        const faintLayer = L.polyline(animationTrack.points.map(p => [p.lat, p.lon]), {
            color: animationTrack.color,
            weight: 3,
            opacity: 0.2,
            interactive: false
        }).addTo(map);
        raceFaintPolylinesRef.current.set('base', faintLayer);

        const passedPoints = animationTrack.points.filter(p => p.cummulativeDistance <= animationProgress);
        const currentInterp = getTrackPointAtDistance(animationTrack, animationProgress);
        if (currentInterp) passedPoints.push(currentInterp);

        if (passedPoints.length > 1) {
            const progressLayer = L.polyline(passedPoints.map(p => [p.lat, p.lon]), {
                color: animationTrack.color,
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(map);
            polylinesRef.current.set('progress', progressLayer);
        }

        if (currentInterp && !showSummaryMode) {
            map.setView([currentInterp.lat, currentInterp.lon], map.getZoom(), { animate: false });
        }

        if (currentInterp) {
            if (animationMarkerRef.current) map.removeLayer(animationMarkerRef.current);
            const icon = L.divIcon({
                className: 'race-cursor-icon',
                html: `<div class="relative flex flex-col items-center"><div class="cursor-dot animate-pulse shadow-lg" style="background-color: ${animationTrack.color}; width: 20px; height: 20px; border: 3px solid white;"></div><div class="pace-label font-black" style="background-color: ${animationTrack.color};">${animationPace > 0 ? formatPace(animationPace) : '--:--'}</div></div>`,
                iconSize: [60, 40],
                iconAnchor: [30, 20]
            });
            animationMarkerRef.current = L.marker([currentInterp.lat, currentInterp.lon], { icon, zIndexOffset: 2000 }).addTo(map);
        }

        const currentKm = Math.floor(animationProgress);
        if (currentKm >= 1 && !passedKmsRef.current.has(currentKm)) {
            passedKmsRef.current.add(currentKm);
            const kmPoint = getTrackPointAtDistance(animationTrack, currentKm);
            if (kmPoint && animationTrackStats) {
                const split = animationTrackStats.splits.find(s => s.splitNumber === currentKm);
                const icon = L.divIcon({
                    className: 'km-marker border-cyan-400 border-2 shadow-cyan-500/50 shadow-md',
                    html: `<span>${currentKm}</span>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });
                const marker = L.marker([kmPoint.lat, kmPoint.lon], { icon }).addTo(kmMarkersLayerGroupRef.current);
                if (split) {
                    marker.bindPopup(`
                        <div class="p-1 font-sans">
                            <div class="text-[10px] font-black text-cyan-400 uppercase tracking-tighter mb-0.5">Km ${currentKm}</div>
                            <div class="text-sm font-black text-white leading-tight">${formatPace(split.pace)}/km</div>
                            <div class="text-[9px] text-slate-400 font-bold mt-1">Tempo: ${formatDuration(split.duration)}</div>
                            <div class="text-[9px] text-slate-500">Alt: +${Math.round(split.elevationGain)}m</div>
                        </div>
                    `, { closeButton: false, offset: [0, -10], className: 'km-info-popup' }).openPopup();
                }
            }
        }
        
        if (animationProgress < 0.1) passedKmsRef.current.clear();

    } else {
        if (animationMarkerRef.current) { map.removeLayer(animationMarkerRef.current); animationMarkerRef.current = null; }
        passedKmsRef.current.clear();

        const safeVisibleIds = visibleTrackIds instanceof Set ? visibleTrackIds : new Set();
        const safeSelectedIds = selectedTrackIds instanceof Set ? selectedTrackIds : new Set();

        const isSelectionActive = safeSelectedIds.size > 0;
        const isAnyHovered = hoveredTrackId !== null;

        tracks.forEach(track => {
            if (!safeVisibleIds.has(track.id)) return;
            const isHovered = hoveredTrackId === track.id;
            const isSelected = safeSelectedIds.has(track.id);
            
            if (raceRunners && raceRunners.length > 0) {
                const runner = raceRunners.find(r => r.trackId === track.id);
                if (!runner) return;
                const faintLayer = L.polyline(track.points.map(p => [p.lat, p.lon]), {
                    color: track.color, weight: 2, opacity: 0.15, interactive: false
                }).addTo(map);
                raceFaintPolylinesRef.current.set(track.id, faintLayer);
                const currentDist = runner.position.cummulativeDistance;
                const passedPoints = track.points.filter(p => p.cummulativeDistance <= currentDist);
                if (passedPoints.length > 1) {
                    passedPoints.push(runner.position);
                    const passedLayer = L.polyline(passedPoints.map(p => [p.lat, p.lon]), {
                        color: track.color, weight: 4, opacity: 0.8, lineJoin: 'round'
                    }).addTo(map);
                    polylinesRef.current.set(track.id, passedLayer);
                }
            } 
            else {
                let opacity = 0.6;
                let weight = 3;
                let color = track.color;
                
                if (isAnyHovered) {
                    if (isHovered) {
                        opacity = 1.0;
                        weight = 8; // Highlight heavily
                        color = track.color;
                    } else {
                        // Decolor other tracks
                        opacity = 0.15; // Fade out significantly
                        weight = 2;
                        color = '#334155'; // Grey/Slate
                    }
                } else if (isSelectionActive) {
                    if (isSelected) {
                        opacity = 1.0;
                        weight = 6;
                        color = track.color;
                    } else {
                        opacity = 0.2;
                        weight = 2;
                        color = '#475569';
                    }
                } else {
                    const isSatellite = mapTheme === 'satellite';
                    opacity = isSatellite ? 0.9 : 0.6;
                    weight = isSatellite ? 4 : 3;
                }
                
                let layer;
                // Apply gradient logic only if highlighted or no focus mode is active
                const shouldApplyGradient = mapGradientMetric !== 'none' && (isHovered || (!isAnyHovered && (isSelected || !isSelectionActive)));

                if (shouldApplyGradient) {
                    const coloredSegments = getTrackSegmentColors(track, mapGradientMetric as GradientMetric, color);
                    layer = L.featureGroup(coloredSegments.map(seg => L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], { color: seg.color, weight: weight + 1, opacity: opacity, lineJoin: 'round' })));
                } else {
                    layer = L.polyline(track.points.map(p => [p.lat, p.lon]), { color: color, weight: weight, opacity: opacity, lineJoin: 'round' });
                }
                
                layer.on('mouseover', () => onTrackHover?.(track.id));
                layer.on('mouseout', () => onTrackHover?.(null));
                
                layer.on('click', (e: any) => { 
                    L.DomEvent.stopPropagation(e); 
                    if (onTrackClick) {
                        const isMultiSelect = e.originalEvent.shiftKey || e.originalEvent.ctrlKey || e.originalEvent.metaKey;
                        onTrackClick(track.id, isMultiSelect);
                    }
                    onPointClick?.({ lat: e.latlng.lat, lon: e.latlng.lng, ele: 0, time: new Date(), cummulativeDistance: 0 });
                });
                
                layer.addTo(map);
                
                if (isHovered || isSelected) {
                    if (layer.bringToFront) layer.bringToFront();
                    else if (layer.eachLayer) layer.eachLayer((l: any) => l.bringToFront && l.bringToFront());
                }
                
                polylinesRef.current.set(track.id, layer);
            }
            if (!raceRunners && (safeVisibleIds.size === 1 || isHovered || isSelected)) {
                for (let km = 1; km < track.distance; km++) {
                    const pt = getTrackPointAtDistance(track, km);
                    if (pt) {
                        const icon = L.divIcon({ className: 'km-marker', html: `<span>${km}</span>`, iconSize: [20, 20], iconAnchor: [10, 10] });
                        L.marker([pt.lat, pt.lon], { icon, interactive: false }).addTo(kmMarkersLayerGroupRef.current);
                    }
                }
            }
        });
    }

    if (selectionPolylineRef.current) map.removeLayer(selectionPolylineRef.current);
    if (selectionPoints && selectionPoints.length > 1) {
        selectionPolylineRef.current = L.polyline(selectionPoints.map(p => [p.lat, p.lon]), { color: '#fde047', weight: 8, opacity: 0.8, lineCap: 'round', dashArray: '1, 10' }).addTo(map);
    }
    if (aiSegmentPolylineRef.current) map.removeLayer(aiSegmentPolylineRef.current);
    if (aiSegmentHighlight && tracks.length > 0) {
        const pts = getPointsInDistanceRange(tracks[0], aiSegmentHighlight.startDistance, aiSegmentHighlight.endDistance);
        if (pts.length > 1) {
            aiSegmentPolylineRef.current = L.polyline(pts.map(p => [p.lat, p.lon]), { color: '#22d3ee', weight: 10, opacity: 0.9, lineCap: 'round' }).addTo(map);
        }
    }
  }, [tracks, visibleTrackIds, selectedTrackIds, hoveredTrackId, mapGradientMetric, selectionPoints, aiSegmentHighlight, onTrackHover, raceRunners, animationTrack, animationProgress, animationPace, isAnimationPlaying, showSummaryMode, animationTrackStats, mapTheme, onTrackClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    raceRunnerMarkersRef.current.forEach(m => map.removeLayer(m));
    raceRunnerMarkersRef.current.clear();
    if (raceRunners && raceRunners.length > 0) {
        raceRunners.forEach(runner => {
            const textColor = runner.color.toLowerCase() === '#ffffff' || runner.color.toLowerCase() === '#fff' ? 'text-slate-900' : 'text-white';
            const icon = L.divIcon({ 
                className: 'race-cursor-icon', 
                html: `<div class="relative flex flex-col items-center"><div class="cursor-dot" style="background-color: ${runner.color};"></div><div class="pace-label ${textColor}" style="background-color: ${runner.color};">${formatPace(runner.pace)}</div></div>`, 
                iconSize: [60, 40], 
                iconAnchor: [30, 20] 
            });
            const marker = L.marker([runner.position.lat, runner.position.lon], { icon, zIndexOffset: 1000 }).addTo(map);
            raceRunnerMarkersRef.current.set(runner.trackId, marker);
        });
    }
  }, [raceRunners, tracks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hoveredPoint) {
        if (hoverMarkerRef.current) { map?.removeLayer(hoverMarkerRef.current); hoverMarkerRef.current = null; }
        return;
    }
    if (hoverMarkerRef.current) map.removeLayer(hoverMarkerRef.current);

    if (hoveredData) {
        const items = Object.entries(hoveredData).map(([k, v]) => `<div><span class="text-[8px] uppercase font-black opacity-60">${k}:</span> <span class="font-black text-[10px]">${v}</span></div>`).join('');
        const icon = L.divIcon({
            className: 'hover-info-cursor',
            html: `
                <div class="relative flex flex-col items-center">
                    <div class="w-4 h-4 bg-cyan-500 border-2 border-white rounded-full shadow-lg"></div>
                    <div class="absolute bottom-full mb-2 bg-slate-900/95 text-white p-2 rounded-lg border border-cyan-500/50 shadow-2xl whitespace-nowrap min-w-[100px] flex flex-col gap-0.5 z-[2000] pointer-events-none">
                        <div class="text-[9px] font-black text-cyan-400 border-b border-slate-700 pb-1 mb-1 uppercase tracking-tighter">KM ${hoveredPoint.cummulativeDistance.toFixed(2)}</div>
                        ${items}
                    </div>
                </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        hoverMarkerRef.current = L.marker([hoveredPoint.lat, hoveredPoint.lon], { icon, zIndexOffset: 3000 }).addTo(map);
    } else {
        hoverMarkerRef.current = L.circleMarker([hoveredPoint.lat, hoveredPoint.lon], { radius: 7, color: '#fff', fillColor: '#0ea5e9', fillOpacity: 1, weight: 3 }).addTo(map);
    }
  }, [hoveredPoint, hoveredData]);

  useEffect(() => { if (isAutoFitEnabled && !raceRunners && !animationTrack) fitMapToBounds(); }, [isAutoFitEnabled, fitMapToBounds, raceRunners, animationTrack, visibleTrackIds, selectedTrackIds]);
  useEffect(() => { if (fitBoundsCounter > 0) fitMapToBounds(); }, [fitBoundsCounter, fitMapToBounds]);

  return (
    <div className="relative h-full w-full bg-slate-900 overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" style={{ minHeight: '100%' }} />
       {!animationTrack && (
            <div className="pointer-events-none absolute inset-0 z-[1000] p-4">
                <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
                    <Tooltip text="Inquadra" subtext="Adatta vista al percorso" position="right">
                        <button onClick={() => { setIsAutoFitEnabled(true); fitMapToBounds(); }} className={`p-3 rounded-lg shadow-xl transition-all border border-slate-700 active:scale-95 ${isAutoFitEnabled ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}><FitBoundsIcon /></button>
                    </Tooltip>
                    
                    <div className="relative group">
                        <Tooltip text="Stile Mappa" subtext="Cambia sfondo" position="right">
                            <button onClick={() => setShowLayerMenu(!showLayerMenu)} className="p-3 rounded-lg shadow-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95">
                                <LayersIcon />
                            </button>
                        </Tooltip>
                        
                        {showLayerMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowLayerMenu(false)}></div>
                                <div className="absolute top-0 left-full ml-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-20 flex flex-col gap-1 w-32 animate-fade-in-down">
                                    {[
                                        { id: 'midnight', label: 'Midnight' },
                                        { id: 'silver', label: 'Silver' },
                                        { id: 'dark', label: 'Classic Dark' },
                                        { id: 'light', label: 'Classic Light' },
                                        { id: 'satellite', label: 'Satellite' }
                                    ].map(theme => (
                                        <button 
                                            key={theme.id}
                                            onClick={() => { setMapTheme(theme.id as any); setShowLayerMenu(false); }}
                                            className={`px-3 py-2 text-left text-xs font-bold rounded-lg transition-colors ${mapTheme === theme.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                        >
                                            {theme.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="h-2"></div>

                    <div className="flex flex-col bg-slate-800/90 backdrop-blur-md rounded-lg border border-slate-700 shadow-xl overflow-hidden">
                        <button onClick={() => mapRef.current?.zoomIn()} className="p-3 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border-b border-slate-700 active:bg-slate-600"><ZoomInIcon /></button>
                        <button onClick={() => mapRef.current?.zoomOut()} className="p-3 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors active:bg-slate-600"><ZoomOutIcon /></button>
                    </div>
                </div>
            </div>
       )}
        {animationTrack && !showSummaryMode && (
            <>
                <StatsDisplay stats={animationStats} splits={animationTrackStats?.splits || []} currentDistance={animationProgress} visibleMetrics={visibleMetrics} />
                <AnimationControls isPlaying={isAnimationPlaying!} onTogglePlay={onToggleAnimationPlay!} progress={animationProgress} totalDistance={animationTrack.distance} onProgressChange={onAnimationProgressChange!} speed={animationSpeed!} onSpeedChange={onAnimationSpeedChange!} onExit={onExitAnimation!} visibleMetrics={visibleMetrics} onToggleMetric={handleToggleMetric} />
            </>
        )}
      <style>{`
        .km-marker { background: rgba(30, 41, 59, 0.9); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 1px solid #475569; pointer-events: none; }
        .race-cursor-icon { display: flex; align-items: center; justify-content: center; }
        .cursor-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        .pace-label { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.4); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .leaflet-popup-content-wrapper { background: rgba(15, 23, 42, 0.95) !important; color: white !important; border: 1px solid #334155; border-radius: 8px !important; }
        .leaflet-popup-tip { background: rgba(15, 23, 42, 0.95) !important; }
        .km-info-popup .leaflet-popup-content { margin: 8px 12px !important; }
        .hover-info-cursor { display: flex; align-items: center; justify-content: center; overflow: visible !important; }
        @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
        .map-tiles-dark {
            filter: invert(100%) hue-rotate(180deg) brightness(70%) contrast(150%) grayscale(20%);
        }
      `}</style>
    </div>
  );
};

export default MapDisplay;
