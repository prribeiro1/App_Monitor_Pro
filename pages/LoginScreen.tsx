import React, { useState } from 'react';
import { authService } from '../services/auth';
import { Icon } from '../components/Icon';

export const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.signIn(username, password);
      // O App.tsx vai detectar a mudança de sessão automaticamente
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('Invalid login')) {
        setError('Usuário ou senha incorretos.');
      } else {
        setError('Erro ao entrar. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="bg-navy-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-navy-700">

        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="bg-white w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-2xl border-4 border-white/20">
            <img src="/logo_vep.png" alt="Logo Van Escolar Pro" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Van Escolar Pro</h1>
          <p className="text-gray-400 text-sm mt-1">Área Restrita</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Usuário</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="user" size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-navy-900 text-white pl-10 p-3 rounded-xl border border-navy-700 w-full focus:border-primary-500 focus:outline-none transition"
                placeholder="Seu usuário de acesso"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="lock" size={18} className="text-gray-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-navy-900 text-white pl-10 p-3 rounded-xl border border-navy-700 w-full focus:border-primary-500 focus:outline-none transition"
                placeholder="Sua senha secreta"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold p-4 rounded-xl shadow-lg shadow-primary-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <div className="pt-4 border-t border-navy-700/50">
            <p className="text-gray-400 text-sm mb-4">Novo por aqui?</p>
            <button
              onClick={() => window.location.hash = '/register'}
              className="w-full bg-navy-700 hover:bg-navy-600 text-white font-bold p-4 rounded-xl transition flex items-center justify-center gap-2 border border-navy-600"
            >
              <Icon name="user-plus" size={20} />
              Criar Conta Grátis (7 dias)
            </button>
          </div>

          <p className="text-gray-500 text-[10px] mt-4 uppercase font-bold tracking-widest">Ou se preferir</p>

          <a
            href="https://wa.me/5522999837547?text=Olá! Gostaria de adquirir um acesso ao Van Escolar Pro."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-green-500/20 text-green-500 hover:bg-green-500/5 transition text-xs font-medium"
          >
            <Icon name="message-circle" size={18} />
            Solicitar via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};