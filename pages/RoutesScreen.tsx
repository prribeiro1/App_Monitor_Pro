import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Route, Stop } from '../types';
import { Icon } from '../components/Icon';
import { Geolocation } from '@capacitor/geolocation';
import { useI18n } from '../i18n';

interface RoutesScreenProps {
  canUseGps?: boolean;
}

export const RoutesScreen: React.FC<RoutesScreenProps> = ({ canUseGps = true }) => {
  const { t, language } = useI18n();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState('');

  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [stopName, setStopName] = useState('');
  const [stopRouteId, setStopRouteId] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const fetchData = async () => {
    const [r, s] = await Promise.all([dbService.getRoutes(), dbService.getStops()]);
    s.sort((a, b) => a.order - b.order);
    setRoutes(r);
    setStops(s);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleRoute = (id: string) => setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.saveRoute({ id: editingRouteId || crypto.randomUUID(), name: routeName });
    setIsRouteModalOpen(false);
    setRouteName('');
    setEditingRouteId(null);
    fetchData();
  };

  const handleDeleteRoute = async (id: string) => {
    if (confirm('Excluir rota? ATENÇÃO: Isso excluirá todos os pontos e alunos vinculados.')) {
      await dbService.deleteRoute(id);
      fetchData();
    }
  };

  const openEditRoute = (route: Route) => { setRouteName(route.name); setEditingRouteId(route.id); setIsRouteModalOpen(true); };

  const moveStop = async (stop: Stop, direction: 'up' | 'down') => {
    const siblings = stops.filter(s => s.routeId === stop.routeId);
    const index = siblings.findIndex(s => s.id === stop.id);
    if (direction === 'up' && index > 0) {
      const prev = siblings[index - 1];
      [stop.order, prev.order] = [prev.order, stop.order];
      await Promise.all([dbService.saveStop(stop), dbService.saveStop(prev)]);
      fetchData();
    } else if (direction === 'down' && index < siblings.length - 1) {
      const next = siblings[index + 1];
      [stop.order, next.order] = [next.order, stop.order];
      await Promise.all([dbService.saveStop(stop), dbService.saveStop(next)]);
      fetchData();
    }
  };

  const handleOptimizeRoute = async (routeId: string) => {
    if (!confirm("Isso irá reordenar todos os pontos desta rota pela distância mais curta. Deseja continuar?")) return;

    // 1. Pega os stops da rota atual
    let routeStops = stops.filter(s => s.routeId === routeId).filter(s => s.latitude && s.longitude);
    const stopsWithoutGps = stops.filter(s => s.routeId === routeId && (!s.latitude || !s.longitude));

    if (routeStops.length < 2) {
      alert("É preciso ter pelo menos 2 pontos com GPS para otimizar.");
      return;
    }

    // 2. Tenta pegar a localização atual do usuário para começar de lá
    let startLat = 0;
    let startLng = 0;

    try {
      const pos = await Geolocation.getCurrentPosition();
      startLat = pos.coords.latitude;
      startLng = pos.coords.longitude;
    } catch (e) {
      // Se falhar GPS, começa do primeiro ponto da lista atual
      startLat = routeStops[0].latitude!;
      startLng = routeStops[0].longitude!;
    }

    // 3. Algoritmo Nearest Neighbor (Vizinho Mais Próximo)
    const optimized: Stop[] = [];
    let currentLat = startLat;
    let currentLng = startLng;

    while (routeStops.length > 0) {
      let nearestIndex = -1;
      let minDist = Infinity;

      for (let i = 0; i < routeStops.length; i++) {
        const s = routeStops[i];
        // Distância Euclidiana simples (funciona bem p/ pequenas distâncias)
        const d = Math.sqrt(Math.pow(s.latitude! - currentLat, 2) + Math.pow(s.longitude! - currentLng, 2));
        if (d < minDist) {
          minDist = d;
          nearestIndex = i;
        }
      }

      const nextStop = routeStops[nearestIndex];
      optimized.push(nextStop);
      currentLat = nextStop.latitude!;
      currentLng = nextStop.longitude!;
      routeStops.splice(nearestIndex, 1);
    }

    // 4. Salva a nova ordem (mantendo os sem GPS no final)
    const finalOrder = [...optimized, ...stopsWithoutGps];

    // Atualiza campo 'order'
    const updates = finalOrder.map((s, index) => ({
      ...s,
      order: index
    }));

    // Salva tudo no banco (dbService já chama cloudSync)
    for (const s of updates) {
      await dbService.saveStop(s);
    }

    alert("Rota otimizada com sucesso!");
    fetchData();
  };

  const searchAddress = async () => {
    if (!addressQuery) return;
    setIsSearchingAddress(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
      const data = await response.json();
      if (data?.length > 0) { setLatitude(parseFloat(data[0].lat)); setLongitude(parseFloat(data[0].lon)); alert(`Endereço encontrado: ${data[0].display_name}`); }
      else alert('Endereço não encontrado.');
    } catch { alert('Erro ao buscar endereço.'); }
    finally { setIsSearchingAddress(false); }
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise<any>((resolve, reject) => {
        let id: string;
        const timeout = setTimeout(() => { Geolocation.clearWatch({ id }); reject(new Error('Timeout')); }, 30000);
        Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }, (pos, err) => {
          if (pos) { clearTimeout(timeout); Geolocation.clearWatch({ id }); resolve(pos); }
        }).then(watchId => id = watchId);
      });
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    } catch { alert('Erro ao obter localização.'); }
    finally { setIsLoadingLocation(false); }
  };

  const openNavigation = (lat: number, lng: number) => window.open(`google.navigation:q=${lat},${lng}`, '_system');

  const handleStopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const routeStops = stops.filter(s => s.routeId === stopRouteId);
    const newOrder = editingStopId ? stops.find(s => s.id === editingStopId)?.order || routeStops.length : routeStops.length;
    await dbService.saveStop({
      id: editingStopId || crypto.randomUUID(),
      name: stopName,
      routeId: stopRouteId,
      order: newOrder,
      latitude,
      longitude
    });
    resetStopForm();
    fetchData();
  };

  const resetStopForm = () => {
    setIsStopModalOpen(false);
    setStopName('');
    setStopRouteId('');
    setEditingStopId(null);
    setLatitude(undefined);
    setLongitude(undefined);
    setAddressQuery('');
  };

  const openEditStop = (stop: Stop) => {
    setStopName(stop.name);
    setStopRouteId(stop.routeId);
    setEditingStopId(stop.id);
    setLatitude(stop.latitude);
    setLongitude(stop.longitude);
    setIsStopModalOpen(true);
  };

  const openAddStop = (routeId: string) => {
    resetStopForm();
    setStopRouteId(routeId);
    setIsStopModalOpen(true);
  };

  const handleDeleteStop = async (id: string) => {
    if (confirm('Excluir este ponto?')) {
      await dbService.deleteStop(id);
      fetchData();
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{t('routes_title')}</h2>
        <button onClick={() => { setRouteName(''); setEditingRouteId(null); setIsRouteModalOpen(true); }} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
          <Icon name="plus" size={18} /> {t('routes_new')}
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Icon name="map" size={48} className="mx-auto mb-4 opacity-50" />
          <p>{t('routes_no_routes')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map(route => {
            const routeStops = stops.filter(s => s.routeId === route.id);
            const isExpanded = expandedRoutes[route.id];
            return (
              <div key={route.id} className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleRoute(route.id)}>
                  <div className="flex items-center gap-3">
                    <Icon name="map" size={20} className="text-primary-500" />
                    <div>
                      <h3 className="text-white font-semibold">{route.name}</h3>
                      <p className="text-xs text-gray-400">{routeStops.length} ponto(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditRoute(route); }} className="p-2 text-gray-400 hover:text-white transition"><Icon name="edit" size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }} className="p-2 text-red-400 hover:text-red-300 transition"><Icon name="trash" size={16} /></button>
                    <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} className="text-gray-400" />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-navy-700 bg-navy-900/50">
                    {routeStops.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">Nenhum ponto nesta rota</p>
                    ) : (
                      <div className="divide-y divide-navy-700">
                        {routeStops.map((stop, idx) => (
                          <div key={stop.id} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                              <div>
                                <p className="text-white text-sm">{stop.name}</p>
                                {stop.latitude && stop.longitude && (
                                  <button onClick={() => openNavigation(stop.latitude!, stop.longitude!)} className="text-xs text-primary-400 hover:underline flex items-center gap-1">
                                    <Icon name="map-pin" size={12} /> Navegar
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => moveStop(stop, 'up')} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition"><Icon name="chevron-up" size={16} /></button>
                              <button onClick={() => moveStop(stop, 'down')} disabled={idx === routeStops.length - 1} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition"><Icon name="chevron-down" size={16} /></button>
                              <button onClick={() => openEditStop(stop)} className="p-1.5 text-gray-400 hover:text-white transition"><Icon name="edit" size={16} /></button>
                              <button onClick={() => handleDeleteStop(stop.id)} className="p-1.5 text-red-400 hover:text-red-300 transition"><Icon name="trash" size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="p-3 border-t border-navy-700">
                      <button onClick={() => openAddStop(route.id)} className="w-full py-2 text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center justify-center gap-2 transition">
                        <Icon name="plus" size={16} /> Adicionar Ponto
                      </button>
                    </div>
                    {/* Botões de Ação da Rota */}
                    <div className="p-3 border-t border-navy-700 flex gap-2">
                      <button
                        onClick={() => window.location.hash = `/routes/navigate/${route.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                      >
                        <Icon name="navigation" size={20} /> Iniciar Rota
                      </button>
                      <button
                        onClick={() => handleOptimizeRoute(route.id)}
                        className="bg-accent-600 hover:bg-accent-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        title="Otimizar ordem dos pontos"
                      >
                        <Icon name="refresh-cw" size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div >
      )}

      {/* Route Modal */}
      {
        isRouteModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700">
              <h3 className="text-xl font-bold text-white mb-4">{editingRouteId ? 'Editar Rota' : 'Nova Rota'}</h3>
              <form onSubmit={handleRouteSubmit}>
                <input type="text" value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="Nome da rota" className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mb-4 outline-none focus:border-primary-500" required />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsRouteModalOpen(false)} className="flex-1 py-3 bg-gray-700 text-white rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Stop Modal */}
      {
        isStopModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">{editingStopId ? 'Editar Ponto' : 'Novo Ponto'}</h3>
              <form onSubmit={handleStopSubmit}>
                <input type="text" value={stopName} onChange={e => setStopName(e.target.value)} placeholder="Nome do ponto" className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mb-4 outline-none focus:border-primary-500" required />

                {canUseGps && (
                  <div className="mb-4 space-y-3">
                    <div className="flex gap-2">
                      <input type="text" value={addressQuery} onChange={e => setAddressQuery(e.target.value)} placeholder="Buscar endereço..." className="flex-1 bg-navy-900 border border-navy-700 text-white p-3 rounded-lg outline-none focus:border-primary-500" />
                      <button type="button" onClick={searchAddress} disabled={isSearchingAddress} className="px-4 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                        {isSearchingAddress ? '...' : <Icon name="search" size={18} />}
                      </button>
                    </div>
                    <button type="button" onClick={getCurrentLocation} disabled={isLoadingLocation} className="w-full py-3 bg-accent-600 hover:bg-accent-500 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition">
                      <Icon name="map-pin" size={18} />
                      {isLoadingLocation ? 'Obtendo...' : 'Usar Localização Atual'}
                    </button>
                    {latitude && longitude && (
                      <p className="text-xs text-green-400 text-center">📍 Localização definida: {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={resetStopForm} className="flex-1 py-3 bg-gray-700 text-white rounded-xl">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};
