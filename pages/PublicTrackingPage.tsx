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

interface Notification {
    id: string;
    message: string;
    timestamp: Date;
    type: 'proximity' | 'pickup' | 'dropoff';
}

// Component to update map view when location changes
const MapUpdater: React.FC<{ location: DriverLocation | null }> = ({ location }) => {
    const map = useMap();

    useEffect(() => {
        if (location) {
            map.setView([location.latitude, location.longitude], map.getZoom());
            // Force resize in case map was hidden or 0 height
            map.invalidateSize();
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [studentName, setStudentName] = useState<string>('');
    const channelRef = useRef<any>(null);
    const eventsChannelRef = useRef<any>(null);

    // Validate share code and get driver info
    useEffect(() => {
        const validateCode = async () => {
            if (!shareCode) {
                setError('Código de rastreamento não informado');
                setLoading(false);
                return;
            }

            try {
                // Clean and normalize share code
                const normalizedCode = shareCode.trim().toUpperCase();
                console.log('[Tracking] Validating code:', normalizedCode);

                // Look up the share code
                const { data: linkData, error: linkError } = await supabase
                    .from('tracking_links')
                    .select('user_id, is_active')
                    .ilike('share_code', normalizedCode) // Use ilike for case insensitivity
                    .maybeSingle(); // Better for single row lookup in terms of error handling

                if (linkError || !linkData) {
                    console.error('[Tracking] Code not found or error:', linkError);
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
                    .maybeSingle(); // Use maybeSingle to avoid errors if no location exists yet

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
                console.error('[Tracking] Error validating code:', e);
                setError('Erro ao verificar código de rastreamento');
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

        // 🆕 Subscribe to route events (notificações)
        const eventsChannel = supabase
            .channel('route_events')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'route_events',
                    filter: `user_id=eq.${driverUserId}`
                },
                (payload) => {
                    const event = payload.new;

                    // Criar notificação baseada no tipo de evento
                    let message = '';
                    let type: 'proximity' | 'pickup' | 'dropoff' = 'proximity';

                    if (event.event_type === 'notification_sent') {
                        message = '🚐 Condutor chegando em breve!';
                        type = 'proximity';
                    } else if (event.event_type === 'picked_up') {
                        message = `✅ ${studentName} embarcou`;
                        type = 'pickup';
                    } else if (event.event_type === 'dropped_off') {
                        message = `🏠 ${studentName} desembarcou`;
                        type = 'dropoff';
                    }

                    if (message) {
                        const notification: Notification = {
                            id: event.id,
                            message,
                            timestamp: new Date(event.timestamp),
                            type
                        };

                        setNotifications(prev => [notification, ...prev].slice(0, 5)); // Manter últimas 5

                        // Remover notificação após 10 segundos
                        setTimeout(() => {
                            setNotifications(prev => prev.filter(n => n.id !== notification.id));
                        }, 10000);
                    }
                }
            )
            .subscribe();

        eventsChannelRef.current = eventsChannel;

        // Set offline after 30 seconds of no updates
        const offlineTimer = setInterval(() => {
            if (lastUpdate && Date.now() - lastUpdate.getTime() > 30000) {
                setIsOnline(false);
            }
        }, 5000);

        return () => {
            channel.unsubscribe();
            eventsChannel.unsubscribe();
            clearInterval(offlineTimer);
        };
    }, [driverUserId, studentName]);

    // Loading state
    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
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
            <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md w-full border border-gray-700">
                    <div className="text-5xl mb-4">❌</div>
                    <h1 className="text-xl font-bold text-white mb-2">Ops!</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                </div>
            </div>
        );
    }

    // Waiting for GPS Fix (0,0) or no Data
    if (!driverLocation || !isOnline || (driverLocation.latitude === 0 && driverLocation.longitude === 0)) {
        return (
            <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md w-full border border-gray-700">
                    <div className="text-5xl mb-4">🛰️</div>
                    <h1 className="text-xl font-bold text-white mb-2">Aguardando GPS</h1>
                    <p className="text-gray-400 mb-6">
                        O motorista iniciou a rota, mas o GPS ainda está conectando.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-yellow-400">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-sm">Aguardando sinal...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
            {/* Header */}
            <header className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700 h-16 shrink-0 z-10 relative shadow-md">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🚐</span>
                    <div>
                        <h1 className="text-white font-bold leading-tight">Monitor PRO</h1>
                        <p className="text-gray-400 text-[10px] uppercase tracking-wider">Tempo Real</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-1 rounded-full">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className={`text-xs font-medium ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                        {isOnline ? 'AO VIVO' : 'OFFLINE'}
                    </span>
                </div>
            </header>

            {/* Map - Fixed Height Logic */}
            <div className="flex-1 relative bg-white z-0">
                <MapContainer
                    center={[driverLocation.latitude, driverLocation.longitude]}
                    zoom={16}
                    style={{ height: '100%', width: '100%', minHeight: '300px' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                        position={[driverLocation.latitude, driverLocation.longitude]}
                        icon={vanIcon}
                    >
                        <Popup>
                            <div className="text-center">
                                <strong>🚐 Van Escolar</strong>
                            </div>
                        </Popup>
                    </Marker>
                    <MapUpdater location={driverLocation} />
                </MapContainer>

                {/* 🆕 Notificações em Tempo Real */}
                {notifications.length > 0 && (
                    <div className="absolute top-4 left-4 right-4 z-[1000] space-y-2">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`
                                    p-4 rounded-xl shadow-2xl border-2 animate-slide-down
                                    ${notification.type === 'proximity' ? 'bg-blue-500 border-blue-400' : ''}
                                    ${notification.type === 'pickup' ? 'bg-green-500 border-green-400' : ''}
                                    ${notification.type === 'dropoff' ? 'bg-purple-500 border-purple-400' : ''}
                                `}
                                style={{
                                    animation: 'slideDown 0.3s ease-out'
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">
                                        {notification.type === 'proximity' && '🚐'}
                                        {notification.type === 'pickup' && '✅'}
                                        {notification.type === 'dropoff' && '🏠'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold text-lg">
                                            {notification.message}
                                        </p>
                                        <p className="text-white/80 text-xs">
                                            {notification.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Panel */}
            <div className="bg-gray-800 p-4 border-t border-gray-700 shrink-0 z-10 relative safe-area-bottom">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs mb-1">Última atualização</p>
                        <p className="text-white font-mono font-medium">
                            {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--'}
                        </p>
                    </div>
                    {driverLocation.speed !== undefined && (
                        <div className="text-right">
                            <p className="text-gray-400 text-xs mb-1">Velocidade</p>
                            <p className="text-white font-mono font-medium text-lg">
                                {Math.round(driverLocation.speed)} <span className="text-sm text-gray-400">km/h</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
