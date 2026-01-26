import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/auth';
import { Icon } from '../components/Icon';

export const PublicStudentRegister: React.FC = () => {
    const { driverId } = useParams<{ driverId: string }>();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        guardianName: '',
        contact: '',
        responsibleEmail: '',
        school: '',
        shift: 'morning',
        address: '',
        observation: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driverId) {
            setError('Link inválido. Peça um novo link ao condutor.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Inserir o aluno diretamente no Supabase
            // Usamos snake_case para as colunas do banco
            const { error: insertError } = await supabase.from('students').insert({
                id: crypto.randomUUID(),
                user_id: driverId, // Vincula ao condutor dono do link
                name: formData.name,
                guardian_name: formData.guardianName,
                contact: formData.contact,
                responsible_email: formData.responsibleEmail,
                school: formData.school,
                shift: formData.shift,
                address: formData.address,
                observation: formData.observation,
                active: true,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });

            if (insertError) throw insertError;
            setSuccess(true);
        } catch (err: any) {
            console.error('Erro ao cadastrar:', err);
            setError(err.message || 'Erro ao enviar cadastro. Verifique sua conexão e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6 text-center">
                <div className="bg-navy-800 p-8 rounded-3xl border border-green-500/30 max-w-sm shadow-2xl">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Icon name="check" size={40} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Cadastro Realizado!</h2>
                    <p className="text-gray-400 mb-8">
                        Os dados da criança <strong>{formData.name}</strong> foram enviados com sucesso para o condutor.
                    </p>
                    <div className="text-sm text-gray-500">
                        Você já pode fechar esta página.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-navy-900 p-4 pb-12">
            <div className="max-w-md mx-auto">
                {/* Header/Branding */}
                <div className="text-center mb-8 pt-8">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-900/40">
                        <Icon name="face" size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Ficha de Cadastro</h1>
                    <p className="text-gray-400 text-sm mt-1">Facilidade para você e segurança para seu filho</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 bg-navy-800 p-6 rounded-3xl border border-navy-700 shadow-xl">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-medium flex gap-2">
                            <Icon name="alert-circle" size={18} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Nome da Criança</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition"
                            placeholder="Nome completo do aluno"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Responsável</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition"
                            placeholder="Seu nome completo"
                            value={formData.guardianName}
                            onChange={e => setFormData({ ...formData, guardianName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Celular (WhatsApp)</label>
                            <input
                                type="tel"
                                required
                                className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition"
                                placeholder="(00) 00000-0000"
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Período</label>
                            <select
                                className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition"
                                value={formData.shift}
                                onChange={e => setFormData({ ...formData, shift: e.target.value })}
                            >
                                <option value="morning">Manhã</option>
                                <option value="afternoon">Tarde</option>
                                <option value="full">Integral/Ambos</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">E-mail</label>
                        <input
                            type="email"
                            className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition"
                            placeholder="seu@email.com"
                            value={formData.responsibleEmail}
                            onChange={e => setFormData({ ...formData, responsibleEmail: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Escola</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition"
                            placeholder="Nome da escola"
                            value={formData.school}
                            onChange={e => setFormData({ ...formData, school: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Endereço Completo</label>
                        <textarea
                            required
                            rows={3}
                            className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition resize-none"
                            placeholder="Rua, número, bairro e pontos de referência"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1 ml-1 uppercase">Observações (Saúde, etc)</label>
                        <textarea
                            rows={2}
                            className="w-full bg-navy-900 border border-navy-700 text-white p-4 rounded-xl focus:border-primary-500 outline-none transition resize-none"
                            placeholder="Ex: Alergias, quem pode retirar, restrições..."
                            value={formData.observation}
                            onChange={e => setFormData({ ...formData, observation: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <>
                                <Icon name="loader" className="animate-spin" size={20} />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Icon name="send" size={20} />
                                Finalizar Cadastro
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-gray-500 text-center mt-4 uppercase tracking-widest font-bold">
                        Sistema Monitor Escolar PRO
                    </p>
                </form>
            </div>
        </div>
    );
};
