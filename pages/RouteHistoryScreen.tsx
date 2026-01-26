import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { RouteSession, RouteEvent, Student, Route } from '../types';
import { Icon } from '../components/Icon';

interface RouteHistoryItem {
  session: RouteSession;
  route: Route;
  events: RouteEvent[];
  students: Student[];
}

export const RouteHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<RouteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<RouteHistoryItem | null>(null);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const [sessions, events, students, routes] = await Promise.all([
        dbService.getRouteSessions(),
        dbService.getRouteEvents(),
        dbService.getStudents(),
        dbService.getRoutes()
      ]);

      // Agrupar por sessão
      const historyItems: RouteHistoryItem[] = sessions
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.startTime || '').getTime() - new Date(a.startTime || '').getTime())
        .map(session => {
          const route = routes.find(r => r.id === session.routeId);
          const sessionEvents = events.filter(e => e.sessionId === session.id);
          const sessionStudents = students.filter(s => 
            sessionEvents.some(e => e.studentId === s.id)
          );

          return {
            session,
            route: route || { id: '', name: 'Rota Desconhecida' },
            events: sessionEvents,
            students: sessionStudents
          };
        });

      setHistory(historyItems);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return '--';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const minutes = Math.round((end - start) / 60000);
    return `${minutes} min`;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'notification_sent':
        return '📢';
      case 'picked_up':
        return '✅';
      case 'dropped_off':
        return '🏠';
      default:
        return '📍';
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'notification_sent':
        return 'Notificação enviada';
      case 'picked_up':
        return 'Embarcou';
      case 'dropped_off':
        return 'Desembarcou';
      default:
        return eventType;
    }
  };

  const filteredHistory = filterDate
    ? history.filter(item => item.session.date === filterDate)
    : history;

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-screen">
        <div className="text-gray-400">Carregando histórico...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 pb-24">
      {/* Header */}
      <div className="bg-navy-800 px-4 py-4 border-b border-navy-700 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate('/routes')} className="p-2 text-gray-400 hover:text-white">
            <Icon name="arrow-left" size={24} />
          </button>
          <h3 className="text-lg font-bold text-white">Histórico de Rotas</h3>
          <div className="w-10"></div>
        </div>

        {/* Filtro de Data */}
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
        />
      </div>

      {/* Lista de Histórico */}
      <div className="p-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Icon name="clock" size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhuma rota concluída{filterDate ? ' nesta data' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.session.id}
                onClick={() => setSelectedSession(item)}
                className="bg-navy-800 p-4 rounded-xl border border-navy-700 cursor-pointer hover:bg-navy-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon name="map" size={18} className="text-primary-500" />
                    <h4 className="text-white font-bold">{item.route.name}</h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.session.type === 'pickup' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {item.session.type === 'pickup' ? '🏠 Ida' : '🏫 Volta'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                  <div>
                    <div className="text-white font-medium">{formatDate(item.session.date)}</div>
                    <div>Data</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {formatTime(item.session.startTime || '')}
                    </div>
                    <div>Início</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {calculateDuration(item.session.startTime, item.session.endTime)}
                    </div>
                    <div>Duração</div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <Icon name="users" size={12} />
                  <span>{item.students.length} aluno(s) atendido(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
          <div className="min-h-screen p-4 flex items-center justify-center">
            <div className="bg-navy-800 rounded-2xl w-full max-w-2xl border border-navy-700">
              {/* Header do Modal */}
              <div className="p-4 border-b border-navy-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Detalhes da Rota</h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <Icon name="x" size={24} />
                </button>
              </div>

              {/* Conteúdo do Modal */}
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {/* Info da Rota */}
                <div className="bg-navy-900 p-4 rounded-xl mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="map" size={20} className="text-primary-500" />
                    <h4 className="text-white font-bold text-lg">{selectedSession.route.name}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Data:</span>
                      <span className="text-white ml-2">{formatDate(selectedSession.session.date)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Tipo:</span>
                      <span className="text-white ml-2">
                        {selectedSession.session.type === 'pickup' ? '🏠 Ida' : '🏫 Volta'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Início:</span>
                      <span className="text-white ml-2">
                        {formatTime(selectedSession.session.startTime || '')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Fim:</span>
                      <span className="text-white ml-2">
                        {formatTime(selectedSession.session.endTime || '')}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Duração:</span>
                      <span className="text-white ml-2">
                        {calculateDuration(selectedSession.session.startTime, selectedSession.session.endTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline de Eventos */}
                <h5 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Icon name="clock" size={18} />
                  Timeline de Eventos
                </h5>
                <div className="space-y-3">
                  {selectedSession.events
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((event) => {
                      const student = selectedSession.students.find(s => s.id === event.studentId);
                      return (
                        <div key={event.id} className="bg-navy-900 p-3 rounded-lg border-l-4 border-primary-500">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{getEventIcon(event.eventType)}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white font-medium">{student?.name || 'Aluno'}</span>
                                <span className="text-xs text-gray-400">
                                  {formatTime(event.timestamp)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400">
                                {getEventLabel(event.eventType)}
                              </div>
                              {event.notes && (
                                <div className="text-xs text-gray-500 mt-1">{event.notes}</div>
                              )}
                              {event.latitude && event.longitude && (
                                <div className="text-xs text-gray-500 mt-1">
                                  📍 Lat: {event.latitude.toFixed(6)}, Lng: {event.longitude.toFixed(6)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="p-4 border-t border-navy-700">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-xl font-bold transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
