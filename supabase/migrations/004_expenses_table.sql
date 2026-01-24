-- Migration: Criar tabela de gastos (Expenses)
-- Esta tabela armazena as despesas do condutor (combustível, manutenção, pedágio, etc.)
-- com persistência na nuvem para não perder dados ao trocar de celular.

-- 1. Criar tabela de gastos
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses(date);

-- 3. Habilitar RLS (Segurança por Linha)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso (Cada motorista só vê/gerencia os próprios gastos)
CREATE POLICY "expenses_select_own"
    ON public.expenses FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_own"
    ON public.expenses FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_own"
    ON public.expenses FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own"
    ON public.expenses FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
