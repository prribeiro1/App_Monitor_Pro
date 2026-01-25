-- Criar tabela vehicle_documents que estava faltando

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

-- Habilitar RLS
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Dropar policies antigas se existirem
DROP POLICY IF EXISTS "Users can view their own vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert their own vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can update their own vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can delete their own vehicle documents" ON vehicle_documents;

-- Criar policies
CREATE POLICY "Users can view their own vehicle documents" ON vehicle_documents FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can insert their own vehicle documents" ON vehicle_documents FOR INSERT WITH CHECK (user_id::uuid = auth.uid());
CREATE POLICY "Users can update their own vehicle documents" ON vehicle_documents FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users can delete their own vehicle documents" ON vehicle_documents FOR DELETE USING (user_id::uuid = auth.uid());
