-- ========================================
-- Migration 010: Correção de Acesso Público e Colunas Faltantes
-- Data: 2026-01-26
-- Instruções: Copie este código e cole no SQL Editor do seu projeto Supabase (bkwrflgrfhsgeowjynou)
-- ========================================

-- 1. Adicionar colunas faltantes na tabela students
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_order INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_pickup_time TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_drop_time TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS monthly_fees DECIMAL(10,2);
ALTER TABLE students ADD COLUMN IF NOT EXISTS due_day INTEGER;

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

-- 3. Atualizar o Cache do PostgREST para reconhecer as novas colunas IMEDIATAMENTE
NOTIFY pgrst, 'reload schema';

SELECT 'Migração 010 aplicada com sucesso!' as status;
