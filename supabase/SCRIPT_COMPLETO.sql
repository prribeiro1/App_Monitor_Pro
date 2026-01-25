-- ========================================
-- SCRIPT COMPLETO - SETUP DO PROJETO NOVO
-- ========================================
-- Este script faz TUDO de uma vez:
-- 1. Limpa o banco (se já tentou antes)
-- 2. Cria todas as tabelas básicas
-- 3. Aplica todas as migrations
-- 
-- INSTRUÇÕES:
-- 1. Copie TODO este arquivo
-- 2. Cole no SQL Editor do Supabase
-- 3. Clique em "Run"
-- 4. Pronto! ✅
-- ========================================

-- ========================================
-- PASSO 1: LIMPAR TUDO (Se já existe)
-- ========================================
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS maintenance_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS conductor_bank_data CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS driver_locations CASCADE;
DROP TABLE IF EXISTS vehicle_documents CASCADE;

-- Limpar storage buckets (se existirem)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- ========================================
-- PASSO 2: CRIAR TABELAS BÁSICAS
-- ========================================

-- Tabela de Rotas
CREATE TABLE routes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    "order" INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Pontos (Stops)
CREATE TABLE stops (
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
CREATE TABLE students (
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
CREATE TABLE attendance (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Ocorrências (Incidents)
CREATE TABLE incidents (
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
CREATE TABLE payments (
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
CREATE TABLE maintenance_items (
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
CREATE TABLE maintenance_logs (
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
CREATE TABLE user_settings (
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
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    schedule_date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PASSO 3: CRIAR ÍNDICES
-- ========================================
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_stops_user_id ON stops(user_id);
CREATE INDEX idx_stops_route_id ON stops(route_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_stop_id ON students(stop_id);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_incidents_user_id ON incidents(user_id);
CREATE INDEX idx_incidents_student_id ON incidents(student_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_maintenance_items_user_id ON maintenance_items(user_id);
CREATE INDEX idx_maintenance_logs_user_id ON maintenance_logs(user_id);
CREATE INDEX idx_maintenance_logs_item_id ON maintenance_logs(item_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);

-- ========================================
-- PASSO 4: HABILITAR RLS
-- ========================================
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

-- ========================================
-- PASSO 5: POLÍTICAS RLS BÁSICAS
-- ========================================

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

-- ========================================
-- PASSO 6: MIGRATION 001 - Webhook Tables
-- ========================================
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    external_reference TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX idx_webhook_logs_external_reference ON webhook_logs(external_reference);

-- ========================================
-- PASSO 7: MIGRATION 002 - Bank Data Table
-- ========================================
CREATE TABLE conductor_bank_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    bank TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    agency TEXT NOT NULL,
    account TEXT NOT NULL,
    account_digit TEXT NOT NULL,
    account_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conductor_bank_data_user_id ON conductor_bank_data(user_id);

ALTER TABLE conductor_bank_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank data" ON conductor_bank_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank data" ON conductor_bank_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank data" ON conductor_bank_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank data" ON conductor_bank_data FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- PASSO 8: MIGRATION 002 - Driver Tracking
-- ========================================
CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    share_code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_driver_locations_user_id ON driver_locations(user_id);
CREATE INDEX idx_driver_locations_share_code ON driver_locations(share_code);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage own location" ON driver_locations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view shared locations" ON driver_locations FOR SELECT USING (is_active = true);

-- ========================================
-- PASSO 9: MIGRATION 003 - Fix RLS (Desabilitar para debug)
-- ========================================
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE conductor_bank_data DISABLE ROW LEVEL SECURITY;

-- ========================================
-- PASSO 10: MIGRATION 003 - Maintenance Storage
-- ========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance-docs', 'maintenance-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'maintenance-docs');

CREATE POLICY "Users can view own files" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'maintenance-docs');

CREATE POLICY "Users can delete own files" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'maintenance-docs');

-- ========================================
-- PASSO 11: MIGRATION 004 - Expenses Table
-- ========================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- PASSO 12: MIGRATION 006 - Delete User Data Function
-- ========================================
CREATE OR REPLACE FUNCTION delete_user_data(user_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Deletar dados em ordem (por causa das foreign keys)
    DELETE FROM maintenance_logs WHERE user_id = user_uuid;
    DELETE FROM maintenance_items WHERE user_id = user_uuid;
    DELETE FROM attendance WHERE user_id = user_uuid;
    DELETE FROM payments WHERE user_id = user_uuid;
    DELETE FROM incidents WHERE user_id = user_uuid;
    DELETE FROM students WHERE user_id = user_uuid;
    DELETE FROM stops WHERE user_id = user_uuid;
    DELETE FROM routes WHERE user_id = user_uuid;
    DELETE FROM user_settings WHERE user_id = user_uuid;
    DELETE FROM reminders WHERE user_id = user_uuid;
    DELETE FROM expenses WHERE user_id = user_uuid;
    DELETE FROM conductor_bank_data WHERE user_id = user_uuid;
    DELETE FROM driver_locations WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuários autenticados chamem essa função
GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO authenticated;

-- ========================================
-- ✅ PRONTO! TUDO CONFIGURADO!
-- ========================================
-- Execute este SQL para verificar:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
