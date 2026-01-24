-- Migração 006: Criar função para deletar conta do usuário
-- Essa função deve ser chamada pelo deleteAccount para limpar todos os dados

-- Função que deleta todos os dados do usuário (sem deletar da Auth)
-- A Auth do Supabase não permite auto-delete, apenas admin pode fazer
CREATE OR REPLACE FUNCTION delete_user_data(user_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Deletar dados em ordem (por causa das foreign keys)
    DELETE FROM vehicle_documents WHERE user_id = user_uuid;
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
    
    -- Nota: Não podemos deletar da tabela auth.users diretamente
    -- O username permanece reservado a menos que um admin delete manualmente
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuários autenticados chamem essa função
GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO authenticated;
