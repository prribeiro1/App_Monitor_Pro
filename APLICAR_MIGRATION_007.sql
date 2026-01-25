-- =====================================================
-- APLICAR ESTA MIGRATION NO SUPABASE
-- =====================================================
-- Projeto: bkwrflgrfhsgeowjynou (DESENVOLVIMENTO)
-- Acesse: https://supabase.com/dashboard/project/bkwrflgrfhsgeowjynou/sql/new
-- Cole este SQL e execute
-- =====================================================

-- 1. ADICIONAR NOVOS CAMPOS NA TABELA STUDENTS
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_order INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_pickup_time TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_drop_time TEXT;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id);
CREATE INDEX IF NOT EXISTS idx_students_route_order ON students(route_id, route_order);

-- 2. MIGRAR DADOS EXISTENTES
UPDATE students s
SET route_id = (SELECT st.route_id FROM stops st WHERE st.id = s.stop_id)
WHERE s.stop_id IS NOT NULL AND s.route_id IS NULL;

UPDATE students s
SET address = (SELECT st.name FROM stops st WHERE st.id = s.stop_id)
WHERE s.stop_id IS NOT NULL AND s.address IS NULL;

UPDATE students s
SET 
  latitude = (SELECT st.latitude FROM stops st WHERE st.id = s.stop_id),
  longitude = (SELECT st.longitude FROM stops st WHERE st.id = s.stop_id)
WHERE s.stop_id IS NOT NULL AND s.latitude IS NULL;

UPDATE students s
SET route_order = (SELECT st.order FROM stops st WHERE st.id = s.stop_id)
WHERE s.stop_id IS NOT NULL AND s.route_order = 0;

-- 3. CRIAR TABELA ROUTE_SESSIONS
CREATE TABLE IF NOT EXISTS route_sessions (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pickup', 'dropoff')),
  start_time TEXT,
  end_time TEXT,
  skipped_students TEXT[],
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_sessions_route_id ON route_sessions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_sessions_user_id ON route_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_route_sessions_date ON route_sessions(date);
CREATE INDEX IF NOT EXISTS idx_route_sessions_status ON route_sessions(status);

ALTER TABLE route_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route sessions"
  ON route_sessions FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own route sessions"
  ON route_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own route sessions"
  ON route_sessions FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own route sessions"
  ON route_sessions FOR DELETE USING (auth.uid()::text = user_id);

-- 4. CRIAR TABELA ROUTE_EVENTS
CREATE TABLE IF NOT EXISTS route_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES route_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('notification_sent', 'picked_up', 'dropped_off', 'skipped')),
  timestamp TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_events_session_id ON route_events(session_id);
CREATE INDEX IF NOT EXISTS idx_route_events_student_id ON route_events(student_id);
CREATE INDEX IF NOT EXISTS idx_route_events_user_id ON route_events(user_id);
CREATE INDEX IF NOT EXISTS idx_route_events_timestamp ON route_events(timestamp);

ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route events"
  ON route_events FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own route events"
  ON route_events FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own route events"
  ON route_events FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own route events"
  ON route_events FOR DELETE USING (auth.uid()::text = user_id);

-- 5. COMENTÁRIOS
COMMENT ON COLUMN students.route_id IS 'ID da rota (substitui stopId)';
COMMENT ON COLUMN students.address IS 'Endereço completo (opcional)';
COMMENT ON COLUMN students.latitude IS 'Latitude (opcional)';
COMMENT ON COLUMN students.longitude IS 'Longitude (opcional)';
COMMENT ON COLUMN students.route_order IS 'Ordem na rota (1, 2, 3...)';
COMMENT ON COLUMN students.estimated_pickup_time IS 'Horário estimado embarque';
COMMENT ON COLUMN students.estimated_drop_time IS 'Horário estimado desembarque';
COMMENT ON TABLE route_sessions IS 'Controla cada viagem (ida/volta)';
COMMENT ON TABLE route_events IS 'Histórico de eventos da viagem';

-- ✅ MIGRATION 007 COMPLETA!
