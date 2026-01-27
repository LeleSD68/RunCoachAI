
import React, { useEffect, useRef, useState } from 'react';
import { Track } from '../types';
import mapboxgl from 'mapbox-gl';

interface FlyoverMapProps {
    track: Track;
    progress: number; // Current distance in km
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

const FlyoverMap: React.FC<FlyoverMapProps> = ({ track, progress, isPlaying }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);
    const [token, setToken] = useState<string>(() => localStorage.getItem('mapbox_token') || '');
    const [isTokenValid, setIsTokenValid] = useState(!!localStorage.getItem('mapbox_token'));

    const handleSaveToken = () => {
        if (token.trim().length > 0) {
            localStorage.setItem('mapbox_token', token);
            setIsTokenValid(true);
            window.location.reload(); // Reload to init mapbox cleanly
        }
    };

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || !isTokenValid) return;

        mapboxgl.accessToken = token;

        try {
            const startPoint = track.points[0];
            const m = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/satellite-streets-v12', // Satellite for realism
                center: [startPoint.lon, startPoint.lat],
                zoom: 17,
                pitch: 70, // Tilt for 3D effect
                bearing: 0,
                interactive: true, // Allow user to look around even during flyover
                attributionControl: false
            });

            m.addControl(new mapboxgl.AttributionControl({ compact: true }));

            m.on('load', () => {
                // Add 3D Terrain
                m.addSource('mapbox-dem', {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    'tileSize': 512,
                    'maxzoom': 14
                });
                m.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 }); // Exaggerate height for dramatic effect

                // Add Sky Layer
                m.addLayer({
                    'id': 'sky',
                    'type': 'sky',
                    'paint': {
                        'sky-type': 'atmosphere',
                        'sky-atmosphere-sun': [0.0, 0.0],
                        'sky-atmosphere-sun-intensity': 15
                    }
                });

                // Add Track Line
                const coordinates = track.points.map(p => [p.lon, p.lat]);
                m.addSource('route', {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': coordinates
                        }
                    }
                });

                // Neon Line Effect (Inner Core)
                m.addLayer({
                    'id': 'route',
                    'type': 'line',
                    'source': 'route',
                    'layout': {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    'paint': {
                        'line-color': '#00ffff', // Cyan Neon
                        'line-width': 4,
                        'line-opacity': 1
                    }
                });
                
                // Glow Effect Layer (Outer Blur)
                m.addLayer({
                    'id': 'route-glow',
                    'type': 'line',
                    'source': 'route',
                    'layout': {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    'paint': {
                        'line-color': '#00ffff',
                        'line-width': 12,
                        'line-opacity': 0.4,
                        'line-blur': 8
                    }
                });

                // Add Runner Marker (Glowing Orb)
                const el = document.createElement('div');
                el.className = 'flyover-marker';
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.backgroundColor = '#d946ef'; // Fuchsia
                el.style.borderRadius = '50%';
                el.style.boxShadow = '0 0 20px 5px #d946ef, inset 0 0 10px white';
                el.style.border = '2px solid white';
                el.style.zIndex = '10';

                marker.current = new mapboxgl.Marker(el)
                    .setLngLat([startPoint.lon, startPoint.lat])
                    .addTo(m);
            });

            map.current = m;

        } catch (e) {
            console.error("Mapbox init failed", e);
            localStorage.removeItem('mapbox_token');
            setIsTokenValid(false);
        }

        return () => {
            map.current?.remove();
        };
    }, [isTokenValid, track, token]); 

    // Animation Loop: Sync Map with Progress
    useEffect(() => {
        if (!map.current || !track.points.length) return;

        // Find current point based on progress (km)
        // We use a simple search here. For 10k+ points a binary search would be better, but typical GPX is fine.
        let currentIndex = track.points.findIndex(p => p.cummulativeDistance >= progress);
        if (currentIndex === -1) currentIndex = track.points.length - 1;
        // Ensure we don't pick index 0 if progress > 0 to have a 'prev' point for bearing if needed
        if (currentIndex < 0) currentIndex = 0;
        
        const currentPoint = track.points[currentIndex];
        
        // Look ahead for bearing calculation (e.g., 50-100 meters ahead) to smooth out camera rotation
        // Looking ahead prevents jittery camera on sharp turns
        let lookAheadDist = 0.05; // 50m
        let lookAheadIndex = track.points.findIndex((p, i) => i > currentIndex && p.cummulativeDistance >= progress + lookAheadDist);
        
        // Fallback if near end
        if (lookAheadIndex === -1) lookAheadIndex = track.points.length - 1;
        
        const nextPoint = track.points[lookAheadIndex];

        if (currentPoint && map.current && marker.current) {
            // Move Marker
            marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);

            // Camera Logic
            // If we have a next point, look at it. If not (end of race), keep last bearing.
            if (nextPoint && nextPoint !== currentPoint) {
                const bearing = getBearing(currentPoint.lat, currentPoint.lon, nextPoint.lat, nextPoint.lon);
                
                map.current.jumpTo({
                    center: [currentPoint.lon, currentPoint.lat],
                    bearing: bearing,
                    pitch: 75, // Aggressive 3D angle
                    zoom: 17.5 
                });
            } else {
                 map.current.jumpTo({
                    center: [currentPoint.lon, currentPoint.lat],
                    zoom: 17.5 
                });
            }
        }

    }, [progress, track]);

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
                        Ottienilo su <a href="https://mapbox.com" target="_blank" className="underline hover:text-white">mapbox.com</a>. Il token viene salvato solo localmente nel tuo browser.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-[1000] w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />
            
            {/* Overlay Info */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-cyan-500/30 pointer-events-none flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Flyover 3D Live</span>
            </div>
        </div>
    );
};

export default FlyoverMap;
