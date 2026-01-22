-- ===========================================
-- CORRIGIR POLÍTICAS RLS
-- Execute no SQL Editor do Supabase
-- ===========================================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can insert own bank data" ON conductor_bank_data;
DROP POLICY IF EXISTS "Users can view own bank data" ON conductor_bank_data;
DROP POLICY IF EXISTS "Users can update own pending bank data" ON conductor_bank_data;
DROP POLICY IF EXISTS "Service role can do everything" ON conductor_bank_data;

-- Desabilitar RLS temporariamente para debug
ALTER TABLE conductor_bank_data DISABLE ROW LEVEL SECURITY;

-- OU se preferir manter RLS, use políticas mais permissivas:
-- ALTER TABLE conductor_bank_data ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow all inserts" ON conductor_bank_data
--   FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Allow all selects" ON conductor_bank_data
--   FOR SELECT USING (true);

-- CREATE POLICY "Allow all updates" ON conductor_bank_data
--   FOR UPDATE USING (true);

-- ✅ Pronto!
SELECT 'RLS desabilitado para debug!' as status;
