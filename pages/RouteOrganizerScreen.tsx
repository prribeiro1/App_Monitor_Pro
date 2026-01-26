import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Route, Student } from '../types';
import { Icon } from '../components/Icon';
import { InitialsAvatar } from '../components/Avatar';
import { routeOptimizationService } from '../services/routeOptimizationService';

export const RouteOrganizerScreen: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  
  const [route, setRoute] = useState<Route | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      .filter(s => s.routeId === routeId)
      .sort((a, b) => (a.routeOrder || a.order || 0) - (b.routeOrder || b.order || 0));

    setRoute(foundRoute);
    setStudents(routeStudents);
  };

  useEffect(() => { fetchData(); }, [routeId]);

  // Drag & Drop Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStudents = [...students];
    const draggedStudent = newStudents[draggedIndex];
    newStudents.splice(draggedIndex, 1);
    newStudents.splice(index, 0, draggedStudent);

    setStudents(newStudents);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Otimização Automática
  const handleOptimize = async () => {
    if (students.length === 0) return;

    // Filtrar apenas alunos com coordenadas
    const studentsWithCoords = students.filter(s => s.latitude && s.longitude);
    
    if (studentsWithCoords.length === 0) {
      alert('Nenhum aluno possui localização GPS cadastrada. Adicione coordenadas para usar a otimização automática.');
      return;
    }

    if (studentsWithCoords.length < students.length) {
      const missing = students.length - studentsWithCoords.length;
      if (!confirm(`${missing} aluno(s) não possuem GPS. Deseja otimizar apenas os que possuem?`)) {
        return;
      }
    }

    setIsOptimizing(true);

    try {
      // Pegar localização atual do condutor (ou usar primeiro aluno como ponto de partida)
      let startLocation = { lat: studentsWithCoords[0].latitude!, lng: studentsWithCoords[0].longitude! };
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          startLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        } catch (e) {
          console.log('Não foi possível obter localização atual, usando primeiro aluno como ponto de partida');
        }
      }

      // Otimizar rota
      const optimized = routeOptimizationService.optimizeRoute(studentsWithCoords, startLocation);
      
      // Calcular horários estimados (começando às 07:00)
      const withTimes = routeOptimizationService.calculateEstimatedTimes(optimized, '07:00');
      
      // Mesclar com alunos sem GPS (colocar no final)
      const studentsWithoutCoords = students.filter(s => !s.latitude || !s.longitude);
      const finalOrder = [...withTimes, ...studentsWithoutCoords];

      setStudents(finalOrder);
      setHasChanges(true);
      alert('Rota otimizada com sucesso!');
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      alert('Erro ao otimizar rota. Tente novamente.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Salvar Ordem
  const handleSave = async () => {
    if (!hasChanges) {
      navigate('/routes');
      return;
    }

    try {
      // Atualizar routeOrder de cada aluno
      const updates = students.map((student, index) => {
        student.routeOrder = index + 1;
        return dbService.saveStudent(student);
      });

      await Promise.all(updates);
      alert('Ordem salva com sucesso!');
      navigate('/routes');
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      alert('Erro ao salvar ordem. Tente novamente.');
    }
  };

  // Mover manualmente (setas)
  const moveStudent = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === students.length - 1) return;

    const newStudents = [...students];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStudents[index], newStudents[targetIndex]] = [newStudents[targetIndex], newStudents[index]];

    setStudents(newStudents);
    setHasChanges(true);
  };

  if (!route) {
    return (
      <div className="p-4 flex items-center justify-center h-screen">
        <div className="text-gray-400">Carregando...</div>
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
          <h3 className="text-lg font-bold text-white">Organizar Rota</h3>
          <button 
            onClick={handleSave}
            className={`font-bold ${hasChanges ? 'text-primary-400' : 'text-gray-600'}`}
            disabled={!hasChanges}
          >
            Salvar
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <Icon name="map" size={18} className="text-primary-500" />
          <span className="text-white font-medium">{route.name}</span>
          <span className="text-gray-400 text-sm">({students.length} alunos)</span>
        </div>

        {/* Botão Otimizar */}
        <button
          onClick={handleOptimize}
          disabled={isOptimizing || students.length === 0}
          className="w-full bg-accent-600 hover:bg-accent-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOptimizing ? (
            <>
              <Icon name="loader" size={20} className="animate-spin" />
              Otimizando...
            </>
          ) : (
            <>
              <Icon name="zap" size={20} />
              Otimizar Automaticamente
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-400 mt-2 text-center">
          Arraste os alunos para reordenar ou use a otimização automática
        </p>
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
            {students.map((student, index) => (
              <div
                key={student.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-navy-800 p-4 rounded-xl border border-navy-700 cursor-move transition-all ${
                  draggedIndex === index ? 'opacity-50 scale-95' : 'hover:bg-navy-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Número da Ordem */}
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{index + 1}</span>
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
                          <div className="flex items-center gap-1">
                            <Icon name="map-pin" size={10} />
                            <span className="truncate">{student.address}</span>
                          </div>
                        )}
                        {student.estimatedPickupTime && (
                          <div className="flex items-center gap-1 text-primary-400">
                            <Icon name="clock" size={10} />
                            {student.estimatedPickupTime}
                          </div>
                        )}
                        {!student.latitude && !student.longitude && (
                          <div className="text-yellow-400 text-[10px]">
                            ⚠️ Sem GPS (não será otimizado)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de Mover */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveStudent(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Icon name="chevron-up" size={20} />
                    </button>
                    <button
                      onClick={() => moveStudent(index, 'down')}
                      disabled={index === students.length - 1}
                      className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Icon name="chevron-down" size={20} />
                    </button>
                  </div>

                  {/* Ícone de Drag */}
                  <Icon name="menu" size={20} className="text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão Salvar Fixo (Bottom) */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-navy-900 border-t border-navy-700">
          <button
            onClick={handleSave}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition"
          >
            <Icon name="check" size={20} />
            Salvar Ordem
          </button>
        </div>
      )}
    </div>
  );
};
