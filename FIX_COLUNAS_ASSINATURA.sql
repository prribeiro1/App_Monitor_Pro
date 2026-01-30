-- =====================================================
-- CORREÇÃO: COLUNAS FALTANTES PARA ASSINATURA DIGITAL
-- =====================================================
-- Execute este script no SQL Editor do seu Supabase (PRODUÇÃO)
-- para habilitar o registro de data e metadados de assinatura.
-- =====================================================

-- 1. Adicionar colunas de controle de assinatura
ALTER TABLE IF EXISTS public.contract_requests 
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signer_metadata JSONB;

-- 2. Garantir que o status e a assinatura existam
ALTER TABLE IF EXISTS public.contract_requests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS parent_signature TEXT;

-- 3. Habilitar acesso público para anon poder assinar (UPDATE)
-- OBS: A política garante que só pode assinar se o status for 'pending'
DROP POLICY IF EXISTS "Permitir que responsáveis assinem contratos" ON public.contract_requests;

CREATE POLICY "Permitir que responsáveis assinem contratos"
ON public.contract_requests
FOR UPDATE
TO anon, authenticated
USING (status = 'pending')
WITH CHECK (status = 'signed');

-- 4. Permitir que anon veja o contrato para assinar (SELECT)
DROP POLICY IF EXISTS "Permitir que responsáveis vejam o contrato" ON public.contract_requests;

CREATE POLICY "Permitir que responsáveis vejam o contrato"
ON public.contract_requests
FOR SELECT
TO anon, authenticated
USING (true);

-- ✅ SCRIPT PRONTO PARA EXECUTAR!
