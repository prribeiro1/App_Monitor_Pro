-- ========================================
-- MIGRATION 000: Criar Tabelas Básicas
-- ========================================
-- Este arquivo cria todas as tabelas básicas necessárias
-- para o funcionamento do app no Supabase
-- Execute PRIMEIRO antes das outras migrations
-- ========================================

-- Tabela de Rotas
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    "order" INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pontos (Stops)
CREATE TABLE IF NOT EXISTS stops (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    route_id TEXT REFERENCES routes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Alunos
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stop_id TEXT REFERENCES stops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    guardian_name TEXT,
    contact TEXT,
    responsible_cpf TEXT,
    responsible_email TEXT,
    responsible_phone TEXT,
    "order" INTEGER,
    monthly_fees DOUBLE PRECISION,
    due_day INTEGER,
    birth_date TEXT,
    school TEXT,
    shift TEXT,
    observation TEXT,
    asaas_subscription_id TEXT,
    asaas_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Chamada (Attendance)
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Ocorrências (Incidents)
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    observation TEXT,
    date TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    paid_at TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Itens de Manutenção
CREATE TABLE IF NOT EXISTS maintenance_items (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES maintenance_items(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    km INTEGER NOT NULL,
    cost DOUBLE PRECISION NOT NULL,
    notes TEXT,
    attachment_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações do Usuário
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY DEFAULT 'settings',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_km INTEGER DEFAULT 0,
    pix_key TEXT,
    driver_name TEXT,
    driver_nickname TEXT,
    driver_cpf TEXT,
    driver_phone TEXT,
    driver_email TEXT,
    driver_address TEXT,
    driver_signature TEXT,
    subscription_tier TEXT,
    asaas_wallet_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Lembretes
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    schedule_date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_stops_user_id ON stops(user_id);
CREATE INDEX IF NOT EXISTS idx_stops_route_id ON stops(route_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_stop_id ON students(stop_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_student_id ON incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_user_id ON maintenance_items(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user_id ON maintenance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_item_id ON maintenance_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);

-- Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (usuário só vê seus próprios dados)
-- Routes
CREATE POLICY "Users can view own routes" ON routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routes" ON routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routes" ON routes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routes" ON routes FOR DELETE USING (auth.uid() = user_id);

-- Stops
CREATE POLICY "Users can view own stops" ON stops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stops" ON stops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stops" ON stops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stops" ON stops FOR DELETE USING (auth.uid() = user_id);

-- Students
CREATE POLICY "Users can view own students" ON students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own students" ON students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own students" ON students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own students" ON students FOR DELETE USING (auth.uid() = user_id);

-- Attendance
CREATE POLICY "Users can view own attendance" ON attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attendance" ON attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own attendance" ON attendance FOR DELETE USING (auth.uid() = user_id);

-- Incidents
CREATE POLICY "Users can view own incidents" ON incidents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own incidents" ON incidents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incidents" ON incidents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own incidents" ON incidents FOR DELETE USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payments" ON payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own payments" ON payments FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Items
CREATE POLICY "Users can view own maintenance_items" ON maintenance_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance_items" ON maintenance_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance_items" ON maintenance_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance_items" ON maintenance_items FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Logs
CREATE POLICY "Users can view own maintenance_logs" ON maintenance_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance_logs" ON maintenance_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance_logs" ON maintenance_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance_logs" ON maintenance_logs FOR DELETE USING (auth.uid() = user_id);

-- User Settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- Reminders
CREATE POLICY "Users can view own reminders" ON reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON reminders FOR DELETE USING (auth.uid() = user_id);
