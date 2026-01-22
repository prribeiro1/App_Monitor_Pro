-- ===========================================
-- TABELA PARA DADOS BANCÁRIOS (SOLUÇÃO ALTERNATIVA)
-- Execute no SQL Editor do Supabase
-- ===========================================

-- Tabela para armazenar dados bancários dos condutores
CREATE TABLE IF NOT EXISTS public.conductor_bank_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Dados pessoais
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  -- Dados bancários
  bank_code TEXT NOT NULL,
  bank_name TEXT,
  agency TEXT NOT NULL,
  account TEXT NOT NULL,
  account_digit TEXT NOT NULL,
  account_type TEXT NOT NULL, -- CONTA_CORRENTE ou CONTA_POUPANCA
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, error
  asaas_wallet_id TEXT,
  asaas_account_id TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conductor_bank_data_user_id ON conductor_bank_data(user_id);
CREATE INDEX IF NOT EXISTS idx_conductor_bank_data_status ON conductor_bank_data(status);
CREATE INDEX IF NOT EXISTS idx_conductor_bank_data_created_at ON conductor_bank_data(created_at);

-- RLS (Row Level Security)
ALTER TABLE conductor_bank_data ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Usuários podem inserir seus próprios dados
CREATE POLICY "Users can insert own bank data" ON conductor_bank_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver seus próprios dados
CREATE POLICY "Users can view own bank data" ON conductor_bank_data
  FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios dados (apenas se status = pending)
CREATE POLICY "Users can update own pending bank data" ON conductor_bank_data
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Service role pode ver e atualizar tudo (para o painel admin)
CREATE POLICY "Service role can do everything" ON conductor_bank_data
  FOR ALL USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_conductor_bank_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conductor_bank_data_updated_at ON conductor_bank_data;
CREATE TRIGGER conductor_bank_data_updated_at
  BEFORE UPDATE ON conductor_bank_data
  FOR EACH ROW
  EXECUTE FUNCTION update_conductor_bank_data_updated_at();

-- ✅ Pronto!
SELECT 'Tabela de dados bancários criada com sucesso!' as status;
