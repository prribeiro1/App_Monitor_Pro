import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../services/auth';
import { Student, Payment, Stop, Route, UserSettings } from '../types';
import { Icon } from '../components/Icon';
import { useI18n } from '../i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { formatCurrency } from '../utils';

// Interface para gastos
interface Expense {
    id: string;
    user_id: string;
    description: string;
    amount: number;
    date: string;
    created_at: string;
}

interface FinancialScreenProps {
    settings: UserSettings | null;
    onUpdateSettings: () => void;
    isTrial?: boolean;
    isAdmin?: boolean;
    canViewAsaas?: boolean;
}

export const FinancialScreen: React.FC<FinancialScreenProps> = ({ settings, onUpdateSettings, isTrial, isAdmin, canViewAsaas }) => {
    const { t, language } = useI18n();
    const [students, setStudents] = useState<Student[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
    const [pdfSortOrder, setPdfSortOrder] = useState<'name' | 'date'>('name');

    // Estados para gastos
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showExpensesList, setShowExpensesList] = useState(false);
    const [newExpenseDescription, setNewExpenseDescription] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [savingExpense, setSavingExpense] = useState(false);

    // Helper function to format YYYY-MM-DD date in local timezone
    const formatDateLocal = (dateStr: string): string => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

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

        // Carregar gastos do Supabase
        await fetchExpenses();

        // 🆕 ALUNOS INATIVOS: Mostrar no histórico financeiro se tiver pagamento registrado
        // Alunos ativos sempre aparecem. Inativos aparecem APENAS se possuem pagamento
        // no mês/ano selecionado (preserva histórico até o mês que esteve ativo).
        const allPayments = p.length > 0 ? p : await dbService.getPayments();
        const filteredStudents = s.filter(student => {
            if (student.active) return true;
            // Inativo: verificar se tem pagamento no mês/ano selecionado
            return allPayments.some(pay =>
                pay.studentId === student.id && pay.month === month && pay.year === year
            );
        });

        setStudents(filteredStudents);
        setStops(st);
        setRoutes(r);
        setLoading(false);
    };

    // Buscar gastos do Supabase para o mês/ano selecionado
    const fetchExpenses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Calcula o primeiro e último dia do mês selecionado
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (err) {
            console.warn('⚠️ Não foi possível carregar gastos:', err);
            setExpenses([]);
        }
    };

    // Salvar novo gasto no Supabase
    const saveExpense = async () => {
        if (!newExpenseDescription.trim() || !newExpenseAmount) {
            alert('Preencha a descrição e o valor do gasto.');
            return;
        }

        const amount = parseFloat(newExpenseAmount.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            alert('Valor inválido.');
            return;
        }

        setSavingExpense(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { error } = await supabase
                .from('expenses')
                .insert([{
                    user_id: user.id,
                    description: newExpenseDescription.trim(),
                    amount: amount,
                    // Usa data local (evita problema de timezone com toISOString que converte para UTC)
                    date: new Date().toLocaleDateString('en-CA') // Formato YYYY-MM-DD em timezone local
                }]);

            if (error) throw error;

            // Limpa campos e fecha modal
            setNewExpenseDescription('');
            setNewExpenseAmount('');
            setShowExpenseModal(false);

            // Recarrega gastos
            await fetchExpenses();
        } catch (err: any) {
            alert('Erro ao salvar gasto: ' + err.message);
        } finally {
            setSavingExpense(false);
        }
    };

    // Deletar gasto
    const deleteExpense = async (expenseId: string) => {
        if (!confirm('Remover este gasto?')) return;

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId);

            if (error) throw error;
            await fetchExpenses();
        } catch (err: any) {
            alert('Erro ao remover gasto: ' + err.message);
        }
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
                    const conductorNetValue = netValueFull * 0.99; // Tira o 1% do Van Pro

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

    // Helper para verificar status do aluno
    const getStudentPaymentStatus = (student: Student): 'paid' | 'pending' | 'overdue' => {
        const payment = payments.find(p => p.studentId === student.id && p.month === month && p.year === year);
        if (payment) return 'paid';

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        // Só considera atrasado se estiver no mês/ano atual e passou do vencimento
        if (month === currentMonth && year === currentYear && student.dueDay && currentDay > student.dueDay) {
            return 'overdue';
        }
        return 'pending';
    };

    const filteredStudents = students
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(s => {
            if (statusFilter === 'all') return true;
            return getStudentPaymentStatus(s) === statusFilter;
        })
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

    // 🆕 Recarregar dados completos quando mudar mês/ano (necessário para filtro de inativos)
    useEffect(() => { fetchData(); }, [month, year]);

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
            const valor = student.monthlyFees ? formatCurrency(student.monthlyFees) : 'a mensalidade';
            const vencimento = student.dueDay ? `vencimento dia ${student.dueDay}` : '';
            const pix = settings?.pixKey ? `Chave Pix: ${settings.pixKey}` : 'Chave Pix: (Solicitar)';
            const tio = settings?.driverNickname || settings?.driverName?.split(' ')[0] || 'Motorista';

            message = `Olá! Tudo bom? Lembrete automático do Tio (a) ${tio} 🚐\nReferente ao aluno ${student.name} (${month}/${year}).\nValor: ${valor} ${vencimento}.\n${pix}\nFavor enviar comprovante. Grato!`;
        }

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Stats
    const totalStudents = students.length;
    const paidCount = students.filter(s => getStudentPaymentStatus(s) === 'paid').length;
    const pendingCount = students.filter(s => getStudentPaymentStatus(s) === 'pending').length;
    const overdueCount = students.filter(s => getStudentPaymentStatus(s) === 'overdue').length;

    // Total recebido garante que soma apenas pagamentos vinculados a alunos locais deste usuário
    const totalReceived = payments
        .filter(p => p.month === month && p.year === year && students.some(s => s.id === p.studentId))
        .reduce((sum, p) => sum + p.amount, 0);

    const generateReceiptPDF = async (student: Student, payment: Payment) => {
        try {
            const doc = new jsPDF();
            const tio = settings?.driverNickname || settings?.driverName || 'Motorista';
            
            // Layout Estilizado do Recibo
            doc.setFillColor(26, 28, 53); // Navy Blue
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text('RECIBO DE PAGAMENTO', 105, 25, { align: 'center' });
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.text(`Nº do Recibo: ${payment.id.split('-')[0].toUpperCase()}`, 14, 55);
            doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 14, 62);
            
            // Conteúdo principal em um box
            doc.setDrawColor(200, 200, 200);
            doc.rect(14, 75, 182, 80);
            
            doc.setFontSize(14);
            doc.text(`Recebi de: ${student.guardianName || 'Responsável'}`, 20, 90);
            doc.text(`A importância de: ${formatCurrency(payment.amount)}`, 20, 105);
            doc.text(`Referente a: Mensalidade Escolar - ${months[month-1]}/${year}`, 20, 120);
            doc.text(`Aluno(a): ${student.name}`, 20, 135);
            
            // Assinatura
            const finalY = 200;
            doc.line(60, finalY, 150, finalY);
            doc.text(tio, 105, finalY + 7, { align: 'center' });
            doc.setFontSize(10);
            doc.text('Assinatura do Condutor', 105, finalY + 15, { align: 'center' });
            
            if (settings?.driverSignature) {
                try {
                   doc.addImage(settings.driverSignature, 'PNG', 75, finalY - 25, 60, 20);
                } catch(e) {}
            }

            const fileName = `recibo_${student.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`;
            if (Capacitor.isNativePlatform()) {
                const base64 = doc.output('datauristring').split(',')[1];
                const result = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
                await Share.share({ title: 'Recibo de Pagamento', url: result.uri });
            } else {
                doc.save(fileName);
            }
        } catch (e: any) {
            alert('Erro ao gerar recibo: ' + e.message);
        }
    };

    const totalPending = students
        .filter(s => !getPaymentForStudent(s.id))
        .reduce((sum, s) => sum + (s.monthlyFees || 0), 0);

    const totalExpected = students.reduce((sum, s) => sum + (s.monthlyFees || 0), 0);

    // Total de gastos do mês
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Lucro líquido (Receitas - Despesas)
    const netProfit = totalReceived - totalExpenses;

    const months = language === 'es'
        ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        : ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const exportPDF = async () => {
        try {
            const doc = new jsPDF();
            const monthName = months[month - 1];
            doc.text(`Relatório Financeiro: ${monthName}/${year}`, 14, 20);

            doc.setFontSize(10);
            doc.text(`Total Esperado: ${formatCurrency(totalExpected)}`, 14, 30);
            doc.text(`Total Recebido: ${formatCurrency(totalReceived)}`, 14, 35);
            doc.text(`Falta Receber: ${formatCurrency(totalPending)}`, 14, 40);
            doc.text(`Total Gastos: ${formatCurrency(totalExpenses)}`, 14, 45);
            doc.text(`Lucro Líquido: ${formatCurrency(netProfit)}`, 14, 50);
            doc.text(`Pagantes: ${paidCount} / ${totalStudents}`, 14, 55);

            // Tabela de Mensalidades - Ordenação Dinâmica
            const sortedStudents = [...students].sort((a, b) => {
                if (pdfSortOrder === 'name') {
                    return a.name.trim().localeCompare(b.name.trim(), undefined, { sensitivity: 'base' });
                } else {
                    const payA = getPaymentForStudent(a.id);
                    const payB = getPaymentForStudent(b.id);
                    
                    if (payA && payB) {
                        return new Date(payA.paidAt).getTime() - new Date(payB.paidAt).getTime();
                    }
                    if (payA && !payB) return -1;
                    if (!payA && payB) return 1;
                    return a.name.trim().localeCompare(b.name.trim(), undefined, { sensitivity: 'base' });
                }
            });

            const bodyData = sortedStudents.map(student => {
                const payment = getPaymentForStudent(student.id);
                const valor = payment ? payment.amount : (student.monthlyFees || 0);
                return [
                    student.name,
                    formatCurrency(valor),
                    payment ? new Date(payment.paidAt).toLocaleDateString() : '-',
                    payment ? 'PAGO' : 'PENDENTE'
                ];
            });

            autoTable(doc, {
                head: [['Aluno', 'Valor', 'Data Pagto.', 'Status']],
                body: bodyData,
                startY: 65,
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

            // Tabela de Gastos (se houver)
            if (expenses.length > 0) {
                const expenseBody = expenses.map(e => [
                    e.description,
                    formatCurrency(e.amount),
                    formatDateLocal(e.date)
                ]);

                // Pega a posição Y final da tabela anterior
                const finalY = (doc as any).lastAutoTable?.finalY || 120;

                doc.setFontSize(12);
                doc.text('Gastos do Mês', 14, finalY + 15);

                autoTable(doc, {
                    head: [['Descrição', 'Valor', 'Data']],
                    body: expenseBody,
                    startY: finalY + 20,
                    theme: 'grid',
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [220, 38, 38] }, // Red header para gastos
                });
            }

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

            {/* Asaas Quick Access - Apenas se tiver permissão e for Pro+ */}
            {canViewAsaas && (settings?.subscriptionTier === 'pro_plus' || isTrial || isAdmin) && (
                <div className="mb-6">
                    <a
                        href="#/automatic-billing"
                        className="bg-gradient-to-r from-green-600 to-green-500 p-4 rounded-xl flex items-center gap-3 hover:from-green-500 hover:to-green-400 transition"
                    >
                        <Icon name="zap" size={24} className="text-white" />
                        <div>
                            <p className="text-white font-bold text-sm">{t('financial_automatic_billing')}</p>
                            <p className="text-green-100 text-xs">{t('financial_activate_student')}</p>
                        </div>
                    </a>
                </div>
            )}

            {/* PDF Sort Selection */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-gray-400 text-xs font-bold uppercase">Ordem do PDF:</span>
                <button
                    onClick={() => setPdfSortOrder('name')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${pdfSortOrder === 'name' ? 'bg-primary-600 text-white' : 'bg-navy-800 text-gray-500 border border-navy-700'}`}
                >
                    Nome (A-Z)
                </button>
                <button
                    onClick={() => setPdfSortOrder('date')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${pdfSortOrder === 'date' ? 'bg-primary-600 text-white' : 'bg-navy-800 text-gray-500 border border-navy-700'}`}
                >
                    Data Pagto.
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('financial_search')}
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
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Total Esperado</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(totalExpected)}</p>
                </div>
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Pagantes</p>
                    <p className="text-xl font-bold text-white">{paidCount}/{totalStudents}</p>
                </div>
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Recebido</p>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(totalReceived)}</p>
                </div>
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <p className="text-gray-400 text-xs uppercase font-bold">Falta Receber</p>
                    <p className="text-xl font-bold text-orange-400">{formatCurrency(totalPending)}</p>
                </div>
            </div>

            {/* Seção de Caixa (Gastos + Lucro) */}
            <div className="bg-navy-800 p-4 rounded-xl border border-navy-700 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-400 text-xs uppercase font-bold">💰 Caixa do Mês</p>
                    <div className="flex gap-2">
                        {/* Olhinho - Ver Gastos */}
                        <button
                            onClick={() => setShowExpensesList(!showExpensesList)}
                            className={`p-2 rounded-lg transition ${showExpensesList ? 'bg-red-600/30 text-red-400' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
                            title={showExpensesList ? 'Ocultar gastos' : 'Ver gastos'}
                        >
                            <Icon name={showExpensesList ? 'eye-off' : 'eye'} size={18} />
                        </button>
                        {/* Botão Adicionar Gasto */}
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="bg-red-600/20 text-red-400 hover:bg-red-600/30 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                        >
                            <Icon name="minus-circle" size={16} />
                            Adicionar Gasto
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Gastos</p>
                        <p className="text-lg font-bold text-red-400">- {formatCurrency(totalExpenses)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Lucro Líquido</p>
                        <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(netProfit)}
                        </p>
                    </div>
                </div>

                {/* Lista de Gastos (expandível) */}
                {showExpensesList && (
                    <div className="mt-4 pt-4 border-t border-navy-700">
                        <p className="text-xs text-gray-500 mb-2">Gastos registrados ({expenses.length})</p>
                        {expenses.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">Nenhum gasto registrado neste mês.</p>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {expenses.map(expense => (
                                    <div key={expense.id} className="flex items-center justify-between bg-navy-900 p-2 rounded-lg">
                                        <div>
                                            <p className="text-white text-sm">{expense.description}</p>
                                            <p className="text-gray-500 text-xs">{formatDateLocal(expense.date)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-400 font-bold text-sm">- {formatCurrency(expense.amount)}</span>
                                            <button
                                                onClick={() => deleteExpense(expense.id)}
                                                className="text-gray-500 hover:text-red-400 p-1"
                                                title="Remover gasto"
                                            >
                                                <Icon name="trash-2" size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-navy-800 p-1 rounded-xl border border-navy-700 mb-6 overflow-x-auto">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${statusFilter === 'all' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Todos
                    <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{totalStudents}</span>
                </button>
                <button
                    onClick={() => setStatusFilter('paid')}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${statusFilter === 'paid' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Pagos
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'paid' ? 'bg-white/20' : 'bg-green-500/30'}`}>{paidCount}</span>
                </button>
                <button
                    onClick={() => setStatusFilter('pending')}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Pendentes
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'pending' ? 'bg-white/20' : 'bg-yellow-500/30'}`}>{pendingCount}</span>
                </button>
                <button
                    onClick={() => setStatusFilter('overdue')}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap ${statusFilter === 'overdue' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Atrasados
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'overdue' ? 'bg-white/20' : 'bg-red-500/30'}`}>{overdueCount}</span>
                </button>
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
                                        <span className="text-green-400 font-bold">{formatCurrency(payment.amount)}</span>
                                        <div className="flex gap-1 mt-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(student, payment); }}
                                                className="text-[10px] flex items-center gap-1 bg-green-600/20 text-green-400 px-2 py-1 rounded-full hover:bg-green-600/30"
                                            >
                                                <Icon name="message-circle" size={12} />
                                                WhatsApp
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); generateReceiptPDF(student, payment); }}
                                                className="text-[10px] flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full hover:bg-blue-600/30"
                                            >
                                                <Icon name="file-text" size={12} />
                                                PDF
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-red-400 text-sm font-bold">
                                            {student.monthlyFees ? formatCurrency(student.monthlyFees) : 'Pendente'}
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

            {/* Modal de Adicionar Gasto */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-navy-800 rounded-2xl p-6 w-full max-w-md border border-navy-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Registrar Gasto</h3>
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                <Icon name="x" size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-1 block">Descrição</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Combustível, Pedágio, Lavagem..."
                                    value={newExpenseDescription}
                                    onChange={e => setNewExpenseDescription(e.target.value)}
                                    className="w-full bg-navy-900 text-white border border-navy-700 rounded-xl p-3 focus:border-red-500 outline-none transition"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-gray-400 text-sm mb-1 block">Valor (R$)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    value={newExpenseAmount}
                                    onChange={e => setNewExpenseAmount(e.target.value)}
                                    className="w-full bg-navy-900 text-white border border-navy-700 rounded-xl p-3 focus:border-red-500 outline-none transition text-2xl font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="flex-1 bg-navy-700 text-gray-300 py-3 rounded-xl font-bold hover:bg-navy-600 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveExpense}
                                disabled={savingExpense}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {savingExpense ? (
                                    <>Salvando...</>
                                ) : (
                                    <>
                                        <Icon name="minus-circle" size={18} />
                                        Registrar Gasto
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
