# 🔧 Como Resolver o Problema de Login

## 🎯 Problema
Não consegue criar conta ou fazer login no app.

## 🔍 Causa
O projeto novo do Supabase (`bkwrflgrfhsgeowjynou`) ainda não tem as tabelas criadas.

---

## ✅ Solução (5 minutos)

### Passo 1: Abrir SQL Editor
1. Acesse: https://supabase.com/dashboard/project/bkwrflgrfhsgeowjynou
2. No menu lateral, clique em **"SQL Editor"**
3. Clique em **"New query"**

### Passo 2: Copiar o SQL
1. Abra o arquivo: `SETUP_COMPLETO_PROJETO_NOVO.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### Passo 3: Executar
1. Cole no SQL Editor do Supabase (Ctrl+V)
2. Clique em **"Run"** (ou pressione Ctrl+Enter)
3. Aguarde a mensagem de sucesso (pode demorar ~10 segundos)

### Passo 4: Testar
1. Volte para o app (`npm run dev`)
2. Tente criar uma conta nova
3. Faça login
4. ✅ Deve funcionar!

---

## 🎉 O Que o SQL Faz

Cria todas as tabelas necessárias:
- ✅ `routes` (rotas)
- ✅ `stops` (pontos)
- ✅ `students` (alunos) **com novos campos**
- ✅ `attendance` (chamada)
- ✅ `payments` (pagamentos)
- ✅ `incidents` (ocorrências)
- ✅ `user_settings` (configurações)
- ✅ `maintenance_items` (manutenção)
- ✅ `maintenance_logs` (logs de manutenção)
- ✅ `reminders` (lembretes)
- ✅ `vehicle_documents` (documentos)
- ✅ `expenses` (gastos)
- ✅ `route_sessions` (sessões de rota) **NOVO**
- ✅ `route_events` (eventos de rota) **NOVO**

E configura todas as políticas de segurança (RLS).

---

## ⚠️ Se Ainda Não Funcionar

### Verificar Console do Navegador:
1. Abra o DevTools (F12)
2. Vá na aba "Console"
3. Procure por erros em vermelho
4. Me envie a mensagem de erro

### Verificar Supabase:
1. Vá em: https://supabase.com/dashboard/project/bkwrflgrfhsgeowjynou/editor
2. Verifique se as tabelas foram criadas
3. Deve aparecer: `routes`, `stops`, `students`, etc.

---

## 📞 Precisa de Ajuda?

Me envie:
1. Print do erro no console
2. Print das tabelas no Supabase
3. Mensagem de erro que aparece no app

---

**Criado em:** 25/01/2026 - 17:30
