import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, AttendanceRecord, Route, Stop, Incident } from '../types';
import { Icon } from '../components/Icon';
import { InitialsAvatar } from '../components/Avatar';
import { useI18n } from '../i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface StudentStats {
    student: Student;
    presentCount: number;
    absentCount: number;
    presentDates: number[];
    absentDates: number[];
    incidentCount: number;
}

interface RouteReportGroup {
    routeName: string;
    students: StudentStats[];
}

export const ReportsScreen: React.FC = () => {
    const { t, language } = useI18n();
    const [reportType, setReportType] = useState<'monthly' | 'daily'>('monthly');
    const [groupBy, setGroupBy] = useState<'route' | 'school'>('route');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [reportData, setReportData] = useState<Record<string, RouteReportGroup>>({});
    const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

    // Details Modal
    const [selectedStudentStats, setSelectedStudentStats] = useState<StudentStats | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [month, date, reportType, groupBy]);

    const loadData = async () => {
        const [students, routes, stops, attendance, allIncidents] = await Promise.all([
            dbService.getStudents(),
            dbService.getRoutes(),
            dbService.getStops(),
            dbService.getAttendance(),
            dbService.getIncidents()
        ]);

        setIncidents(allIncidents);

        const grouped: Record<string, RouteReportGroup> = {};

        // Group Logic
        // 1. Initialize groups
        if (groupBy === 'route') {
            routes.forEach(r => {
                grouped[r.id] = { routeName: r.name, students: [] };
            });
            grouped['sem_rota'] = { routeName: 'Sem Rota Definida', students: [] };
        }

        students.forEach(student => {
            let groupId = '';
            let groupName = '';

            if (groupBy === 'route') {
                groupId = student.routeId || 'sem_rota';
                groupName = routes.find(r => r.id === groupId)?.name || 'Sem Rota Definida';
            } else {
                const school = student.school || 'Sem Escola';
                const shift = student.shift || 'Sem Turno';
                const sala = student.sala || 'Sem Sala';
                groupId = `${school}_${shift}_${sala}`;
                groupName = `${school} - ${shift.toUpperCase()} - Sala: ${sala}`;
            }

            if (!grouped[groupId]) {
                grouped[groupId] = { routeName: groupName, students: [] };
            }

            let presentRecs: AttendanceRecord[] = [];
            let absentRecs: AttendanceRecord[] = [];
            let studentIncidents: Incident[] = [];

            if (reportType === 'monthly') {
                const studentRecords = attendance.filter(a =>
                    a.studentId === student.id && a.date.startsWith(month)
                );
                presentRecs = studentRecords.filter(a => a.status === 'PRESENT');
                absentRecs = studentRecords.filter(a => a.status === 'ABSENT');
                studentIncidents = allIncidents.filter(i =>
                    i.studentId === student.id && i.date.startsWith(month)
                );
            } else {
                const studentRecords = attendance.filter(a =>
                    a.studentId === student.id && a.date === date
                );
                presentRecs = studentRecords.filter(a => a.status === 'PRESENT');
                absentRecs = studentRecords.filter(a => a.status === 'ABSENT');
                studentIncidents = allIncidents.filter(i =>
                    i.studentId === student.id && i.date === date
                );
            }

            grouped[groupId].students.push({
                student,
                presentCount: presentRecs.length,
                absentCount: absentRecs.length,
                presentDates: presentRecs.map(r => parseInt(r.date.split('-')[2])),
                absentDates: absentRecs.map(r => parseInt(r.date.split('-')[2])),
                incidentCount: studentIncidents.length
            });
        });

        // Ordenar alunos alfabeticamente dentro de cada rota
        Object.values(grouped).forEach(group => {
            group.students.sort((a, b) => a.student.name.localeCompare(b.student.name));
        });

        setReportData(grouped);
        const initialExpanded: Record<string, boolean> = {};
        Object.keys(grouped).forEach(k => initialExpanded[k] = false);
        setExpandedRoutes(initialExpanded);
    };

    const toggleRoute = (id: string) => {
        setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openDetails = (stats: StudentStats) => {
        setSelectedStudentStats(stats);
        setIsModalOpen(true);
    };

    const exportPDF = async () => {
        try {
            const doc = new jsPDF();
            const title = reportType === 'monthly'
                ? `Relatório Mensal: ${month}`
                : `Relatório Diário: ${date.split('-').reverse().join('/')}`;

            doc.text(title, 14, 20);

            const bodyData: any[] = [];
            Object.values(reportData).forEach((groupItem) => {
                const group = groupItem as RouteReportGroup;
                if (group.students.length === 0) return;
                bodyData.push([{ content: group.routeName.toUpperCase(), colSpan: reportType === 'monthly' ? 5 : 4, styles: { fillColor: [26, 28, 53], textColor: [255, 255, 255], fontStyle: 'bold' } }]);

                group.students.forEach(stat => {
                    if (reportType === 'monthly') {
                        const pDates = stat.presentDates.sort((a, b) => a - b).join(', ');
                        const aDates = stat.absentDates.sort((a, b) => a - b).join(', ');
                        bodyData.push([
                            stat.student.name,
                            `${stat.presentCount} (${pDates})`,
                            `${stat.absentCount} (${aDates})`,
                            stat.incidentCount,
                            `${((stat.presentCount / ((stat.presentCount + stat.absentCount) || 1)) * 100).toFixed(0)}%`
                        ]);
                    } else {
                        const status = stat.presentCount > 0 ? 'PRESENTE' : (stat.absentCount > 0 ? 'FALTA' : '-');
                        bodyData.push([
                            stat.student.name,
                            status,
                            stat.incidentCount > 0 ? 'SIM' : '-',
                            ''
                        ]);
                    }
                });
            });

            if (reportType === 'monthly') {
                autoTable(doc, {
                    head: [['Aluno', 'Presenças (Dias)', 'Faltas (Dias)', 'Ocorr.', 'Freq.']],
                    body: bodyData,
                    startY: 30,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [59, 130, 246] }
                });
            } else {
                autoTable(doc, {
                    head: [['Aluno', 'Status', 'Ocorrência', 'Obs']],
                    body: bodyData,
                    startY: 30,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [59, 130, 246] }
                });
            }

            const fileName = `relatorio_${reportType === 'monthly' ? month : date}.pdf`;
            if (Capacitor.isNativePlatform()) {
                const base64 = doc.output('datauristring').split(',')[1];
                const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
                await Share.share({ title: fileName, url: result.uri });
            } else {
                doc.save(fileName);
            }
        } catch (e: any) {
            alert(`Erro ao gerar PDF: ${e.message}`);
        }
    };

    const renderCalendar = (stats: StudentStats) => {
        const [y, m] = month.split('-').map(Number);
        const firstDayOfMonth = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        const padding = (firstDayOfMonth >= 1 && firstDayOfMonth <= 5) ? firstDayOfMonth - 1 : 0;
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
            <div className="grid grid-cols-5 gap-2 mt-4">
                {['S', 'T', 'Q', 'Q', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-gray-500 text-xs font-bold">{d}</div>
                ))}
                {Array.from({ length: padding }).map((_, i) => (
                    <div key={`pad-${i}`} className="h-8 w-8" />
                ))}
                {days.map(day => {
                    const date = new Date(y, m - 1, day);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
                    let bgClass = "bg-navy-700 text-gray-400";
                    if (stats.presentDates.includes(day)) bgClass = "bg-green-500 text-white";
                    if (stats.absentDates.includes(day)) bgClass = "bg-red-500 text-white";
                    return (
                        <div key={day} className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${bgClass}`}>
                            {day}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-4 pb-20">
            <h2 className="text-2xl font-bold text-white mb-4">Relatórios</h2>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex bg-navy-800 p-1 rounded-xl border border-navy-700">
                    <button onClick={() => setReportType('monthly')} className={`flex-1 p-2 rounded-lg text-sm font-bold transition ${reportType === 'monthly' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Mensal</button>
                    <button onClick={() => setReportType('daily')} className={`flex-1 p-2 rounded-lg text-sm font-bold transition ${reportType === 'daily' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Diário</button>
                </div>
                {reportType === 'monthly' ? (
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-navy-800 text-white p-3 rounded-xl border border-navy-700 w-full" />
                ) : (
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-navy-800 text-white p-3 rounded-xl border border-navy-700 w-full" />
                )}
                <div className="flex bg-navy-800 p-1 rounded-xl border border-navy-700">
                    <button onClick={() => setGroupBy('route')} className={`flex-1 p-2 rounded-lg text-xs font-bold transition ${groupBy === 'route' ? 'bg-navy-700 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>ROTA</button>
                    <button onClick={() => setGroupBy('school')} className={`flex-1 p-2 rounded-lg text-xs font-bold transition ${groupBy === 'school' ? 'bg-navy-700 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>ESCOLA / TURMA</button>
                </div>
            </div>

            <div className="space-y-4 mb-20">
                {Object.entries(reportData).map(([routeId, group]) => (
                    <div key={routeId} className="border border-navy-700 rounded-xl overflow-hidden">
                        <div onClick={() => toggleRoute(routeId)} className="bg-navy-800 p-4 flex justify-between items-center cursor-pointer">
                            <h3 className="text-white font-bold">{group.routeName}</h3>
                            <Icon name={expandedRoutes[routeId] ? "chevron-up" : "chevron-down"} className="text-gray-400" />
                        </div>
                        {expandedRoutes[routeId] && (
                            <div className="bg-navy-900/50 p-2 space-y-2">
                                {group.students.map(stats => (
                                    <div key={stats.student.id} className="flex items-center justify-between p-3 bg-navy-800 rounded-lg border border-navy-700">
                                        <div className="flex-1">
                                            <div className="text-white font-medium">{stats.student.name}</div>
                                            <div className="text-xs text-gray-400 flex gap-3 mt-1">
                                                <span className="text-green-400">P: {stats.presentCount}</span>
                                                <span className="text-red-400">F: {stats.absentCount}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => openDetails(stats)} className="p-2 text-primary-400 hover:text-white transition"><Icon name="eye" size={20} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button onClick={exportPDF} className="fixed bottom-24 right-4 bg-primary-600 text-white p-4 rounded-full shadow-xl z-30"><Icon name="save" size={24} /></button>

            {isModalOpen && selectedStudentStats && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-600 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400"><Icon name="x" /></button>
                        <h3 className="text-xl font-bold text-white text-center mb-4">{selectedStudentStats.student.name}</h3>
                        <div className="bg-navy-900 p-4 rounded-xl">{renderCalendar(selectedStudentStats)}</div>
                    </div>
                </div>
            )}
        </div>
    );
};