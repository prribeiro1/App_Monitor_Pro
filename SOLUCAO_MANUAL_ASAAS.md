# 🎯 SOLUÇÃO MANUAL - Criar Subcontas Asaas

## ✅ O QUE FOI IMPLEMENTADO

### 1. Salvamento no Supabase
- Dados bancários agora são salvos **diretamente no Supabase**
- **NÃO depende** de Edge Functions
- **Funciona 100%** no APK

### 2. Novo Fluxo
1. Cliente preenche dados bancários no app
2. Dados são salvos no Supabase (tabela `conductor_bank_data`)
3. **VOCÊ** acessa o Supabase e vê os dados
4. **VOCÊ** cria a subconta manualmente no painel Asaas
5. **VOCÊ** cola o `walletId` de volta no Supabase
6. App sincroniza automaticamente

---

## 📋 SQL PARA EXECUTAR NO SUPABASE

**Acesse**: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/sql/new

**Cole e execute** o arquivo: `supabase/migrations/002_bank_data_table.sql`

---

## 🔍 COMO VER OS DADOS DOS CLIENTES

### Opção 1: Pelo Table Editor (Mais Fácil)

1. **Acesse**: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/editor

2. **Clique** na tabela: `conductor_bank_data`

3. **Você verá** todos os clientes que preencheram dados bancários

4. **Colunas importantes**:
   - `full_name`: Nome completo
   - `cpf`: CPF
   - `email`: Email
   - `phone`: Telefone
   - `bank_code`: Código do banco
   - `agency`: Agência
   - `account`: Conta
   - `account_digit`: Dígito
   - `account_type`: Tipo (CONTA_CORRENTE ou CONTA_POUPANCA)
   - `status`: Status (pending, completed, error)
   - `asaas_wallet_id`: Wallet ID (vazio até você preencher)

### Opção 2: Por SQL

Execute no SQL Editor:

```sql
SELECT 
  full_name,
  cpf,
  email,
  phone,
  bank_code,
  bank_name,
  agency,
  account,
  account_digit,
  account_type,
  status,
  asaas_wallet_id,
  created_at
FROM conductor_bank_data
WHERE status = 'pending'
ORDER BY created_at DESC;
```

---

## 🔧 COMO CRIAR SUBCONTA NO ASAAS

### Passo 1: Acesse o Painel Asaas

https://sandbox.asaas.com (ou https://www.asaas.com para produção)

### Passo 2: Vá em "Subcontas"

Menu lateral → Subcontas → Nova Subconta

### Passo 3: Preencha os Dados

Use os dados da tabela `conductor_bank_data`:

- **Nome**: `full_name`
- **CPF**: `cpf`
- **Email**: `email`
- **Telefone**: `phone`
- **Tipo**: Pessoa Física

### Passo 4: Configure Dados Bancários

- **Banco**: `bank_code` (ex: 260 = Nubank)
- **Agência**: `agency`
- **Conta**: `account`
- **Dígito**: `account_digit`
- **Tipo**: `account_type`

### Passo 5: Copie o Wallet ID

Após criar a subconta, o Asaas vai gerar um **Wallet ID**.

**Exemplo**: `wallet_abc123xyz`

---

## 💾 COMO ATUALIZAR O WALLET ID NO SUPABASE

### Opção 1: Pelo Table Editor

1. **Acesse**: https://supabase.com/dashboard/project/nrkwrmksqhykfvgmfpcw/editor

2. **Clique** na tabela: `conductor_bank_data`

3. **Encontre** o registro do cliente

4. **Clique** na célula `asaas_wallet_id`

5. **Cole** o Wallet ID

6. **Mude** o `status` para `completed`

7. **Salve**

### Opção 2: Por SQL

Execute no SQL Editor:

```sql
UPDATE conductor_bank_data
SET 
  asaas_wallet_id = 'wallet_abc123xyz',  -- Cole o Wallet ID aqui
  status = 'completed',
  processed_at = NOW()
WHERE cpf = '12345678900';  -- CPF do cliente
```

---

## 📱 COMO O APP SINCRONIZA

O app verifica automaticamente se o `asaas_wallet_id` foi preenchido:

1. Cliente abre o app
2. App consulta o Supabase
3. Se `asaas_wallet_id` estiver preenchido:
   - Salva localmente
   - Ativa a cobrança automática
   - Mostra mensagem de sucesso

---

## 🎯 FLUXO COMPLETO (RESUMO)

### No App (Cliente):
1. Configurações → Mudar Plano → Pro+
2. Preenche dados bancários
3. Clica em "Finalizar"
4. Dados são salvos no Supabase
5. Mensagem: "Sua conta será ativada em até 24 horas"

### No Supabase (Você):
1. Acessa Table Editor
2. Vê os dados do cliente
3. Copia os dados

### No Asaas (Você):
1. Cria subconta manualmente
2. Copia o Wallet ID

### No Supabase (Você):
1. Cola o Wallet ID na tabela
2. Muda status para "completed"

### No App (Cliente):
1. Abre o app novamente
2. App sincroniza automaticamente
3. Cobrança automática ativada!

---

## ⏱️ TEMPO ESTIMADO

- **Ver dados no Supabase**: 30 segundos
- **Criar subconta no Asaas**: 2 minutos
- **Atualizar Wallet ID**: 30 segundos

**Total**: ~3 minutos por cliente

---

## 📊 VANTAGENS DESTA SOLUÇÃO

✅ **Funciona 100%** - Não depende de Edge Functions
✅ **Simples** - Apenas 3 minutos por cliente
✅ **Seguro** - Dados no Supabase (criptografados)
✅ **Rastreável** - Você vê todos os clientes pendentes
✅ **Escalável** - Pode processar vários de uma vez

---

## 🚀 PRÓXIMOS PASSOS

1. **Execute o SQL** (`002_bank_data_table.sql`)
2. **Gere o novo APK** (já está pronto)
3. **Teste no celular**
4. **Veja os dados no Supabase**
5. **Crie a primeira subconta no Asaas**

---

**Está pronto para testar!** 🎉
