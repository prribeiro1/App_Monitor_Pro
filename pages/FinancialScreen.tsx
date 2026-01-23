import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../services/auth';
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
    isTrial?: boolean;
    isAdmin?: boolean;
}

export const FinancialScreen: React.FC<FinancialScreenProps> = ({ settings, onUpdateSettings, isTrial, isAdmin }) => {
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

        // Sincronizar pagamentos do servidor baseado APENAS nos alunos deste usuário
        if (s.length > 0) {
            await syncPaymentsWithServer(s);
            // Re-busca pagamentos localmente após o sync
            const updatedPayments = await dbService.getPayments();
            setPayments(updatedPayments);
        } else {
            setPayments(p);
        }

        setStudents(s.filter(student => student.active));
        setStops(st);
        setRoutes(r);
        setLoading(false);
    };

    const syncPaymentsWithServer = async (currentUserStudents: Student[]) => {
        try {
            const studentIds = currentUserStudents.map(s => `student:${s.id}`);
            if (studentIds.length === 0) return;

            // Busca logs de pagamento confirmado APENAS para os alunos do usuário Logado
            const { data: logs, error } = await supabase
                .from('webhook_logs')
                .select('*')
                .in('event', ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
                .in('external_reference', studentIds)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            if (!logs || logs.length === 0) return;

            const localPayments = await dbService.getPayments();

            for (const log of logs) {
                const paymentData = log.raw_payload?.payment;
                if (!paymentData || !paymentData.externalReference) continue;

                const ref = paymentData.externalReference;
                const studentId = ref.includes(':') ? ref.split(':')[1] : ref;

                // Extrair mês e ano da data de pagamento do Asaas
                const payDate = new Date(paymentData.paymentDate || log.created_at);
                const pMonth = payDate.getMonth() + 1;
                const pYear = payDate.getFullYear();

                // Verificar se já existe localmente (evitar duplicados)
                const exists = localPayments.some(lp =>
                    lp.studentId === studentId &&
                    lp.month === pMonth &&
                    lp.year === pYear
                );

                if (!exists) {
                    console.log(`📥 Sincronizando pagamento do Asaas: Aluno ${studentId}, R$ ${paymentData.value}`);

                    // Calcular o valor líquido (99% do valor após taxa do Asaas)
                    // No Sandbox a taxa é simulada, no Real o Asaas envia 'netValue' no log.
                    const netValueFull = paymentData.netValue || (paymentData.value - 0.99); // Simula taxa boleto Asaas R$0,99
                    const conductorNetValue = netValueFull * 0.99; // Tira o 1% do Monitor Pro

                    await dbService.savePayment({
                        id: `asaas_${paymentData.id}`,
                        studentId,
                        month: pMonth,
                        year: pYear,
                        amount: conductorNetValue, // Salva o valor real que cai na conta
                        paidAt: payDate.toISOString(),
                        timestamp: payDate.getTime()
                    });
                }
            }
        } catch (err) {
            console.warn('⚠️ Não foi possível sincronizar pagamentos do Asaas:', err);
        }
    };

    const filteredStudents = students
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();

            // Verificar se já pagou
            const aPaid = payments.some(p => p.studentId === a.id && p.month === month && p.year === year);
            const bPaid = payments.some(p => p.studentId === b.id && p.month === month && p.year === year);

            // Pagos vão para o final
            if (aPaid && !bPaid) return 1;
            if (!aPaid && bPaid) return -1;
            if (aPaid && bPaid) return a.name.localeCompare(b.name);

            // Para não pagos, ordenar por vencimento
            const aDue = a.dueDay || 31;
            const bDue = b.dueDay || 31;

            // Se estamos no mês atual, calcular dias restantes
            if (month === currentMonth && year === currentYear) {
                const aDaysLeft = aDue - currentDay;
                const bDaysLeft = bDue - currentDay;

                if (aDaysLeft !== bDaysLeft) return aDaysLeft - bDaysLeft;
            } else {
                // Mês diferente, ordenar só pelo dia
                if (aDue !== bDue) return aDue - bDue;
            }

            // Mesmo vencimento, ordem alfabética
            return a.name.localeCompare(b.name);
        });

    useEffect(() => { fetchData(); }, []);

    const getPaymentForStudent = (studentId: string) => {
        return payments.find(p => p.studentId === studentId && p.month === month && p.year === year);
    };

    const getDueDateStatus = (student: Student) => {
        if (!student.dueDay) return null;

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        // Só mostra status se estiver olhando o mês atual
        if (month !== currentMonth || year !== currentYear) {
            return { text: `Vence dia ${student.dueDay}`, color: 'text-gray-400', isLate: false };
        }

        if (currentDay > student.dueDay) {
            const daysLate = currentDay - student.dueDay;
            return { text: `Atrasado ${daysLate} dia${daysLate > 1 ? 's' : ''}`, color: 'text-red-400', isLate: true };
        } else if (currentDay === student.dueDay) {
            return { text: 'Vence hoje!', color: 'text-orange-400', isLate: false };
        } else {
            return { text: `Vence dia ${student.dueDay}`, color: 'text-gray-400', isLate: false };
        }
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

    const quickPay = async (student: Student) => {
        const amount = student.monthlyFees || 0;
        if (amount <= 0) {
            alert(`${student.name} não tem mensalidade cadastrada. Edite o aluno para definir o valor.`);
            return;
        }

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
        fetchData();
    };


    const sendWhatsAppReminder = (student: Student, payment?: Payment) => {
        let cleanPhone = (student.responsiblePhone || student.contact || '').replace(/\D/g, '');

        if (!cleanPhone) {
            const manualPhone = prompt("Telefone não encontrado. Digite o número (DDD + Número):", "");
            if (manualPhone) {
                cleanPhone = manualPhone.replace(/\D/g, '');
            }
        }

        if (!cleanPhone) {
            alert("É necessário um telefone para enviar o comprovante/cobrança.");
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

    // Total recebido garante que soma apenas pagamentos vinculados a alunos locais deste usuário
    const totalReceived = payments
        .filter(p => p.month === month && p.year === year && students.some(s => s.id === p.studentId))
        .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = students
        .filter(s => !getPaymentForStudent(s.id))
        .reduce((sum, s) => sum + (s.monthlyFees || 0), 0);

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
            doc.text(`Total Pendente: R$ ${totalPending.toFixed(2)}`, 14, 35);
            doc.text(`Pagantes: ${paidCount} / ${totalStudents}`, 14, 40);

            const bodyData = students.map(student => {
                const payment = getPaymentForStudent(student.id);
                const valor = payment ? payment.amount : (student.monthlyFees || 0);
                return [
                    student.name,
                    `R$ ${valor.toFixed(2)}`,
                    payment ? new Date(payment.paidAt).toLocaleDateString() : '-',
                    payment ? 'PAGO' : 'PENDENTE'
                ];
            });

            autoTable(doc, {
                head: [['Aluno', 'Valor', 'Data Pagto.', 'Status']],
                body: bodyData,
                startY: 50,
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
    const userTier = settings?.subscriptionTier || (isTrial ? 'pro_plus' : 'basic');

    return (
        <div className="p-4 pb-20">
            {/* Upgrade Card Pro+ - Só mostra se for estritamente BASIC e não estiver em teste/admin */}
            {userTier === 'basic' && !isTrial && !isAdmin && (
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-5 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon name="zap" size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">
                                ⚡ Cobrança Automática Disponível!
                            </h3>
                            <p className="text-sm text-gray-300 mb-3">
                                Receba automaticamente com PIX, Boleto e Cartão. Split de 99% para você, 1% para o app.
                            </p>
                            <button
                                onClick={() => window.location.hash = '/welcome'}
                                className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition flex items-center gap-2"
                            >
                                Fazer Upgrade para Pro+
                                <Icon name="arrow-right" size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Asaas Quick Access - Apenas para Pro+ */}
            {settings?.subscriptionTier === 'pro_plus' && (
                <div className="mb-6">
                    <a
                        href="#/automatic-billing"
                        className="bg-gradient-to-r from-green-600 to-green-500 p-4 rounded-xl flex items-center gap-3 hover:from-green-500 hover:to-green-400 transition"
                    >
                        <Icon name="zap" size={24} className="text-white" />
                        <div>
                            <p className="text-white font-bold text-sm">Cobrança Automática</p>
                            <p className="text-green-100 text-xs">Ativar por aluno</p>
                        </div>
                    </a>
                </div>
            )}

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
                                        {student.guardianName || 'Responsável não cadastrado'}
                                    </p>
                                    {payment ? (
                                        <p className="text-xs text-green-400">Pago em {new Date(payment.paidAt).toLocaleDateString()}</p>
                                    ) : (
                                        (() => {
                                            const dueStatus = getDueDateStatus(student);
                                            return dueStatus ? (
                                                <p className={`text-xs ${dueStatus.color}`}>{dueStatus.text}</p>
                                            ) : null;
                                        })()
                                    )}
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                {payment ? (
                                    <>
                                        <span className="text-green-400 font-bold">R$ {payment.amount.toFixed(2)}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(student, payment); }}
                                            className="text-[10px] flex items-center gap-1 bg-green-600/20 text-green-400 px-2 py-1 rounded-full hover:bg-green-600/30"
                                        >
                                            <Icon name="message-circle" size={12} />
                                            Recibo
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-red-400 text-sm font-bold">
                                            {student.monthlyFees ? `R$ ${student.monthlyFees.toFixed(2)}` : 'Pendente'}
                                        </span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); quickPay(student); }}
                                                className="text-[10px] flex items-center gap-1 bg-primary-600/20 text-primary-400 px-2 py-1 rounded-full hover:bg-primary-600/30"
                                            >
                                                <Icon name="check" size={12} />
                                                Pagou
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(student, undefined); }}
                                                className="text-[10px] flex items-center gap-1 bg-orange-600/20 text-orange-400 px-2 py-1 rounded-full hover:bg-orange-600/30"
                                            >
                                                <Icon name="message-circle" size={12} />
                                                Cobrar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredStudents.length === 0 && <p className="text-center text-gray-500 mt-10">Nenhum aluno encontrado.</p>}
            </div>

            {/* Floating Action Button for PDF */}
            <button
                onClick={exportPDF}
                className="fixed bottom-24 right-4 bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-full shadow-xl shadow-primary-600/30 flex items-center justify-center z-30"
                title="Baixar Relatório Financeiro"
            >
                <Icon name="save" size={24} />
            </button>

        </div>
    );
};
