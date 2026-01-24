-- Migração 005: Adicionar campos observation e birth_date à tabela students
-- Executar no Supabase Dashboard -> SQL Editor

-- Adicionar coluna observation (se não existir)
ALTER TABLE students ADD COLUMN IF NOT EXISTS observation TEXT;

-- Adicionar coluna birth_date (se não existir)
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Comentário: Essas colunas permitem armazenar observações sobre o aluno
-- (ex: alergias, condições especiais) e data de nascimento para aniversários
