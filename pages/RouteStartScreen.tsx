import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Route, Student, RouteSession } from '../types';
import { Icon } from '../components/Icon';
import { InitialsAvatar } from '../components/Avatar';

export const RouteStartScreen: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();

  const [route, setRoute] = useState<Route | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [routeType, setRouteType] = useState<'pickup' | 'dropoff'>('pickup');

  const fetchData = async () => {
    if (!routeId) return;

    const [routes, allStudents] = await Promise.all([
      dbService.getRoutes(),
      dbService.getStudents()
    ]);

    const foundRoute = routes.find(r => r.id === routeId);
    if (!foundRoute) {
      alert('Rota não encontrada');
      navigate('/routes');
      return;
    }

    const routeStudents = allStudents
      .filter(s => s.routeId === routeId && s.active)
      .sort((a, b) => (a.routeOrder || a.order || 0) - (b.routeOrder || b.order || 0));

    setRoute(foundRoute);
    setStudents(routeStudents);

    // Selecionar todos por padrão
    setSelectedStudents(new Set(routeStudents.map(s => s.id)));
  };

  useEffect(() => { fetchData(); }, [routeId]);

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleStartRoute = async () => {
    if (selectedStudents.size === 0) {
      alert('Selecione pelo menos um aluno para iniciar a rota');
      return;
    }

    try {
      // Criar sessão de rota
      const skippedStudents = students
        .filter(s => !selectedStudents.has(s.id))
        .map(s => s.id);

      const session: RouteSession = {
        id: crypto.randomUUID(),
        routeId: routeId!,
        userId: '', // Será preenchido pelo cloudSync
        date: new Date().toISOString().split('T')[0],
        type: routeType,
        startTime: new Date().toISOString(),
        skippedStudents,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbService.saveRouteSession(session);

      // Navegar para tela de navegação
      navigate(`/routes/navigate/${routeId}?sessionId=${session.id}`);
    } catch (error) {
      console.error('Erro ao iniciar rota:', error);
      alert('Erro ao iniciar rota. Tente novamente.');
    }
  };

  if (!route) {
    return (
      <div className="p-4 flex items-center justify-center h-screen">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  const presentCount = selectedStudents.size;
  const absentCount = students.length - presentCount;

  return (
    <div className="min-h-screen bg-navy-900 pb-24">
      {/* Header */}
      <div className="bg-navy-800 px-4 py-4 border-b border-navy-700 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate('/routes')} className="p-2 text-gray-400 hover:text-white">
            <Icon name="arrow-left" size={24} />
          </button>
          <h3 className="text-lg font-bold text-white">Iniciar Rota</h3>
          <div className="w-10"></div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Icon name="map" size={18} className="text-primary-500" />
          <span className="text-white font-medium">{route.name}</span>
        </div>

        {/* Tipo de Rota */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setRouteType('pickup')}
            className={`flex-1 py-3 rounded-xl font-bold transition ${routeType === 'pickup'
              ? 'bg-primary-600 text-white'
              : 'bg-navy-700 text-gray-400 hover:bg-navy-600'
              }`}
          >
            🏠 Buscar (Ida)
          </button>
          <button
            onClick={() => setRouteType('dropoff')}
            className={`flex-1 py-3 rounded-xl font-bold transition ${routeType === 'dropoff'
              ? 'bg-primary-600 text-white'
              : 'bg-navy-700 text-gray-400 hover:bg-navy-600'
              }`}
          >
            🏫 Levar (Volta)
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/30 text-center">
            <div className="text-2xl font-bold text-green-400">{presentCount}</div>
            <div className="text-xs text-green-200/70 uppercase">Presentes</div>
          </div>
          <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/30 text-center">
            <div className="text-2xl font-bold text-red-400">{absentCount}</div>
            <div className="text-xs text-red-200/70 uppercase">Faltantes</div>
          </div>
        </div>

        {/* Botão Selecionar Todos */}
        <button
          onClick={toggleAll}
          className="w-full bg-navy-700 hover:bg-navy-600 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          {selectedStudents.size === students.length ? 'Desmarcar Todos' : 'Marcar Todos'}
        </button>
      </div>

      {/* Lista de Alunos */}
      <div className="p-4">
        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Icon name="users" size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum aluno nesta rota</p>
            <button
              onClick={() => navigate('/students')}
              className="mt-4 text-primary-400 hover:text-primary-300 font-medium"
            >
              Adicionar alunos →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm mb-3">
              Marque os alunos que <strong>VÃO</strong> na rota hoje:
            </p>

            {students.map((student, index) => {
              const isSelected = selectedStudents.has(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`bg-navy-800 p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-navy-700 hover:bg-navy-700/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-600'
                        }`}
                    >
                      {isSelected && <Icon name="check" size={16} className="text-white" strokeWidth={3} />}
                    </div>

                    {/* Número da Ordem */}
                    <div className="flex-shrink-0 w-8 h-8 bg-navy-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>

                    {/* Avatar e Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <InitialsAvatar name={student.name} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate flex items-center gap-1">
                          {student.observation && (
                            <span className="text-orange-400" title="Possui observação">⚠️</span>
                          )}
                          {student.name}
                        </h4>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          {student.school && <div>{student.school}</div>}
                          {student.address && (
                            <div className="flex items-center gap-1 truncate">
                              <Icon name="map-pin" size={10} />
                              <span className="truncate">{student.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Visual */}
                    {!isSelected && (
                      <div className="text-red-400 text-xs font-bold">
                        FALTA
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botão Iniciar Rota (Fixo) */}
      {students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-navy-900 border-t border-navy-700 pb-20">
          <button
            onClick={handleStartRoute}
            disabled={selectedStudents.size === 0}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="navigation" size={20} />
            Iniciar Rota ({presentCount} aluno{presentCount !== 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  );
};
