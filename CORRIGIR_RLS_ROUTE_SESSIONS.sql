-- =====================================================
-- CORRIGIR RLS DAS TABELAS ROUTE_SESSIONS E ROUTE_EVENTS
-- =====================================================
-- Problema: As policies estão falhando porque user_id é TEXT
-- mas auth.uid() retorna UUID
-- =====================================================

-- DROPAR POLICIES ANTIGAS
DROP POLICY IF EXISTS "Users can view their own route sessions" ON route_sessions;
DROP POLICY IF EXISTS "Users can insert their own route sessions" ON route_sessions;
DROP POLICY IF EXISTS "Users can update their own route sessions" ON route_sessions;
DROP POLICY IF EXISTS "Users can delete their own route sessions" ON route_sessions;

DROP POLICY IF EXISTS "Users can view their own route events" ON route_events;
DROP POLICY IF EXISTS "Users can insert their own route events" ON route_events;
DROP POLICY IF EXISTS "Users can update their own route events" ON route_events;
DROP POLICY IF EXISTS "Users can delete their own route events" ON route_events;

-- RECRIAR POLICIES COM TRATAMENTO DE ERRO
-- Route Sessions
ALTER TABLE route_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route sessions" 
ON route_sessions FOR SELECT 
USING (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

CREATE POLICY "Users can insert their own route sessions" 
ON route_sessions FOR INSERT 
WITH CHECK (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

CREATE POLICY "Users can update their own route sessions" 
ON route_sessions FOR UPDATE 
USING (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

CREATE POLICY "Users can delete their own route sessions" 
ON route_sessions FOR DELETE 
USING (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

-- Route Events
ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route events" 
ON route_events FOR SELECT 
USING (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

CREATE POLICY "Users can insert their own route events" 
ON route_events FOR INSERT 
WITH CHECK (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

CREATE POLICY "Users can update their own route events" 
ON route_events FOR UPDATE 
USING (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

CREATE POLICY "Users can delete their own route events" 
ON route_events FOR DELETE 
USING (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN user_id::uuid = auth.uid()
    ELSE false
  END
);

-- ✅ POLICIES CORRIGIDAS!
-- Agora as queries não vão falhar mesmo se user_id não for UUID válido
