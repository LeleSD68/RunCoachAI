
import React, { useEffect, useRef, useState } from 'react';
import { Track, RaceRunner } from '../types';

// Use global variable from script tag to avoid version mismatch
declare const mapboxgl: any;

interface FlyoverMapProps {
    track?: Track | null; // Primary track for camera following
    tracks?: Track[]; // All tracks to render lines for
    raceRunners?: RaceRunner[] | null; // Live positions of all runners
    progress: number; // Current distance in km of primary track
    isPlaying: boolean;
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

const FlyoverMap: React.FC<FlyoverMapProps> = ({ track, tracks = [], raceRunners, progress, isPlaying }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    
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

    // Determine the focus track (camera target) - used for initial center only
    const initialCenterTrack = track || (tracks.length > 0 ? tracks[0] : null);

    // 1. Initialize Map (Run ONCE when token validates)
    useEffect(() => {
        if (!mapContainer.current || !isTokenValid) return;

        if (typeof mapboxgl === 'undefined') {
            console.error("Mapbox GL JS not loaded");
            return;
        }

        mapboxgl.accessToken = token;

        try {
            const startPoint = initialCenterTrack ? initialCenterTrack.points[0] : { lon: 0, lat: 0 };
            const m = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/satellite-streets-v12',
                center: [startPoint.lon, startPoint.lat],
                zoom: 17,
                pitch: 70,
                bearing: 0,
                interactive: true,
                attributionControl: false
            });

            m.addControl(new mapboxgl.AttributionControl({ compact: true }));

            m.on('load', () => {
                try {
                    m.addSource('mapbox-dem', {
                        'type': 'raster-dem',
                        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                        'tileSize': 512,
                        'maxzoom': 14
                    });
                    m.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
                } catch (e) {
                    console.warn("Terrain error:", e);
                }

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

            m.on('error', (e: any) => {
                if (e.error && (e.error.status === 401 || e.error.message?.includes('Forbidden'))) {
                    handleResetToken();
                }
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
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTokenValid, token]); // Only depend on token validity

    // 2. Update Track Layers (Run when tracks change)
    useEffect(() => {
        const m = map.current;
        if (!m) return;

        const updateLayers = () => {
            // Render ALL tracks lines
            const tracksToRender = tracks.length > 0 ? tracks : (track ? [track] : []);
            
            tracksToRender.forEach((t) => {
                const coordinates = t.points.map(p => [p.lon, p.lat]);
                const sourceId = `route-${t.id}`;
                
                const geoJsonData = {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': coordinates
                    }
                };

                const source = m.getSource(sourceId);
                if (source) {
                    source.setData(geoJsonData);
                } else {
                    m.addSource(sourceId, {
                        'type': 'geojson',
                        'data': geoJsonData
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
                }
            });
        };

        if (m.isStyleLoaded()) {
            updateLayers();
        } else {
            m.on('load', updateLayers);
        }
    }, [tracks, track]); // Update lines if tracks change

    // 3. Animation Loop: Update Markers & Camera (Run on every frame update)
    useEffect(() => {
        if (!map.current) return;

        const updateRunner = (id: string, lat: number, lon: number, color: string) => {
            let marker = markersRef.current.get(id);
            if (!marker) {
                const el = document.createElement('div');
                el.className = 'flyover-marker';
                el.style.width = '20px';
                el.style.height = '20px';
                el.style.backgroundColor = color;
                el.style.borderRadius = '50%';
                el.style.boxShadow = `0 0 15px 2px ${color}, inset 0 0 5px white`;
                el.style.border = '2px solid white';
                el.style.zIndex = '10';

                marker = new mapboxgl.Marker(el)
                    .setLngLat([lon, lat])
                    .addTo(map.current);
                markersRef.current.set(id, marker);
            } else {
                marker.setLngLat([lon, lat]);
            }
        };

        // 1. Handle Race Runners (Multi-runner mode)
        if (raceRunners && raceRunners.length > 0) {
            raceRunners.forEach(runner => {
                updateRunner(runner.trackId, runner.position.lat, runner.position.lon, runner.color);
            });

            // Camera follows the first runner (Leader usually)
            const leader = raceRunners[0];
            const leaderTrack = tracks.find(t => t.id === leader.trackId);
            
            if (leader && leaderTrack) {
                // Find next point for bearing
                const currentDist = leader.position.cummulativeDistance;
                const lookAheadDist = currentDist + 0.05; // 50m ahead
                const nextPoint = leaderTrack.points.find(p => p.cummulativeDistance >= lookAheadDist);

                if (nextPoint) {
                    const bearing = getBearing(leader.position.lat, leader.position.lon, nextPoint.lat, nextPoint.lon);
                    map.current.easeTo({
                        center: [leader.position.lon, leader.position.lat],
                        bearing: bearing,
                        pitch: 70,
                        zoom: 17,
                        duration: 500,
                        easing: (t: number) => t 
                    });
                }
            }
        } 
        // 2. Handle Single Track Replay (Animation mode)
        else if (track) {
            // Find current point based on progress
            let currentIndex = track.points.findIndex(p => p.cummulativeDistance >= progress);
            if (currentIndex === -1) currentIndex = track.points.length - 1;
            const currentPoint = track.points[currentIndex];

            if (currentPoint) {
                updateRunner('single-replay', currentPoint.lat, currentPoint.lon, track.color);

                // Bearing
                let lookAheadIndex = track.points.findIndex((p, i) => i > currentIndex && p.cummulativeDistance >= progress + 0.05);
                if (lookAheadIndex === -1) lookAheadIndex = track.points.length - 1;
                const nextPoint = track.points[lookAheadIndex];

                if (nextPoint && nextPoint !== currentPoint) {
                    const bearing = getBearing(currentPoint.lat, currentPoint.lon, nextPoint.lat, nextPoint.lon);
                    map.current.easeTo({
                        center: [currentPoint.lon, currentPoint.lat],
                        bearing: bearing,
                        pitch: 70,
                        zoom: 17,
                        duration: 500
                    });
                }
            }
        }

    }, [progress, track, raceRunners, tracks]);

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

            <button 
                onClick={handleResetToken}
                className="absolute bottom-4 right-4 bg-slate-800/80 hover:bg-red-900/80 text-slate-400 hover:text-white p-2 rounded-lg text-xs font-bold border border-slate-600 transition-colors z-[1010]"
                title="Cambia Token Mapbox"
            >
                Reset Token
            </button>
        </div>
    );
};

export default FlyoverMap;
