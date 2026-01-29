-- =====================================================
-- CORREÇÃO DE SEGURANÇA (RLS) PARA TABELAS SENSÍVEIS
-- =====================================================
-- Projeto: bkwrflgrfhsgeowjynou
-- 
-- Este script ativa o Row Level Security (RLS) nas tabelas
-- que estão marcadas como "unrestricted" (desprotegidas).
-- =====================================================

-- 1. TABELA conductor_bank_data
-- Esta tabela contém dados bancários e CPF, deve ser altamente protegida.

ALTER TABLE IF EXISTS public.conductor_bank_data ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Users can insert own bank data" ON conductor_bank_data;
DROP POLICY IF EXISTS "Users can view own bank data" ON conductor_bank_data;
DROP POLICY IF EXISTS "Users can update own pending bank data" ON conductor_bank_data;
DROP POLICY IF EXISTS "Service role can do everything" ON conductor_bank_data;

-- Adicionar novas políticas seguras
-- O usuário só pode ver/inserir seus próprios dados bancários
CREATE POLICY "Users can manage own bank data" ON conductor_bank_data
  FOR ALL USING (auth.uid() = user_id);

-- Permitir que o sistema (service_role) processe os dados
-- (Políticas de SERVICE ROLE são automáticas, não precisam de SQL adicional,
-- mas é bom ter o RLS ON para bloquear o acesso anônimo/público).


-- 2. TABELA webhook_logs
-- Esta tabela contém logs de eventos financeiros. Não deve ser pública.

ALTER TABLE IF EXISTS public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Normalmente logs de webhook são apenas para auditoria interna.
-- Se você precisar visualizar via Dashboard, o service_role já tem acesso.
-- Se precisar que o ADMIN (teste@monitorescolar.app) veja no App, use a política abaixo:

DROP POLICY IF EXISTS "Admins can view webhook logs" ON webhook_logs;
CREATE POLICY "Admins can view webhook logs" ON webhook_logs
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('teste@monitorescolar.app', 'google_test@monitorescolar.app')
  );

-- ✅ SEGURANÇA APLICADA!
-- Agora as tabelas não devem mais mostrar o aviso em vermelho "unrestricted".
