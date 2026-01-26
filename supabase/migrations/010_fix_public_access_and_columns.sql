-- ========================================
-- Migration 010: Correção de Acesso Público e Colunas Faltantes
-- Data: 2026-01-26
-- ========================================

-- 1. Adicionar colunas faltantes na tabela students (usadas no cloudSync e cadastro público)
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_order INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_pickup_time TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_drop_time TEXT;

-- 2. Garantir que as políticas RLS permitam acesso anônimo para links públicos
-- Tabela: tracking_links
DROP POLICY IF EXISTS "public_read_active_links" ON tracking_links;
CREATE POLICY "public_read_active_links" ON tracking_links
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- Tabela: driver_locations
DROP POLICY IF EXISTS "public_read_active_tracking" ON driver_locations;
CREATE POLICY "public_read_active_tracking" ON driver_locations
    FOR SELECT TO anon, authenticated
    USING (is_tracking_active = true);

-- Tabela: students (garantir inserção pública)
DROP POLICY IF EXISTS "Permitir inserção pública de alunos" ON students;
CREATE POLICY "Permitir inserção pública de alunos"
    ON students FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Habilitar leitura de estudantes para anon (apenas para o condutor verificar cadastros ou para o fluxo de contrato se necessário)
-- Na verdade, o anon não precisa ler estudantes, apenas inserir.
-- Mas vamos garantir que o anon possa ler as configurações básicas se necessário.

-- 4. Permitir que anon leia a tabela app_constants para verificação de versão (se necessário)
-- ALTER TABLE app_constants ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read constants" ON app_constants FOR SELECT TO anon, authenticated USING (true);
