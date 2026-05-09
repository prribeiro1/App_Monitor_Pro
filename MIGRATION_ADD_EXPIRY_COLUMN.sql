-- =================================================================
-- MIGRATION: ADICIONAR COLUNA DE EXPIRAÇÃO
-- Execute este script no SQL Editor do seu Supabase para evitar erros.
-- =================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_paid_until') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_paid_until TEXT;
        RAISE NOTICE 'Coluna subscription_paid_until adicionada com sucesso à tabela profiles.';
    ELSE
        RAISE NOTICE 'A coluna subscription_paid_until já existe.';
    END IF;
END $$;
