# 🧪 Como Testar Split de Pagamento (Opção 2)

## 📋 Pré-requisitos

1. **Duas contas Sandbox Asaas:**
   - Conta A: "Monitor Pro" (você - master)
   - Conta B: "Condutor Teste" (simula cliente)

2. **API Keys:**
   - API Key da Conta A (master) - será configurada no app

---

## 🚀 Passo a Passo do Teste

### **1. Criar Contas Sandbox**

**Conta A (Monitor Pro - Você):**
1. Acesse: https://sandbox.asaas.com
2. Crie conta com email: `monitorpro@teste.com`
3. Vá em: Integrações → API Key
4. Copie a API Key (ex: `$aact_YTU5YTE0...`)

**Conta B (Condutor Teste):**
1. Use outro navegador/aba anônima
2. Acesse: https://sandbox.asaas.com
3. Crie conta com email: `condutor@teste.com`
4. Anote o CPF usado (pode ser fictício: 123.456.789-00)

---

### **2. Configurar no App**

1. **Abra o app** (localhost ou APK)
2. **Faça login** como admin
3. **Vá em Financeiro → Configurar Asaas**
4. **Cole a API Key da Conta A** (Monitor Pro)
5. **Selecione "Sandbox"**
6. **Salve**

---

### **3. Simular Onboarding do Condutor**

**No app, o condutor precisaria informar:**
- Nome completo
- CPF (use o da Conta B: 123.456.789-00)
- Email (condutor@teste.com)
- Telefone
- Dados bancários:
  - Banco: 001 (Banco do Brasil)
  - Agência: 1234
  - Conta: 12345-6
  - Tipo: Conta Corrente

**O sistema fará automaticamente:**
```javascript
// 1. Cria subconta no Asaas
const account = await asaasService.createAccount({
  name: "Condutor Teste",
  email: "condutor@teste.com",
  cpfCnpj: "12345678900",
  companyType: "INDIVIDUAL",
  bankAccount: {
    bank: "001",
    accountName: "Condutor Teste",
    ownerName: "Condutor Teste",
    cpfCnpj: "12345678900",
    agency: "1234",
    account: "12345",
    accountDigit: "6",
    bankAccountType: "CONTA_CORRENTE"
  }
});

// 2. Salva o walletId no banco local
// walletId = account.walletId
```

---

### **4. Ativar Cobrança para um Aluno**

1. **Cadastre um aluno:**
   - Nome: "João Silva"
   - CPF Responsável: 987.654.321-00 (fictício)
   - Mensalidade: R$ 250,00
   - Vencimento: Dia 10

2. **Vá em "Cobrança Automática"**

3. **Clique em "Ativar Cobrança"**

**O sistema fará:**
```javascript
// 1. Cria cliente (responsável)
const customer = await asaasService.createCustomer({
  name: "Responsável João",
  cpfCnpj: "98765432100"
});

// 2. Cria assinatura COM SPLIT
const subscription = await asaasService.createSubscription({
  customer: customer.id,
  billingType: "PIX",
  value: 250,
  nextDueDate: "2025-02-10",
  cycle: "MONTHLY",
  description: "Mensalidade - João Silva"
}, conductorWalletId); // ← Passa o walletId do condutor

// Split automático:
// 97% (R$ 242,50) → Condutor
// 3% (R$ 7,50) → Você
```

---

### **5. Verificar no Painel Asaas**

**Conta A (Monitor Pro):**
1. Acesse: https://sandbox.asaas.com
2. Vá em: **Assinaturas**
3. Deve aparecer: "Mensalidade - João Silva"
4. Clique para ver detalhes
5. Veja a seção **"Split de Pagamento"**:
   - 97% → Condutor Teste
   - 3% → Você (fica na conta master)

**Conta B (Condutor):**
1. Acesse: https://sandbox.asaas.com (conta do condutor)
2. Vá em: **Cobranças** ou **Extrato**
3. Deve aparecer: R$ 242,50 (97% de R$ 250)

---

### **6. Simular Pagamento (Sandbox)**

1. **No painel da Conta A**, vá na cobrança criada
2. Clique em **"Simular Pagamento"** (só existe no Sandbox)
3. Confirme

**O que acontece:**
- Asaas simula que o responsável pagou
- R$ 242,50 vai para conta do Condutor
- R$ 7,50 fica na sua conta (Monitor Pro)
- Tudo automático!

---

## ✅ **Checklist de Validação**

- [ ] API Key da Conta A configurada no app
- [ ] Subconta criada para o condutor (walletId salvo)
- [ ] Assinatura criada com split configurado
- [ ] Split aparece no painel Asaas (97% / 3%)
- [ ] Pagamento simulado dividiu corretamente
- [ ] Condutor recebeu 97% na conta dele
- [ ] Você recebeu 3% na conta master

---

## 💰 **Cálculo do Split**

| Valor Mensalidade | Condutor (97%) | Você (3%) | Taxa Asaas (~1%) | Condutor Líquido |
|-------------------|----------------|-----------|------------------|------------------|
| R$ 100,00 | R$ 97,00 | R$ 3,00 | R$ 1,00 | R$ 96,00 |
| R$ 250,00 | R$ 242,50 | R$ 7,50 | R$ 2,50 | R$ 240,00 |
| R$ 500,00 | R$ 485,00 | R$ 15,00 | R$ 5,00 | R$ 480,00 |

**Seu lucro mensal:**
- 1 condutor com 30 alunos × R$ 250 = R$ 7.500
- Seu split (3%) = **R$ 225/mês**
- 100 condutores = **R$ 22.500/mês** 🚀

---

## 🔧 **Troubleshooting**

### **Erro: "Subconta não encontrada"**
- Verifique se o CPF do condutor está correto
- Confirme que a subconta foi criada (veja no painel Asaas)

### **Erro: "Split inválido"**
- Verifique se o walletId está correto
- Confirme que a subconta está ativa

### **Split não aparece no painel**
- Aguarde alguns segundos (pode demorar)
- Recarregue a página
- Verifique se está na conta master (Conta A)

---

## 📱 **Próximos Passos**

1. ✅ Testar no Sandbox (AGORA)
2. ✅ Validar fluxo completo
3. ✅ Gerar APK para testar no celular
4. 🔄 Quando tiver CNPJ → Migrar para Produção
5. 🔄 Configurar webhook para atualizar status automaticamente
6. 🔄 Criar dashboard de receita

---

**Status**: 🟢 Pronto para testar no Sandbox
**Branch**: `feature/asaas-cobranca-automatica`
**Última atualização**: Janeiro 2025
