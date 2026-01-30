import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapDisplayProps, GradientMetric } from '../types';
import { getTrackSegmentColors } from '../services/colorService';
import { getTrackPointAtDistance } from '../services/trackEditorUtils';

// Fix for default marker icons in Leaflet with Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapDisplay: React.FC<MapDisplayProps> = ({
    tracks,
    visibleTrackIds,
    selectedTrackIds,
    raceRunners,
    hoveredTrackId,
    runnerSpeeds,
    selectionPoints,
    hoveredPoint,
    hoveredData,
    pauseSegments,
    showPauses,
    onMapHover,
    onTrackHover,
    onPauseClick,
    mapGradientMetric = 'none',
    coloredPauseSegments,
    selectedPoint,
    onPointClick,
    hoveredLegendValue,
    onTrackClick,
    animationTrack,
    animationProgress,
    animationPace,
    onExitAnimation,
    fastestSplitForAnimation,
    animationHighlight,
    animationKmHighlight,
    isAnimationPlaying,
    onToggleAnimationPlay,
    onAnimationProgressChange,
    animationTrackStats,
    animationSpeed,
    onAnimationSpeedChange,
    fitBoundsCounter,
    aiSegmentHighlight,
    showSummaryMode,
    theme = 'dark',
    is3DMode = false
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const polylinesRef = useRef<Map<string, L.Layer>>(new Map());
    const raceFaintPolylinesRef = useRef<Map<string, L.Layer>>(new Map());
    const kmMarkersLayerGroupRef = useRef<L.LayerGroup | null>(null);
    const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
    const selectionLayerGroupRef = useRef<L.LayerGroup | null>(null);
    const hoverMarkerRef = useRef<L.Marker | null>(null);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: [41.9028, 12.4964], // Rome default
                zoom: 13,
                zoomControl: false
            });
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
            
            // Tile Layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapRef.current);

            kmMarkersLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
            markersLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
            selectionLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Fit Bounds
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        
        const visibleTracks = tracks.filter(t => visibleTrackIds.has(t.id));
        if (visibleTracks.length === 0 && !animationTrack) return;

        const bounds = L.latLngBounds([]);
        (animationTrack ? [animationTrack] : visibleTracks).forEach(t => {
            t.points.forEach(p => bounds.extend([p.lat, p.lon]));
        });

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [tracks, visibleTrackIds, fitBoundsCounter, animationTrack]);

    // Main Track Rendering Effect - 2D Only
    useEffect(() => {
        const map = mapRef.current;
        if (!map || is3DMode) return;

        // Clear previous layers
        polylinesRef.current.forEach(layer => map.removeLayer(layer));
        polylinesRef.current.clear();
        raceFaintPolylinesRef.current.forEach(layer => map.removeLayer(layer));
        raceFaintPolylinesRef.current.clear();
        
        if (!animationTrack) kmMarkersLayerGroupRef.current?.clearLayers();

        if (animationTrack) {
            // Animation Mode
            const faintLayer = L.polyline(animationTrack.points.map(p => [p.lat, p.lon]), {
                color: animationTrack.color, weight: 3, opacity: 0.2, interactive: false
            }).addTo(map);
            raceFaintPolylinesRef.current.set('base', faintLayer);

            const passedPoints = animationTrack.points.filter(p => p.cummulativeDistance <= (animationProgress || 0));
            const currentInterp = getTrackPointAtDistance(animationTrack, animationProgress || 0);
            if (currentInterp) passedPoints.push(currentInterp);

            if (passedPoints.length > 1) {
                const progressLayer = L.polyline(passedPoints.map(p => [p.lat, p.lon]), {
                    color: animationTrack.color, weight: 5, opacity: 0.9, lineJoin: 'round'
                }).addTo(map);
                polylinesRef.current.set('progress', progressLayer);
                
                // Add marker at tip
                if (currentInterp) {
                     const marker = L.circleMarker([currentInterp.lat, currentInterp.lon], {
                        radius: 6,
                        fillColor: animationTrack.color,
                        color: '#fff',
                        weight: 2,
                        fillOpacity: 1
                    }).addTo(map);
                    // We don't track this marker ref in polylinesRef to clear it here,
                    // but since we clear all layers on re-render by effect dependencies, 
                    // it should be handled if we added it to a layer group. 
                    // For simplicity, let's just add it to map and track in raceFaintPolylinesRef for now or better markersLayer
                    raceFaintPolylinesRef.current.set('animMarker', marker);
                }
            }
        } 
        else {
            // Normal Mode / Race Mode
            const safeVisibleIds = visibleTrackIds instanceof Set ? visibleTrackIds : new Set();
            const safeSelectedIds = selectedTrackIds instanceof Set ? selectedTrackIds : new Set();
            
            tracks.forEach(track => {
                const shouldRender = hoveredTrackId 
                    ? track.id === hoveredTrackId 
                    : safeVisibleIds.has(track.id);

                if (!shouldRender) return;

                if (raceRunners && raceRunners.length > 0) {
                    const runner = raceRunners.find(r => r.trackId === track.id);
                    if (!runner) return;
                    const faintLayer = L.polyline(track.points.map(p => [p.lat, p.lon]), {
                        color: track.color, weight: 2, opacity: 0.15, interactive: false
                    }).addTo(map);
                    raceFaintPolylinesRef.current.set(track.id, faintLayer);
                    
                    const currentDist = runner.position.cummulativeDistance;
                    const passedPoints = track.points.filter(p => p.cummulativeDistance <= currentDist);
                    // Add current interpolated pos
                    passedPoints.push(runner.position); 

                    if (passedPoints.length > 1) {
                        const passedLayer = L.polyline(passedPoints.map(p => [p.lat, p.lon]), {
                            color: track.color, weight: 4, opacity: 0.8, lineJoin: 'round'
                        }).addTo(map);
                        polylinesRef.current.set(track.id, passedLayer);
                    }
                } 
                else {
                    let layer;
                    const isHovered = track.id === hoveredTrackId;
                    const isSelected = safeSelectedIds.has(track.id);
                    
                    if (mapGradientMetric !== 'none') {
                        const coloredSegments = getTrackSegmentColors(track, mapGradientMetric as GradientMetric, track.color);
                        layer = L.featureGroup(coloredSegments.map(seg => 
                            L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], { 
                                color: seg.color, 
                                weight: isHovered ? 8 : (isSelected ? 6 : 4), 
                                opacity: isHovered ? 1 : (isSelected ? 1 : 0.7), 
                                lineJoin: 'round' 
                            })
                        ));
                    } else {
                        layer = L.polyline(track.points.map(p => [p.lat, p.lon]), { 
                            color: isHovered ? '#fde047' : track.color, 
                            weight: isHovered ? 8 : (isSelected ? 6 : 4), 
                            opacity: isHovered ? 1 : (isSelected ? 1 : 0.7), 
                            lineJoin: 'round',
                            bubblingMouseEvents: false 
                        });
                    }
                    
                    if (isHovered || isSelected) {
                        (layer as L.Layer).bringToFront();
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
                    polylinesRef.current.set(track.id, layer);
                }
            });
        }
    }, [tracks, visibleTrackIds, selectedTrackIds, mapGradientMetric, raceRunners, animationTrack, animationProgress, showSummaryMode, is3DMode, hoveredTrackId]);

    // Handle Hover Marker
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (hoveredPoint) {
            if (!hoverMarkerRef.current) {
                hoverMarkerRef.current = L.circleMarker([hoveredPoint.lat, hoveredPoint.lon], {
                    color: '#fff',
                    fillColor: '#0ea5e9',
                    fillOpacity: 1,
                    radius: 6,
                    weight: 2
                }).addTo(map);
            } else {
                hoverMarkerRef.current.setLatLng([hoveredPoint.lat, hoveredPoint.lon]);
                if (!map.hasLayer(hoverMarkerRef.current)) hoverMarkerRef.current.addTo(map);
            }
        } else {
            if (hoverMarkerRef.current) {
                hoverMarkerRef.current.remove();
                hoverMarkerRef.current = null;
            }
        }
    }, [hoveredPoint]);

    // Handle Selection Points (e.g. from editor)
    useEffect(() => {
        if (!selectionLayerGroupRef.current) return;
        selectionLayerGroupRef.current.clearLayers();
        
        if (selectionPoints && selectionPoints.length > 0) {
            const latlngs = selectionPoints.map(p => [p.lat, p.lon] as [number, number]);
            L.polyline(latlngs, { color: 'yellow', weight: 6, opacity: 0.6 }).addTo(selectionLayerGroupRef.current);
        }
    }, [selectionPoints]);

    return <div ref={mapContainerRef} className="w-full h-full bg-slate-900" />;
};

export default MapDisplay;