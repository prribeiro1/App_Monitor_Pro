# 🔔 Configuração do Webhook Asaas

## Passo a Passo

### 1. Rodar o SQL no Supabase
Copie o conteúdo de `supabase/migrations/001_webhook_tables.sql` e execute no **SQL Editor** do Supabase.

### 2. Fazer Deploy da Edge Function
```bash
npx supabase functions deploy asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw
```

### 3. Configurar Webhook no Painel Asaas

1. Acesse: **Asaas → Configurações → Integrações → Webhooks**
2. Clique em **"Webhook para Cobranças"**
3. Preencha:

| Campo | Valor |
|-------|-------|
| **URL** | `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/asaas-webhook` |
| **Email** | Seu email para notificações de falha |
| **Versão API** | V3 |

4. **Eventos para marcar**:
   - ✅ Cobrança criada
   - ✅ Cobrança atualizada
   - ✅ Pagamento confirmado
   - ✅ Pagamento recebido
   - ✅ Cobrança vencida
   - ✅ Cobrança removida
   - ✅ Pagamento estornado
   - ✅ Boleto visualizado

5. Clique em **Salvar**

---

## Como Funciona

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     ASAAS       │      │    SUPABASE     │      │   SEU APP       │
│                 │      │  Edge Function  │      │                 │
│  Pagamento ───────────▶│                 │      │                 │
│  Confirmado     │ POST │  Processa       │      │                 │
│                 │      │  Evento         │      │                 │
│                 │      │       │         │      │                 │
│                 │      │       ▼         │      │                 │
│                 │      │  Atualiza DB  ──────▶  │  Reflete        │
│                 │      │  - profiles     │      │  mudanças       │
│                 │      │  - students     │      │  em tempo real  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## Eventos Tratados

| Evento | Ação |
|--------|------|
| `PAYMENT_CONFIRMED` | Marca aluno como PAGO ou atualiza plano do usuário |
| `PAYMENT_RECEIVED` | Mesmo que acima (dinheiro já na conta) |
| `PAYMENT_OVERDUE` | Marca aluno como INADIMPLENTE |
| `PAYMENT_REFUNDED` | Rebaixa usuário para plano básico |
| `PAYMENT_DELETED` | Mesmo que refunded |
| `PAYMENT_CHARGEBACK_REQUESTED` | Mesmo que refunded |

---

## External Reference

Para o webhook saber O QUE foi pago, usamos o campo `externalReference` ao criar a cobrança:

```javascript
// Para mensalidade de aluno
externalReference: 'student:uuid-do-aluno'

// Para assinatura do app
externalReference: 'subscription:uuid-do-usuario'
```

O webhook lê esse campo e sabe exatamente o que atualizar no banco.

---

## Testando

### No Sandbox
1. Crie uma cobrança de teste
2. No painel Asaas, clique em "Simular Pagamento"
3. Verifique os logs no Supabase: **Edge Functions → asaas-webhook → Logs**

### Em Produção
1. Gere uma cobrança real (PIX de R$ 1,00 para você mesmo)
2. Pague
3. Verifique se o webhook foi recebido nos logs

---

## Segurança (Opcional)

Para validar que o webhook realmente veio do Asaas, configure um token:

```bash
npx supabase secrets set ASAAS_WEBHOOK_TOKEN="seu-token-secreto" --project-ref nrkwrmksqhykfvgmfpcw
```

E no Asaas, adicione esse token no campo "Token de Autenticação" do webhook.

---

## Logs

Todos os webhooks são salvos na tabela `webhook_logs`:

```sql
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;
```

---

**Status**: ✅ Pronto para deploy
**Próximo passo**: `npx supabase functions deploy asaas-webhook`
