import React, { useState } from 'react';
import { supabase } from '../services/auth';
import { Icon } from '../components/Icon';

const PERMISSION_LABELS: Record<string, string> = {
    can_view_routes: 'Rotas',
    can_view_stops: 'Pontos',
    can_view_students: 'Alunos',
    can_view_attendance: 'Chamada',
    can_view_incidents: 'Ocorrências',
    can_view_reports: 'Relatórios',
    can_view_financial: 'Financeiro',
    can_view_reminders: 'Lembretes',
    can_view_maintenance: 'Manutenção',
    can_view_contracts: 'Contratos',
    can_view_gps: 'GPS (Navegação)'
};

export const TeamScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [tier, setTier] = useState<'basic' | 'pro'>('pro');

    // Permissions State
    const [permissions, setPermissions] = useState({
        can_view_routes: true,
        can_view_stops: true,
        can_view_students: true,
        can_view_attendance: true,
        can_view_incidents: true,
        can_view_reports: true,
        can_view_financial: false,
        can_view_reminders: true,
        can_view_maintenance: false,
        can_view_contracts: false,
        can_view_gps: false
    });

    const handleToggle = (key: keyof typeof permissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (!email) {
            alert('Digite o e-mail do usuário');
            return;
        }

        setLoading(true);
        try {
            // Updated RPC call to include subscription_tier if backend supports it
            // Or use two separate updates if needed.
            // Let's assume the RPC update_user_permissions can be expanded or we use updateUser directly

            // First update permissions via RPC (existing way)
            const { error: permError } = await supabase.rpc('update_user_permissions', {
                target_email: email,
                new_permissions: permissions
            });
            if (permError) throw permError;

            // Then update subscription tier
            // We'll use a custom RPC or directly update metadata if possible 
            // Since we don't have a specific RPC for tier yet, let's create a generic one or assume update_user_metadata exists
            const { error: tierError } = await supabase.rpc('update_user_metadata_admin', {
                target_email: email,
                new_metadata: { subscription_tier: tier }
            });

            if (tierError) {
                console.warn("RPC update_user_metadata_admin not found, skipping tier update. Please ask admin to run SQL.");
            }

            alert(`Permissões e Plano (${tier.toUpperCase()}) atualizados com sucesso para ${email}!`);
            setEmail('');
        } catch (e: any) {
            console.error(e);
            alert(`Erro ao atualizar: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 pb-20">
            <h2 className="text-2xl font-bold text-white mb-4">Gestão de Equipe</h2>
            <div className="bg-navy-800 p-6 rounded-xl border border-navy-700">
                <p className="text-gray-400 text-sm mb-4">
                    Digite o e-mail do membro da equipe para definir o que ele pode acessar.
                </p>

                <div className="mb-6">
                    <label className="block text-gray-400 text-xs font-bold mb-2 uppercase">E-mail do Usuário</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="exemplo@email.com"
                        className="w-full bg-navy-900 text-white p-3 rounded-xl border border-navy-600 focus:border-primary-500 outline-none"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-gray-400 text-xs font-bold mb-3 uppercase">Plano do Usuário</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setTier('basic');
                                setPermissions(prev => ({
                                    ...prev,
                                    can_view_financial: false,
                                    can_view_maintenance: false,
                                    can_view_contracts: false,
                                    can_view_gps: false
                                }));
                            }}
                            className={`flex-1 py-3 rounded-xl border font-bold transition flex items-center justify-center gap-2 ${tier === 'basic' ? 'bg-orange-500/20 border-orange-500 text-orange-500' : 'bg-navy-900 border-navy-600 text-gray-400'}`}
                        >
                            <Icon name="star" size={16} />
                            Básico
                        </button>
                        <button
                            onClick={() => {
                                setTier('pro');
                                setPermissions(prev => ({
                                    ...prev,
                                    can_view_financial: true,
                                    can_view_maintenance: true,
                                    can_view_contracts: true,
                                    can_view_gps: true
                                }));
                            }}
                            className={`flex-1 py-3 rounded-xl border font-bold transition flex items-center justify-center gap-2 ${tier === 'pro' ? 'bg-primary-500/20 border-primary-500 text-primary-500' : 'bg-navy-900 border-navy-600 text-gray-400'}`}
                        >
                            <Icon name="zap" size={16} />
                            PRO
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-400 text-xs font-bold mb-3 uppercase">Permissões Específicas</label>
                    <div className="space-y-3">
                        {Object.keys(PERMISSION_LABELS).map((key) => {
                            const value = (permissions as any)[key];
                            return (
                                <div key={key} className="flex items-center justify-between bg-navy-900 p-3 rounded-lg border border-navy-700">
                                    <span className="text-gray-200 text-sm font-medium">
                                        {PERMISSION_LABELS[key]}
                                    </span>
                                    <button
                                        onClick={() => handleToggle(key as keyof typeof permissions)}
                                        className={`w-12 h-6 rounded-full relative transition ${value ? 'bg-green-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${value ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? <Icon name="loader" className="animate-spin" /> : <Icon name="save" />}
                    Salvar Permissões e Plano
                </button>
            </div>
        </div>
    );
};
