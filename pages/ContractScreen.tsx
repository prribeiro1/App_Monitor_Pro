import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, UserSettings } from '../types';
import { Icon } from '../components/Icon';
import jsPDF from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { SignaturePad } from '../components/SignaturePad';
import { supabase } from '../services/auth';

interface ContractScreenProps {
    settings: UserSettings | null;
}

export const ContractScreen: React.FC<ContractScreenProps> = ({ settings }) => {
    const navigate = useNavigate();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [loading, setLoading] = useState(true);

    // Signatures
    const [parentSignature, setParentSignature] = useState('');
    const [isSigningLocal, setIsSigningLocal] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const sts = await dbService.getStudents();
            setStudents(sts.filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name)));
            setLoading(false);
        };
        loadData();
    }, []);

    const fetchSignature = async (studentId: string, forceRemote = false) => {
        // 1. Check local ONLY if not forcing remote sync
        if (!forceRemote) {
            const local = await dbService.getContractSignature(studentId);
            if (local?.signature) {
                setParentSignature(local.signature);
                return;
            }
        }

        // 2. Check Supabase
        try {
            console.log('[Sync] Buscando assinatura para studentId:', studentId);
            const { data, error } = await supabase
                .from('contract_requests')
                .select('parent_signature, status, student_id_local')
                .eq('student_id_local', studentId)
                .eq('status', 'signed')
                .order('created_at', { ascending: false })
                .limit(1);

            console.log('[Sync] Resultado:', { data, error });

            if (error) {
                console.error('[Sync] Erro Supabase:', error);
                alert('Erro ao sincronizar: ' + error.message);
                return;
            }

            if (data && data.length > 0 && data[0]?.parent_signature) {
                setParentSignature(data[0].parent_signature);
                // Save local for offline
                await dbService.saveContractSignature(studentId, data[0].parent_signature);
                alert('✅ Assinatura sincronizada com sucesso!');
            } else {
                setParentSignature('');
                console.log('[Sync] Nenhum contrato assinado encontrado para este aluno');
            }
        } catch (e: any) {
            console.error('[Sync] Erro:', e);
            alert('Erro ao sincronizar: ' + e.message);
        }
    };

    useEffect(() => {
        if (selectedStudentId) {
            fetchSignature(selectedStudentId);
        } else {
            setParentSignature('');
        }
    }, [selectedStudentId]);

    const handleSaveLocalSignature = async (sig: string) => {
        if (!selectedStudentId) return;
        setParentSignature(sig);
        if (sig) {
            await dbService.saveContractSignature(selectedStudentId, sig);
            setIsSigningLocal(false);
        } else {
            // REMOVE Logic
            await dbService.deleteContractSignature(selectedStudentId);
            // Also try to update Supabase so "Sync" doesn't bring it back
            try {
                await supabase
                    .from('contract_requests')
                    .update({ parent_signature: null, status: 'pending' })
                    .eq('student_id_local', selectedStudentId);
            } catch (err) {
                console.error("Erro ao resetar assinatura remota:", err);
            }
        }
    };

    const handleGenerateLink = async () => {
        // Alerta 1: Função disparada
        alert("Gerando link... aguarde um instante.");

        if (!selectedStudentId) {
            alert("Erro: Nenhum aluno selecionado.");
            return;
        }

        if (!settings?.driverName) {
            alert("⚠️ Atenção: Seu nome de motorista não está configurado. Vá em Configurações > Perfil e preencha seu nome para poder gerar contratos.");
            return;
        }

        const student = students.find(s => s.id === selectedStudentId);
        if (!student) {
            alert("Erro: Aluno não encontrado na lista.");
            return;
        }

        setIsGeneratingLink(true);
        try {
            // alert("Conectando ao servidor Supabase...");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Erro: Usuário não autenticado no Supabase.");
                setIsGeneratingLink(false);
                return;
            }

            const payload = {
                driver_id: user.id,
                driver_name: settings.driverName,
                student_id_local: student.id,
                student_name: student.name,
                responsible_name: student.guardianName || '',
                responsible_cpf: student.responsibleCpf || '',
                responsible_phone: student.responsiblePhone || '',
                monthly_fee: student.monthlyFees,
                due_day: student.dueDay,
                contract_clauses: settings?.contractClauses || [],
                status: 'pending'
            };

            const { data, error } = await supabase
                .from('contract_requests')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error('[Contract] Erro Insert:', error);
                alert(`ERRO AO SALVAR NO SUPABASE: ${error.message} (Código: ${error.code})`);
                setIsGeneratingLink(false);
                return;
            }

            alert("Contrato salvo com sucesso na nuvem!");

            const baseUrl = import.meta.env.VITE_APP_URL || 'https://app-van-pro.vercel.app';
            const link = `${baseUrl}/#/sign-contract/${data.id}`;
            const message = `Olá! Segue o link para visualizar e assinar o contrato de transporte escolar do(a) ${student.name}:\n\n${link}`;

            const rawPhone = student.responsiblePhone?.replace(/\D/g, '') || '';

            // Tenta abrir WhatsApp ou Fallback para Share
            if (rawPhone && (rawPhone.length === 10 || rawPhone.length === 11)) {
                const waUrl = `https://wa.me/55${rawPhone}?text=${encodeURIComponent(message)}`;
                // alert(`Abrindo WhatsApp para: ${rawPhone}`);

                // No Android, window.open às vezes falha. Tentar location.href ou Capacitor Browser
                window.location.href = waUrl;
            } else {
                alert("⚠️ WhatsApp não encontrado ou inválido. Abrindo menu de compartilhamento local...");
                await Share.share({
                    title: `Contrato - ${student.name}`,
                    text: message,
                    url: link,
                    dialogTitle: 'Enviar Link'
                });
            }

        } catch (e: any) {
            console.error(e);
            alert("Erro crítico no processo: " + e.message);
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const generatePDF = async () => {
        if (!selectedStudentId || !settings?.driverName || !settings?.driverCpf) {
            alert("Por favor, preencha seus dados no Perfil (Configurações) e selecione um aluno.");
            return;
        }

        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;

        try {
            const doc = new jsPDF();
            const primaryColor = [166, 93, 80]; // Terracotta color
            const margin = 20;
            const pageWidth = 170;
            let y = 20;

            // 1. HEADER - "CONTRATO"
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(28);
            doc.text("CONTRATO", 105, y, { align: "center" });
            y += 8;
            doc.setFontSize(12);
            doc.text("DE PRESTAÇÃO DE SERVIÇOS", 105, y, { align: "center" });
            y += 6;
            doc.text("DE TRANSPORTE ESCOLAR", 105, y, { align: "center" });
            y += 10;

            // DRAW VAN ICON (Geometric shapes)
            const vanX = 98;
            const vanY = y;
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.roundedRect(vanX, vanY + 2, 14, 6, 1, 1, 'F');
            doc.roundedRect(vanX + 1, vanY, 10, 4, 1, 1, 'F');
            doc.setFillColor(255, 255, 255);
            doc.rect(vanX + 2, vanY + 1, 3, 2, 'F');
            doc.rect(vanX + 6, vanY + 1, 3, 2, 'F');
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.circle(vanX + 3, vanY + 8, 1.5, 'F');
            doc.circle(vanX + 11, vanY + 8, 1.5, 'F');

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.2);
            doc.line(margin, vanY + 5, vanX - 5, vanY + 5);
            doc.line(vanX + 19, vanY + 5, margin + pageWidth, vanY + 5);
            y += 20;

            const dottedLine = (x: number, y: number, length: number) => {
                const dotSpacing = 1.2;
                doc.setFillColor(200, 200, 200);
                for (let i = 0; i < length; i += dotSpacing) {
                    doc.rect(x + i, y, 0.2, 0.2, 'F');
                }
            };

            const addParagraph = (text: string, isBold = false, color = [0, 0, 0]) => {
                doc.setTextColor(color[0], color[1], color[2]);
                doc.setFont("helvetica", isBold ? "bold" : "normal");
                const lines = doc.splitTextToSize(text, pageWidth);
                doc.text(lines, margin, y);
                y += (lines.length * 6) + 2;
            };

            // CONTRATANTE SECTION
            doc.setFontSize(11);
            addParagraph("CONTRATANTE:", true, primaryColor);
            y += 1;
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
            doc.text("Nome: ", margin, y);
            doc.text(student.guardianName || "", margin + 15, y);
            dottedLine(margin + 15, y + 0.5, 155);
            y += 7;
            doc.text("CPF: ", margin, y);
            doc.text(student.responsibleCpf || "", margin + 12, y);
            dottedLine(margin + 12, y + 0.5, 80);
            doc.text("Telefone:", margin + 100, y);
            doc.text(student.responsiblePhone || "", margin + 120, y);
            dottedLine(margin + 120, y + 0.5, 50);
            y += 10;

            // CONTRATADO SECTION
            addParagraph("CONTRATADO:", true, primaryColor);
            y += 1;
            doc.setTextColor(0, 0, 0);
            doc.text("Nome: ", margin, y);
            doc.text(settings?.driverName || '', margin + 15, y);
            dottedLine(margin + 15, y + 0.5, 155);
            y += 7;
            doc.text("CPF/CNPJ: ", margin, y);
            doc.text(settings?.driverCpf || '', margin + 25, y);
            dottedLine(margin + 25, y + 0.5, 80);
            doc.text("Telefone:", margin + 110, y);
            doc.text(settings?.driverPhone || '', margin + 130, y);
            dottedLine(margin + 130, y + 0.5, 40);
            y += 12;

            doc.setFont("helvetica", "bold");
            doc.text("As partes ajustam o presente contrato nos termos abaixo:", margin, y);
            y += 10;

            // CLAUSES
            const addClause = (title: string, content: string) => {
                const titleText = title.toUpperCase();
                const processedContent = content
                    .replace(/{{ALUNO}}/g, student.name.toUpperCase())
                    .replace(/{{VALOR}}/g, student.monthlyFees ? `R$ ${student.monthlyFees.toFixed(2)}` : "____")
                    .replace(/{{DIA}}/g, student.dueDay ? student.dueDay.toString() : "____");

                // Check if current page has enough space
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }

                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.setFont("helvetica", "bold");
                doc.text(titleText, margin, y);
                const titleWidth = doc.getTextWidth(titleText);
                dottedLine(margin + titleWidth + 2, y, pageWidth - titleWidth);
                y += 6;
                doc.setTextColor(100, 100, 100);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                const lines = doc.splitTextToSize(processedContent, pageWidth);
                doc.text(lines, margin, y);
                y += (lines.length * 5) + 6;
                doc.setFontSize(11);
            };

            const DEFAULT_CLAUSES = [
                { title: "CLÁUSULA 1ª - DO OBJETO", content: "O presente contrato tem como objeto a prestação de serviços de transporte escolar do(a) aluno(a) {{ALUNO}}, conforme rota e horários previamente definidos entre as partes." },
                { title: "CLÁUSULA 2ª - DA VIGÊNCIA E RESCISÃO", content: "O presente contrato tem validade para o ano letivo vigente, podendo ser renovado ou rescindido por qualquer uma das partes mediante aviso prévio." },
                { title: "CLÁUSULA 3ª - DO VALOR E PAGAMENTO", content: "Pelos serviços prestados, o(a) CONTRATANTE pagará ao CONTRATADO o valor de {{VALOR}}, com vencimento todo dia {{DIA}} de cada mês." },
                { title: "CLÁUSULA 4ª - DAS RESPONSABILIDADES", content: "O CONTRATADO compromete-se a realizar o transporte do aluno com zelo e pontualidade. O CONTRATANTE compromete-se a cumprir os horários acordados." }
            ];

            const clausesToUse = settings?.contractClauses && settings.contractClauses.length > 0
                ? settings.contractClauses
                : DEFAULT_CLAUSES;

            clausesToUse.forEach(clause => {
                addClause(clause.title, clause.content);
            });

            y += 2;
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text("E, por estarem de acordo, firmam o presente instrumento.", margin, y);
            y += 10;

            // SIGNATURES AREA
            const signatureWidth = 50;
            const signatureHeight = 15;

            // 1. Parent Signature - posicionada mais à direita para não sobrepor texto
            if (parentSignature) {
                doc.addImage(parentSignature, 'PNG', margin + 80, y - 10, signatureWidth, signatureHeight);
            }
            dottedLine(margin + 80, y - 1, 90);
            doc.setFontSize(10);
            doc.text("Assinatura do(a) CONTRATANTE (Responsável):", margin, y);
            y += 15;

            // 2. Driver Signature - posicionada mais à direita
            if (settings?.driverSignature) {
                doc.addImage(settings.driverSignature, 'PNG', margin + 80, y - 10, signatureWidth, signatureHeight);
            }
            dottedLine(margin + 80, y - 1, 90);
            doc.text("Assinatura do CONTRATADO (Monitor):", margin, y);

            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            y += 12;
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`Documento gerado em ${dateStr}.`, margin, y);

            // Save/Share
            const base64 = doc.output('datauristring').split(',')[1];
            const fileName = `contrato_${student.name.replace(/\s+/g, '_')}.pdf`;

            if (Capacitor.isNativePlatform()) {
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache
                });
                await Share.share({
                    title: `Contrato - ${student.name}`,
                    text: `Segue contrato assinado de ${student.name}`,
                    url: result.uri,
                    dialogTitle: 'Compartilhar Contrato'
                });
            } else {
                doc.save(fileName);
            }

        } catch (e: any) {
            console.error(e);
            alert("Erro ao gerar PDF: " + e.message);
        }
    };

    if (loading) return <div className="p-10 text-white text-center">Carregando...</div>;

    return (
        <div className="p-4 pb-20 text-white">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 bg-navy-800 rounded-full text-gray-400">
                    <Icon name="arrow-left" size={24} />
                </button>
                <h2 className="text-2xl font-bold">Contratos Digitais 📝</h2>
            </div>

            <div className="space-y-6">
                {/* 1. Driver Signature Status */}
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <h3 className="text-primary-400 font-bold mb-3 flex items-center gap-2 text-sm">
                        <Icon name="user" size={18} />
                        Sua Assinatura (Monitor)
                    </h3>
                    {settings?.driverSignature ? (
                        <div className="flex items-center gap-4 p-3 bg-navy-900 rounded-lg border border-green-500/30">
                            <div className="bg-white p-1 rounded h-12 w-24 flex items-center justify-center">
                                <img src={settings.driverSignature} alt="Assinatura" className="max-h-full" />
                            </div>
                            <div className="flex-1">
                                <p className="text-green-400 text-xs font-bold">Assinatura Salva!</p>
                                <p className="text-[10px] text-gray-500">Será aplicada automaticamente.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
                            <p className="text-red-400 text-xs font-medium">Você ainda não salvou sua assinatura no Perfil.</p>
                            <button
                                onClick={() => navigate('/attendance')} // Redirect to trigger profile modal or just warn
                                className="text-xs bg-red-500 text-white px-2 py-1 rounded font-bold"
                            >
                                Ir ao Perfil
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Select Student */}
                <div className="bg-navy-800 p-4 rounded-xl border border-navy-700">
                    <h3 className="text-accent-400 font-bold mb-4 flex items-center gap-2 text-sm">
                        <Icon name="users" size={18} />
                        Selecionar Aluno
                    </h3>
                    <select
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                        className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg"
                    >
                        <option value="">Selecione um aluno...</option>
                        {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* 3. Parent Signature Status */}
                {selectedStudentId && (
                    <div className="bg-navy-800 p-4 rounded-xl border border-navy-700 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-indigo-400 font-bold flex items-center gap-2 text-sm">
                                <Icon name="edit-3" size={18} />
                                Assinatura do Responsável
                            </h3>
                            <button
                                onClick={() => fetchSignature(selectedStudentId, true)}
                                className="text-[10px] text-gray-500 flex items-center gap-1 hover:text-white"
                            >
                                <Icon name="refresh-cw" size={12} /> Sincronizar
                            </button>
                        </div>

                        {parentSignature ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-4 p-3 bg-navy-900 rounded-lg border border-green-500/30">
                                    <div className="bg-white p-1 rounded h-12 w-24 flex items-center justify-center">
                                        <img src={parentSignature} alt="Assinatura Responsável" className="max-h-full" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-green-400 text-xs font-bold">Assinatura Capturada!</p>
                                        <button
                                            onClick={() => handleSaveLocalSignature('')}
                                            className="text-[10px] text-red-400 underline"
                                        >
                                            Remover e Assinar Novamente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsSigningLocal(true)}
                                    className="flex flex-col items-center justify-center p-4 bg-navy-900 border border-navy-600 rounded-xl hover:bg-navy-700 transition"
                                >
                                    <Icon name="smartphone" size={24} className="mb-2 text-accent-400" />
                                    <span className="text-xs font-bold">Assinar no Meu Celular</span>
                                </button>
                                <button
                                    onClick={handleGenerateLink}
                                    disabled={isGeneratingLink}
                                    className="flex flex-col items-center justify-center p-4 bg-navy-900 border border-navy-600 rounded-xl hover:bg-navy-700 transition"
                                >
                                    <Icon name={isGeneratingLink ? "refresh-cw" : "share-2"} size={24} className={`mb-2 ${isGeneratingLink ? 'animate-spin' : 'text-primary-400'}`} />
                                    <span className="text-xs font-bold text-center">Enviar Link WhatsApp</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Final Action */}
                <button
                    onClick={generatePDF}
                    disabled={!selectedStudentId || !settings?.driverName || !parentSignature}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold p-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition"
                >
                    <Icon name="file-text" size={24} />
                    {parentSignature ? 'Gerar PDF Contrato Assinado' : 'Aguardando Assinatura'}
                </button>

                {/* Hints */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg flex gap-3">
                    <Icon name="info" size={20} className="text-yellow-500 shrink-0" />
                    <p className="text-[11px] text-yellow-200/80 leading-relaxed">
                        Ao usar a assinatura digital, o PDF terá validade administrativa rápida.
                        Para validade jurídica plena, certifique-se de recolher os dados do dispositivo no link enviado.
                    </p>
                </div>
            </div>

            {/* Local Signing Modal */}
            {isSigningLocal && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                    <div className="bg-navy-800 p-6 rounded-2xl w-full max-w-sm border border-navy-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold">Assinatura Local</h3>
                            <button onClick={() => setIsSigningLocal(false)}><Icon name="x" /></button>
                        </div>
                        <div className="bg-white p-2 rounded-xl mb-6">
                            <SignaturePad
                                onSave={(sig) => setParentSignature(sig)}
                                label="O pai/mãe deve assinar aqui"
                            />
                        </div>
                        <button
                            onClick={() => handleSaveLocalSignature(parentSignature)}
                            className="w-full bg-primary-600 py-3 rounded-xl font-bold"
                        >
                            Confirmar e Salvar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
