-- =====================================================
-- CORREÇÃO: COLUNA ADICIONAL PARA PRESENÇA POR ROTA
-- =====================================================
-- Execute este script no SQL Editor do seu Supabase (PRODUÇÃO / DESENVOLVIMENTO)
-- para permitir armazenar e recuperar o ID da rota associado ao registro de chamada.
-- =====================================================

ALTER TABLE IF EXISTS public.attendance 
ADD COLUMN IF NOT EXISTS route_id TEXT;

-- Opcional: Adicionar índice para melhorar a performance de consultas por rota
CREATE INDEX IF NOT EXISTS idx_attendance_route_id ON public.attendance(route_id);
