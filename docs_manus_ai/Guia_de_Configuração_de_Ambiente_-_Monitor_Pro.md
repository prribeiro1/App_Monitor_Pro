Guia de Configuração de Ambiente -
Monitor Pro
Este guia explica como configurar seu projeto para alternar automaticamente entre o
projeto de Desenvolvimento (testes) e o de Produção (Play Store) sem precisar alterar o
código manualmente.
1. Configuração dos Arquivos .env
O Vite (seu sistema de build) só reconhece variáveis que começam com VITE_ . Certifique-se
de que seus arquivos na raiz do projeto estejam assim:
Arquivo: .env.development
Plain Text
VITE_SUPABASE_URL=https://seu-projeto-teste.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-de-teste
Arquivo: .env.production
Plain Text
VITE_SUPABASE_URL=https://seu-projeto-producao.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-de-producao
2. Atualização do Arquivo services/auth.ts
Substitua o conteúdo do seu arquivo services/auth.ts pelo código abaixo. Ele foi projetado
para ler as variáveis do .env e só usar valores fixos se algo falhar.
TypeScript
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Device } from '@capacitor/device';
// --- CONFIGURAÇÃO DINÂMICA DO SUPABASE ---
// O Vite carrega automaticamente o .env correto baseado no modo (dev ou build )
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Log para você conferir no console qual projeto está ativo
console.log('🔧 Monitor Pro - Inicializando...');
console.log(' Modo:', import.meta.env.MODE);
console.log(' URL:', SUPABASE_URL);
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
console.error('❌ ERRO: Variáveis de ambiente não encontradas! Verifique se
}
// Sufixo para "esconder" o e-mail
const EMAIL_SUFFIX = '@monitorescolar.app';
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON
export const authService = {
// Login com "Usuário"
signIn: async (username: string, password: string) => {
try {
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
const isNativeApp = window.Capacitor?.isNativePlatform?.() || false
if (isNativeApp) {
const deviceId = (await Device.getId()).identifier;
const userDeviceId = data.user.user_metadata?.device_id;
// Se for usuário de teste, ignora a trava
const isTestUser = cleanUsername === 'google_test' || cleanUser
if (!userDeviceId) {
// Primeiro acesso: Vincula este dispositivo ao usuário
const { error: updateError } = await supabase.auth.updateUse
data: { device_id: deviceId }
});
if (updateError) throw updateError;
} else if (userDeviceId !== deviceId && !isTestUser) {
// Dispositivo diferente: Bloqueia (EXCETO para usuários de
await supabase.auth.signOut();
throw new Error("Este usuário já está vinculado a outro disp
}
}
return data;
} catch (error) {
console.error("Erro no login:", error);
throw error;
}
},
signOut: async () => {
const { error } = await supabase.auth.signOut();
if (error) throw error;
},
signUp: async (username: string, password: string, name: string) => {
try {
const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0
const email = `${cleanUsername}${EMAIL_SUFFIX}`;
const deviceId = (await Device.getId()).identifier;
const { data, error } = await supabase.auth.signUp({
email,
password,
options: {
data: {
full_name: name,
device_id: deviceId,
subscription_tier: 'basic',
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
getCurrentUser: async (): Promise<User | null> => {
const { data } = await supabase.auth.getUser();
return data.user;
},
getUsernameFromEmail: (email?: string) => {
if (!email) return '';
return email.replace(EMAIL_SUFFIX, '');
}
};
3. Como rodar cada ambiente
Agora, você não precisa mais mexer no código. Use os comandos no terminal do seu VS
Code:
Para Testar Localmente (Desenvolvimento):
Bash
npm run dev
Isso usará o .env.development .
Para Gerar o APK de Teste:
Bash
npm run build && npx cap sync
Por padrão, o npm run build usa o modo de produção. Se você quiser gerar um build usando
o projeto de teste, use:
Bash
npx vite build --mode development && npx cap sync
Para Publicar na Play Store (Produção):
Bash
npm run build && npx cap sync
Isso usará o .env.production .
Por que isso é melhor?
1. Segurança: Você não corre o risco de publicar o app na Play Store conectado ao banco
de dados de teste por engano.
2. Praticidade: Você altera as URLs apenas nos arquivos .env uma única vez.
3. Organização: O código fica limpo e profissional.