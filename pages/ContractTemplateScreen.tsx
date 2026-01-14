import React, { useState } from 'react';
import { UserSettings } from '../types';
import { Icon } from '../components/Icon';

interface ContractTemplateScreenProps {
    settings: UserSettings | null;
    onSave: (settings: UserSettings) => Promise<void>;
    onBack: () => void;
}

const DEFAULT_CLAUSES = [
    { title: "CLÁUSULA 1ª - DO OBJETO", content: "O presente contrato tem como objeto a prestação de serviços de transporte escolar do(a) aluno(a) {{ALUNO}}, conforme rota e horários previamente definidos entre as partes." },
    { title: "CLÁUSULA 2ª - DA VIGÊNCIA E RESCISÃO", content: "O presente contrato tem validade para o ano letivo vigente, podendo ser renovado ou rescindido por qualquer uma das partes mediante aviso prévio." },
    { title: "CLÁUSULA 3ª - DO VALOR E PAGAMENTO", content: "Pelos serviços prestados, o(a) CONTRATANTE pagará ao CONTRATADO o valor de {{VALOR}}, com vencimento todo dia {{DIA}} de cada mês." },
    { title: "CLÁUSULA 4ª - DAS RESPONSABILIDADES", content: "O CONTRATADO compromete-se a realizar o transporte do aluno com zelo e pontualidade. O CONTRATANTE compromete-se a cumprir os horários acordados." }
];

export const ContractTemplateScreen: React.FC<ContractTemplateScreenProps> = ({ settings, onSave, onBack }) => {
    const [clauses, setClauses] = useState(settings?.contractClauses || DEFAULT_CLAUSES);

    const handleSave = async () => {
        if (!settings) return;
        await onSave({ ...settings, contractClauses: clauses });
        alert("Modelo de contrato salvo com sucesso!");
        onBack();
    };

    const updateClause = (index: number, field: 'title' | 'content', value: string) => {
        const newClauses = [...clauses];
        newClauses[index] = { ...newClauses[index], [field]: value };
        setClauses(newClauses);
    };

    const addClause = () => {
        setClauses([...clauses, { title: `CLÁUSULA ${clauses.length + 1}ª - NOVO TÍTULO`, content: "" }]);
    };

    const removeClause = (index: number) => {
        if (confirm("Deseja remover esta cláusula?")) {
            setClauses(clauses.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="p-4 pb-24 text-white">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={onBack} className="p-2 bg-navy-800 rounded-full text-gray-400">
                    <Icon name="arrow-left" size={24} />
                </button>
                <h2 className="text-2xl font-bold">Editar Modelo 📝</h2>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl mb-6 flex gap-3">
                <Icon name="info" className="text-blue-400 shrink-0" size={20} />
                <div className="text-xs text-blue-200/80 space-y-1">
                    <p>Use as etiquetas abaixo para preenchimento dinâmico:</p>
                    <p><strong>{"{{ALUNO}}"}</strong> - Nome do Aluno</p>
                    <p><strong>{"{{VALOR}}"}</strong> - Valor da Mensalidade</p>
                    <p><strong>{"{{DIA}}"}</strong> - Dia do Vencimento</p>
                </div>
            </div>

            <div className="space-y-6">
                {clauses.map((clause, index) => (
                    <div key={index} className="bg-navy-800 p-4 rounded-xl border border-navy-700 relative group">
                        <button
                            onClick={() => removeClause(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"
                        >
                            <Icon name="x" size={16} />
                        </button>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Título da Cláusula</label>
                                <input
                                    type="text"
                                    value={clause.title}
                                    onChange={(e) => updateClause(index, 'title', e.target.value)}
                                    className="w-full bg-navy-900 border border-navy-700 p-2 rounded text-sm font-bold text-primary-400"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Conteúdo</label>
                                <textarea
                                    value={clause.content}
                                    onChange={(e) => updateClause(index, 'content', e.target.value)}
                                    className="w-full bg-navy-900 border border-navy-700 p-2 rounded text-xs min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addClause}
                    className="w-full border-2 border-dashed border-navy-700 p-4 rounded-xl text-gray-500 hover:text-gray-300 hover:border-navy-500 transition flex items-center justify-center gap-2"
                >
                    <Icon name="plus" size={20} />
                    Adicionar Nova Cláusula
                </button>

                <div className="pt-8 pb-20">
                    <button
                        onClick={handleSave}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
                    >
                        <Icon name="save" size={24} />
                        Salvar Modelo de Contrato
                    </button>
                </div>
            </div>
        </div>
    );
};
