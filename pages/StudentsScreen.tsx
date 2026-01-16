import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const shiftLabels: Record<string, string> = {
  integral: 'Integral',
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite'
};

export const StudentsScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});
  
  // Modal de detalhes do aluno
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form State
  const [studentName, setStudentName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [school, setSchool] = useState('');
  const [shift, setShift] = useState<'integral' | 'manha' | 'tarde' | 'noite'>('manha');
  const [stopId, setStopId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [observation, setObservation] = useState('');
  const [monthlyFees, setMonthlyFees] = useState('');
  const [dueDay, setDueDay] = useState('');

  const fetchData = async () => {
    const [st, sp, rt] = await Promise.all([
      dbService.getStudents(),
      dbService.getStops(),
      dbService.getRoutes()
    ]);

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

  // Abrir aluno via URL (busca global)
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && students.length > 0) {
      const student = students.find(s => s.id === openId);
      if (student) {
        setSelectedStudent(student);
        // Limpar o parâmetro da URL
        setSearchParams({});
      }
    }
  }, [searchParams, students]);

  const toggleRoute = (id: string) => {
    setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStop = (id: string) => {
    setExpandedStops(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const moveStudent = async (student: Student, direction: 'up' | 'down') => {
    const siblings = students.filter(s => s.stopId === student.stopId);
    const index = siblings.findIndex(s => s.id === student.id);

    if (direction === 'up' && index > 0) {
      const prev = siblings[index - 1];
      const tempOrder = student.order || 0;
      student.order = prev.order || 0;
      prev.order = tempOrder;
      await Promise.all([dbService.saveStudent(student), dbService.saveStudent(prev)]);
      fetchData();
    } else if (direction === 'down' && index < siblings.length - 1) {
      const next = siblings[index + 1];
      const tempOrder = student.order || 0;
      student.order = next.order || 0;
      next.order = tempOrder;
      await Promise.all([dbService.saveStudent(student), dbService.saveStudent(next)]);
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const existing = editingId ? students.find(s => s.id === editingId) : null;
    
    const student: Student = {
      id: editingId || crypto.randomUUID(),
      stopId,
      name: studentName,
      active: true,
      birthDate: birthDate || undefined,
      school: school || undefined,
      shift: shift || undefined,
      guardianName: guardianName || undefined,
      responsibleCpf: responsibleCpf || undefined,
      responsiblePhone: responsiblePhone || undefined,
      observation: observation || undefined,
      monthlyFees: monthlyFees ? parseFloat(monthlyFees.replace(',', '.')) : 0,
      dueDay: dueDay ? parseInt(dueDay) : 0,
      order: existing?.order || Date.now()
    };
    
    await dbService.saveStudent(student);
    setIsModalOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setStudentName('');
    setBirthDate('');
    setSchool('');
    setShift('manha');
    setGuardianName('');
    setResponsibleCpf('');
    setResponsiblePhone('');
    setObservation('');
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
    setStudentName(student.name);
    setBirthDate(student.birthDate || '');
    setSchool(student.school || '');
    setShift(student.shift || 'manha');
    setGuardianName(student.guardianName || '');
    setResponsibleCpf(student.responsibleCpf || '');
    setResponsiblePhone(student.responsiblePhone || '');
    setObservation(student.observation || '');
    setMonthlyFees(student.monthlyFees ? student.monthlyFees.toString() : '');
    setDueDay(student.dueDay ? student.dueDay.toString() : '');
    setEditingId(student.id);

    const stop = stops.find(s => s.id === student.stopId);
    if (stop) {
      setSelectedRouteId(stop.routeId);
      setStopId(student.stopId);
    }

    setSelectedStudent(null);
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
      setSelectedStudent(null);
      fetchData();
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber) {
      window.open(`https://wa.me/55${cleanNumber}`, '_blank');
    } else {
      alert('Número inválido para WhatsApp');
    }
  };

  const getStopName = (stopId: string) => {
    const stop = stops.find(s => s.id === stopId);
    return stop?.name || '';
  };

  const getRouteName = (stopId: string) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop) return '';
    const route = routes.find(r => r.id === stop.routeId);
    return route?.name || '';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const groupedData: RouteGroup[] = routes.map(route => {
    const routeStops = stops.filter(s => s.routeId === route.id);
    const stopGroups: StopGroup[] = routeStops.map(stop => ({
      stop,
      students: students.filter(s => s.stopId === stop.id)
    }));
    return { route, stops: stopGroups };
  });

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
          if (routeStops.every(g => g.students.length === 0)) return null;
          const isRouteExpanded = expandedRoutes[route.id];

          return (
            <div key={route.id} className="border border-navy-700 rounded-xl overflow-hidden bg-navy-800/30">
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
                              <div 
                                key={student.id} 
                                onClick={() => setSelectedStudent(student)}
                                className="bg-navy-800 p-3 rounded-lg border border-navy-700 flex items-center justify-between group cursor-pointer hover:bg-navy-700/50 transition-colors"
                              >
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
                                    <span className="text-white font-medium flex items-center gap-1">
                                      {student.observation && (
                                        <span className="text-orange-400" title="Possui observação">⚠️</span>
                                      )}
                                      {student.name}
                                    </span>
                                    {student.school && (
                                      <span className="text-xs text-gray-400 block">{student.school}</span>
                                    )}
                                  </div>
                                </div>
                                <Icon name="chevron-right" size={20} className="text-gray-500" />
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

      {/* Modal de Detalhes do Aluno */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 z-50" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-navy-900 h-full flex flex-col">
            {/* Header */}
            <div className="bg-navy-800 px-4 py-4 flex items-center justify-between border-b border-navy-700">
              <button onClick={() => setSelectedStudent(null)} className="p-2 text-gray-400 hover:text-white">
                <Icon name="arrow-left" size={24} />
              </button>
              <h3 className="text-lg font-bold text-white">Aluno</h3>
              <button onClick={() => populateForm(selectedStudent)} className="text-primary-400 font-bold">
                Editar
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Nome do Aluno */}
              <div className="bg-navy-800 rounded-xl p-4 mb-4 border border-navy-700">
                <div className="flex items-center gap-3 mb-4">
                  <InitialsAvatar name={selectedStudent.name} />
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {selectedStudent.observation && <span className="text-orange-400">⚠️</span>}
                      {selectedStudent.name}
                    </h2>
                    {selectedStudent.shift && (
                      <span className="text-sm text-gray-400">{shiftLabels[selectedStudent.shift]}</span>
                    )}
                  </div>
                </div>

                {/* Dados do Aluno */}
                <div className="space-y-3">
                  {selectedStudent.birthDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Data Nascimento</span>
                      <span className="text-white">{formatDate(selectedStudent.birthDate)}</span>
                    </div>
                  )}
                  {selectedStudent.school && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Escola</span>
                      <span className="text-white">{selectedStudent.school}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rota</span>
                    <span className="text-white">{getRouteName(selectedStudent.stopId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ponto</span>
                    <span className="text-white">{getStopName(selectedStudent.stopId)}</span>
                  </div>
                  {selectedStudent.monthlyFees && selectedStudent.monthlyFees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mensalidade</span>
                      <span className="text-green-400">R$ {selectedStudent.monthlyFees.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedStudent.dueDay && selectedStudent.dueDay > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vencimento</span>
                      <span className="text-white">Dia {selectedStudent.dueDay}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observação */}
              {selectedStudent.observation && (
                <div className="bg-orange-500/10 rounded-xl p-4 mb-4 border border-orange-500/30">
                  <h4 className="text-orange-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <Icon name="alert-triangle" size={14} />
                    Observação Importante
                  </h4>
                  <p className="text-white">{selectedStudent.observation}</p>
                </div>
              )}

              {/* Responsável */}
              {(selectedStudent.guardianName || selectedStudent.responsiblePhone) && (
                <div className="bg-navy-800 rounded-xl p-4 mb-4 border border-navy-700">
                  <h4 className="text-gray-400 text-xs font-bold uppercase mb-3">Responsável</h4>
                  
                  {selectedStudent.guardianName && (
                    <p className="text-white font-medium mb-1">{selectedStudent.guardianName}</p>
                  )}
                  
                  {selectedStudent.responsibleCpf && (
                    <p className="text-gray-400 text-sm mb-2">CPF: {selectedStudent.responsibleCpf}</p>
                  )}

                  {selectedStudent.responsiblePhone && (
                    <div className="mt-3 space-y-2">
                      <p className="text-gray-400 text-sm">{selectedStudent.responsiblePhone}</p>
                      
                      <div className="flex gap-3 mt-3">
                        <a 
                          href={`tel:${selectedStudent.responsiblePhone}`}
                          className="flex-1 bg-blue-500/20 text-blue-400 py-3 rounded-xl font-bold text-center hover:bg-blue-500/30 transition"
                        >
                          Ligar
                        </a>
                        <button
                          onClick={() => openWhatsApp(selectedStudent.responsiblePhone || '')}
                          className="flex-1 bg-green-500/20 text-green-400 py-3 rounded-xl font-bold hover:bg-green-500/30 transition"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botão Excluir */}
              <button
                onClick={() => handleDelete(selectedStudent.id)}
                className="w-full bg-red-500/10 text-red-400 py-3 rounded-xl font-bold border border-red-500/20 hover:bg-red-500/20 transition mt-4"
              >
                Excluir Aluno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-md border border-navy-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar Aluno' : 'Novo Aluno'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Nome do Aluno */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Aluno *</label>
                <input 
                  type="text" 
                  value={studentName} 
                  onChange={e => setStudentName(e.target.value)} 
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" 
                  placeholder="Nome completo"
                  required 
                />
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data de Nascimento</label>
                <input 
                  type="date" 
                  value={birthDate} 
                  onChange={e => setBirthDate(e.target.value)} 
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                />
              </div>

              {/* Escola e Turno */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Escola</label>
                  <input 
                    type="text" 
                    value={school} 
                    onChange={e => setSchool(e.target.value)} 
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                    placeholder="Nome da escola"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Turno</label>
                  <select 
                    value={shift} 
                    onChange={e => setShift(e.target.value as any)} 
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                  >
                    <option value="integral">Integral</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
              </div>

              {/* Rota e Ponto */}
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

              <hr className="border-navy-700" />

              {/* Responsável */}
              <h4 className="text-gray-400 text-xs font-bold uppercase">Dados do Responsável</h4>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Responsável</label>
                <input 
                  type="text" 
                  value={guardianName} 
                  onChange={e => setGuardianName(e.target.value)} 
                  placeholder="Ex: Maria Souza" 
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CPF</label>
                  <input 
                    type="text" 
                    value={responsibleCpf} 
                    onChange={e => setResponsibleCpf(e.target.value)} 
                    placeholder="000.000.000-00" 
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">WhatsApp/Tel</label>
                  <input 
                    type="text" 
                    value={responsiblePhone} 
                    onChange={e => setResponsiblePhone(e.target.value)} 
                    placeholder="(00) 00000-0000" 
                    className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg" 
                  />
                </div>
              </div>

              <hr className="border-navy-700" />

              {/* Observação */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Observação <span className="text-orange-400">(alergias, condições, etc.)</span>
                </label>
                <textarea 
                  value={observation} 
                  onChange={e => setObservation(e.target.value)} 
                  placeholder="Ex: Alergia a amendoim, usa óculos, precisa de adaptação..."
                  className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg h-20"
                />
              </div>

              <hr className="border-navy-700" />

              {/* Financeiro */}
              <h4 className="text-gray-400 text-xs font-bold uppercase">Financeiro</h4>
              
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
