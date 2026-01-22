# 🚀 DEPLOY RÁPIDO - Backend Asaas

## ⚡ Comandos para Executar (COPIE E COLE)

### 1️⃣ Configurar Secrets (API Key)

```powershell
npx supabase secrets set ASAAS_API_KEY_MASTER="$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJlYTg2MGU2LWZhOWItNGJkMi1hYjg1LTVhYmZiMmU0OGY0OTo6JGFhY2hfY2I3MGRhYTItZGJiOS00NzZiLWFkZWEtNGM1MjJjNWRlY2Y4" --project-ref nrkwrmksqhykfvgmfpcw
```

```powershell
npx supabase secrets set ASAAS_ENVIRONMENT="sandbox" --project-ref nrkwrmksqhykfvgmfpcw
```

### 2️⃣ Verificar Secrets

```powershell
npx supabase secrets list --project-ref nrkwrmksqhykfvgmfpcw
```

### 3️⃣ Deploy Edge Functions

```powershell
npx supabase functions deploy create-asaas-account --project-ref nrkwrmksqhykfvgmfpcw --no-verify-jwt
```

```powershell
npx supabase functions deploy asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw --no-verify-jwt
```

---

## 📋 Próximos Passos (MANUAL)

### 4️⃣ Rodar SQL no Supabase

1. Acesse: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/sql/new

2. Copie o conteúdo de `supabase/migrations/001_webhook_tables.sql`

3. Cole no editor SQL e clique em **RUN**

### 5️⃣ Configurar Webhook no Asaas

1. Acesse: https://sandbox.asaas.com/config/webhooks

2. Clique em **"Webhook para Cobranças"**

3. Preencha:
   - **URL**: `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/asaas-webhook`
   - **Email**: Seu email
   - **Versão API**: V3

4. Marque TODOS os eventos:
   - ✅ Cobrança criada
   - ✅ Cobrança atualizada
   - ✅ Pagamento confirmado
   - ✅ Pagamento recebido
   - ✅ Cobrança vencida
   - ✅ Cobrança removida
   - ✅ Pagamento estornado

5. Clique em **Salvar**

---

## ✅ Checklist

- [ ] Secrets configurados (passo 1)
- [ ] Secrets verificados (passo 2)
- [ ] Edge Functions deployed (passo 3)
- [ ] SQL executado no Supabase (passo 4)
- [ ] Webhook configurado no Asaas (passo 5)
- [ ] Gerar novo APK para testar

---

## 🧪 Testar no APK

Após deploy completo:

1. Gere o APK:
   ```powershell
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleDebug
   ```

2. Instale no celular

3. Teste o fluxo:
   - Configurações → Mudar Plano → Pro+
   - Configure dados bancários
   - Vá em Financeiro → Cobrança Automática
   - Ative para um aluno

---

## 📞 Suporte

Se der erro, me envie:
- Print do erro
- Logs do comando que falhou
- Qual passo estava executando
