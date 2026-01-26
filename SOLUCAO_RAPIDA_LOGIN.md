# ⚡ SOLUÇÃO RÁPIDA - Problema de Login

## 🎯 O QUE FAZER AGORA

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: **`bkwrflgrfhsgeowjynou`**
3. Clique em: **SQL Editor**
4. Copie e execute: **`CORRIGIR_RLS_ROUTE_SESSIONS.sql`**
5. Teste o login no app

## ❓ POR QUE ISSO RESOLVE?

O problema está nas **RLS Policies** das tabelas `route_sessions` e `route_events`.

Elas estão tentando converter `user_id` (TEXT) para UUID sem validar:
```sql
USING (user_id::uuid = auth.uid())  -- ❌ Falha se não for UUID válido
```

O SQL corrige isso adicionando validação:
```sql
USING (
  CASE 
    WHEN user_id ~ '^[0-9a-f]{8}-...'  -- Valida formato UUID
    THEN user_id::uuid = auth.uid()    -- Só converte se válido
    ELSE false                          -- Retorna false se inválido
  END
)
```

## ✅ COMO SABER SE FUNCIONOU?

Após executar o SQL:
1. Abra o app no celular
2. Faça login
3. O app deve:
   - ✅ Mostrar "Carregando..."
   - ✅ Carregar a tela Home (Dashboard)
   - ✅ **NÃO** voltar para o login

## 🆘 SE NÃO FUNCIONAR

1. Verifique se o SQL foi executado sem erros
2. Tente fazer logout e login novamente
3. Desinstale e reinstale o APK
4. Compartilhe os logs do console (F12 no navegador)

---

**Arquivo para executar:** `CORRIGIR_RLS_ROUTE_SESSIONS.sql`
**Tempo estimado:** 2 minutos
**Última atualização:** 25/01/2026 - 17:00
