-- =================================================================
-- CORREÇÃO MANUAL PARA USUÁRIO: tiajack
-- Este script libera o Plano Pro e define a data de expiração.
-- Execute este script no SQL Editor do seu Supabase.
-- =================================================================

-- 1. Encontrar o ID do usuário (busca por email ou nome de exibição)
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'tiajack'; -- Pode ser parte do email ou nome
BEGIN
    -- Busca o ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email ILIKE '%' || target_email || '%' 
       OR raw_user_meta_data->>'full_name' ILIKE '%' || target_email || '%'
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuário % não encontrado.', target_email;
    ELSE
        RAISE NOTICE 'Usuário encontrado: ID %', target_user_id;

        -- 2. Garantir que a coluna existe na tabela profiles
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_paid_until') THEN
            ALTER TABLE public.profiles ADD COLUMN subscription_paid_until TEXT;
        END IF;

        -- 3. Atualizar Metadata no Auth (Onde o App verifica as travas)
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || 
            jsonb_build_object(
                'subscription_tier', 'pro',
                'subscription_paid_until', (CURRENT_DATE + INTERVAL '31 days')::TEXT,
                'permissions', jsonb_build_object(
                    'can_view_financial', true,
                    'can_view_maintenance', true,
                    'can_view_contracts', true,
                    'can_view_gps', true,
                    'can_view_reports', true,
                    'can_view_reminders', true,
                    'can_view_attendance', true,
                    'can_view_students', true,
                    'can_view_routes', true
                )
            )
        WHERE id = target_user_id;

        -- 4. Atualizar Tabela de Profiles (Para consistência)
        UPDATE public.profiles
        SET subscription_tier = 'pro',
            subscription_paid_until = (CURRENT_DATE + INTERVAL '31 days')::TEXT
        WHERE id = target_user_id;

        RAISE NOTICE 'Usuário % (ID: %) atualizado para Plano PRO com sucesso!', target_email, target_user_id;
    END IF;
END $$;
