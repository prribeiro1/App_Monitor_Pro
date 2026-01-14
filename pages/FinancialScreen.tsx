import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, Payment, Stop, Route, UserSettings } from '../types';
import { Icon } from '../components/Icon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface FinancialScreenProps {
    settings: UserSettings | null;
    onUpdateSettings: () => void;
}

export const FinancialScreen: React.FC<FinancialScreenProps> = ({ settings, onUpdateSettings }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [s, p, st, r] = await Promise.all([
            dbService.getStudents(),
            dbService.getPayments(),
            dbService.getStops(),
            dbService.getRoutes()
        ]);
        setStudents(s.filter(st => st.active)); // Only active students
        setPayments(p);
        setStops(st);
        setRoutes(r);
        setLoading(false);
    };

    const filteredStudents = students
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    useEffect(() => { fetchData(); }, []);

    const getPaymentForStudent = (studentId: string) => {
        return payments.find(p => p.studentId === studentId && p.month === month && p.year === year);
    };

    const togglePayment = async (student: Student) => {
        const existing = getPaymentForStudent(student.id);

        if (existing) {
            if (confirm(`Remover pagamento de ${student.name}?`)) {
                await dbService.deletePayment(existing.id);
            }
        } else {
            const amount = parseFloat(prompt(`Valor da mensalidade para ${student.name}:`, "0") || "0");
            if (amount > 0) {
                const newPayment: Payment = {
                    id: crypto.randomUUID(),
                    studentId: student.id,
                    month,
                    year,
                    amount,
                    paidAt: new Date().toISOString(),
                    timestamp: Date.now()
                };
                await dbService.savePayment(newPayment);
            }
        }
        fetchData();
    };


    const sendWhatsAppReminder = (student: Student, payment?: Payment) => {
        const rawPhone = student.responsiblePhone || student.contact;
        const cleanPhone = rawPhone?.replace(/\D/g, '');
        if (!cleanPhone) {
            alert("Aluno sem telefone cadastrado.");
            return;
        }

        let message = '';
        if (payment) {
            // Recibo
            message = `Olá! Confirmo o recebimento da mensalidade de ${student.name} referente a ${month}/${year}. Valor: R$ ${payment.amount.toFixed(2)}. Obrigado!`;
        } else {
            // Cobrança
            const valor = student.monthlyFees ? `R$ ${student.monthlyFees.toFixed(2)}` : 'a mensalidade';
            const vencimento = student.dueDay ? `vencimento dia ${student.dueDay}` : '';
            const pix = settings?.pixKey ? `Chave Pix: ${settings.pixKey}` : 'Chave Pix: (Solicitar)';
            const tio = settings?.driverNickname || settings?.driverName?.split(' ')[0] || 'Motorista';

            message = `Olá! Tudo bom? Lembrete automático do Tio ${tio} 🚐\nReferente ao aluno ${student.name} (${month}/${year}).\nValor: ${valor} ${vencimento}.\n${pix}\nFavor enviar comprovante. Grato!`;
        }

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Stats
    const totalStudents = students.length;
    const paidCount = students.filter(s => getPaymentForStudent(s.id)).length;
    const totalReceived = payments
        .filter(p => p.month === month && p.year === year)
        .reduce((sum, p) => sum + p.amount, 0);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const exportPDF = async () => {
        try {
            const doc = new jsPDF();
            const monthName = months[month - 1];
            doc.text(`Relatório Financeiro: ${monthName}/${year}`, 14, 20);

            doc.setFontSize(10);
            doc.text(`Total Recebido: R$ ${totalReceived.toFixed(2)}`, 14, 30);
            doc.text(`Pagantes: ${paidCount} / ${totalStudents}`, 14, 35);

            const bodyData = students.map(student => {
                const payment = getPaymentForStudent(student.id);
                return [
                    student.name,
                    payment ? `R$ ${payment.amount.toFixed(2)}` : 'Pendente',
                    payment ? new Date(payment.paidAt).toLocaleDateString() : '-',
                    payment ? 'PAGO' : 'PENDENTE'
                ];
            });

            autoTable(doc, {
                head: [['Aluno', 'Valor', 'Data Pagto.', 'Status']],
                body: bodyData,
                startY: 45,
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [22, 163, 74] }, // Green header
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) {
                        if (data.cell.raw === 'PENDENTE') {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                        } else {
                            data.cell.styles.textColor = [22, 163, 74]; // Green
                        }
                    }
                }
            });

            const base64 = doc.output('datauristring').split(',')[1];
            const fileName = `financeiro_${month}_${year}.pdf`;

            if (Capacitor.isNativePlatform()) {
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: `Financeiro ${monthName}/${year}`,
                    text: `Relatório Financeiro - ${monthName}/${year}`,
                    url: result.uri,
                    dialogTitle: 'Compartilhar Relatório'
                });
            } else {
                doc.save(fileName);
            }
        } catch (e: any) {
            console.error("Erro ao exportar PDF", e);
            alert(`Erro ao gerar PDF: ${e.message}`);
        }
    };

    return (
        <div className="p-4 pb-20">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Financeiro</h2>
                <div className="flex gap-2">
                    <select
                        value={month}
                        onChange={e => setMonth(parseInt(e.target.value))}
                        className="bg-navy-800 text-white border border-navy-700 rounded-lg p-2 text-sm"
                    >
                        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select
                        value={year}
                        onChange={e => setYear(parseInt(e.target.value))}
                        className="bg-navy-800 text-white border border-navy-700 rounded-lg p-2 text-sm"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar aluno..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-navy-800 text-white border border-navy-700 rounded-xl p-3 pl-10 focus:border-primary-500 outline-none transition"
                    />
                    <div className="absolute left-3 top-3.5 text-gray-400">
                        <Icon name="search" size={20} />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Recebido</p>
                    <p className="text-2xl font-bold text-green-400">R$ {totalReceived.toFixed(2)}</p>
                </div>
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Pagantes</p>
                    <p className="text-2xl font-bold text-white">{paidCount}/{totalStudents}</p>
                </div>
            </div>

            <div className="space-y-3 mb-20">
                {filteredStudents.map(student => {
                    const payment = getPaymentForStudent(student.id);
                    return (
                        <div
                            key={student.id}
                            onClick={() => togglePayment(student)}
                            className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${payment
                                ? 'bg-green-900/20 border-green-800 hover:bg-green-900/30'
                                : 'bg-navy-800 border-navy-700 hover:bg-navy-700'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${payment ? 'bg-green-500 text-white' : 'bg-navy-900 text-gray-500'}`}>
                                    <Icon name={payment ? "check" : "dollar-sign"} size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-medium">{student.name}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {(() => {
                                            const stop = stops.find(s => s.id === student.stopId);
                                            const route = routes.find(r => r.id === stop?.routeId);
                                            return route && stop ? `${route.name} - ${stop.name}` : 'Sem rota definida';
                                        })()}
                                    </p>
                                    {payment && <p className="text-xs text-green-400">Pago em {new Date(payment.paidAt).toLocaleDateString()}</p>}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                {payment ? (
                                    <span className="text-green-400 font-bold">R$ {payment.amount.toFixed(2)}</span>
                                ) : (
                                    <span className="text-red-400 text-sm font-bold">
                                        {student.monthlyFees ? `R$ ${student.monthlyFees.toFixed(2)}` : 'Pendente'}
                                    </span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(student, payment); }}
                                    className="text-[10px] flex items-center gap-1 bg-green-600/20 text-green-400 px-2 py-1 rounded-full hover:bg-green-600/30"
                                >
                                    <Icon name="message-circle" size={12} />
                                    {payment ? 'Recibo' : 'Cobrar'}
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredStudents.length === 0 && <p className="text-center text-gray-500 mt-10">Nenhum aluno encontrado.</p>}
            </div>

            {/* Floating Action Button for PDF */}
            <button
                onClick={exportPDF}
                className="fixed bottom-20 right-4 bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-full shadow-xl shadow-primary-600/30 flex items-center justify-center z-30"
                title="Baixar Relatório Financeiro"
            >
                <Icon name="save" size={24} />
            </button>

        </div>
    );
};
