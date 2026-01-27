
import React, { useEffect, useRef, useState } from 'react';
import { Track, RaceRunner } from '../types';

// Use global variable from script tag to avoid version mismatch
declare const mapboxgl: any;

interface FlyoverMapProps {
    track?: Track | null; // Primary track for camera following
    tracks?: Track[]; // All tracks available in the context
    raceRunners?: RaceRunner[] | null; // Live positions of all runners
    progress: number; // Current distance in km of primary track
    isPlaying: boolean;
}

// Helpers for smoothing
const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
};

// Handles angle wrapping (e.g. 350 -> 10 degrees)
const lerpAngle = (start: number, end: number, factor: number) => {
    let diff = end - start;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return start + diff * factor;
};

// Helper to calculate bearing between two coordinates
const getBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
    const startLatRad = (startLat * Math.PI) / 180;
    const startLngRad = (startLng * Math.PI) / 180;
    const destLatRad = (destLat * Math.PI) / 180;
    const destLngRad = (destLng * Math.PI) / 180;

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
        Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
    const brng = Math.atan2(y, x);
    return ((brng * 180) / Math.PI + 360) % 360;
};

const FlyoverMap: React.FC<FlyoverMapProps> = ({ track, tracks = [], raceRunners, progress, isPlaying }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    const sourcesInitializedRef = useRef<Set<string>>(new Set());
    const [userInteracting, setUserInteracting] = useState(false);
    
    // Sanitize token on initial load
    const getStoredToken = () => {
        const t = localStorage.getItem('mapbox_token') || '';
        if (t.startsWith('pk.') && !t.includes('Unknown Key') && !t.includes('Error')) {
            return t;
        }
        return '';
    };

    const [token, setToken] = useState<string>(getStoredToken());
    const [isTokenValid, setIsTokenValid] = useState(!!getStoredToken());

    const handleSaveToken = () => {
        if (token.trim().startsWith('pk.')) {
            localStorage.setItem('mapbox_token', token.trim());
            setIsTokenValid(true);
        } else {
            alert("Il token deve iniziare con 'pk.'");
        }
    };

    const handleResetToken = () => {
        localStorage.removeItem('mapbox_token');
        setIsTokenValid(false);
        setToken('');
    };

    const activeTracks = React.useMemo(() => {
        if (raceRunners && raceRunners.length > 0) {
            const runnerIds = new Set(raceRunners.map(r => r.trackId));
            return tracks.filter(t => runnerIds.has(t.id));
        }
        if (track) return [track];
        return [];
    }, [tracks, track, raceRunners]);

    // 1. Initialize Map (Run ONCE)
    useEffect(() => {
        if (!mapContainer.current || !isTokenValid) return;
        if (typeof mapboxgl === 'undefined') return;

        mapboxgl.accessToken = token;

        try {
            const startPoint = activeTracks.length > 0 ? activeTracks[0].points[0] : { lon: 0, lat: 0 };
            const m = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/satellite-streets-v12',
                center: [startPoint.lon, startPoint.lat],
                zoom: 17,
                pitch: 60,
                bearing: 0,
                interactive: true,
                attributionControl: false
            });

            m.addControl(new mapboxgl.AttributionControl({ compact: true }));

            // Add interaction listeners to detect when user is manually moving the map
            m.on('mousedown', () => setUserInteracting(true));
            m.on('touchstart', () => setUserInteracting(true));
            m.on('mouseup', () => setUserInteracting(false));
            m.on('touchend', () => setUserInteracting(false));
            m.on('dragend', () => setUserInteracting(false));

            m.on('load', () => {
                m.addSource('mapbox-dem', {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    'tileSize': 512,
                    'maxzoom': 14
                });
                // Slightly reduced exaggeration for performance and realism
                m.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.2 });

                m.addLayer({
                    'id': 'sky',
                    'type': 'sky',
                    'paint': {
                        'sky-type': 'atmosphere',
                        'sky-atmosphere-sun': [0.0, 0.0],
                        'sky-atmosphere-sun-intensity': 15
                    }
                });
            });

            map.current = m;

        } catch (e) {
            console.error("Mapbox init failed", e);
            handleResetToken();
        }

        return () => {
            map.current?.remove();
            map.current = null;
            markersRef.current.clear();
            sourcesInitializedRef.current.clear();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTokenValid]); 

    // 2. Setup Sources & Layers for Active Tracks (Re-runs when tracks change)
    useEffect(() => {
        const m = map.current;
        if (!m) return;

        const setupLayers = () => {
            activeTracks.forEach((t) => {
                const sourceId = `route-${t.id}`;
                if (!m.getSource(sourceId)) {
                    m.addSource(sourceId, {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': [] 
                            }
                        }
                    });

                    m.addLayer({
                        'id': `${sourceId}-glow`,
                        'type': 'line',
                        'source': sourceId,
                        'layout': { 'line-join': 'round', 'line-cap': 'round' },
                        'paint': {
                            'line-color': t.color,
                            'line-width': 8,
                            'line-opacity': 0.4,
                            'line-blur': 4
                        }
                    });

                    m.addLayer({
                        'id': `${sourceId}-core`,
                        'type': 'line',
                        'source': sourceId,
                        'layout': { 'line-join': 'round', 'line-cap': 'round' },
                        'paint': {
                            'line-color': t.color,
                            'line-width': 3,
                            'line-opacity': 1
                        }
                    });
                    
                    sourcesInitializedRef.current.add(sourceId);
                }
            });
        };

        if (m.isStyleLoaded()) {
            setupLayers();
        } else {
            m.on('load', setupLayers);
        }
    }, [activeTracks]);

    // 3. Animation Loop: Update Geometry, Markers & Camera
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;
        const m = map.current;

        // --- A. Update Geometries (Progressive Trail) ---
        // This ensures the trail is drawn even if paused
        activeTracks.forEach(t => {
            const sourceId = `route-${t.id}`;
            const source = m.getSource(sourceId);
            if (!source) return;

            let currentDist = 0;
            if (raceRunners && raceRunners.length > 0) {
                const runner = raceRunners.find(r => r.trackId === t.id);
                currentDist = runner ? runner.position.cummulativeDistance : 0;
            } else {
                currentDist = progress;
            }

            // Ensure we always have at least one point to avoid "disappearing"
            const visiblePoints = t.points.filter(p => p.cummulativeDistance <= currentDist);
            if (visiblePoints.length === 0 && t.points.length > 0) {
                visiblePoints.push(t.points[0]);
            }
            
            if (visiblePoints.length > 0) {
                source.setData({
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': visiblePoints.map(p => [p.lon, p.lat])
                    }
                });
            }
        });

        // --- B. Update Markers ---
        const updateMarker = (id: string, lat: number, lon: number, color: string) => {
            let marker = markersRef.current.get(id);
            if (!marker) {
                const el = document.createElement('div');
                el.className = 'flyover-marker';
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.backgroundColor = color;
                el.style.borderRadius = '50%';
                el.style.boxShadow = `0 0 15px 4px ${color}, inset 0 0 8px white`;
                el.style.border = '3px solid white';
                el.style.zIndex = '10';

                marker = new mapboxgl.Marker(el)
                    .setLngLat([lon, lat])
                    .addTo(m);
                markersRef.current.set(id, marker);
            } else {
                marker.setLngLat([lon, lat]);
            }
        };

        // --- C. Cinematic Camera Logic (Smoothed) ---
        
        // Use slower smoothing for better feel, less jerky
        const POS_SMOOTH = 0.08; 
        const BEARING_SMOOTH = 0.04;
        
        // READ CURRENT STATE to allow manual Zoom/Pitch overrides
        // Instead of forcing zoom to 16.5, we interpolate towards the target center
        // but keep the user's current zoom/pitch to allow manual control.
        const currentCenter = m.getCenter();
        const currentBearing = m.getBearing();
        const currentZoom = m.getZoom();
        const currentPitch = m.getPitch();

        if (raceRunners && raceRunners.length > 0) {
            // --- RACE MODE (Group) ---
            raceRunners.forEach(runner => {
                updateMarker(runner.trackId, runner.position.lat, runner.position.lon, runner.color);
            });

            if (!userInteracting) {
                const bounds = new mapboxgl.LngLatBounds();
                raceRunners.forEach(r => bounds.extend([r.position.lon, r.position.lat]));

                const targetCamera = m.cameraForBounds(bounds, {
                    padding: { top: 80, bottom: 80, left: 80, right: 80 },
                    bearing: currentBearing, // Respect user bearing
                    pitch: currentPitch, // Respect user pitch
                    maxZoom: 18 // Cap max zoom
                });

                if (targetCamera) {
                    const nextLng = lerp(currentCenter.lng, targetCamera.center.lng, POS_SMOOTH);
                    const nextLat = lerp(currentCenter.lat, targetCamera.center.lat, POS_SMOOTH);
                    // For race mode, we might want some auto-zoom to keep everyone in frame, 
                    // but let's blend it with current zoom to not fight the user too hard.
                    const nextZoom = lerp(currentZoom, targetCamera.zoom, 0.05);

                    m.jumpTo({
                        center: [nextLng, nextLat],
                        zoom: nextZoom,
                        bearing: currentBearing,
                        pitch: currentPitch
                    });
                } else if (raceRunners.length > 0) {
                    const r = raceRunners[0];
                    const nextLng = lerp(currentCenter.lng, r.position.lon, POS_SMOOTH);
                    const nextLat = lerp(currentCenter.lat, r.position.lat, POS_SMOOTH);
                    m.jumpTo({ 
                        center: [nextLng, nextLat],
                        zoom: currentZoom,
                        bearing: currentBearing,
                        pitch: currentPitch
                    });
                }
            }

        } else if (track) {
            // --- SINGLE REPLAY MODE (Follow Path) ---
            let currentIndex = track.points.findIndex(p => p.cummulativeDistance >= progress);
            if (currentIndex === -1) currentIndex = track.points.length - 1;
            const currentPoint = track.points[currentIndex];

            if (currentPoint) {
                updateMarker('single-replay', currentPoint.lat, currentPoint.lon, track.color);

                // Skip camera update if user is interacting to allow free look
                if (!userInteracting) {
                    // Lookahead logic
                    let lookAheadIndex = track.points.findIndex((p, i) => i > currentIndex && p.cummulativeDistance >= progress + 0.15);
                    if (lookAheadIndex === -1) lookAheadIndex = track.points.length - 1;
                    const nextPoint = track.points[lookAheadIndex];

                    let targetBearing = currentBearing;
                    if (nextPoint && nextPoint !== currentPoint) {
                        targetBearing = getBearing(currentPoint.lat, currentPoint.lon, nextPoint.lat, nextPoint.lon);
                    }

                    // Smoothly Interpolate
                    const nextLng = lerp(currentCenter.lng, currentPoint.lon, POS_SMOOTH);
                    const nextLat = lerp(currentCenter.lat, currentPoint.lat, POS_SMOOTH);
                    const nextBearing = lerpAngle(currentBearing, targetBearing, BEARING_SMOOTH);

                    // KEY CHANGE: Use currentZoom and currentPitch instead of hardcoded values
                    // This allows the user to Zoom In/Out during replay
                    m.jumpTo({
                        center: [nextLng, nextLat],
                        bearing: nextBearing,
                        pitch: currentPitch, 
                        zoom: currentZoom 
                    });
                }
            }
        }

    }, [progress, raceRunners, activeTracks, userInteracting]);

    if (!isTokenValid) {
        return (
            <div className="absolute inset-0 z-[2000] bg-slate-900/90 flex items-center justify-center p-6">
                <div className="bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-md text-center border border-slate-700 animate-fade-in-down">
                    <h2 className="text-xl font-black text-cyan-400 mb-2 uppercase tracking-tighter">Attiva Flyover 3D</h2>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                        Per visualizzare il terreno 3D immersivo, è necessario un <strong>Mapbox Public Access Token</strong> gratuito.
                    </p>
                    <input 
                        type="text" 
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="pk.eyJ1i..." 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-xs mb-4 font-mono focus:border-cyan-500 outline-none transition-colors"
                    />
                    <button 
                        onClick={handleSaveToken}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95"
                    >
                        Attiva Mappa 3D
                    </button>
                    <p className="text-[10px] text-slate-500 mt-4">
                        Ottienilo su <a href="https://mapbox.com" target="_blank" className="underline hover:text-white">mapbox.com</a>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-0 w-full h-full bg-slate-900">
            <div ref={mapContainer} className="w-full h-full" />
            
            {/* Overlay Info & Reset - Made Smaller */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-cyan-500/20 pointer-events-none flex items-center gap-2 z-[1010]">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-white/80 uppercase tracking-[0.2em]">3D Live</span>
            </div>

            <button 
                onClick={handleResetToken}
                className="absolute bottom-4 right-4 text-slate-500 hover:text-white text-[9px] font-bold transition-colors z-[1010] opacity-50 hover:opacity-100"
                title="Cambia Token Mapbox"
            >
                Reset Token
            </button>
        </div>
    );
};

export default FlyoverMap;
