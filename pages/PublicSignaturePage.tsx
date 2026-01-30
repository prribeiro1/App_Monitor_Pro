import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/auth';
import { SignaturePad } from '../components/SignaturePad';
import { Icon } from '../components/Icon';

const DEFAULT_CLAUSES = [
    { title: "CLÁUSULA 1ª - DO OBJETO", content: "O presente contrato tem como objeto a prestação de serviços de transporte escolar do(a) aluno(a) {{ALUNO}}, conforme rota e horários previamente definidos entre as partes." },
    { title: "CLÁUSULA 2ª - DA VIGÊNCIA E RESCISÃO", content: "O presente contrato tem validade para o ano letivo vigente, podendo ser renovado ou rescindido por qualquer uma das partes mediante aviso prévio." },
    { title: "CLÁUSULA 3ª - DO VALOR E PAGAMENTO", content: "Pelos serviços prestados, o(a) CONTRATANTE pagará ao CONTRATADO o valor de {{VALOR}}, com vencimento todo dia {{DIA}} de cada mês." },
    { title: "CLÁUSULA 4ª - DAS RESPONSABILIDADES", content: "O CONTRATADO compromete-se a realizar o transporte do aluno com zelo e pontualidade. O CONTRATANTE compromete-se a cumprir os horários acordados." }
];

