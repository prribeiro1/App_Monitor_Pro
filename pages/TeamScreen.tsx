import React, { useState } from 'react';
import { supabase } from '../services/auth';
import { Icon } from '../components/Icon';

export const TeamScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Permissions State
    const [permissions, setPermissions] = useState({
        can_view_routes: true,
        can_view_stops: true,
        can_view_students: true,
        can_view_attendance: true,
        can_view_incidents: true,
        can_view_reports: true,
        can_view_financial: false,
        can_view_reminders: true
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
            const { error } = await supabase.rpc('update_user_permissions', {
                target_email: email,
                new_permissions: permissions
            });

            if (error) throw error;

            alert(`Permissões atualizadas com sucesso para ${email}!`);
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
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="exemplo@email.com"
                            className="flex-1 bg-navy-900 text-white p-3 rounded-xl border border-navy-600 focus:border-primary-500 outline-none"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-400 text-xs font-bold mb-3 uppercase">Permissões de Acesso</label>
                    <div className="space-y-3">
                        {Object.entries(permissions).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between bg-navy-900 p-3 rounded-lg border border-navy-700">
                                <span className="text-gray-200 text-sm font-medium">
                                    {key.replace('can_view_', '').replace('_', ' ').toUpperCase()}
                                </span>
                                <button
                                    onClick={() => handleToggle(key as keyof typeof permissions)}
                                    className={`w-12 h-6 rounded-full relative transition ${value ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${value ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? <Icon name="loader" className="animate-spin" /> : <Icon name="save" />}
                    Salvar Permissões
                </button>
            </div>
        </div>
    );
};
