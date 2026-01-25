-- =====================================================
-- Migration 007: Nova Estrutura de Rotas
-- Data: 2026-01-25
-- Descrição: Simplifica estrutura Rota → Aluno (sem pontos intermediários)
-- =====================================================

-- 1. ADICIONAR NOVOS CAMPOS NA TABELA STUDENTS
-- =====================================================

-- Adicionar routeId (substitui stopId)
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_id TEXT;

-- Adicionar campos de endereço (opcional)
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Adicionar ordem na rota
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_order INTEGER DEFAULT 0;

-- Adicionar horários estimados
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_pickup_time TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_drop_time TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id);
CREATE INDEX IF NOT EXISTS idx_students_route_order ON students(route_id, route_order);


-- 2. MIGRAR DADOS EXISTENTES (stopId → routeId)
-- =====================================================

-- Copiar routeId do stop para o aluno
UPDATE students s
SET route_id = (
  SELECT st.route_id 
  FROM stops st 
  WHERE st.id = s.stop_id
)
WHERE s.stop_id IS NOT NULL AND s.route_id IS NULL;

-- Usar nome do stop como endereço temporário (para não perder informação)
UPDATE students s
SET address = (
  SELECT st.name 
  FROM stops st 
  WHERE st.id = s.stop_id
)
WHERE s.stop_id IS NOT NULL AND s.address IS NULL;

-- Copiar coordenadas do stop (se existirem)
UPDATE students s
SET 
  latitude = (SELECT st.latitude FROM stops st WHERE st.id = s.stop_id),
  longitude = (SELECT st.longitude FROM stops st WHERE st.id = s.stop_id)
WHERE s.stop_id IS NOT NULL AND s.latitude IS NULL;

-- Definir ordem inicial baseada na ordem do stop
UPDATE students s
SET route_order = (
  SELECT st.order 
  FROM stops st 
  WHERE st.id = s.stop_id
)
WHERE s.stop_id IS NOT NULL AND s.route_order = 0;


-- 3. CRIAR TABELA ROUTE_SESSIONS (Controlar cada viagem)
-- =====================================================

CREATE TABLE IF NOT EXISTS route_sessions (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- ISO Date YYYY-MM-DD
  type TEXT NOT NULL CHECK (type IN ('pickup', 'dropoff')), -- Ida ou volta
  start_time TEXT, -- ISO DateTime
  end_time TEXT, -- ISO DateTime
  skipped_students TEXT[], -- Array de IDs dos alunos que faltaram
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_route_sessions_route_id ON route_sessions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_sessions_user_id ON route_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_route_sessions_date ON route_sessions(date);
CREATE INDEX IF NOT EXISTS idx_route_sessions_status ON route_sessions(status);

-- RLS Policies
ALTER TABLE route_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route sessions"
  ON route_sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own route sessions"
  ON route_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own route sessions"
  ON route_sessions FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own route sessions"
  ON route_sessions FOR DELETE
  USING (auth.uid()::text = user_id);


-- 4. CRIAR TABELA ROUTE_EVENTS (Histórico detalhado)
-- =====================================================

CREATE TABLE IF NOT EXISTS route_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES route_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('notification_sent', 'picked_up', 'dropped_off', 'skipped')),
  timestamp TEXT NOT NULL, -- ISO DateTime
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_route_events_session_id ON route_events(session_id);
CREATE INDEX IF NOT EXISTS idx_route_events_student_id ON route_events(student_id);
CREATE INDEX IF NOT EXISTS idx_route_events_user_id ON route_events(user_id);
CREATE INDEX IF NOT EXISTS idx_route_events_timestamp ON route_events(timestamp);

-- RLS Policies
ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route events"
  ON route_events FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own route events"
  ON route_events FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own route events"
  ON route_events FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own route events"
  ON route_events FOR DELETE
  USING (auth.uid()::text = user_id);


-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN students.route_id IS 'ID da rota (substitui stopId na nova estrutura)';
COMMENT ON COLUMN students.address IS 'Endereço completo do aluno (opcional)';
COMMENT ON COLUMN students.latitude IS 'Latitude do endereço (opcional)';
COMMENT ON COLUMN students.longitude IS 'Longitude do endereço (opcional)';
COMMENT ON COLUMN students.route_order IS 'Ordem do aluno na rota (1, 2, 3...)';
COMMENT ON COLUMN students.estimated_pickup_time IS 'Horário estimado de embarque (HH:MM)';
COMMENT ON COLUMN students.estimated_drop_time IS 'Horário estimado de desembarque (HH:MM)';

COMMENT ON TABLE route_sessions IS 'Controla cada viagem de uma rota (ida ou volta)';
COMMENT ON TABLE route_events IS 'Histórico detalhado de eventos durante a viagem';

-- =====================================================
-- FIM DA MIGRATION 007
-- =====================================================
