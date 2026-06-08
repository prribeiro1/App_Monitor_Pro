ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
