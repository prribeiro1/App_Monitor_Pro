# 📋 ORDEM CORRETA PARA EXECUTAR AS MIGRATIONS

## ⚠️ IMPORTANTE

Execute as migrations **NESTA ORDEM EXATA** no SQL Editor do Supabase.

---

## 🎯 PASSO A PASSO

### 1️⃣ Limpar Projeto (Se já executou algo)

Se você já tentou executar migrations e deu erro, execute isso primeiro para limpar:

```sql
-- Limpar tudo (CUIDADO: Apaga todas as tabelas!)
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

-- Limpar storage buckets
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
```

---

### 2️⃣ Executar Migrations na Ordem

Copie e cole cada arquivo no SQL Editor e clique em **"Run"**.

#### **Migration 0: Tabelas Básicas** (NOVO!)
📁 Arquivo: `supabase/migrations/000_create_base_tables.sql`

```sql
-- Copie TODO o conteúdo do arquivo 000_create_base_tables.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Tabelas básicas criadas (routes, stops, students, etc.)

---

#### **Migration 1: Webhook Tables**
📁 Arquivo: `supabase/migrations/001_webhook_tables.sql`

```sql
-- Copie TODO o conteúdo do arquivo 001_webhook_tables.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Tabela `webhook_logs` criada

---

#### **Migration 2: Bank Data Table**
📁 Arquivo: `supabase/migrations/002_bank_data_table.sql`

```sql
-- Copie TODO o conteúdo do arquivo 002_bank_data_table.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Tabela `conductor_bank_data` criada

---

#### **Migration 3: Driver Tracking**
📁 Arquivo: `supabase/migrations/002_driver_tracking.sql`

```sql
-- Copie TODO o conteúdo do arquivo 002_driver_tracking.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Tabela `driver_locations` criada

---

#### **Migration 4: Fix RLS Policies**
📁 Arquivo: `supabase/migrations/003_fix_rls_policies.sql`

```sql
-- Copie TODO o conteúdo do arquivo 003_fix_rls_policies.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** RLS desabilitado para debug

---

#### **Migration 5: Maintenance Storage**
📁 Arquivo: `supabase/migrations/003_maintenance_storage.sql`

```sql
-- Copie TODO o conteúdo do arquivo 003_maintenance_storage.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Storage bucket `maintenance-docs` criado

---

#### **Migration 6: Expenses Table**
📁 Arquivo: `supabase/migrations/004_expenses_table.sql`

```sql
-- Copie TODO o conteúdo do arquivo 004_expenses_table.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Tabela `expenses` criada

---

#### **Migration 7: Student Observation & Birth Date**
📁 Arquivo: `supabase/migrations/005_student_observation_birthdate.sql`

```sql
-- Copie TODO o conteúdo do arquivo 005_student_observation_birthdate.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Colunas `observation` e `birth_date` adicionadas

---

#### **Migration 8: Delete User Data Function**
📁 Arquivo: `supabase/migrations/006_delete_user_data_function.sql`

```sql
-- Copie TODO o conteúdo do arquivo 006_delete_user_data_function.sql
-- e cole aqui no SQL Editor
```

✅ **Resultado esperado:** Function `delete_user_data` criada

---

## ✅ VERIFICAR SE DEU CERTO

Após executar todas as migrations, execute este SQL para verificar:

```sql
-- Listar todas as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Você deve ver:**
- attendance
- conductor_bank_data
- driver_locations
- expenses
- incidents
- maintenance_items
- maintenance_logs
- payments
- reminders
- routes
- stops
- students
- user_settings
- webhook_logs

---

## 🐛 TROUBLESHOOTING

### Erro: "relation already exists"
- Você já executou essa migration antes
- Pule para a próxima

### Erro: "relation does not exist"
- Você pulou alguma migration
- Volte e execute na ordem

### Erro: "policy already exists"
- Execute o script de limpeza do passo 1
- Comece do zero

---

## 📊 RESUMO

```
000_create_base_tables.sql       ← NOVO! Execute primeiro
001_webhook_tables.sql
002_bank_data_table.sql
002_driver_tracking.sql
003_fix_rls_policies.sql
003_maintenance_storage.sql
004_expenses_table.sql
005_student_observation_birthdate.sql
006_delete_user_data_function.sql
```

---

**Última Atualização:** 25/01/2026 - 15:30
