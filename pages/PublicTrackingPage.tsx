/**
 * Public Tracking Page
 * 
 * Parents access this page via a share link (e.g., /track/ABC123)
 * Shows real-time location of the driver on a map
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/auth';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom van icon
const vanIcon = L.divIcon({
    className: 'van-marker',
    html: `
        <div style="
            background: linear-gradient(135deg, #10b981, #059669);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
            border: 3px solid white;
        ">
            <span style="font-size: 20px;">🚐</span>
        </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

interface DriverLocation {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp: number;
}

// Component to update map view when location changes
const MapUpdater: React.FC<{ location: DriverLocation | null }> = ({ location }) => {
    const map = useMap();

    useEffect(() => {
        if (location) {
            map.setView([location.latitude, location.longitude], map.getZoom());
        }
    }, [location, map]);

    return null;
};

export const PublicTrackingPage: React.FC = () => {
    const { shareCode } = useParams<{ shareCode: string }>();
    const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
    const [driverUserId, setDriverUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const channelRef = useRef<any>(null);

    // Validate share code and get driver info
    useEffect(() => {
        const validateCode = async () => {
            if (!shareCode) {
                setError('Código de rastreamento não informado');
                setLoading(false);
                return;
            }

            try {
                // Look up the share code
                const { data: linkData, error: linkError } = await supabase
                    .from('tracking_links')
                    .select('user_id, is_active')
                    .eq('share_code', shareCode.toUpperCase())
                    .single();

                if (linkError || !linkData) {
                    setError('Código de rastreamento inválido');
                    setLoading(false);
                    return;
                }

                if (!linkData.is_active) {
                    setError('Este link de rastreamento foi desativado');
                    setLoading(false);
                    return;
                }

                setDriverUserId(linkData.user_id);

                // Get last known location from DB
                const { data: locData } = await supabase
                    .from('driver_locations')
                    .select('*')
                    .eq('user_id', linkData.user_id)
                    .single();

                if (locData && locData.is_tracking_active) {
                    setDriverLocation({
                        latitude: locData.latitude,
                        longitude: locData.longitude,
                        heading: locData.heading,
                        speed: locData.speed,
                        accuracy: locData.accuracy,
                        timestamp: new Date(locData.updated_at).getTime()
                    });
                    setIsOnline(true);
                    setLastUpdate(new Date(locData.updated_at));
                }

                setLoading(false);
            } catch (e) {
                console.error('Error validating code:', e);
                setError('Erro ao verificar código');
                setLoading(false);
            }
        };

        validateCode();
    }, [shareCode]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!driverUserId) return;

        const channel = supabase.channel(`driver-tracking:${driverUserId}`)
            .on('broadcast', { event: 'location' }, (payload) => {
                const loc = payload.payload as DriverLocation;
                setDriverLocation(loc);
                setLastUpdate(new Date());
                setIsOnline(true);
            })
            .subscribe();

        channelRef.current = channel;

        // Set offline after 30 seconds of no updates
        const offlineTimer = setInterval(() => {
            if (lastUpdate && Date.now() - lastUpdate.getTime() > 30000) {
                setIsOnline(false);
            }
        }, 5000);

        return () => {
            channel.unsubscribe();
            clearInterval(offlineTimer);
        };
    }, [driverUserId]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
                    <p>Conectando ao rastreamento...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md w-full border border-gray-700">
                    <div className="text-5xl mb-4">❌</div>
                    <h1 className="text-xl font-bold text-white mb-2">Ops!</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <p className="text-sm text-gray-500">
                        Verifique se o link está correto ou peça um novo link ao motorista.
                    </p>
                </div>
            </div>
        );
    }

    // Waiting for driver state
    if (!driverLocation || !isOnline) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md w-full border border-gray-700">
                    <div className="text-5xl mb-4">🚐</div>
                    <h1 className="text-xl font-bold text-white mb-2">Aguardando Rota</h1>
                    <p className="text-gray-400 mb-6">
                        O motorista ainda não iniciou o rastreamento.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-yellow-400">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-sm">Aguardando conexão...</span>
                    </div>
                    {lastUpdate && (
                        <p className="text-xs text-gray-500 mt-4">
                            Última atualização: {lastUpdate.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🚐</span>
                    <div>
                        <h1 className="text-white font-bold">Monitor Escolar PRO</h1>
                        <p className="text-gray-400 text-xs">Rastreamento em tempo real</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className={`text-sm ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                        {isOnline ? 'Ao vivo' : 'Offline'}
                    </span>
                </div>
            </header>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer
                    center={[driverLocation.latitude, driverLocation.longitude]}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                        position={[driverLocation.latitude, driverLocation.longitude]}
                        icon={vanIcon}
                    >
                        <Popup>
                            <div className="text-center">
                                <strong>🚐 Van Escolar</strong>
                                {driverLocation.speed && (
                                    <p className="text-sm">{Math.round(driverLocation.speed)} km/h</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                    <MapUpdater location={driverLocation} />
                </MapContainer>
            </div>

            {/* Info Panel */}
            <div className="bg-gray-800 p-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs">Última atualização</p>
                        <p className="text-white font-medium">
                            {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Agora'}
                        </p>
                    </div>
                    {driverLocation.speed !== undefined && driverLocation.speed > 0 && (
                        <div className="text-right">
                            <p className="text-gray-400 text-xs">Velocidade</p>
                            <p className="text-white font-medium">{Math.round(driverLocation.speed)} km/h</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
