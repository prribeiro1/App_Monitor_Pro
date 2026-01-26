# 🔴 PROBLEMA: App "Pisca" e Volta para Login

## 📋 O QUE ESTÁ ACONTECENDO

Quando você faz login no app, ele:
1. ✅ Autentica com sucesso no Supabase
2. ✅ Tenta carregar os dados da nuvem (`pullFromCloud`)
3. ❌ **FALHA** ao tentar acessar tabelas que não existem
4. ❌ Volta para a tela de login

## 🔍 CAUSA RAIZ

O app está configurado para usar o **projeto de desenvolvimento** (`bkwrflgrfhsgeowjynou`), e o problema está nas **RLS Policies** das tabelas `route_sessions` e `route_events`.

### O que está acontecendo:

As policies estão tentando converter `user_id` (TEXT) para UUID:
```sql
CREATE POLICY "Users can view their own route sessions" 
ON route_sessions FOR SELECT 
USING (user_id::uuid = auth.uid());
```

Quando o `user_id` não é um UUID válido (ou está vazio), essa conversão **FALHA** e a query retorna erro.

### Onde o erro acontece:

No arquivo `services/cloudSync.ts`, linha ~305:
```typescript
const [studentsRes, routesRes, ..., routeSessionsRes, routeEventsRes] = await Promise.all([
    supabase.from('students').select('*'),
    supabase.from('routes').select('*'),
    // ...
    supabase.from('route_sessions').select('*'), // ❌ POLICY FALHA AQUI
    supabase.from('route_events').select('*')    // ❌ POLICY FALHA AQUI
]);
```

Quando essas queries falham, o `pullAllData` retorna `null`, o app não consegue carregar os dados e volta para o login.

---

## ✅ SOLUÇÃO

O problema está nas **RLS Policies** das tabelas `route_sessions` e `route_events`. Elas estão tentando converter `user_id` de TEXT para UUID, mas isso causa erro quando não há dados ou quando o formato não é válido.

### Passo 1: Corrigir as Policies (OBRIGATÓRIO) ⚡

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Selecione o projeto **`bkwrflgrfhsgeowjynou`** (desenvolvimento)
3. Clique em **"SQL Editor"** no menu lateral
4. Copie TODO o conteúdo do arquivo **`CORRIGIR_RLS_ROUTE_SESSIONS.sql`**
5. Cole no editor SQL
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. ✅ Pronto! As policies foram corrigidas

### Passo 2: Aplicar Migrations (se ainda não fez)

Se você ainda não aplicou as migrations, execute também:

1. No mesmo SQL Editor
2. Copie TODO o conteúdo do arquivo **`SETUP_LIMPO_PROJETO_NOVO.sql`**
3. Cole e execute
4. Aguarde a execução (pode demorar ~10 segundos)

### Opção 2: Migrations Individuais (NÃO RECOMENDADO)

Se preferir aplicar uma por uma (na ordem), você ainda vai precisar executar o `CORRIGIR_RLS_ROUTE_SESSIONS.sql` no final para corrigir as policies.

```
1. supabase/migrations/000_create_base_tables.sql
2. supabase/migrations/001_webhook_tables.sql
3. supabase/migrations/002_bank_data_table.sql
4. supabase/migrations/002_driver_tracking.sql
5. supabase/migrations/003_fix_rls_policies.sql
6. supabase/migrations/003_maintenance_storage.sql
7. supabase/migrations/004_expenses_table.sql
8. supabase/migrations/005_student_observation_birthdate.sql
9. supabase/migrations/006_delete_user_data_function.sql
10. supabase/migrations/007_new_route_structure.sql ⭐ (CRIA route_sessions)
11. supabase/migrations/008_remove_stop_constraint.sql ⭐ (AJUSTA constraints)
12. CORRIGIR_RLS_ROUTE_SESSIONS.sql ⭐⭐⭐ (CORRIGE POLICIES - OBRIGATÓRIO!)
```

