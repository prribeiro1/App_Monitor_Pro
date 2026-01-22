# 🚀 Deploy do Backend - Passo a Passo

## Pré-requisitos

1. **Supabase CLI instalado**
   ```bash
   npm install -g supabase
   ```

2. **Login no Supabase**
   ```bash
   supabase login
   ```
   - Vai abrir o navegador para você fazer login
   - Autorize o acesso

3. **Link com seu projeto**
   ```bash
   supabase link --project-ref nrkwrmksqhykfvgmfpcw
   ```
   - Vai pedir a senha do banco (Database Password)
   - É a senha que você criou quando criou o projeto Supabase

---

## Passo 1: Configurar Variáveis de Ambiente (Secrets)

Execute estes comandos **um por vez**:

```bash
# 1. Configurar sua API Key do Asaas (Sandbox)
npx supabase secrets set ASAAS_API_KEY_MASTER="$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJlYTg2MGU2LWZhOWItNGJkMi1hYjg1LTVhYmZiMmU0OGY0OTo6JGFhY2hfY2I3MGRhYTItZGJiOS00NzZiLWFkZWEtNGM1MjJjNWRlY2Y4" --project-ref nrkwrmksqhykfvgmfpcw

# 2. Configurar ambiente (sandbox para testes)
npx supabase secrets set ASAAS_ENVIRONMENT="sandbox" --project-ref nrkwrmksqhykfvgmfpcw
```

**Verificar se foi salvo:**
```bash
npx supabase secrets list --project-ref nrkwrmksqhykfvgmfpcw
```

Deve mostrar:
```
ASAAS_API_KEY_MASTER
ASAAS_ENVIRONMENT
```

---

## Passo 2: Deploy das Edge Functions

### 2.1 Deploy: create-asaas-account
```bash
npx supabase functions deploy create-asaas-account --project-ref nrkwrmksqhykfvgmfpcw
```

**Saída esperada:**
```
✓ Deployed Function create-asaas-account
URL: https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/create-asaas-account
```

### 2.2 Deploy: asaas-webhook
```bash
npx supabase functions deploy asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw
```

**Saída esperada:**
```
✓ Deployed Function asaas-webhook
URL: https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/asaas-webhook
```

---

## Passo 3: Rodar SQL no Supabase

1. Acesse: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/sql/new

2. Copie o conteúdo de `supabase/migrations/001_webhook_tables.sql`

3. Cole no editor SQL

4. Clique em **"Run"**

**Resultado esperado:**
```
✓ Tabelas de webhook configuradas com sucesso!
```

---

## Passo 4: Configurar Webhook no Asaas

1. Acesse: https://sandbox.asaas.com

2. Vá em: **Configurações → Integrações → Webhooks**

3. Clique em **"Webhook para Cobranças"**

4. Preencha:

| Campo | Valor |
|-------|-------|
| **URL** | `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/asaas-webhook` |
| **Email** | Seu email |
| **Versão API** | V3 |

5. **Eventos** (marque todos):
   - ✅ Cobrança criada
   - ✅ Cobrança atualizada
   - ✅ Pagamento confirmado
   - ✅ Pagamento recebido
   - ✅ Cobrança vencida
   - ✅ Cobrança removida
   - ✅ Pagamento estornado

6. Clique em **Salvar**

---

## Passo 5: Testar

### Teste 1: Criar Subconta

No APK, vá em:
```
Configurações → Mudar Plano → Pro+ → Configurar dados bancários
```

Preencha os dados e clique em "Finalizar".

**Logs para verificar:**
```bash
# Ver logs da função
npx supabase functions logs create-asaas-account --project-ref nrkwrmksqhykfvgmfpcw
```

### Teste 2: Webhook

No painel Asaas:
1. Crie uma cobrança de teste
2. Clique em "Simular Pagamento"

**Logs para verificar:**
```bash
npx supabase functions logs asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw
```

---

## Troubleshooting

### Erro: "supabase: command not found"
```bash
npm install -g supabase
```

### Erro: "Not logged in"
```bash
supabase login
```

### Erro: "Project not linked"
```bash
supabase link --project-ref nrkwrmksqhykfvgmfpcw
```

### Erro: "Database password required"
- É a senha do banco que você criou no Supabase
- Se esqueceu: Supabase Dashboard → Settings → Database → Reset Password

### Ver logs em tempo real
```bash
# Função create-asaas-account
npx supabase functions logs create-asaas-account --project-ref nrkwrmksqhykfvgmfpcw --follow

# Webhook
npx supabase functions logs asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw --follow
```

---

## Checklist Final

- [ ] Supabase CLI instalado
- [ ] Login feito (`supabase login`)
- [ ] Projeto linkado (`supabase link`)
- [ ] Secrets configurados (API Key + Environment)
- [ ] Edge Function `create-asaas-account` deployed
- [ ] Edge Function `asaas-webhook` deployed
- [ ] SQL executado no Supabase
- [ ] Webhook configurado no painel Asaas
- [ ] Testado no APK

---

## URLs Importantes

**Edge Functions:**
- Create Account: `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/create-asaas-account`
- Webhook: `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/asaas-webhook`

**Supabase Dashboard:**
- SQL Editor: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/sql/new
- Edge Functions: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/functions
- Logs: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/logs/edge-functions

**Asaas:**
- Sandbox: https://sandbox.asaas.com
- Webhooks: https://sandbox.asaas.com/config/webhooks

---

**Status**: 📝 Pronto para deploy
**Tempo estimado**: 10 minutos
**Dificuldade**: Fácil (só seguir os passos)
