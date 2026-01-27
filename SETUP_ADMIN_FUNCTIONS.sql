-- =====================================================
-- SETUP DAS FUNÇÕES ADMINISTRATIVAS (VERSÃO BLINDADA)
-- =====================================================
-- Projeto: bkwrflgrfhsgeowjynou
-- 
-- Estas funções permitem que o ADM gerencie a equipe.
-- ADICIONADA TRAVA DE SEGURANÇA NO NÍVEL DO BANCO.
-- =====================================================

-- 1. Função para atualizar permissões específicas do usuário
CREATE OR REPLACE FUNCTION update_user_permissions(target_email TEXT, new_permissions JSONB)
RETURNS void AS $$
DECLARE
  caller_email TEXT;
BEGIN
  -- Busca o e-mail de quem está tentando executar a função
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  
  -- SÓ PERMITE SE FOR O ADM REAL
  IF caller_email NOT IN ('teste@monitorescolar.app', 'google_test@monitorescolar.app') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas o administrador principal pode gerenciar equipe.';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('permissions', new_permissions)
      ELSE raw_user_meta_data || jsonb_build_object('permissions', new_permissions)
    END
  WHERE email = target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para atualizar metadados gerais (como o Plano/Tier)
CREATE OR REPLACE FUNCTION update_user_metadata_admin(target_email TEXT, new_metadata JSONB)
RETURNS void AS $$
DECLARE
  caller_email TEXT;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  
  IF caller_email NOT IN ('teste@monitorescolar.app', 'google_test@monitorescolar.app') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN new_metadata
      ELSE raw_user_meta_data || new_metadata
    END
  WHERE email = target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão de execução
GRANT EXECUTE ON FUNCTION update_user_permissions(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_metadata_admin(TEXT, JSONB) TO authenticated;

-- ✅ SEGURANÇA MÁXIMA ATIVADA!
