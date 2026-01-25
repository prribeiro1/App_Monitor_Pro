# 🔧 Corrigir Erro: Foreign Key Constraint "students_stop_id_fkey"

## ❌ Problema

Ao tentar salvar um aluno, aparece o erro:
```
Erro ao salvar Aluno na Nuvem: insert or update on table "students" 
violates foreign key constraint "students_stop_id_fkey"
```

## 🔍 Causa

O banco de dados ainda tem uma **constraint** (restrição) que exige que todo aluno tenha um `stop_id` válido. Como estamos migrando para a nova estrutura (sem pontos), precisamos remover essa constraint.

## ✅ Solução

### Passo 1: Aplicar SQL no Supabase

1. Acesse o SQL Editor do Supabase:
   - URL: https://supabase.com/dashboard/project/bkwrflgrfhsgeowjynou/sql/new

2. Cole o seguinte SQL:

```sql
-- Remover constraint de foreign key
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_stop_id_fkey;

-- Tornar stop_id nullable
ALTER TABLE students ALTER COLUMN stop_id DROP NOT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_students_route_id ON students(route_id);
CREATE INDEX IF NOT EXISTS idx_students_route_order ON students(route_order);
```

3. Clique em **Run** (Executar)

4. Aguarde a confirmação de sucesso

### Passo 2: Testar

1. Recarregue o app (`npm run dev`)
2. Tente cadastrar um novo aluno
3. Deve funcionar sem erros!

## 📝 O que foi alterado no código

### 1. `types.ts`
- `stopId` agora é **opcional** (`stopId?: string`)

### 2. `pages/StudentsScreen.tsx`
- Novos alunos **não** recebem `stopId`
- Alunos existentes **mantêm** o `stopId` (compatibilidade)

### 3. Nova Migration
- Arquivo: `supabase/migrations/008_remove_stop_constraint.sql`
- Remove a constraint de `stop_id`
- Torna `stop_id` nullable

## ⚠️ Importante

- Alunos **antigos** (com `stopId`) continuam funcionando
- Alunos **novos** usam apenas `routeId`
- A tabela `stops` ainda existe (não foi deletada)

## 🎯 Resultado Esperado

Após aplicar o SQL, você poderá:
- ✅ Cadastrar alunos sem `stop_id`
- ✅ Usar apenas `route_id` (nova estrutura)
- ✅ Manter alunos antigos funcionando

---

**Data:** 25/01/2026  
**Branch:** feature/feedback-condutores
