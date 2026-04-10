-- =====================================================
-- CRIAR CONTA DE TESTE MANUALMENTE (VERSÃO CORRIGIDA)
-- =====================================================
-- Execute este SQL no Supabase para criar uma conta de teste
-- =====================================================

-- IMPORTANTE: Substitua os valores abaixo:
-- Linha 15: 'testuser' - Nome de usuário desejado
-- Linha 16: 'senha123' - Senha desejada (mínimo 6 caracteres)

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'paulinho@monitorescolar.app',
  crypt('123456', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'full_name', 'Usuário Teste',
    'device_id', 'test-device',
    'subscription_tier', 'basic',
    'trial_started_at', NOW()::text
  ),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- ✅ Pronto! Agora você pode fazer login com:
-- Usuário: testuser
-- Senha: senha123
