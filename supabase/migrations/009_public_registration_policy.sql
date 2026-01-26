-- ========================================
-- Migration 009: Permissão para Cadastro Público
-- Data: 2026-01-26
-- Descrição: Permite que responsáveis cadastrem alunos via link público
-- ========================================

-- 1. Habilitar inserção pública para a tabela students
-- Nota: O Supabase já tem RLS habilitado, estamos apenas adicionando a política para 'anon'
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'students' 
        AND policyname = 'Permitir inserção pública de alunos'
    ) THEN
        CREATE POLICY "Permitir inserção pública de alunos"
        ON students FOR INSERT
        TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- 2. Comentário de segurança
COMMENT ON POLICY "Permitir inserção pública de alunos" ON students IS 'Permite que usuários não autenticados (pais/responsáveis) enviem a ficha de cadastro para um condutor específico.';
