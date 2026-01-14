import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Stop, Student, Route } from '../types';
import { Icon } from '../components/Icon';

interface StopGroup {
  stop: Stop;
  students: Student[];
}

interface RouteGroup {
  route: Route;
  stops: StopGroup[];
}

const InitialsAvatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
  const colorIndex = name.length % colors.length;
  const bgClass = colors[colorIndex];

  return (
    <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center text-white font-bold text-sm border-2 border-navy-800`}>
      {initials}
    </div>
  );
};

export const StudentsScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});

  // Form State
  const [namesInput, setNamesInput] = useState('');
  const [stopId, setStopId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [contact, setContact] = useState('');
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [monthlyFees, setMonthlyFees] = useState('');
  const [dueDay, setDueDay] = useState('');

  const fetchData = async () => {
    const [st, sp, rt] = await Promise.all([
      dbService.getStudents(),
      dbService.getStops(),
      dbService.getRoutes()
    ]);

    // Sort everything
    st.sort((a, b) => (a.order || 0) - (b.order || 0));
    sp.sort((a, b) => a.order - b.order);

    setStudents(st);
    setStops(sp);
    setRoutes(rt);

    const firstRouteId = rt.length > 0 ? rt[0].id : '';
    const firstRouteStops = sp.filter(s => s.routeId === firstRouteId);
    if (firstRouteStops.length > 0 && !stopId) setStopId(firstRouteStops[0].id);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleRoute = (id: string) => {
    setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStop = (id: string) => {
    setExpandedStops(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const moveStudent = async (student: Student, direction: 'up' | 'down') => {
    // Find students in the same stop
    const siblings = students.filter(s => s.stopId === student.stopId);
    const index = siblings.findIndex(s => s.id === student.id);

    if (direction === 'up' && index > 0) {
      const prev = siblings[index - 1];
      // Swap orders
      const tempOrder = student.order || 0;
      student.order = prev.order || 0;
      prev.order = tempOrder;

      await Promise.all([dbService.saveStudent(student), dbService.saveStudent(prev)]);
      fetchData();
    } else if (direction === 'down' && index < siblings.length - 1) {
      const next = siblings[index + 1];
      // Swap orders
      const tempOrder = student.order || 0;
      student.order = next.order || 0;
      next.order = tempOrder;

      await Promise.all([dbService.saveStudent(student), dbService.saveStudent(next)]);
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Edit Single
      const existing = students.find(s => s.id === editingId);
      const student: Student = {
        id: editingId,
        stopId,
        name: namesInput,
        active: true,
        guardianName,
        contact,
        responsibleCpf,
        responsiblePhone,
        monthlyFees: monthlyFees ? parseFloat(monthlyFees.replace(',', '.')) : 0,
        dueDay: dueDay ? parseInt(dueDay) : 0,
        order: existing?.order || Date.now()
      };
      await dbService.saveStudent(student);
    } else {
      // Bulk Add
      const names = namesInput.split(/[\n,]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

      for (const name of names) {
        const newStudent: Student = {
          id: crypto.randomUUID(),
          stopId,
          name,
          active: true,
          guardianName: '',
          contact: '',
          responsibleCpf: '',
          responsiblePhone: '',
          monthlyFees: monthlyFees ? parseFloat(monthlyFees.replace(',', '.')) : 0,
          dueDay: dueDay ? parseInt(dueDay) : 0,
          order: Date.now() // Simple chronological order
        };
        await dbService.saveStudent(newStudent);
        // Small delay to ensure unique timestamps if loop is too fast
        await new Promise(r => setTimeout(r, 10));
      }
    }

    setIsModalOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setNamesInput('');
    setGuardianName('');
    setContact('');
    setResponsibleCpf('');
    setResponsiblePhone('');
    setMonthlyFees('');
    setDueDay('');
    setEditingId(null);

    if (routes.length > 0) {
      const firstRouteId = routes[0].id;
      setSelectedRouteId(firstRouteId);
      const firstRouteStops = stops.filter(s => s.routeId === firstRouteId);
      setStopId(firstRouteStops.length > 0 ? firstRouteStops[0].id : '');
    }
  };

  const populateForm = (student: Student) => {
    setNamesInput(student.name);
    setGuardianName(student.guardianName || '');
    setContact(student.contact || '');
    setResponsibleCpf(student.responsibleCpf || '');
    setResponsiblePhone(student.responsiblePhone || '');
    setMonthlyFees(student.monthlyFees ? student.monthlyFees.toString() : '');
    setDueDay(student.dueDay ? student.dueDay.toString() : '');
    setEditingId(student.id);

    const stop = stops.find(s => s.id === student.stopId);
    if (stop) {
      setSelectedRouteId(stop.routeId);
      setStopId(student.stopId);
    }

    setIsModalOpen(true);
  };

  const handleRouteChange = (newRouteId: string) => {
    setSelectedRouteId(newRouteId);
    const routeStops = stops.filter(s => s.routeId === newRouteId);
    setStopId(routeStops.length > 0 ? routeStops[0].id : '');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover aluno?')) {
      await dbService.deleteStudent(id);
      fetchData();
    }
  };

  // Grouping: Route -> Stop -> Student
  const groupedData: RouteGroup[] = routes.map(route => {
    const routeStops = stops.filter(s => s.routeId === route.id);
    const stopGroups: StopGroup[] = routeStops.map(stop => ({
      stop,
      students: students.filter(s => s.stopId === stop.id)
    }));
    return { route, stops: stopGroups };
  });

  // Filter stops for the form
  const filteredStops = stops.filter(s => s.routeId === selectedRouteId);

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Alunos</h2>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-full shadow-lg"
        >
          <Icon name="plus" />
        </button>
      </div>

      <div className="space-y-6">
        {groupedData.map(({ route, stops: routeStops }) => {
          if (routeStops.every(g => g.students.length === 0)) return null; // Hide empty routes
          const isRouteExpanded = expandedRoutes[route.id];

          return (
            <div key={route.id} className="border border-navy-700 rounded-xl overflow-hidden bg-navy-800/30">
              {/* Route Header */}
              <div
                onClick={() => toggleRoute(route.id)}
                className="flex items-center justify-between bg-navy-700 p-3 cursor-pointer hover:bg-navy-600 transition-colors"
              >
                <h3 className="text-primary-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Icon name="map" size={18} />
                  {route.name}
                </h3>
                <Icon name={isRouteExpanded ? "x" : "plus"} size={16} className="text-primary-400 rotate-45 transition-transform" />
              </div>

              {isRouteExpanded && (
                <div className="p-3 space-y-4">
                  {routeStops.map(({ stop, students: stopStudents }) => {
                    if (stopStudents.length === 0) return null;
                    const isStopExpanded = expandedStops[stop.id];

                    return (
                      <div key={stop.id}>
                        {/* Stop Header */}
                        <div
                          onClick={() => toggleStop(stop.id)}
                          className="flex items-center justify-between mb-2 cursor-pointer hover:opacity-80 transition-opacity pl-2 border-l-2 border-accent-500/30"
                        >
                          <h4 className="text-accent-400 font-bold flex items-center gap-2 text-sm">
                            <Icon name="map-pin" size={14} />
                            {stop.name} ({stopStudents.length})
                          </h4>
                          <Icon name={isStopExpanded ? "x" : "plus"} size={12} className="text-accent-400 rotate-45 transition-transform" />
                        </div>

                        {isStopExpanded && (
                          <div className="grid gap-2 pl-4">
                            {stopStudents.map((student, index) => (
                              <div key={student.id} className="bg-navy-800 p-3 rounded-lg border border-navy-700 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col gap-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); moveStudent(student, 'up'); }} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30">
                                      <Icon name="chevron-up" size={16} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); moveStudent(student, 'down'); }} disabled={index === stopStudents.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30">
                                      <Icon name="chevron-down" size={16} />
                                    </button>
                                  </div>
                                  <InitialsAvatar name={student.name} />
                                  <div>
                                    <span className="text-white font-medium block">{student.name}</span>
                                    {(student.guardianName || student.contact) && (
                                      <span className="text-[10px] text-gray-400 block">
                                        {student.guardianName} {student.contact && `• ${student.contact}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1 items-center">
                                  {(student.contact || student.responsiblePhone) && (
                                    <>
                                      <a href={`tel:${student.responsiblePhone || student.contact}`} className="p-2 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500/40" title="Ligar">
                                        <Icon name="phone" size={16} />
                                      </a>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const phoneNumber = student.responsiblePhone || student.contact || '';
                                          const cleanNumber = phoneNumber.replace(/\D/g, '');
                                          if (cleanNumber) {
                                            window.open(`https://wa.me/55${cleanNumber}`, '_blank');
                                          } else {
                                            alert('Número inválido para WhatsApp');
                                          }
                                        }}
                                        className="p-2 bg-green-600/20 text-green-400 rounded-full mr-2 hover:bg-green-600/40"
                                        title="WhatsApp"
                                      >
                                        <Icon name="message-circle" size={16} />
                                      </button>
                                    </>
                                  )}
                                  <button onClick={() => populateForm(student)} className="p-2 text-gray-400 hover:text-white">
                                    <Icon name="edit" size={18} />
                                  </button>
                                  <button onClick={() => handleDelete(student.id)} className="p-2 text-red-400 hover:text-red-300">
                                    <Icon name="trash" size={18} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {students.length === 0 && <p className="text-center text-gray-500 mt-10">Nenhum aluno cadastrado.</p>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-md border border-navy-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar Aluno' : 'Novos Alunos'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {editingId ? 'Nome Completo *' : 'Nomes (Cole uma lista ou digite um por linha)'}
                </label>
                {editingId ? (
                  <input type="text" value={namesInput} onChange={e => setNamesInput(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" required />
                ) : (
                  <textarea
                    value={namesInput}
                    onChange={e => setNamesInput(e.target.value)}
                    placeholder="João Silva&#10;Maria Souza&#10;Pedro Santos"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg h-32"
                    required
                  />
                )}
              </div>

              {editingId && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome do Responsável</label>
                    <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Ex: Maria Souza" className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">CPF do Responsável</label>
                      <input type="text" value={responsibleCpf} onChange={e => setResponsibleCpf(e.target.value)} placeholder="000.000.000-00" className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">WhatsApp/Tel</label>
                      <input type="text" value={responsiblePhone} onChange={e => setResponsiblePhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyFees}
                    onChange={e => setMonthlyFees(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Dia Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Rota *</label>
                <select value={selectedRouteId} onChange={e => handleRouteChange(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mb-3">
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>

                <label className="block text-sm text-gray-400 mb-1">Ponto de Embarque *</label>
                <select value={stopId} onChange={e => setStopId(e.target.value)} className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" disabled={filteredStops.length === 0}>
                  {filteredStops.length === 0 && <option value="">Nenhum ponto nesta rota</option>}
                  {filteredStops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
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