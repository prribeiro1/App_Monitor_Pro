import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Device } from '@capacitor/device';

// --- CONFIGURAÇÃO DINÂMICA DO SUPABASE ---
// O Vite carrega automaticamente o .env correto baseado no modo (dev ou build)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log para conferência
console.log('🔧 Van Pro - Inicializando...');
console.log('   Modo:', import.meta.env.MODE);
console.log('   URL:', SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERRO: Variáveis de ambiente não encontradas! Verifique os arquivos .env');
}


// Sufixo para "esconder" o e-mail
const EMAIL_SUFFIX = '@monitorescolar.app';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const authService = {


    // Login com "Usuário" (transformado em e-mail internamente)
    signIn: async (username: string, password: string) => {
        try {
            // Limpa o usuário e adiciona o sufixo
            const cleanUsername = username.trim().toLowerCase();
            const email = `${cleanUsername}${EMAIL_SUFFIX}`;

            // 1. Login no Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            if (!data.user) throw new Error("Usuário não encontrado.");

            // 2. Trava de Dispositivo (Device Lock) - APENAS EM APPS NATIVOS
            const isNativeApp = window.Capacitor?.isNativePlatform?.() || false;

            if (isNativeApp) {
                const deviceId = (await Device.getId()).identifier;
                const userDeviceId = data.user.user_metadata?.device_id;

                if (!userDeviceId) {
                    // Primeiro acesso: Vincula este dispositivo ao usuário
                    const { error: updateError } = await supabase.auth.updateUser({
                        data: { device_id: deviceId }
                    });
                    if (updateError) throw updateError;
                } else if (userDeviceId !== deviceId && cleanUsername !== 'google_test' && cleanUsername !== 'teste') {
                    // Dispositivo diferente: Bloqueia (EXCETO para o usuário de teste)
                    await supabase.auth.signOut();
                    throw new Error("Este usuário já está vinculado a outro dispositivo. Entre em contato com o suporte para resetar.");
                }
            }

            return data;
        } catch (error) {
            console.error("Erro no login:", error);
            throw error;
        }
    },

    // Logout
    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Criar conta (Novo!)
    signUp: async (username: string, password: string, name: string) => {
        try {
            const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const email = `${cleanUsername}${EMAIL_SUFFIX}`;
            const deviceId = (await Device.getId()).identifier;

            // 1. Criar usuário no Supabase
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        device_id: deviceId,
                        subscription_tier: 'basic', // Começa no básico (ou trial)
                        trial_started_at: new Date().toISOString()
                    }
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Erro no cadastro:", error);
            throw error;
        }
    },

    // Verificar usuário atual
    getCurrentUser: async (): Promise<User | null> => {
        const { data } = await supabase.auth.getUser();
        return data.user;
    },

    // Helper para pegar o nome de usuário (sem o sufixo)
    getUsernameFromEmail: (email?: string) => {
        if (!email) return '';
        return email.replace(EMAIL_SUFFIX, '');
    }
};
