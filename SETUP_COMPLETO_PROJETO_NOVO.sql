-- =====================================================
-- SETUP COMPLETO DO PROJETO NOVO (DESENVOLVIMENTO)
-- =====================================================
-- Projeto: bkwrflgrfhsgeowjynou
-- Acesse: https://supabase.com/dashboard/project/bkwrflgrfhsgeowjynou/sql/new
-- 
-- IMPORTANTE: Execute este SQL COMPLETO de uma vez só!
-- =====================================================

-- =====================================================
-- MIGRATION 000: Tabelas Base
-- =====================================================

-- Tabela de Rotas
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pontos (Stops)
CREATE TABLE IF NOT EXISTS stops (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Alunos
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stop_id TEXT,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  guardian_name TEXT,
  contact TEXT,
  responsible_cpf TEXT,
  responsible_email TEXT,
  responsible_phone TEXT,
  school TEXT,
  shift TEXT,
  due_day INTEGER,
  monthly_fees NUMERIC(10,2),
  birth_date TEXT,
  observation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Chamada (Attendance)
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  paid_at TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Ocorrências (Incidents)
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  observation TEXT,
  date TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações do Usuário
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  id TEXT DEFAULT 'settings',
  current_km INTEGER DEFAULT 0,
  pix_key TEXT,
  driver_name TEXT,
  driver_nickname TEXT,
  driver_cpf TEXT,
  driver_phone TEXT,
  driver_email TEXT,
  driver_address TEXT,
  driver_signature TEXT,
  contract_clauses JSONB,
  subscription_tier TEXT DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Itens de Manutenção
CREATE TABLE IF NOT EXISTS maintenance_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  interval_km INTEGER NOT NULL,
  interval_months INTEGER NOT NULL,
  last_km INTEGER NOT NULL,
  last_date TEXT NOT NULL,
  next_km INTEGER,
  next_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Logs de Manutenção
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES maintenance_items(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  km INTEGER NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Documentos do Veículo
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Gastos (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================

-- Routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own routes" ON routes FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own routes" ON routes FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own routes" ON routes FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own routes" ON routes FOR DELETE USING (user_id::uuid = auth.uid());

-- Stops
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own stops" ON stops FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own stops" ON stops FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own stops" ON stops FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own stops" ON stops FOR DELETE USING (user_id::uuid = auth.uid());

-- Students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own students" ON students FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own students" ON students FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own students" ON students FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own students" ON students FOR DELETE USING (user_id::uuid = auth.uid());

-- Attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own attendance" ON attendance FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own attendance" ON attendance FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own attendance" ON attendance FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own attendance" ON attendance FOR DELETE USING (user_id::uuid = auth.uid());

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own payments" ON payments FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own payments" ON payments FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own payments" ON payments FOR DELETE USING (user_id::uuid = auth.uid());

-- Incidents
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own incidents" ON incidents FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own incidents" ON incidents FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own incidents" ON incidents FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own incidents" ON incidents FOR DELETE USING (user_id::uuid = auth.uid());

-- User Settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own settings" ON user_settings FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own settings" ON user_settings FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own settings" ON user_settings FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own settings" ON user_settings FOR DELETE USING (user_id::uuid = auth.uid());

-- Maintenance Items
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own maintenance items" ON maintenance_items FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own maintenance items" ON maintenance_items FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own maintenance items" ON maintenance_items FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own maintenance items" ON maintenance_items FOR DELETE USING (user_id::uuid = auth.uid());

-- Maintenance Logs
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own maintenance logs" ON maintenance_logs FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own maintenance logs" ON maintenance_logs FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own maintenance logs" ON maintenance_logs FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own maintenance logs" ON maintenance_logs FOR DELETE USING (user_id::uuid = auth.uid());

-- Reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reminders" ON reminders FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own reminders" ON reminders FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own reminders" ON reminders FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own reminders" ON reminders FOR DELETE USING (user_id::uuid = auth.uid());

-- Vehicle Documents
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own vehicle documents" ON vehicle_documents FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own vehicle documents" ON vehicle_documents FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own vehicle documents" ON vehicle_documents FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own vehicle documents" ON vehicle_documents FOR DELETE USING (user_id::uuid = auth.uid());

-- Expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own expenses" ON expenses FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own expenses" ON expenses FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own expenses" ON expenses FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own expenses" ON expenses FOR DELETE USING (user_id::uuid = auth.uid());

-- =====================================================
-- MIGRATION 007: Nova Estrutura de Rotas
-- =====================================================

-- Adicionar novos campos em students
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE students ADD COLUMN IF NOT EXISTS route_order INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_pickup_time TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estimated_drop_time TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id);
CREATE INDEX IF NOT EXISTS idx_students_route_order ON students(route_id, route_order);

-- Tabela route_sessions
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

ALTER TABLE route_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own route sessions" ON route_sessions FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own route sessions" ON route_sessions FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own route sessions" ON route_sessions FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own route sessions" ON route_sessions FOR DELETE USING (user_id::uuid = auth.uid());

-- Tabela route_events
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

ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own route events" ON route_events FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own route events" ON route_events FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own route events" ON route_events FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own route events" ON route_events FOR DELETE USING (user_id::uuid = auth.uid());

-- ✅ SETUP COMPLETO!
-- Agora você pode criar uma conta e fazer login!
