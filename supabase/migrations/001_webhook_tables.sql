-- ===========================================
-- TABELAS PARA WEBHOOK ASAAS
-- Execute no SQL Editor do Supabase
-- ===========================================

-- 1. Tabela de logs de webhook (para auditoria)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  payment_id TEXT,
  customer_id TEXT,
  value DECIMAL(10,2),
  external_reference TEXT,
  raw_payload JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_external_reference ON webhook_logs(external_reference);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- RLS (apenas service role pode inserir)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- 2. Adicionar campos de pagamento na tabela students (se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'payment_status') THEN
    ALTER TABLE students ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'last_payment_date') THEN
    ALTER TABLE students ADD COLUMN last_payment_date TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'last_payment_value') THEN
    ALTER TABLE students ADD COLUMN last_payment_value DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'asaas_customer_id') THEN
    ALTER TABLE students ADD COLUMN asaas_customer_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'asaas_subscription_id') THEN
    ALTER TABLE students ADD COLUMN asaas_subscription_id TEXT;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela students não existe ainda, pulando alterações';
END $$;

-- 3. Garantir que profiles tem subscription_tier
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'basic';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Criar tabela profiles se não existir
    CREATE TABLE public.profiles (
      id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
      asaas_customer_id TEXT,
      asaas_wallet_id TEXT,
      subscription_tier TEXT DEFAULT 'basic',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
END $$;

-- 4. Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, subscription_tier)
  VALUES (new.id, 'basic')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Sincronizar usuários existentes
INSERT INTO public.profiles (id, subscription_tier)
SELECT id, COALESCE(raw_user_meta_data->>'subscription_tier', 'pro') 
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ✅ Pronto!
SELECT 'Tabelas de webhook configuradas com sucesso!' as status;
