-- ⚠️ APLICAR NO SUPABASE SQL EDITOR
-- Projeto: bkwrflgrfhsgeowjynou (desenvolvimento)
-- URL: https://supabase.com/dashboard/project/bkwrflgrfhsgeowjynou/sql/new

-- Migration 008: Remover constraint de stop_id
-- Isso permite salvar alunos sem stop_id (nova estrutura)

-- 1. Remover constraint de foreign key
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_stop_id_fkey;

-- 2. Tornar stop_id nullable
ALTER TABLE students ALTER COLUMN stop_id DROP NOT NULL;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id);
CREATE INDEX IF NOT EXISTS idx_students_route_order ON students(route_order);

-- ✅ Pronto! Agora você pode salvar alunos sem stop_id
