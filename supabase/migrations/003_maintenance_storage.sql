-- Storage Bucket for Maintenance Documents

-- 1. Criar o bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'maintenance-docs',
    'maintenance-docs',
    false,
    52428800,  -- 50 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Add 'attachment_url' to maintenance_logs table
-- COMENTADO POIS A TABELA É LOCAL (INDEXEDDB):
-- ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 3. Políticas de acesso (RLS)

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload maintenance docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read their own maintenance docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own maintenance docs" ON storage.objects;

-- Permitir upload
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-docs');

-- Permitir leitura
CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance-docs');

-- Permitir exclusão
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-docs');