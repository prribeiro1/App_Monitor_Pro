import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon as LeafletIcon } from 'leaflet';
import { Icon } from '../components/Icon';
import { Geolocation } from '@capacitor/geolocation';
import { dbService } from '../services/db';
import { Route, Stop } from '../types';
import 'leaflet/dist/leaflet.css';
import { TrackingControl } from '../components/TrackingControl';

interface RouteNavigationScreenProps {
    routeId: string;
    onBack: () => void;
}

interface RoutePoint {
    id: string;
    name: string;
    address?: string;
    students: string[];
    lat: number;
    lng: number;
    order: number;
}

// Componente auxiliar para centralizar o mapa
const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng]);
    return null;
};

export const RouteNavigationScreen: React.FC<RouteNavigationScreenProps> = ({ routeId, onBack }) => {
    const [points, setPoints] = useState<RoutePoint[]>([]);
    const [routeName, setRouteName] = useState('');
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [visitedPoints, setVisitedPoints] = useState<Set<number>>(new Set());
    const [skippedPoints, setSkippedPoints] = useState<number[]>([]); // Pontos pulados para voltar depois
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [showSkippedPanel, setShowSkippedPanel] = useState(false);

    useEffect(() => {
        loadData();
        startTracking();
    }, []);

    const loadData = async () => {
        const [routes, stops, students] = await Promise.all([
            dbService.getRoutes(),
            dbService.getStops(),
            dbService.getStudents()
        ]);

        const route = routes.find(r => r.id === routeId);
        if (route) setRouteName(route.name);

        const routeStops = stops
            .filter(s => s.routeId === routeId && s.latitude && s.longitude)
            .sort((a, b) => a.order - b.order);

        const mappedPoints: RoutePoint[] = routeStops.map(stop => ({
            id: stop.id,
            name: stop.name,
            address: `Lat: ${stop.latitude?.toFixed(4)}, Lng: ${stop.longitude?.toFixed(4)}`,
            students: students.filter(s => s.stopId === stop.id).map(s => s.name),
            lat: stop.latitude!,
            lng: stop.longitude!,
            order: stop.order
        }));

        setPoints(mappedPoints);
    };

    const startTracking = async () => {
        try {
            await Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
                if (position) {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                }
            });
        } catch (e) {
            console.error("Erro GPS:", e);
        }
    };

    const createIcon = (color: string) => new LeafletIcon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
        `)}`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    const getPointIcon = (index: number) => {
        if (visitedPoints.has(index)) return createIcon('#10b981'); // Verde - Visitado
        if (skippedPoints.includes(index)) return createIcon('#f59e0b'); // Amarelo - Pulado
        if (index === currentPointIndex) return createIcon('#3b82f6'); // Azul - Atual
        return createIcon('#6b7280'); // Cinza - Pendente
    };

    // Encontra o próximo ponto não visitado e não pulado
    const findNextPoint = () => {
        for (let i = currentPointIndex + 1; i < points.length; i++) {
            if (!visitedPoints.has(i) && !skippedPoints.includes(i)) {
                return i;
            }
        }
        return -1; // Não há mais pontos
    };

    const handleMarkAsVisited = () => {
        setVisitedPoints(prev => new Set(prev).add(currentPointIndex));

        // Remove dos pulados se estava lá
        setSkippedPoints(prev => prev.filter(idx => idx !== currentPointIndex));

        const nextPoint = findNextPoint();
        if (nextPoint !== -1) {
            setCurrentPointIndex(nextPoint);
        } else if (skippedPoints.length > 0) {
            // Se não há mais pontos normais, vai para o primeiro pulado
            setCurrentPointIndex(skippedPoints[0]);
        }
    };

    const handleSkipPoint = () => {
        // Adiciona aos pulados se ainda não estava
        if (!skippedPoints.includes(currentPointIndex)) {
            setSkippedPoints(prev => [...prev, currentPointIndex]);
        }

        const nextPoint = findNextPoint();
        if (nextPoint !== -1) {
            setCurrentPointIndex(nextPoint);
        } else if (skippedPoints.length > 0) {
            // Se pulou todos, mostra mensagem ou vai para primeiro pulado
            setShowSkippedPanel(true);
        }
    };

    const handleGoToSkipped = (pointIndex: number) => {
        setCurrentPointIndex(pointIndex);
        setShowSkippedPanel(false);
    };

    const launchNavigation = () => {
        const point = points[currentPointIndex];
        if (point) {
            window.open(`google.navigation:q=${point.lat},${point.lng}`, '_system');
        }
    };

    const center = userLocation ? [userLocation.lat, userLocation.lng] as [number, number] :
        (points[0] ? [points[0].lat, points[0].lng] as [number, number] : [-23.5505, -46.6333]);

    const isRouteComplete = visitedPoints.size === points.length;
    const pendingCount = points.length - visitedPoints.size;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                backgroundColor: '#1e293b',
                padding: '16px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <button onClick={onBack} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'white' }}>
                    <Icon name="arrow-left" size={24} />
                </button>
                <h1 style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>{routeName}</h1>
                <div style={{ width: '40px' }} />
            </div>

            {/* Map Container */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {userLocation && <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />}

                    {/* Linha da Rota */}
                    <Polyline positions={points.map(p => [p.lat, p.lng])} color="#3b82f6" weight={4} opacity={0.7} />

                    {/* Marcadores */}
                    {points.map((p, idx) => (
                        <Marker key={p.id} position={[p.lat, p.lng]} icon={getPointIcon(idx)}>
                            <Popup>
                                <strong>{idx + 1}. {p.name}</strong><br />
                                {p.students.length} alunos
                                {visitedPoints.has(idx) && <><br /><span style={{ color: 'green' }}>✓ Visitado</span></>}
                                {skippedPoints.includes(idx) && <><br /><span style={{ color: 'orange' }}>⏭ Pulado</span></>}
                            </Popup>
                        </Marker>
                    ))}

                    {/* User Location */}
                    {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={createIcon('#ef4444')}>
                            <Popup>Você está aqui</Popup>
                        </Marker>
                    )}
                </MapContainer>

                {/* Badge de Pontos Pulados */}
                {skippedPoints.length > 0 && (
                    <button
                        onClick={() => setShowSkippedPanel(!showSkippedPanel)}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            zIndex: 1000,
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '8px 16px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            cursor: 'pointer'
                        }}
                    >
                        <Icon name="clock" size={16} />
                        {skippedPoints.length} pulado(s)
                    </button>
                )}

                {/* Painel de Pontos Pulados */}
                {showSkippedPanel && skippedPoints.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '50px',
                        right: '10px',
                        zIndex: 1000,
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        minWidth: '200px'
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
                            Pontos Pulados
                        </h4>
                        {skippedPoints.map(idx => (
                            <button
                                key={idx}
                                onClick={() => handleGoToSkipped(idx)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    marginBottom: '4px',
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                {idx + 1}. {points[idx]?.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Barra de Controle Inferior - SEMPRE VISÍVEL */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderTop: '1px solid #e5e7eb',
                boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.1)',
                flexShrink: 0
            }}>
                <TrackingControl routeId={routeId} />

                {isRouteComplete ? (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                        <h3 style={{ color: '#10b981', fontWeight: 'bold', fontSize: '20px', margin: '0 0 8px 0' }}>
                            Rota Concluída!
                        </h3>
                        <p style={{ color: '#6b7280', margin: 0 }}>
                            Todos os {points.length} pontos foram visitados.
                        </p>
                        <button
                            onClick={onBack}
                            style={{
                                marginTop: '16px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px 24px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Voltar
                        </button>
                    </div>
                ) : points[currentPointIndex] ? (
                    <div>
                        {/* Info do Ponto Atual */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ fontWeight: 'bold', fontSize: '18px', color: '#1f2937', margin: '0 0 4px 0' }}>
                                    {currentPointIndex + 1}. {points[currentPointIndex].name}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                                    {points[currentPointIndex].students.length > 0
                                        ? points[currentPointIndex].students.join(', ')
                                        : 'Nenhum aluno vinculado'}
                                </p>
                            </div>
                            <span style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                padding: '4px 10px',
                                borderRadius: '20px'
                            }}>
                                {visitedPoints.size}/{points.length}
                            </span>
                        </div>

                        {/* Botões de Ação */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <button
                                onClick={launchNavigation}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px 8px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Icon name="navigation" size={20} />
                                <span>GPS</span>
                            </button>
                            <button
                                onClick={handleMarkAsVisited}
                                style={{
                                    backgroundColor: '#22c55e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px 8px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Icon name="check" size={20} />
                                <span>Cheguei</span>
                            </button>
                            <button
                                onClick={handleSkipPoint}
                                style={{
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px 8px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Icon name="skip-forward" size={20} />
                                <span>Pular</span>
                            </button>
                        </div>

                        {/* Info de Pontos Pendentes */}
                        {pendingCount > 1 && (
                            <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '12px', marginBottom: 0 }}>
                                {pendingCount - 1} ponto(s) restante(s) após este
                            </p>
                        )}
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: '16px 0', margin: 0 }}>
                        Nenhum ponto com GPS cadastrado nesta rota.
                    </p>
                )}
            </div>
        </div>
    );
};
