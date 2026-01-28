
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
    pace?: number; // Added pace prop for single track animation
}

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

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const FlyoverMap: React.FC<FlyoverMapProps> = ({ track, tracks = [], raceRunners, progress, isPlaying, pace = 0 }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    const labelElementsRef = useRef<Map<string, { nameEl: HTMLElement, paceEl: HTMLElement }>>(new Map());
    const sourcesInitializedRef = useRef<Set<string>>(new Set());
    
    // Track if user has manually rotated/pitched the camera
    const userHasRotatedRef = useRef(false);
    
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

    // Determine active tracks (Racing or Single Animation)
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

            // Listen for user rotation interactions
            m.on('rotatestart', () => {
                userHasRotatedRef.current = true;
            });
            m.on('pitchstart', () => {
                userHasRotatedRef.current = true;
            });

            m.on('load', () => {
                m.addSource('mapbox-dem', {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    'tileSize': 512,
                    'maxzoom': 14
                });
                m.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

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
            labelElementsRef.current.clear();
            sourcesInitializedRef.current.clear();
            userHasRotatedRef.current = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTokenValid]); 

    // 2. Setup Sources & Layers for Active Tracks
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
                                'coordinates': [] // Start empty, filled by animation loop
                            }
                        }
                    });

                    // Glow
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

                    // Core
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

    // 3. Animation Loop: Update Geometry (Progressive), Markers & Camera
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;
        const m = map.current;

        // --- A. Update Geometries (Progressive Trail) ---
        activeTracks.forEach(t => {
            const sourceId = `route-${t.id}`;
            const source = m.getSource(sourceId);
            if (!source) return;

            let currentDist = 0;
            if (raceRunners) {
                const runner = raceRunners.find(r => r.trackId === t.id);
                currentDist = runner ? runner.position.cummulativeDistance : 0;
            } else {
                currentDist = progress;
            }

            const visiblePoints = t.points.filter(p => p.cummulativeDistance <= currentDist);
            
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

        // --- B. Update Markers with Labels ---
        const updateMarker = (id: string, lat: number, lon: number, color: string, name: string, currentPace: number) => {
            let marker = markersRef.current.get(id);
            const paceStr = formatPace(currentPace);
            const textColor = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff' ? '#0f172a' : '#ffffff';

            if (!marker) {
                const container = document.createElement('div');
                container.className = 'flyover-marker-container';
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.alignItems = 'center';
                container.style.zIndex = '50';

                // Label Box
                const labelBox = document.createElement('div');
                labelBox.style.backgroundColor = color;
                labelBox.style.color = textColor;
                labelBox.style.padding = '4px 8px';
                labelBox.style.borderRadius = '6px';
                labelBox.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
                labelBox.style.border = '1px solid rgba(255,255,255,0.4)';
                labelBox.style.textAlign = 'center';
                labelBox.style.whiteSpace = 'nowrap';
                labelBox.style.marginBottom = '6px';
                labelBox.style.display = 'flex';
                labelBox.style.flexDirection = 'column';
                labelBox.style.alignItems = 'center';
                labelBox.style.gap = '0px';

                const nameSpan = document.createElement('span');
                nameSpan.innerText = name;
                nameSpan.style.fontWeight = '900';
                nameSpan.style.fontSize = '10px';
                nameSpan.style.display = 'block';
                nameSpan.style.lineHeight = '1.1';
                nameSpan.style.maxWidth = '100px';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';

                const paceSpan = document.createElement('span');
                paceSpan.innerText = paceStr;
                paceSpan.style.fontFamily = 'monospace';
                paceSpan.style.fontSize = '11px';
                paceSpan.style.fontWeight = 'bold';
                paceSpan.style.lineHeight = '1.1';

                labelBox.appendChild(nameSpan);
                labelBox.appendChild(paceSpan);

                // Dot
                const dot = document.createElement('div');
                dot.style.width = '20px';
                dot.style.height = '20px';
                dot.style.backgroundColor = color;
                dot.style.borderRadius = '50%';
                dot.style.boxShadow = `0 0 15px 4px ${color}, inset 0 0 8px white`;
                dot.style.border = '3px solid white';

                container.appendChild(labelBox);
                container.appendChild(dot);

                marker = new mapboxgl.Marker({ element: container, anchor: 'bottom' })
                    .setLngLat([lon, lat])
                    .addTo(m);
                
                markersRef.current.set(id, marker);
                labelElementsRef.current.set(id, { nameEl: nameSpan, paceEl: paceSpan });
            } else {
                marker.setLngLat([lon, lat]);
                const els = labelElementsRef.current.get(id);
                if (els) {
                    if (els.paceEl.innerText !== paceStr) els.paceEl.innerText = paceStr;
                }
            }
        };

        // --- C. Handle Camera & Markers Logic ---
        if (raceRunners && raceRunners.length > 0) {
            // Race Mode
            raceRunners.forEach(runner => {
                updateMarker(runner.trackId, runner.position.lat, runner.position.lon, runner.color, runner.name, runner.pace);
            });

            // Camera follows Leader
            const leader = raceRunners[0];
            const leaderTrack = activeTracks.find(t => t.id === leader.trackId);
            
            if (leader && leaderTrack) {
                const currentDist = leader.position.cummulativeDistance;
                const lookAheadDist = currentDist + 0.08; 
                const nextPoint = leaderTrack.points.find(p => p.cummulativeDistance >= lookAheadDist);

                const cameraParams: any = {
                    center: [leader.position.lon, leader.position.lat],
                    zoom: 17
                };

                // Only update bearing/pitch if user has NOT manually rotated
                if (!userHasRotatedRef.current) {
                    cameraParams.pitch = 60;
                    if (nextPoint) {
                        cameraParams.bearing = getBearing(leader.position.lat, leader.position.lon, nextPoint.lat, nextPoint.lon);
                    }
                }

                // Use jumpTo for smooth per-frame updates without animation queue buildup
                m.jumpTo(cameraParams); 
            }

        } else if (track) {
            // Single Track Mode
            let currentIndex = track.points.findIndex(p => p.cummulativeDistance >= progress);
            if (currentIndex === -1) currentIndex = track.points.length - 1;
            const currentPoint = track.points[currentIndex];

            if (currentPoint) {
                updateMarker('single-replay', currentPoint.lat, currentPoint.lon, track.color, track.name || 'Runner', pace);

                let lookAheadIndex = track.points.findIndex((p, i) => i > currentIndex && p.cummulativeDistance >= progress + 0.08);
                if (lookAheadIndex === -1) lookAheadIndex = track.points.length - 1;
                const nextPoint = track.points[lookAheadIndex];

                const cameraParams: any = {
                    center: [currentPoint.lon, currentPoint.lat],
                    zoom: 16.5
                };

                // Only update bearing/pitch if user has NOT manually rotated
                if (!userHasRotatedRef.current) {
                    cameraParams.pitch = 60;
                    if (nextPoint && nextPoint !== currentPoint) {
                        cameraParams.bearing = getBearing(currentPoint.lat, currentPoint.lon, nextPoint.lat, nextPoint.lon);
                    }
                }

                m.jumpTo(cameraParams);
            }
        }

    }, [progress, raceRunners, activeTracks, pace]);

    const handleResetCamera = () => {
        userHasRotatedRef.current = false;
    };

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
            
            {/* Overlay Info & Reset */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-cyan-500/30 pointer-events-none flex items-center gap-2 z-[1010]">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Flyover 3D Live</span>
            </div>

            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1010]">
                <button 
                    onClick={handleResetCamera}
                    className="bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 p-2 rounded-lg text-xs font-bold border border-cyan-700/50 shadow-lg"
                    title="Blocca Camera su Runner"
                >
                    🎥 Lock Cam
                </button>
                <button 
                    onClick={handleResetToken}
                    className="bg-slate-800/80 hover:bg-red-900/80 text-slate-400 hover:text-white p-2 rounded-lg text-xs font-bold border border-slate-600 transition-colors"
                    title="Cambia Token Mapbox"
                >
                    Reset Token
                </button>
            </div>
        </div>
    );
};

export default FlyoverMap;
