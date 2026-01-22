# ✅ STATUS DO DEPLOY - Backend Asaas

## 🎉 O QUE JÁ FOI FEITO (AUTOMÁTICO)

### ✅ 1. Secrets Configurados
- `ASAAS_API_KEY_MASTER`: Configurado com sua API Key Sandbox
- `ASAAS_ENVIRONMENT`: Configurado como "sandbox"

### ✅ 2. Edge Functions Deployed
- `create-asaas-account`: ✅ Deployed
  - URL: `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/create-asaas-account`
- `asaas-webhook`: ✅ Deployed
  - URL: `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/asaas-webhook`

---

## 📋 O QUE VOCÊ PRECISA FAZER (MANUAL)

### 🔴 PASSO 1: Executar SQL no Supabase

1. **Acesse**: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/sql/new

2. **Copie TODO o conteúdo** do arquivo: `supabase/migrations/001_webhook_tables.sql`

3. **Cole no editor SQL** e clique em **RUN** (botão verde)

4. **Resultado esperado**: 
   ```
   ✅ Tabelas de webhook configuradas com sucesso!
   ```

---

### 🔴 PASSO 2: Configurar Webhook no Asaas

1. **Acesse**: https://sandbox.asaas.com/config/webhooks

2. **Clique em**: "Webhook para Cobranças" (ou "Adicionar Webhook")

3. **Preencha**:

   | Campo | Valor |
   |-------|-------|
   | **URL** | `https://nrkwrmksqhykfvgmfpcw.functions.supabase.co/asaas-webhook` |
   | **Email** | Seu email |
   | **Versão API** | V3 |

4. **Marque TODOS os eventos**:
   - ✅ Cobrança criada (PAYMENT_CREATED)
   - ✅ Cobrança atualizada (PAYMENT_UPDATED)
   - ✅ Pagamento confirmado (PAYMENT_CONFIRMED)
   - ✅ Pagamento recebido (PAYMENT_RECEIVED)
   - ✅ Cobrança vencida (PAYMENT_OVERDUE)
   - ✅ Cobrança removida (PAYMENT_DELETED)
   - ✅ Pagamento estornado (PAYMENT_REFUNDED)

5. **Clique em**: Salvar

---

## 🧪 TESTAR NO APK

Após completar os passos acima, gere um novo APK:

```powershell
# 1. Build do projeto
npm run build

# 2. Sincronizar com Android
npx cap sync android

# 3. Gerar APK
cd android
./gradlew assembleDebug
cd ..
```

**APK estará em**: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🎯 FLUXO DE TESTE NO APK

1. **Instale o APK** no celular

2. **Faça login** com usuário `teste` ou `google_test`

3. **Vá em**: Configurações → Mudar Plano

4. **Escolha**: Pro+ (R$ 24,90/mês)

5. **Configure dados bancários**:
   - Nome completo
   - CPF
   - Email
   - Telefone
   - Banco (ex: Nubank - 260)
   - Agência (ex: 0001)
   - Conta (ex: 12345)
   - Dígito (ex: 6)

6. **Clique em**: Finalizar Configuração

7. **Resultado esperado**:
   ```
   ✅ Conta criada com sucesso!
   
   Agora você pode usar a Cobrança Automática.
   
   💰 Você receberá 99% direto na sua conta.
   1% fica com o Monitor Pro.
   ```

8. **Vá em**: Financeiro → Cobrança Automática

9. **Ative para um aluno** (que tenha CPF, valor e vencimento)

10. **Resultado esperado**:
    ```
    ✅ Cobrança automática ativada!
    
    Assinatura ID: sub_xxxxx
    Próximo vencimento: 22/02/2026
    
    💰 Split configurado:
    99% para você
    1% para Monitor Pro
    ```

---

## 🔍 VERIFICAR LOGS

### Ver logs das Edge Functions:

```powershell
# Logs da criação de conta
npx supabase functions logs create-asaas-account --project-ref nrkwrmksqhykfvgmfpcw

# Logs do webhook
npx supabase functions logs asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw
```

### Ver logs em tempo real:

```powershell
# Adicione --follow para ver em tempo real
npx supabase functions logs create-asaas-account --project-ref nrkwrmksqhykfvgmfpcw --follow
```

---

## 📊 VERIFICAR NO PAINEL ASAAS

Após criar a subconta e ativar cobrança:

1. **Acesse**: https://sandbox.asaas.com

2. **Vá em**: Cobranças → Assinaturas

3. **Você verá**: A assinatura criada com split de 1%

4. **Clique na assinatura** para ver detalhes do split

---

## ❓ ARGUMENTOS DE VENDA (Para seus clientes)

### "Por que fornecer dados bancários?"

**Resposta**:
> "O dinheiro cai DIRETO na sua conta! Você recebe 99% automaticamente. 
> Apenas 1% fica com o Monitor Pro pela tecnologia. 
> É mais transparente e seguro do que eu fazer o repasse manualmente."

### "Por que aceitar 1% de split?"

**Resposta**:
> "Compare:
> - Sem Monitor Pro: R$ 105/mês em boletos (R$ 3,50 x 30 alunos)
> - Com Monitor Pro: R$ 24,90/mês + 1% de split
> 
> Economia: R$ 80/mês + redução de inadimplência + negativação automática"

### "É seguro?"

**Resposta**:
> "Sim! O Asaas é regulamentado pelo Banco Central.
> Seus dados são enviados direto para o Asaas (HTTPS).
> Eu NÃO tenho acesso aos seus dados bancários.
> Você pode acompanhar tudo no app."

---

## 📞 SUPORTE

Se der algum erro, me envie:

1. **Print do erro**
2. **Logs do comando** (copie e cole)
3. **Qual passo estava executando**

---

## ✅ CHECKLIST FINAL

- [x] Secrets configurados
- [x] Edge Functions deployed
- [ ] SQL executado no Supabase ← **VOCÊ PRECISA FAZER**
- [ ] Webhook configurado no Asaas ← **VOCÊ PRECISA FAZER**
- [ ] APK gerado e testado ← **VOCÊ PRECISA FAZER**

---

**Status Atual**: 🟡 60% Completo (faltam passos manuais)

**Próximo Passo**: Execute o SQL no Supabase (Passo 1)
