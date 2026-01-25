import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Device } from '@capacitor/device';

// --- CONFIGURAÇÃO DO SUPABASE ---
// ⚠️⚠️⚠️ ATENÇÃO: HARDCODED PARA DESENVOLVIMENTO ⚠️⚠️⚠️
// TODO: ANTES DE FAZER MERGE NA MAIN, REVERTER PARA USAR .env
// Branch: feature/feedback-condutores
// Projeto: DESENVOLVIMENTO (bkwrflgrfhsgeowjynou)
const SUPABASE_URL = 'https://bkwrflgrfhsgeowjynou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrd3JmbGdyZmhzZ2Vvd2p5bm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDEyNjEsImV4cCI6MjA4NDkxNzI2MX0.w4Y8o4hQ3Sq2NZTcVasqQUE85QcPjdlJc2zUzYxLzzM';

// ALERTA VISUAL NO CONSOLE
console.warn('⚠️⚠️⚠️ ATENÇÃO: USANDO PROJETO DE DESENVOLVIMENTO HARDCODED! ⚠️⚠️⚠️');
console.warn('🔴 NÃO FAZER MERGE NA MAIN SEM REVERTER!');
console.warn('📝 Arquivo: services/auth.ts');

// Log para debug
console.log('🔧 Supabase Config:');
console.log('   URL:', SUPABASE_URL);
console.log('   Environment: development (hardcoded)');
console.log('   Mode:', import.meta.env.MODE);

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

            // 2. Trava de Dispositivo (Device Lock)
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