export const PublicSignaturePage: React.FC = () => {
    const { contractId } = useParams();
    const [searchParams] = useSearchParams();

    // Data from URL (Fallback)
    const driverName = searchParams.get('d') || '';
    const studentName = searchParams.get('s') || '';
    const monthlyFee = searchParams.get('v') || '';
    const dueDay = searchParams.get('dia') || '';

    const [loading, setLoading] = useState(!!contractId);
    const [agreed, setAgreed] = useState(false);
    const [signature, setSignature] = useState('');
    const [signed, setSigned] = useState(false);
    const [dbContract, setDbContract] = useState<any>(null);
    const [showClauses, setShowClauses] = useState(false);

    useEffect(() => {
        if (contractId) {
            const fetchContract = async () => {
                console.log('[PublicPage] Buscando contrato ID:', contractId);
                const { data, error } = await supabase
                    .from('contract_requests')
                    .select('*')
                    .eq('id', contractId)
                    .single();

                console.log('[PublicPage] Resultado:', { data, error });

                if (error) {
                    console.error('[PublicPage] Erro:', error);
                    alert('Erro ao carregar contrato: ' + error.message);
                }

                if (data) {
                    console.log('[PublicPage] Dados do contrato:', {
                        student_name: data.student_name,
                        responsible_name: data.responsible_name,
                        contract_clauses: data.contract_clauses,
                        status: data.status
                    });
                    setDbContract(data);
                }
                setLoading(false);
            };
            fetchContract();
        }
    }, [contractId]);

    const handleSave = async () => {
        if (!agreed) {
            alert("Você precisa concordar com os termos antes de assinar.");
            return;
        }

        if (!signature) {
            alert("Por favor, assine antes de confirmar.");
            return;
        }

        try {
            if (contractId) {
                const { error } = await supabase
                    .from('contract_requests')
                    .update({
                        parent_signature: signature,
                        status: 'signed',
                        signed_at: new Date().toISOString(),
                        signer_metadata: {
                            userAgent: navigator.userAgent,
                            platform: navigator.platform,
                            language: navigator.language
                        }
                    })
                    .eq('id', contractId);

                if (error) throw error;
            }
            setSigned(true);
        } catch (e: any) {
            alert("Erro ao salvar assinatura: " + e.message);
        }
    };

    // Parse clauses from DB or use defaults
    const getClauses = () => {
        if (dbContract?.contract_clauses) {
            try {
                const parsed = JSON.parse(dbContract.contract_clauses);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error("Erro ao parsear cláusulas:", e);
            }
        }
        return DEFAULT_CLAUSES;
    };

    const processClauseContent = (content: string) => {
        const student = dbContract?.student_name || studentName;
        const fee = dbContract?.monthly_fee || monthlyFee;
        const day = dbContract?.due_day || dueDay;

        return content
            .replace(/{{ALUNO}}/g, student?.toUpperCase() || '____')
            .replace(/{{VALOR}}/g, fee ? `R$ ${parseFloat(fee).toFixed(2)}` : '____')
            .replace(/{{DIA}}/g, day?.toString() || '____');
    };

    if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Carregando contrato...</div>;

    if (signed) {
        return (
            <div className="min-h-screen bg-navy-900 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <Icon name="check" size={40} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Assinado com Sucesso!</h2>
                <p className="text-gray-400">Obrigado. O motorista já recebeu sua assinatura e o contrato está validado.</p>
            </div>
        );
    }

    const displayStudent = dbContract?.student_name || studentName;
    const displayDriver = dbContract?.driver_name || driverName;
    const displayResponsible = dbContract?.responsible_name || displayStudent;
    const displayCpf = dbContract?.responsible_cpf || searchParams.get('cpf') || '';
    const displayTel = dbContract?.responsible_phone || searchParams.get('tel') || '';
    const clauses = getClauses();

    return (
        <div className="min-h-screen bg-navy-900 p-4 text-white">
            <div className="max-w-md mx-auto space-y-6 pt-6 pb-12">
                <div className="text-center">
                    <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-lg">
                        <img src="/VEP_LOGO.png" alt="Logo" className="w-full h-full object-contain rounded-xl" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Contrato de Transporte ✍️</h1>
                    <p className="text-gray-400 text-sm">Leia o contrato e assine ao final</p>
                </div>

                {/* Contract Summary Card */}
                <div className="bg-navy-800 p-5 rounded-2xl border border-navy-700 shadow-xl">
                    <h3 className="text-primary-400 font-bold mb-4 uppercase text-xs tracking-wider">Dados do Contrato</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-navy-700 pb-2">
                            <span className="text-gray-400">Aluno(a):</span>
                            <span className="text-white font-medium">{displayStudent || '---'}</span>
                        </div>
                        <div className="flex justify-between border-b border-navy-700 pb-2">
                            <span className="text-gray-400">Responsável:</span>
                            <span className="text-white font-medium">{displayResponsible || '---'}</span>
                        </div>
                        {displayCpf && (
                            <div className="flex justify-between border-b border-navy-700 pb-2">
                                <span className="text-gray-400">CPF:</span>
                                <span className="text-white">{displayCpf}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-b border-navy-700 pb-2">
                            <span className="text-gray-400">Motorista:</span>
                            <span className="text-white">{displayDriver || '---'}</span>
                        </div>
                        <div className="flex justify-between border-b border-navy-700 pb-2">
                            <span className="text-gray-400">Mensalidade:</span>
                            <span className="text-accent-400 font-bold">R$ {dbContract?.monthly_fee || monthlyFee || '---'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Vencimento:</span>
                            <span className="text-white">Todo dia {dbContract?.due_day || dueDay || '---'}</span>
                        </div>
                    </div>
                </div>

                {/* Contract Clauses Section */}
                <div className="bg-navy-800 rounded-2xl border border-navy-700 overflow-hidden">
                    <button
                        onClick={() => setShowClauses(!showClauses)}
                        className="w-full p-4 flex justify-between items-center text-left hover:bg-navy-700 transition"
                    >
                        <span className="text-primary-400 font-bold text-sm flex items-center gap-2">
                            <Icon name="file-text" size={18} />
                            {showClauses ? 'Ocultar Cláusulas' : 'Ver Cláusulas do Contrato'}
                        </span>
                        <Icon name={showClauses ? "chevron-up" : "chevron-down"} size={20} className="text-gray-400" />
                    </button>

                    {showClauses && (
                        <div className="p-4 pt-0 space-y-4 border-t border-navy-700">
                            {clauses.map((clause: { title: string; content: string }, index: number) => (
                                <div key={index} className="text-xs">
                                    <h4 className="text-primary-300 font-bold mb-1">{clause.title}</h4>
                                    <p className="text-gray-300 leading-relaxed">{processClauseContent(clause.content)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Legal Notice & Checkbox */}
                <div
                    onClick={() => setAgreed(!agreed)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${agreed
                        ? 'bg-green-500/10 border-green-500/50 text-green-200'
                        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200/80'
                        }`}
                >
                    <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${agreed ? 'bg-green-600 border-green-600' : 'bg-transparent border-yellow-500/50'
                        }`}>
                        {agreed && <Icon name="check" size={16} className="text-white" />}
                    </div>
                    <div>
                        <p className="text-xs font-medium leading-relaxed">
                            Eu li e concordo com todas as cláusulas do contrato de transporte escolar descritas acima e confirmo a veracidade dos dados do aluno e responsável.
                        </p>
                        {!agreed && <p className="text-[10px] mt-1 text-yellow-500 font-bold uppercase animate-pulse">Marque aqui para assinar</p>}
                    </div>
                </div>

                {/* Signature Pad */}
                <div className="bg-white p-2 rounded-2xl">
                    <SignaturePad
                        onSave={setSignature}
                        label="Assinatura do Responsável"
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSave}
                    disabled={!signature}
                    className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition text-lg flex items-center justify-center gap-2"
                >
                    <Icon name="check" size={24} />
                    Confirmar Assinatura
                </button>
            </div>
        </div>
    );
};
