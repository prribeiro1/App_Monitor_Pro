import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, Stop, Route, AttendanceRecord, AttendanceStatus } from '../types';
import { Icon } from '../components/Icon';

interface RouteGroup {
  routeName: string;
  students: Student[];
}

// Helper: Initials Avatar
const InitialsAvatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
  const colorIndex = name.length % colors.length;
  return (
    <div className={`w-10 h-10 min-w-[2.5rem] rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-sm border border-navy-600`}>
      {initials}
    </div>
  );
};

export const AttendanceScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

  const today = new Date().toISOString().split('T')[0];

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
    const stop = stops.find(s => s.id === student.stopId);
    return stop?.routeId;
  };

  const groupedByRoute = routes.sort((a, b) => (a.order || 0) - (b.order || 0)).reduce((acc, route) => {
    const routeStudents = students.filter(s => getRouteIdForStudent(s) === route.id);
    const stopOrder = stops.reduce((map, s) => ({ ...map, [s.id]: s.order }), {} as Record<string, number>);

    // Sort by Stop Order then by Student Order (or Name if no order)
    routeStudents.sort((a, b) => {
      const stopDiff = (stopOrder[a.stopId] || 0) - (stopOrder[b.stopId] || 0);
      if (stopDiff !== 0) return stopDiff;
      return (a.order || 0) - (b.order || 0);
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
        <h2 className="text-2xl font-bold text-white">Chamada Diária</h2>
        <p className="text-gray-400 text-sm">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-navy-800 p-3 rounded-xl border border-navy-700 text-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-gray-400 uppercase">Total</div>
        </div>
        <div className="bg-navy-800 p-3 rounded-xl border border-green-900/50 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5"></div>
          <div className="text-2xl font-bold text-green-400">{present}</div>
          <div className="text-xs text-green-200/70 uppercase">Presentes</div>
        </div>
        <div className="bg-navy-800 p-3 rounded-xl border border-red-900/50 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5"></div>
          <div className="text-2xl font-bold text-red-400">{absent}</div>
          <div className="text-xs text-red-200/70 uppercase">Faltas</div>
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
                    const stopName = stops.find(s => s.id === student.stopId)?.name || '...';

                    return (
                      <div key={student.id} className="bg-navy-800 p-3 rounded-2xl border border-navy-700 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <InitialsAvatar name={student.name} />
                          <div className="truncate">
                            <h3 className="text-white font-bold text-base truncate">{student.name}</h3>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Icon name="map-pin" size={8} /> {stopName}
                            </p>
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