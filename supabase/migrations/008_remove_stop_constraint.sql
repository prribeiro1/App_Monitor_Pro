-- Migration 008: Remover constraint de stop_id
-- Data: 25/01/2026
-- Descrição: Remove a foreign key constraint de stop_id para permitir nova estrutura

-- 1. Remover constraint de foreign key
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_stop_id_fkey;

-- 2. Tornar stop_id nullable (se ainda não for)
ALTER TABLE students ALTER COLUMN stop_id DROP NOT NULL;

-- 3. Criar índice para route_id (melhor performance)
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id);

-- 4. Criar índice para route_order (melhor performance)
CREATE INDEX IF NOT EXISTS idx_students_route_order ON students(route_order);
