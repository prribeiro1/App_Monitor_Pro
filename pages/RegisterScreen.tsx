import React, { useState } from 'react';
import { authService } from '../services/auth';
import { Icon } from '../components/Icon';

export const RegisterScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (username.length < 3) {
            setError('O usuário deve ter pelo menos 3 caracteres.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authService.signUp(username, password, name);
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            if (err.message.includes('User already registered')) {
                setError('Este nome de usuário já está em uso. Escolha outro.');
            } else {
                setError(err.message || 'Erro ao criar conta. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
                <div className="bg-navy-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-navy-700 text-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <Icon name="check" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Conta Criada!</h2>
                    <p className="text-gray-400 mb-8">
                        Seja bem-vindo ao Monitor Pro. Agora você pode entrar com seu usuário e senha.
                    </p>
                    <button
                        onClick={() => window.location.hash = '/login'}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold p-4 rounded-xl shadow-lg transition"
                    >
                        Ir para Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
            <div className="bg-navy-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-navy-700">

                <button
                    onClick={() => window.location.hash = '/login'}
                    className="mb-6 text-gray-500 hover:text-white transition flex items-center gap-2 text-sm"
                >
                    <Icon name="arrow-left" size={16} />
                    Voltar
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
                    <p className="text-gray-400 text-sm">Comece seus 7 dias de teste grátis</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-2 pl-1">Nome Completo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Icon name="user" size={18} className="text-gray-500" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-navy-900 text-white pl-12 p-4 rounded-2xl border border-navy-700 w-full focus:border-primary-500 focus:outline-none transition"
                                placeholder="Como quer ser chamado?"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-2 pl-1">Usuário (Sem espaços)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                                @
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                                className="bg-navy-900 text-white pl-12 p-4 rounded-2xl border border-navy-700 w-full focus:border-primary-500 focus:outline-none transition"
                                placeholder="joao_van"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase mb-2 pl-1">Senha (Mín. 6 dígitos)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Icon name="lock" size={18} className="text-gray-500" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-navy-900 text-white pl-12 p-4 rounded-2xl border border-navy-700 w-full focus:border-primary-500 focus:outline-none transition"
                                placeholder="Crie uma senha segura"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold p-4 rounded-2xl shadow-xl shadow-primary-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Icon name="loader" className="animate-spin" />
                                Criando Conta...
                            </>
                        ) : 'Começar Agora'}
                    </button>

                    <p className="text-[10px] text-gray-500 text-center px-4">
                        Ao criar uma conta, você concorda com nossos Termos de Uso e Política de Privacidade.
                    </p>
                </form>
            </div>
        </div>
    );
};
