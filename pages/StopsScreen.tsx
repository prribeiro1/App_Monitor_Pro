import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Route, Stop } from '../types';
import { Icon } from '../components/Icon';
import { Geolocation } from '@capacitor/geolocation';
import { Browser } from '@capacitor/browser';

export const StopsScreen: React.FC<{ canUseGps: boolean }> = ({ canUseGps }) => {
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

  // Form State
  const [namesInput, setNamesInput] = useState(''); // Changed to support bulk text
  const [routeId, setRouteId] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const fetchData = async () => {
    const [s, r] = await Promise.all([dbService.getStops(), dbService.getRoutes()]);
    // Sort logic
    s.sort((a, b) => a.order - b.order);
    setStops(s);
    setRoutes(r);
    if (r.length > 0 && !routeId) setRouteId(r[0].id);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleRoute = (id: string) => {
    setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const moveStop = async (stop: Stop, direction: 'up' | 'down') => {
    // Find stops in the same route
    const siblings = stops.filter(s => s.routeId === stop.routeId);
    const index = siblings.findIndex(s => s.id === stop.id);

    if (direction === 'up' && index > 0) {
      const prev = siblings[index - 1];
      // Swap orders
      const tempOrder = stop.order;
      stop.order = prev.order;
      prev.order = tempOrder;

      await Promise.all([dbService.saveStop(stop), dbService.saveStop(prev)]);
      fetchData();
    } else if (direction === 'down' && index < siblings.length - 1) {
      const next = siblings[index + 1];
      // Swap orders
      const tempOrder = stop.order;
      stop.order = next.order;
      next.order = tempOrder;

      await Promise.all([dbService.saveStop(stop), dbService.saveStop(next)]);
      fetchData();
    }
  };

  const [addressQuery, setAddressQuery] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const searchAddress = async () => {
    if (!addressQuery) return;
    setIsSearchingAddress(true);
    try {
      // Nominatim Search (OpenStreetMap)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        setLatitude(parseFloat(data[0].lat));
        setLongitude(parseFloat(data[0].lon));
        // Optional: Update name if empty? No, keep user input.
        alert(`Endereço encontrado: ${data[0].display_name}`);
      } else {
        alert('Endereço não encontrado.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao buscar endereço. Verifique sua conexão.');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      // Robust Offline GPS Strategy:
      // 1. Try to get a high-accuracy fix using watchPosition (forces GPS on)
      // 2. Wait up to 30s for a valid reading
      // 3. If fails, fallback to any available cached location (if acceptable) or throw error

      const getPosition = () => new Promise<any>((resolve, reject) => {
        let id: string;
        const timeoutId = setTimeout(() => {
          Geolocation.clearWatch({ id });
          reject(new Error('Timeout waiting for GPS fix'));
        }, 30000);

        Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }, (position, err) => {
          if (err) {
            // Don't reject immediately on error, keep trying until timeout
            console.warn('GPS Error during watch:', err);
            return;
          }
          if (position) {
            clearTimeout(timeoutId);
            Geolocation.clearWatch({ id });
            resolve(position);
          }
        }).then(watchId => id = watchId);
      });

      const position = await getPosition();
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    } catch (error) {
      alert('Erro ao obter localização. Certifique-se de estar em local aberto e tente novamente.');
      console.error(error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const openNavigation = async (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    try {
      await Browser.open({ url });
    } catch (error) {
      console.error('Erro ao abrir navegação:', error);
      window.open(url, '_system');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Edição Única
      const stop: Stop = {
        id: editingId,
        routeId,
        name: namesInput,
        order: stops.find(s => s.id === editingId)?.order || 0,
        latitude,
        longitude
      };
      await dbService.saveStop(stop);
    } else {
      // Criação em Massa (Bulk Add)
      const names = namesInput.split(/[\n,]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

      // Find max order for this route to append correctly
      const routeStops = stops.filter(s => s.routeId === routeId);
      let currentCount = routeStops.length > 0 ? Math.max(...routeStops.map(s => s.order)) + 1 : 0;

      for (const name of names) {
        const newStop: Stop = {
          id: crypto.randomUUID(),
          routeId,
          name,
          order: currentCount++,
          // Bulk add doesn't support individual GPS coordinates easily, so we skip it or use the current one for all (which might be wrong)
          // For now, let's only apply GPS if it's a single entry or apply to all (user discretion)
          latitude: names.length === 1 ? latitude : undefined,
          longitude: names.length === 1 ? longitude : undefined
        };
        await dbService.saveStop(newStop);
      }
    }

    setIsModalOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setNamesInput('');
    setAddressQuery('');
    setEditingId(null);
    setLatitude(undefined);
    setLongitude(undefined);
    if (routes.length > 0) setRouteId(routes[0].id);
  };

  const handleEditClick = (stop: Stop) => {
    setNamesInput(stop.name);
    setRouteId(stop.routeId);
    setEditingId(stop.id);
    setLatitude(stop.latitude);
    setLongitude(stop.longitude);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir ponto?')) {
      await dbService.deleteStop(id);
      fetchData();
    }
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Pontos de Embarque</h2>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-full shadow-lg shadow-primary-600/30"
        >
          <Icon name="plus" />
        </button>
      </div>

      <div className="space-y-4">
        {routes.map(route => {
          const routeStops = stops.filter(s => s.routeId === route.id);
          const isExpanded = expandedRoutes[route.id];

          return (
            <div key={route.id} className="space-y-2">
              <div
                onClick={() => toggleRoute(route.id)}
                className="flex items-center justify-between bg-navy-800/50 p-3 rounded-lg cursor-pointer hover:bg-navy-800 transition-colors border border-navy-700"
              >
                <h3 className="text-accent-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Icon name="map" size={16} />
                  {route.name} ({routeStops.length})
                </h3>
                <Icon name={isExpanded ? "x" : "plus"} size={14} className="text-gray-400 rotate-45 transition-transform" />
              </div>

              {isExpanded && (
                <div className="pl-2 space-y-2">
                  {routeStops.length === 0 && <p className="text-xs text-gray-500 ml-2 py-2">Nenhum ponto cadastrado.</p>}
                  {routeStops.map((stop, index) => (
                    <div key={stop.id} className="bg-navy-800 p-4 rounded-xl border border-navy-700 flex justify-between items-center shadow-sm group">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); moveStop(stop, 'up'); }} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30">
                            <Icon name="chevron-up" size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); moveStop(stop, 'down'); }} disabled={index === routeStops.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30">
                            <Icon name="chevron-down" size={16} />
                          </button>
                        </div>
                        <div className="bg-navy-700 p-2 rounded-full text-gray-300">
                          <Icon name="map-pin" size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{stop.name}</span>
                          {stop.latitude && stop.longitude && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Icon name="check" size={10} /> GPS Vinculado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {canUseGps && stop.latitude && stop.longitude && (
                          <button
                            onClick={() => openNavigation(stop.latitude!, stop.longitude!)}
                            className="p-2 text-blue-400 hover:text-blue-300 bg-blue-400/10 rounded-lg"
                            title="Navegar até o ponto"
                          >
                            <Icon name="road" size={16} />
                          </button>
                        )}
                        {!canUseGps && (
                          <button onClick={() => alert("Acesso ao GPS bloqueado. Entre em contato com o administrador.")} className="p-2 text-gray-600">
                            <Icon name="lock" size={16} />
                          </button>
                        )}
                        <button onClick={() => handleEditClick(stop)} className="p-2 text-gray-400 hover:text-white">
                          <Icon name="edit" size={16} />
                        </button>
                        <button onClick={() => handleDelete(stop.id)} className="p-2 text-red-400 hover:text-red-300">
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {routes.length === 0 && <p className="text-center text-gray-500 mt-10">Crie uma rota primeiro.</p>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-md border border-navy-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar Ponto' : 'Novos Pontos'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rota</label>
                <select value={routeId} onChange={e => setRouteId(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg">
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {editingId ? 'Nome do Ponto' : 'Nomes (Cole uma lista ou digite um por linha)'}
                </label>
                {editingId ? (
                  <input type="text" value={namesInput} onChange={e => setNamesInput(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" required />
                ) : (
                  <textarea
                    value={namesInput}
                    onChange={e => setNamesInput(e.target.value)}
                    placeholder="Ex: Padaria Central&#10;Praça da Matriz&#10;Rua das Flores"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg h-32"
                    required
                  />
                )}
              </div>

              {/* GPS Section */}
              <div className={`bg-navy-900/50 p-4 rounded-lg border ${canUseGps ? 'border-navy-700' : 'border-red-900/50 opacity-50 pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm text-gray-400 font-medium">Localização GPS (Opcional)</label>
                  {!canUseGps && <span className="text-xs text-red-400 font-bold flex items-center gap-1"><Icon name="lock" size={10} /> BLOQUEADO</span>}
                </div>

                {/* Address Search */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Buscar endereço (Rua, Número, Cidade)"
                    value={addressQuery}
                    onChange={e => setAddressQuery(e.target.value)}
                    className="flex-1 bg-navy-800 text-white p-2 rounded-lg text-sm border border-navy-600 focus:border-primary-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={searchAddress}
                    disabled={isSearchingAddress || !canUseGps}
                    className="bg-navy-700 hover:bg-navy-600 text-white p-2 rounded-lg border border-navy-600"
                  >
                    {isSearchingAddress ? <Icon name="loader" className="animate-spin" size={18} /> : <Icon name="search" size={18} />}
                  </button>
                </div>

                <div className="text-center text-xs text-gray-500 mb-3">- OU -</div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation || !canUseGps}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
                  >
                    {isLoadingLocation ? (
                      <span>Obtendo...</span>
                    ) : (
                      <>
                        <Icon name="map-pin" size={16} />
                        Pegar Local Atual
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude || ''}
                      onChange={e => setLatitude(parseFloat(e.target.value))}
                      className="w-full bg-navy-900 border border-navy-700 text-white p-2 rounded text-sm"
                      placeholder="0.000000"
                      disabled={!canUseGps}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude || ''}
                      onChange={e => setLongitude(parseFloat(e.target.value))}
                      className="w-full bg-navy-900 border border-navy-700 text-white p-2 rounded text-sm"
                      placeholder="0.000000"
                      disabled={!canUseGps}
                    />
                  </div>
                </div>
                {latitude && longitude && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <Icon name="check" size={12} /> Localização definida
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-300">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};