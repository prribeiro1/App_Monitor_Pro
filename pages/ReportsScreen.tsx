import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, AttendanceRecord, Route, Stop } from '../types';
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
}

// Grupo de escola com sub-grupos de sala
interface SchoolGroup {
    schoolName: string;
    salas: Record<string, { salaName: string; students: StudentStats[] }>;
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
    const [routeReportData, setRouteReportData] = useState<Record<string, RouteReportGroup>>({});
    const [schoolReportData, setSchoolReportData] = useState<Record<string, SchoolGroup>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [expandedSalas, setExpandedSalas] = useState<Record<string, boolean>>({});

    // Details Modal
    const [selectedStudentStats, setSelectedStudentStats] = useState<StudentStats | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [month, date, reportType, groupBy]);

    const getStudentStats = (student: Student, attendance: AttendanceRecord[]): StudentStats => {
        let presentRecs: AttendanceRecord[] = [];
        let absentRecs: AttendanceRecord[] = [];

        if (reportType === 'monthly') {
            const studentRecords = attendance.filter(a =>
                a.studentId === student.id && a.date.startsWith(month)
            );
            presentRecs = studentRecords.filter(a => a.status === 'PRESENT');
            absentRecs = studentRecords.filter(a => a.status === 'ABSENT');
        } else {
            const studentRecords = attendance.filter(a =>
                a.studentId === student.id && a.date === date
            );
            presentRecs = studentRecords.filter(a => a.status === 'PRESENT');
            absentRecs = studentRecords.filter(a => a.status === 'ABSENT');
        }

        return {
            student,
            presentCount: presentRecs.length,
            absentCount: absentRecs.length,
            presentDates: presentRecs.map(r => parseInt(r.date.split('-')[2])),
            absentDates: absentRecs.map(r => parseInt(r.date.split('-')[2])),
        };
    };

    const loadData = async () => {
        const [students, routes, stops, attendance] = await Promise.all([
            dbService.getStudents(),
            dbService.getRoutes(),
            dbService.getStops(),
            dbService.getAttendance(),
        ]);

        if (groupBy === 'route') {
            // --- RELATÓRIO POR ROTA (organizado e ordenado) ---
            const grouped: Record<string, RouteReportGroup> = {};

            // Inicializa grupos por rota (ordenados pelo nome da rota)
            const sortedRoutes = [...routes].sort((a, b) => a.name.localeCompare(b.name));
            sortedRoutes.forEach(r => {
                grouped[r.id] = { routeName: r.name, students: [] };
            });
            grouped['sem_rota'] = { routeName: 'Sem Rota Definida', students: [] };

            students.forEach(student => {
                const groupId = student.routeId || 'sem_rota';
                if (!grouped[groupId]) {
                    const routeName = routes.find(r => r.id === groupId)?.name || 'Sem Rota Definida';
                    grouped[groupId] = { routeName, students: [] };
                }

                grouped[groupId].students.push(getStudentStats(student, attendance));
            });

            // Ordenar alunos alfabeticamente dentro de cada rota
            Object.values(grouped).forEach(group => {
                group.students.sort((a, b) => a.student.name.localeCompare(b.student.name));
            });

            setRouteReportData(grouped);
            setSchoolReportData({});

            // Expandir todos por padrão
            const initialExpanded: Record<string, boolean> = {};
            Object.keys(grouped).forEach(k => initialExpanded[k] = false);
            setExpandedGroups(initialExpanded);
        } else {
            // --- RELATÓRIO POR ESCOLA (hierárquico: Escola -> Sala/Turma) ---
            const schoolGroups: Record<string, SchoolGroup> = {};

            students.forEach(student => {
                const schoolName = student.school || 'Sem Escola';
                const salaName = student.sala || 'Sem Sala';
                const shiftLabel = student.shift ? student.shift.toUpperCase() : 'SEM TURNO';
                const salaKey = `${salaName} - ${shiftLabel}`;

                if (!schoolGroups[schoolName]) {
                    schoolGroups[schoolName] = { schoolName, salas: {} };
                }

                if (!schoolGroups[schoolName].salas[salaKey]) {
                    schoolGroups[schoolName].salas[salaKey] = { salaName: salaKey, students: [] };
                }

                schoolGroups[schoolName].salas[salaKey].students.push(
                    getStudentStats(student, attendance)
                );
            });

            // Ordenar alunos dentro de cada sala e salas dentro de cada escola
            Object.values(schoolGroups).forEach(school => {
                Object.values(school.salas).forEach(sala => {
                    sala.students.sort((a, b) => a.student.name.localeCompare(b.student.name));
                });
            });

            setSchoolReportData(schoolGroups);
            setRouteReportData({});

            // Expandir
            const initialExpanded: Record<string, boolean> = {};
            Object.keys(schoolGroups).forEach(k => initialExpanded[k] = false);
            setExpandedGroups(initialExpanded);
        }
    };

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSala = (id: string) => {
        setExpandedSalas(prev => ({ ...prev, [id]: !prev[id] }));
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

            if (groupBy === 'route') {
                // PDF por Rota
                const sortedEntries = (Object.entries(routeReportData) as [string, RouteReportGroup][])
                    .filter(([_, group]) => group.students.length > 0)
                    .sort(([_, a], [__, b]) => a.routeName.localeCompare(b.routeName));

                sortedEntries.forEach(([_, group]: [string, RouteReportGroup]) => {
                    bodyData.push([{
                        content: group.routeName.toUpperCase(),
                        colSpan: reportType === 'monthly' ? 4 : 3,
                        styles: { fillColor: [26, 28, 53], textColor: [255, 255, 255], fontStyle: 'bold' }
                    }]);

                    group.students.forEach(stat => {
                        if (reportType === 'monthly') {
                            const pDates = stat.presentDates.sort((a, b) => a - b).join(', ');
                            const aDates = stat.absentDates.sort((a, b) => a - b).join(', ');
                            bodyData.push([
                                stat.student.name,
                                `${stat.presentCount} (${pDates})`,
                                `${stat.absentCount} (${aDates})`,
                                `${((stat.presentCount / ((stat.presentCount + stat.absentCount) || 1)) * 100).toFixed(0)}%`
                            ]);
                        } else {
                            const presencaFalta = stat.presentCount > 0 ? 'PRESENÇA' : (stat.absentCount > 0 ? 'FALTA' : '-');
                            bodyData.push([
                                stat.student.name,
                                presencaFalta,
                                ''
                            ]);
                        }
                    });
                });
            } else {
                // PDF por Escola (hierárquico)
                const sortedSchools = (Object.entries(schoolReportData) as [string, SchoolGroup][])
                    .sort(([a], [b]) => a.localeCompare(b));

                sortedSchools.forEach(([schoolName, school]) => {
                    // Cabeçalho da escola
                    bodyData.push([{
                        content: `ESCOLA: ${schoolName.toUpperCase()}`,
                        colSpan: reportType === 'monthly' ? 4 : 3,
                        styles: { fillColor: [26, 28, 53], textColor: [255, 255, 255], fontStyle: 'bold' }
                    }]);

                    // Salas ordenadas (tipadas)
                    const sortedSalas = (Object.entries(school.salas) as [string, { salaName: string; students: StudentStats[] }][])
                        .sort(([a], [b]) => a.localeCompare(b));

                    sortedSalas.forEach(([salaKey, sala]) => {
                        // Sub-cabeçalho da sala
                        bodyData.push([{
                            content: `  Turma: ${sala.salaName}`,
                            colSpan: reportType === 'monthly' ? 4 : 3,
                            styles: { fillColor: [40, 44, 80], textColor: [180, 200, 255], fontStyle: 'italic' }
                        }]);

                        sala.students.forEach(stat => {
                            if (reportType === 'monthly') {
                                const pDates = stat.presentDates.sort((a, b) => a - b).join(', ');
                                const aDates = stat.absentDates.sort((a, b) => a - b).join(', ');
                                bodyData.push([
                                    stat.student.name,
                                    `${stat.presentCount} (${pDates})`,
                                    `${stat.absentCount} (${aDates})`,
                                    `${((stat.presentCount / ((stat.presentCount + stat.absentCount) || 1)) * 100).toFixed(0)}%`
                                ]);
                            } else {
                                const presencaFalta = stat.presentCount > 0 ? 'PRESENÇA' : (stat.absentCount > 0 ? 'FALTA' : '-');
                                bodyData.push([
                                    stat.student.name,
                                    presencaFalta,
                                    ''
                                ]);
                            }
                        });
                    });
                });
            }

            if (reportType === 'monthly') {
                autoTable(doc, {
                    head: [['Aluno', 'Presenças (Dias)', 'Faltas (Dias)', 'Freq.']],
                    body: bodyData,
                    startY: 30,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [59, 130, 246] }
                });
            } else {
                autoTable(doc, {
                    head: [['Aluno', 'Presença/Falta', 'Obs']],
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
                    const dateObj = new Date(y, m - 1, day);
                    const dayOfWeek = dateObj.getDay();
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

    // Renderiza card de aluno (reutilizado em ambos os modos)
    const renderStudentCard = (stats: StudentStats) => (
        <div key={stats.student.id} className="flex items-center justify-between p-3 bg-navy-800 rounded-lg border border-navy-700">
            <div className="flex-1">
                <div className="text-white font-medium">{stats.student.name}</div>
                <div className="text-xs text-gray-400 flex gap-3 mt-1">
                    <span className="text-green-400">P: {stats.presentCount}</span>
                    <span className="text-red-400">F: {stats.absentCount}</span>
                    {reportType === 'daily' && (
                        <span className={`font-bold ${stats.presentCount > 0 ? 'text-green-400' : stats.absentCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            {stats.presentCount > 0 ? 'PRESENÇA' : stats.absentCount > 0 ? 'FALTA' : '-'}
                        </span>
                    )}
                </div>
            </div>
            <button onClick={() => openDetails(stats)} className="p-2 text-primary-400 hover:text-white transition"><Icon name="eye" size={20} /></button>
        </div>
    );

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
                {groupBy === 'route' ? (
                    /* ========== RELATÓRIO POR ROTA ========== */
                    (Object.entries(routeReportData) as [string, RouteReportGroup][])
                        .filter(([_, group]) => group.students.length > 0)
                        .sort(([_, a], [__, b]) => a.routeName.localeCompare(b.routeName))
                        .map(([routeId, group]) => (
                            <div key={routeId} className="border border-navy-700 rounded-xl overflow-hidden">
                                <div onClick={() => toggleGroup(routeId)} className="bg-navy-800 p-4 flex justify-between items-center cursor-pointer">
                                    <div>
                                        <h3 className="text-white font-bold flex items-center gap-2">
                                            <Icon name="map" size={16} className="text-primary-400" />
                                            {group.routeName}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{group.students.length} aluno(s)</p>
                                    </div>
                                    <Icon name={expandedGroups[routeId] ? "chevron-up" : "chevron-down"} className="text-gray-400" />
                                </div>
                                {expandedGroups[routeId] && (
                                    <div className="bg-navy-900/50 p-2 space-y-2">
                                        {group.students.map(stats => renderStudentCard(stats))}
                                    </div>
                                )}
                            </div>
                        ))
                ) : (
                    /* ========== RELATÓRIO POR ESCOLA (Hierárquico) ========== */
                    (Object.entries(schoolReportData) as [string, SchoolGroup][])
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([schoolName, school]) => (
                            <div key={schoolName} className="border border-navy-700 rounded-xl overflow-hidden">
                                {/* Cabeçalho da Escola */}
                                <div
                                    onClick={() => toggleGroup(schoolName)}
                                    className="bg-gradient-to-r from-navy-800 to-navy-800/80 p-4 flex justify-between items-center cursor-pointer border-b border-navy-700"
                                >
                                    <div>
                                        <h3 className="text-white font-bold flex items-center gap-2">
                                            <span className="text-lg">🏫</span>
                                            {schoolName}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {Object.keys(school.salas).length} sala(s) • {Object.values(school.salas).reduce((sum, s) => sum + s.students.length, 0)} aluno(s)
                                        </p>
                                    </div>
                                    <Icon name={expandedGroups[schoolName] ? "chevron-up" : "chevron-down"} className="text-gray-400" />
                                </div>

                                {expandedGroups[schoolName] && (
                                    <div className="bg-navy-900/30">
                                        {/* Salas dentro da escola */}
                                        {(Object.entries(school.salas) as [string, { salaName: string; students: StudentStats[] }][])
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .map(([salaKey, sala]) => {
                                                const salaId = `${schoolName}_${salaKey}`;
                                                return (
                                                    <div key={salaKey} className="border-t border-navy-700/50">
                                                        {/* Cabeçalho da Sala */}
                                                        <div
                                                            onClick={() => toggleSala(salaId)}
                                                            className="bg-navy-800/50 px-4 py-3 flex justify-between items-center cursor-pointer ml-4 mr-2 rounded-lg my-1"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm">📚</span>
                                                                <span className="text-primary-300 font-semibold text-sm">{sala.salaName}</span>
                                                                <span className="text-gray-500 text-xs">({sala.students.length} aluno{sala.students.length !== 1 ? 's' : ''})</span>
                                                            </div>
                                                            <Icon name={expandedSalas[salaId] ? "chevron-up" : "chevron-down"} size={16} className="text-gray-500" />
                                                        </div>

                                                        {/* Alunos da sala */}
                                                        {expandedSalas[salaId] && (
                                                            <div className="px-4 pb-2 space-y-2 ml-4">
                                                                {sala.students.map(stats => renderStudentCard(stats))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        ))
                )}
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