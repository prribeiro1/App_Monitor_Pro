import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon as LeafletIcon } from 'leaflet';
import { Icon } from '../components/Icon';
import { Geolocation } from '@capacitor/geolocation';
import { dbService } from '../services/db';
import { Route, Student, RouteSession, RouteEvent } from '../types';
import { notificationService } from '../services/notificationService';
import { proximityMonitorService } from '../services/proximityMonitorService';
import 'leaflet/dist/leaflet.css';
import { TrackingControl } from '../components/TrackingControl';
import { Browser } from '@capacitor/browser';

interface RouteNavigationScreenProps {
    routeId?: string;
    onBack?: () => void;
}

interface StudentPoint {
    student: Student;
    order: number;
    visited: boolean;
}

// Componente auxiliar para centralizar o mapa
const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng]);
    return null;
};

export const RouteNavigationScreen: React.FC<RouteNavigationScreenProps> = ({ routeId: propRouteId, onBack: propOnBack }) => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const routeId = propRouteId || id;
    const sessionId = searchParams.get('sessionId');
    const onBack = propOnBack || (() => navigate('/routes'));

    const [route, setRoute] = useState<Route | null>(null);
    const [session, setSession] = useState<RouteSession | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visitedStudents, setVisitedStudents] = useState<Set<string>>(new Set());
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [activeAlert, setActiveAlert] = useState<{ student: Student, distance: number } | null>(null);

    useEffect(() => {
        if (routeId) {
            loadData();
            startTracking();
        }

        // 🆕 Registrar callback de alerta de proximidade
        proximityMonitorService.onAlert((student, distance) => {
            setActiveAlert({ student, distance });
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        });
    }, [routeId, sessionId]);

    const loadData = async () => {
        if (!routeId) return;

        const [routes, allStudents, sessions] = await Promise.all([
            dbService.getRoutes(),
            dbService.getStudents(),
            dbService.getRouteSessions()
        ]);

        const foundRoute = routes.find(r => r.id === routeId);
        if (foundRoute) setRoute(foundRoute);

        // Buscar sessão se foi passada
        let currentSession: RouteSession | null = null;
        if (sessionId) {
            currentSession = sessions.find(s => s.id === sessionId) || null;
            setSession(currentSession);
        }

        // Filtrar alunos da rota (excluindo faltantes se houver sessão)
        let routeStudents = allStudents
            .filter(s => s.routeId === routeId && s.active)
            .sort((a, b) => (a.routeOrder || a.order || 0) - (b.routeOrder || b.order || 0));

        // Se há sessão, remover alunos faltantes
        if (currentSession && currentSession.skippedStudents.length > 0) {
            routeStudents = routeStudents.filter(s => !currentSession.skippedStudents.includes(s.id));
        }

        setStudents(routeStudents);
    };

    const startTracking = async () => {
        try {
            await Geolocation.watchPosition({ enableHighAccuracy: true }, (position) => {
                if (position) {
                    const newLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(newLocation);

                    // 🆕 Monitorar proximidade automaticamente
                    if (session && students.length > 0) {
                        proximityMonitorService.checkProximity(
                            newLocation,
                            students,
                            session.id,
                            session.userId
                        );
                    }
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
        if (visitedStudents.has(students[index]?.id)) return createIcon('#10b981'); // Verde - Visitado
        if (index === currentIndex) return createIcon('#3b82f6'); // Azul - Atual
        return createIcon('#6b7280'); // Cinza - Pendente
    };

    const handleNotifyArrival = async () => {
        const student = students[currentIndex];
        if (!student) return;

        try {
            await notificationService.notifyArriving({
                studentName: student.name,
                responsiblePhone: student.responsiblePhone || '',
                distance: userLocation && student.latitude && student.longitude
                    ? calculateDistance(userLocation.lat, userLocation.lng, student.latitude, student.longitude)
                    : undefined
            });

            // Registrar evento
            if (session) {
                const event: RouteEvent = {
                    id: crypto.randomUUID(),
                    sessionId: session.id,
                    studentId: student.id,
                    userId: session.userId,
                    eventType: 'notification_sent',
                    timestamp: new Date().toISOString(),
                    latitude: userLocation?.lat,
                    longitude: userLocation?.lng,
                    createdAt: new Date().toISOString()
                };
                await dbService.saveRouteEvent(event);
            }
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
        }
    };

    const handleMarkAsVisited = async () => {
        const student = students[currentIndex];
        if (!student) return;

        setVisitedStudents(prev => new Set(prev).add(student.id));

        // Registrar evento
        if (session) {
            const event: RouteEvent = {
                id: crypto.randomUUID(),
                sessionId: session.id,
                studentId: student.id,
                userId: session.userId,
                eventType: session.type === 'pickup' ? 'picked_up' : 'dropped_off',
                timestamp: new Date().toISOString(),
                latitude: userLocation?.lat,
                longitude: userLocation?.lng,
                createdAt: new Date().toISOString()
            };
            await dbService.saveRouteEvent(event);
        }

        // Avançar para próximo
        if (currentIndex < students.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // Finalizar sessão
            if (session) {
                session.status = 'completed';
                session.endTime = new Date().toISOString();
                await dbService.saveRouteSession(session);
            }
        }
    };

    const launchNavigation = async () => {
        const student = students[currentIndex];
        if (student && student.latitude && student.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${student.latitude},${student.longitude}&travelmode=driving`;
            try {
                await Browser.open({ url });
            } catch (error) {
                console.error('Erro ao abrir navegação:', error);
                window.open(url, '_system');
            }
        } else {
            alert('Este aluno não possui localização GPS cadastrada.');
        }
    };

    // Calcular distância entre duas coordenadas (Haversine formula - retorna em metros)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Raio da Terra em metros
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Distância atual até o aluno
    const getDistanceToCurrentStudent = (): number | null => {
        const student = students[currentIndex];
        if (!student || !student.latitude || !student.longitude || !userLocation) return null;
        return calculateDistance(userLocation.lat, userLocation.lng, student.latitude, student.longitude);
    };

    // Filtrar apenas alunos com GPS para o mapa
    const studentsWithGPS = students.filter(s => s.latitude && s.longitude);

    const center = userLocation ? [userLocation.lat, userLocation.lng] as [number, number] :
        (studentsWithGPS[0] ? [studentsWithGPS[0].latitude!, studentsWithGPS[0].longitude!] as [number, number] : [-23.5505, -46.6333]);

    const isRouteComplete = visitedStudents.size === students.length;
    const pendingCount = students.length - visitedStudents.size;
    const currentStudent = students[currentIndex];

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
                <h1 style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
                    {route?.name || 'Navegação'}
                </h1>
                <div style={{ width: '40px' }} />
            </div>

            {/* 🆕 Alerta de Proximidade (Motorista) */}
            {activeAlert && (
                <div style={{
                    position: 'fixed',
                    top: '80px',
                    left: '20px',
                    right: '20px',
                    backgroundColor: '#1e293b',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '2px solid #3b82f6',
                    zIndex: 2000,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '24px' }}>🚐</span>
                            <div>
                                <h4 style={{ color: 'white', fontWeight: 'bold', margin: 0 }}>Chegando em {activeAlert.student.name}</h4>
                                <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Distância: {Math.round(activeAlert.distance)}m</p>
                            </div>
                        </div>
                        <button onClick={() => setActiveAlert(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                            <Icon name="x" size={20} />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            notificationService.sendCustomNotification(
                                activeAlert.student.responsiblePhone || '',
                                `Olá! 🚐 Estou chegando para buscar ${activeAlert.student.name} (aprox. 500m). Por favor, esteja pronto(a)!`
                            );
                            setActiveAlert(null);
                        }}
                        disabled={!activeAlert.student.responsiblePhone}
                        style={{
                            backgroundColor: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            opacity: activeAlert.student.responsiblePhone ? 1 : 0.5
                        }}
                    >
                        <Icon name="message-circle" size={20} />
                        Avisar via WhatsApp
                    </button>
                </div>
            )}

            {/* Map Container */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {userLocation && <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />}

                    {/* Linha da Rota */}
                    {studentsWithGPS.length > 1 && (
                        <Polyline
                            positions={studentsWithGPS.map(s => [s.latitude!, s.longitude!])}
                            color="#3b82f6"
                            weight={4}
                            opacity={0.7}
                        />
                    )}

                    {/* Marcadores dos Alunos */}
                    {studentsWithGPS.map((student, idx) => {
                        const globalIndex = students.findIndex(s => s.id === student.id);
                        return (
                            <Marker
                                key={student.id}
                                position={[student.latitude!, student.longitude!]}
                                icon={getPointIcon(globalIndex)}
                            >
                                <Popup>
                                    <strong>{globalIndex + 1}. {student.name}</strong><br />
                                    {student.school && <>{student.school}<br /></>}
                                    {student.address && <>{student.address}<br /></>}
                                    {visitedStudents.has(student.id) && <span style={{ color: 'green' }}>✓ Visitado</span>}
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* User Location */}
                    {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={createIcon('#ef4444')}>
                            <Popup>Você está aqui</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            {/* Barra de Controle Inferior */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderTop: '1px solid #e5e7eb',
                boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.1)',
                flexShrink: 0
            }}>
                {routeId && <TrackingControl routeId={routeId} />}

                {isRouteComplete ? (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                        <h3 style={{ color: '#10b981', fontWeight: 'bold', fontSize: '20px', margin: '0 0 8px 0' }}>
                            Rota Concluída!
                        </h3>
                        <p style={{ color: '#6b7280', margin: 0 }}>
                            Todos os {students.length} aluno(s) foram atendidos.
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
                ) : currentStudent ? (
                    <div>
                        {/* Info do Aluno Atual */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ fontWeight: 'bold', fontSize: '18px', color: '#1f2937', margin: '0 0 4px 0' }}>
                                    {currentIndex + 1}. {currentStudent.name}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                                    {currentStudent.school && <>{currentStudent.school}<br /></>}
                                    {currentStudent.address && <>{currentStudent.address}</>}
                                    {!currentStudent.address && !currentStudent.latitude && (
                                        <span style={{ color: '#f59e0b' }}>⚠️ Sem endereço cadastrado</span>
                                    )}
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
                                {visitedStudents.size}/{students.length}
                            </span>
                        </div>

                        {/* Botões de Ação */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <button
                                onClick={launchNavigation}
                                disabled={!currentStudent.latitude || !currentStudent.longitude}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px 8px',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    opacity: (!currentStudent.latitude || !currentStudent.longitude) ? 0.5 : 1
                                }}
                            >
                                <Icon name="navigation" size={20} />
                                <span>GPS</span>
                            </button>
                            <button
                                onClick={handleNotifyArrival}
                                disabled={!currentStudent.responsiblePhone}
                                style={{
                                    backgroundColor: '#25D366',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px 8px',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    opacity: !currentStudent.responsiblePhone ? 0.5 : 1
                                }}
                            >
                                <Icon name="message-circle" size={20} />
                                <span>Avisar</span>
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
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Icon name="check" size={20} />
                                <span>{session?.type === 'pickup' ? 'Embarcou' : 'Desembarcou'}</span>
                            </button>
                        </div>

                        {/* Info de Alunos Pendentes */}
                        {pendingCount > 1 && (
                            <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '12px', marginBottom: 0 }}>
                                {pendingCount - 1} aluno(s) restante(s) após este
                            </p>
                        )}
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: '16px 0', margin: 0 }}>
                        Nenhum aluno cadastrado nesta rota.
                    </p>
                )}
            </div>
        </div>
    );
};
