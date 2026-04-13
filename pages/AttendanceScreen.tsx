import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, Stop, Route, AttendanceRecord, AttendanceStatus } from '../types';
import { Icon } from '../components/Icon';
import { InitialsAvatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import { useNavigate } from 'react-router-dom';

interface RouteGroup {
  routeName: string;
  students: Student[];
}

export const AttendanceScreen: React.FC = () => {
  const { t, language } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [filterShift, setFilterShift] = useState<'all' | 'manha' | 'tarde' | 'integral'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'name' | 'sala'>('order');
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  // Verifica se é aniversário do aluno
  const isBirthday = (student: Student) => {
    if (!student.birthDate) return false;
    const todayDate = new Date();
    const [year, month, day] = student.birthDate.split('-').map(Number);
    return todayDate.getDate() === day && (todayDate.getMonth() + 1) === month;
  };

  const loadData = async () => {
    const [allStudents, allStops, allRoutes, allAttendance] = await Promise.all([
      dbService.getStudents(),
      dbService.getStops(),
      dbService.getRoutes(),
      dbService.getAttendance()
    ]);

    const todayMap: Record<string, AttendanceStatus> = {};
    allAttendance.forEach(r => {
      if (r.date === today) {
        todayMap[r.studentId] = r.status;
      }
    });

    setStudents(allStudents);
    setStops(allStops);
    setRoutes(allRoutes);
    setAttendance(todayMap);
  };

  useEffect(() => { loadData(); }, []);

  const markAttendance = async (studentId: string, status: AttendanceStatus) => {
    const record: AttendanceRecord = {
      id: `${today}_${studentId}`,
      studentId,
      date: today,
      status,
      timestamp: Date.now()
    };

    await dbService.saveAttendance(record);
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const toggleRoute = (id: string) => {
    setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Grouping Logic: Route -> Students
  const getRouteIdForStudent = (student: Student): string | undefined => {
    // 🆕 NOVA ESTRUTURA: Aluno tem routeId direto
    if (student.routeId) return student.routeId;
    
    // ⚠️ FALLBACK: Compatibilidade com estrutura antiga (stopId)
    const stop = stops.find(s => s.id === student.stopId);
    return stop?.routeId;
  };

  const groupedByRoute = routes.sort((a, b) => (a.order || 0) - (b.order || 0)).reduce((acc, route) => {
    // Filtrar por ATIVOS e por TURNO
    let routeStudents = students.filter(s => s.active && getRouteIdForStudent(s) === route.id);
    
    if (filterShift !== 'all') {
      routeStudents = routeStudents.filter(s => s.shift === filterShift);
    }

    // Ordenação
    routeStudents.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'sala') return (a.sala || '').localeCompare(b.sala || '');
      
      const orderA = a.routeOrder ?? a.order ?? 0;
      const orderB = b.routeOrder ?? b.order ?? 0;
      return orderA - orderB;
    });

    acc[route.id] = {
      routeName: route.name,
      students: routeStudents
    };
    return acc;
  }, {} as Record<string, RouteGroup>);


  // Stats
  const total = students.length;
  const present = Object.values(attendance).filter(s => s === AttendanceStatus.PRESENT).length;
  const absent = Object.values(attendance).filter(s => s === AttendanceStatus.ABSENT).length;

  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{t('attendance_title')}</h2>
        <p className="text-gray-400 text-sm">{new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-navy-800 p-3 rounded-xl border border-navy-700 text-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-gray-400 uppercase">{t('attendance_total')}</div>
        </div>
        <div className="bg-navy-800 p-3 rounded-xl border border-green-900/50 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5"></div>
          <div className="text-2xl font-bold text-green-400">{present}</div>
          <div className="text-xs text-green-200/70 uppercase">{t('attendance_present')}</div>
        </div>
        <div className="bg-navy-800 p-3 rounded-xl border border-red-900/50 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5"></div>
          <div className="text-2xl font-bold text-red-400">{absent}</div>
          <div className="text-xs text-red-200/70 uppercase">{t('attendance_absent')}</div>
        </div>
      </div>

      {/* 🆕 Filtros e Ordenação */}
      <div className="space-y-4 mb-6">
        {/* Turnos */}
        <div className="flex bg-navy-800 p-1 rounded-xl border border-navy-700">
          {(['all', 'manha', 'tarde', 'integral'] as const).map((shift) => (
            <button
              key={shift}
              onClick={() => setFilterShift(shift)}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${filterShift === shift ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              {shift === 'all' ? 'TODOS' : shift.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Ordenação */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-500 font-bold uppercase">Ordenar por:</span>
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setSortBy('order')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all ${sortBy === 'order' ? 'bg-primary-500/10 border-primary-500/50 text-primary-400' : 'bg-navy-800 border-navy-700 text-gray-500'}`}
            >
              ROTA
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all ${sortBy === 'name' ? 'bg-primary-500/10 border-primary-500/50 text-primary-400' : 'bg-navy-800 border-navy-700 text-gray-500'}`}
            >
              NOME
            </button>
            <button
              onClick={() => setSortBy('sala')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all ${sortBy === 'sala' ? 'bg-primary-500/10 border-primary-500/50 text-primary-400' : 'bg-navy-800 border-navy-700 text-gray-500'}`}
            >
              SALA
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {Object.entries(groupedByRoute).map(([routeId, groupItem]) => {
          const group = groupItem as RouteGroup;
          if (group.students.length === 0) return null;
          const isExpanded = expandedRoutes[routeId];

          // Calculate Route Stats
          const routeTotal = group.students.length;
          const routePresent = group.students.filter(s => attendance[s.id] === AttendanceStatus.PRESENT).length;
          const routeAbsent = group.students.filter(s => attendance[s.id] === AttendanceStatus.ABSENT).length;

          return (
            <div key={routeId}>
              <div
                onClick={() => toggleRoute(routeId)}
                className="flex items-center justify-between bg-navy-700/50 p-3 rounded-lg cursor-pointer mb-2 border border-navy-600 hover:bg-navy-700 transition-colors"
              >
                <h3 className="text-primary-500 font-bold uppercase tracking-wider flex items-center gap-2 text-sm">
                  <Icon name="map" size={18} />
                  <span>
                    {group.routeName}
                    <span className="ml-2 text-white normal-case">
                      (<span className="text-green-400">{routePresent}</span>/<span className="text-red-400">{routeAbsent}</span>) de {routeTotal}
                    </span>
                  </span>
                </h3>
                <Icon name={isExpanded ? "x" : "plus"} size={16} className="text-primary-500 rotate-45 transition-transform" />
              </div>

              {isExpanded && (
                <div className="space-y-3 pl-1">
                  {group.students.map(student => {
                    const status = attendance[student.id];
                    
                    // 🆕 NOVA ESTRUTURA: Mostrar endereço ou nome do stop (fallback)
                    const locationText = student.address || stops.find(s => s.id === student.stopId)?.name || '';

                    return (
                      <div key={student.id} className="bg-navy-800 p-3 rounded-2xl border border-navy-700 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <InitialsAvatar name={student.name} />
                          <div className="truncate">
                            <h3 
                              onClick={() => student.id && navigate(`/alunos?open=${student.id}`)}
                              className="text-white font-bold text-base truncate cursor-pointer hover:text-primary-400 transition-colors"
                            >
                              {student.name}
                            </h3>
                            {isBirthday(student) && (
                              <p className="text-[10px] text-pink-400 flex items-center gap-1">
                                🎂 Aniversário Hoje
                              </p>
                            )}
                            <p className="text-[10px] text-gray-300 font-medium flex items-center gap-1">
                              {student.school || 'Sem Escola'} {student.sala ? ` • ${student.sala}` : ''}
                            </p>
                            {student.observation && (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded mt-1">
                                <p className="text-[10px] text-yellow-500 flex items-center gap-1">
                                  <Icon name="alert-circle" size={10} /> {student.observation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => markAttendance(student.id, AttendanceStatus.PRESENT)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${status === AttendanceStatus.PRESENT ? 'bg-green-500 border-green-500 text-white scale-110 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'border-gray-600 text-gray-600 hover:border-green-500/50 hover:text-green-500'}`}
                          >
                            <Icon name="check" size={20} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, AttendanceStatus.ABSENT)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${status === AttendanceStatus.ABSENT ? 'bg-red-500 border-red-500 text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-gray-600 text-gray-600 hover:border-red-500/50 hover:text-red-500'}`}
                          >
                            <Icon name="x" size={20} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {students.length === 0 && <div className="text-center p-10 text-gray-500">Nenhum aluno cadastrado na base.</div>}
      </div>
    </div>
  );
};