---

## 🧪 COMO TESTAR SE FUNCIONOU

### 1. Verificar se as tabelas foram criadas:

No SQL Editor do Supabase, execute:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Você deve ver na lista:
- ✅ `route_sessions`
- ✅ `route_events`

### 2. Testar o login no app:

1. Abra o app no celular
2. Faça login com suas credenciais
3. O app deve:
   - ✅ Mostrar a tela de loading "Carregando..."
   - ✅ Carregar os dados da nuvem
   - ✅ Mostrar a tela Home (Dashboard)
   - ✅ **NÃO** voltar para o login

---

## 🔧 VERIFICAÇÃO ADICIONAL

Se mesmo após aplicar as migrations o problema persistir, verifique:

### 1. Console do navegador (se testar no navegador):

```bash
npm run dev
```

Abra o DevTools (F12) e veja se há erros no console relacionados a:
- `relation "route_sessions" does not exist`
- `relation "route_events" does not exist`
- Erros de RLS (Row Level Security)

### 2. Logs do app (se testar no celular):

Use o Android Studio Logcat para ver os logs:
```bash
cd android
./gradlew installDebug
# Depois abra o Android Studio e veja o Logcat
```

Procure por erros relacionados a:
- `Supabase`
- `pullFromCloud`
- `cloudSync`

---

## 📊 RESUMO VISUAL

```
┌─────────────────────────────────────────────────────────┐
│                    FLUXO DO LOGIN                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Usuário digita login/senha                          │
│     ↓                                                   │
│  2. authService.signIn() ✅                             │
│     ↓                                                   │
│  3. App.tsx detecta sessão ✅                           │
│     ↓                                                   │
│  4. dbService.pullFromCloud() ⏳                        │
│     ↓                                                   │
│  5. cloudSync.pullAllData() ⏳                          │
│     ↓                                                   │
│  6. Tenta acessar route_sessions ❌ FALHA!             │
│     ↓                                                   │
│  7. Erro não tratado → Volta para login ❌              │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  APÓS APLICAR MIGRATIONS                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Usuário digita login/senha                          │
│     ↓                                                   │
│  2. authService.signIn() ✅                             │
│     ↓                                                   │
│  3. App.tsx detecta sessão ✅                           │
│     ↓                                                   │
│  4. dbService.pullFromCloud() ✅                        │
│     ↓                                                   │
│  5. cloudSync.pullAllData() ✅                          │
│     ↓                                                   │
│  6. Acessa route_sessions ✅ SUCESSO!                   │
│     ↓                                                   │
│  7. Carrega dados e mostra Dashboard ✅                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ IMPORTANTE

### Sobre o Hardcode:

O arquivo `services/auth.ts` está **HARDCODED** com as credenciais do projeto de desenvolvimento:

```typescript
const SUPABASE_URL = 'https://bkwrflgrfhsgeowjynou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**ANTES DE FAZER MERGE NA MAIN**, você precisa:
1. ✅ Reverter o hardcode
2. ✅ Voltar a usar as variáveis de ambiente (`.env`)
3. ✅ Testar se o app de produção continua funcionando

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Aplicar migrations no projeto de desenvolvimento** (SETUP_LIMPO_PROJETO_NOVO.sql)
2. ✅ **Testar login no app**
3. ✅ **Criar conta de teste** (use CRIAR_CONTA_TESTE_V2.sql)
4. ✅ **Testar todas as funcionalidades novas**
5. ✅ **Reverter hardcode antes do merge**

---

## 🆘 SE AINDA NÃO FUNCIONAR

Se após aplicar as migrations o problema persistir, pode ser:

1. **Cache do app**: Desinstale e reinstale o APK
2. **Erro de RLS**: Verifique se as policies foram criadas corretamente
3. **Outro erro**: Compartilhe os logs do console/Logcat

---

**Última Atualização:** 25/01/2026 - 16:30
