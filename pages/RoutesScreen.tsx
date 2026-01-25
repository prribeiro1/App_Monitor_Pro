import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Route, Student } from '../types';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';

interface RoutesScreenProps {
  canUseGps?: boolean;
}

export const RoutesScreen: React.FC<RoutesScreenProps> = ({ canUseGps = true }) => {
  const { t } = useI18n();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState('');

  const fetchData = async () => {
    const [r, st] = await Promise.all([dbService.getRoutes(), dbService.getStudents()]);
    st.sort((a, b) => (a.routeOrder || a.order || 0) - (b.routeOrder || b.order || 0));
    setRoutes(r);
    setStudents(st);
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
    const routeStudents = students.filter(s => s.routeId === id);
    if (routeStudents.length > 0) {
      alert(`Não é possível excluir esta rota pois existem ${routeStudents.length} aluno(s) vinculado(s). Remova os alunos primeiro.`);
      return;
    }
    if (confirm('Excluir rota?')) {
      await dbService.deleteRoute(id);
      fetchData();
    }
  };

  const openEditRoute = (route: Route) => { setRouteName(route.name); setEditingRouteId(route.id); setIsRouteModalOpen(true); };

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
            const routeStudents = students.filter(s => s.routeId === route.id);
            const isExpanded = expandedRoutes[route.id];
            return (
              <div key={route.id} className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleRoute(route.id)}>
                  <div className="flex items-center gap-3">
                    <Icon name="map" size={20} className="text-primary-500" />
                    <div>
                      <h3 className="text-white font-semibold">{route.name}</h3>
                      <p className="text-xs text-gray-400">{routeStudents.length} aluno(s)</p>
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
                    {routeStudents.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-gray-500 text-sm mb-3">Nenhum aluno nesta rota</p>
                        <button
                          onClick={() => window.location.hash = '/students'}
                          className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                        >
                          Adicionar alunos →
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-navy-700">
                        {routeStudents.map((student, idx) => (
                          <div key={student.id} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center text-xs font-bold">
                                {student.routeOrder || idx + 1}
                              </span>
                              <div>
                                <p className="text-white text-sm font-medium">{student.name}</p>
                                {student.address && (
                                  <p className="text-xs text-gray-400">📍 {student.address}</p>
                                )}
                                {student.estimatedPickupTime && (
                                  <p className="text-xs text-gray-400">🕐 {student.estimatedPickupTime}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => window.location.hash = `/students?open=${student.id}`}
                              className="p-1.5 text-gray-400 hover:text-white transition"
                            >
                              <Icon name="chevron-right" size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Botões de Ação da Rota */}
                    <div className="p-3 border-t border-navy-700 flex gap-2">
                      <button
                        onClick={() => window.location.hash = `/routes/navigate/${route.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        disabled={routeStudents.length === 0}
                      >
                        <Icon name="navigation" size={20} /> Iniciar Rota
                      </button>
                      <button
                        onClick={() => alert('Tela de organização em desenvolvimento')}
                        className="bg-accent-600 hover:bg-accent-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        title="Organizar ordem dos alunos"
                        disabled={routeStudents.length === 0}
                      >
                        <Icon name="list" size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Route Modal */}
      {isRouteModalOpen && (
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
      )}
    </div>
  );
};
