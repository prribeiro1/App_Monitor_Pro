import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Route, Student, UserSettings } from '../types';
import { Icon } from '../components/Icon';
import { InitialsAvatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface RoutesScreenProps {
  settings: UserSettings | null;
  canUseGps?: boolean;
}

export const RoutesScreen: React.FC<RoutesScreenProps> = ({ settings, canUseGps = true }) => {
  const { t } = useI18n();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState('');

  const exportItineraryPDF = async (route: Route, routeStudents: Student[]) => {
    try {
      const doc = new jsPDF();
      const driverName = settings?.driverNickname || settings?.driverName || 'Condutor';
      
      // Header
      doc.setFillColor(26, 28, 53);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('ITINERÁRIO DA ROTA', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text(route.name.toUpperCase(), 105, 30, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Responsável: ${driverName}`, 14, 50);
      doc.text(`Data do Relatório: ${new Date().toLocaleDateString()}`, 14, 55);
      doc.text(`Total de Alunos: ${routeStudents.length}`, 14, 60);

      const tableData = routeStudents.map(s => [
        s.routeId === route.id ? (s.routeOrder || '-') : (s.routeOrder2 || '-'),
        s.name,
        s.school || '-',
        s.address || '-',
        s.estimatedPickupTime || '-'
      ]);

      autoTable(doc, {
        head: [['Ordem', 'Aluno', 'Escola', 'Endereço', 'Horário']],
        body: tableData,
        startY: 70,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: { 3: { cellWidth: 70 } }
      });

      const fileName = `itinerario_${route.name.replace(/\s+/g, '_')}.pdf`;
      if (Capacitor.isNativePlatform()) {
          const base64 = doc.output('datauristring').split(',')[1];
          const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
          await Share.share({ title: 'Itinerário de Rota', url: result.uri });
      } else {
          doc.save(fileName);
      }
    } catch (e: any) {
      alert('Erro ao gerar itinerário: ' + e.message);
    }
  };

  const fetchData = async () => {
    const [r, st] = await Promise.all([dbService.getRoutes(), dbService.getStudents()]);
    st.sort((a, b) => (a.routeOrder || a.order || 0) - (b.routeOrder || b.order || 0));
    setRoutes(r);
    setStudents(st);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleRoute = (id: string) => setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    setDraggedStudentId(studentId);
    e.dataTransfer.setData('studentId', studentId);
  };

  const handleDragOver = (e: React.DragEvent, studentId: string) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStudentId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('studentId');
    if (draggedId === targetStudentId) return;

    const studentToMove = students.find(s => s.id === draggedId);
    const targetStudent = students.find(s => s.id === targetStudentId);
    if (!studentToMove || !targetStudent || studentToMove.routeId !== targetStudent.routeId) return;

    const routeId = studentToMove.routeId;
    const routeStudents = students
      .filter(s => s.routeId === routeId)
      .sort((a, b) => (a.routeOrder || a.order || 0) - (b.routeOrder || b.order || 0));

    const oldIndex = routeStudents.findIndex(s => s.id === draggedId);
    const newIndex = routeStudents.findIndex(s => s.id === targetStudentId);

    const newOrder = [...routeStudents];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, studentToMove);

    // Salvar nova ordem
    const updates = newOrder.map((s, idx) => {
      s.routeOrder = idx + 1;
      return dbService.saveStudent(s);
    });

    await Promise.all(updates);
    setDraggedStudentId(null);
    fetchData();
  };

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
        <div className="flex gap-2">
          <button
            onClick={() => window.location.hash = '/routes/history'}
            className="bg-navy-700 hover:bg-navy-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
            title="Ver histórico de rotas"
          >
            <Icon name="clock" size={18} />
          </button>
          <button onClick={() => { setRouteName(''); setEditingRouteId(null); setIsRouteModalOpen(true); }} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
            <Icon name="plus" size={18} /> {t('routes_new')}
          </button>
        </div>
      </div>

      <div className="mb-4 bg-navy-800 p-4 rounded-xl border border-navy-700 text-xs text-gray-400">
        <Icon name="info" size={14} className="inline mr-1 text-primary-500" />
        Dica: Clique no ícone de papel <Icon name="file-text" size={12} className="inline"/> ao lado da rota para gerar um itinerário impresso para motoristas reservas.
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Icon name="map" size={48} className="mx-auto mb-4 opacity-50" />
          <p>{t('routes_no_routes')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map(route => {
            const routeStudents = students.filter(s => s.active && (s.routeId === route.id || s.routeId2 === route.id));
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
                    <button 
                      onClick={(e) => { e.stopPropagation(); exportItineraryPDF(route, routeStudents); }} 
                      className="p-2 text-primary-400 hover:text-white transition"
                      title="Baixar Itinerário PDF"
                    >
                      <Icon name="file-text" size={18} />
                    </button>
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
                      <div className="p-3 grid gap-2">
                        {routeStudents.map((student, idx) => (
                          <div
                            key={student.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, student.id)}
                            onDragOver={(e) => handleDragOver(e, student.id)}
                            onDrop={(e) => handleDrop(e, student.id)}
                            onClick={() => window.location.hash = `/students?open=${student.id}`}
                            className={`bg-navy-800 p-3 rounded-lg border flex items-center justify-between group cursor-move hover:bg-navy-700/50 transition-colors ${draggedStudentId === student.id ? 'opacity-30' : 'border-navy-700'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-1 mr-1">
                                <Icon name="menu" size={16} className="text-gray-600" />
                              </div>
                              <InitialsAvatar name={student.name} />
                              <div>
                                <span className="text-white font-medium flex items-center gap-1">
                                  {student.observation && (
                                    <span className="text-orange-400" title="Possui observação">⚠️</span>
                                  )}
                                  {(() => {
                                      const order = student.routeId === route.id ? student.routeOrder : student.routeOrder2;
                                      return order != null && order > 0 && (
                                        <span className="text-primary-400 text-xs font-bold mr-1">#{order}</span>
                                      );
                                  })()}
                                  {student.name}
                                </span>
                                <div className="text-xs text-gray-400 space-y-0.5">
                                  {student.school && <div>{student.school}</div>}
                                  {student.address && <div>📍 {student.address}</div>}
                                  {student.estimatedPickupTime && <div>🕐 {student.estimatedPickupTime}</div>}
                                </div>
                              </div>
                            </div>
                            <Icon name="chevron-right" size={20} className="text-gray-500" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botões de Ação da Rota */}
                    <div className="p-3 border-t border-navy-700 flex gap-2">
                      <button
                        onClick={() => window.location.hash = `/routes/start/${route.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        disabled={routeStudents.length === 0}
                      >
                        <Icon name="navigation" size={20} /> Iniciar Rota
                      </button>
                      <button
                        onClick={() => window.location.hash = `/routes/organize/${route.id}`}
                        className="flex-1 bg-accent-600 hover:bg-accent-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        title="Organizar ordem dos alunos"
                        disabled={routeStudents.length === 0}
                      >
                        <Icon name="list" size={20} /> Organizar
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
