# 💳 Integração Asaas - Cobrança Automática e Negativação

## 📋 Visão Geral

Esta branch implementa a integração completa com a API do Asaas para:
- ✅ Cobrança automática recorrente (PIX, Boleto, Cartão)
- ✅ Negativação automática (Serasa/SPC)
- ✅ Notificações automáticas aos responsáveis
- ✅ Gestão de inadimplência

---

## 🎯 Funcionalidades Implementadas

### 1. **Serviço Asaas** (`services/asaasService.ts`)
Classe completa para integração com API do Asaas:

**Clientes:**
- `createCustomer()` - Criar cliente no Asaas
- `getCustomerByCpf()` - Buscar cliente por CPF

**Cobranças:**
- `createPayment()` - Criar cobrança única
- `listPayments()` - Listar cobranças
- `getPayment()` - Buscar cobrança específica

**Assinaturas (Recorrência):**
- `createSubscription()` - Criar cobrança recorrente mensal
- `listSubscriptions()` - Listar assinaturas
- `cancelSubscription()` - Cancelar assinatura

**Negativação:**
- `createNegativation()` - Enviar para Serasa/SPC
- `simulateNegativation()` - Simular antes de enviar
- `listNegativations()` - Listar negativações
- `cancelNegativation()` - Cancelar negativação

**Webhooks:**
- `configureWebhook()` - Configurar notificações automáticas

---

### 2. **Tela de Configuração** (`pages/AsaasConfigScreen.tsx`)

Interface para o condutor configurar:
- ✅ API Key do Asaas
- ✅ Ambiente (Sandbox/Produção)
- ✅ Ativar/Desativar integração
- ✅ Dias para negativação automática
- ✅ Teste de conexão

**Como usar:**
1. Condutor acessa "Configurações → Asaas"
2. Insere API Key (obtida no painel Asaas)
3. Escolhe ambiente (Sandbox para testes)
4. Clica em "Testar Conexão"
5. Define dias para negativação (padrão: 30 dias)
6. Salva configurações

---

### 3. **Tela de Cobrança Automática** (`pages/AutomaticBillingScreen.tsx`)

Interface para gerenciar cobranças por aluno:
- ✅ Lista todos os alunos ativos
- ✅ Mostra status (Pronto/Incompleto)
- ✅ Botão "Ativar Cobrança" por aluno
- ✅ Botão "Negativar" para inadimplentes
- ✅ Validação de dados obrigatórios

**Dados necessários por aluno:**
- CPF do responsável
- Valor da mensalidade
- Dia de vencimento

**Fluxo de ativação:**
1. Condutor clica em "Ativar Cobrança"
2. Sistema cria/busca cliente no Asaas
3. Cria assinatura recorrente mensal
4. Asaas gera cobranças automaticamente todo mês
5. Responsável recebe link de pagamento

---

## 💰 Modelo de Negócio

### **Custos do Asaas (aproximados):**
- PIX: R$ 0,99 a R$ 1,99 por transação
- Boleto: R$ 2,49 a R$ 3,49 por boleto
- Cartão: 3,99% a 5,99% do valor
- Negativação: R$ 5,00 a R$ 10,00

### **Modelo de Cobrança Sugerido:**

**Opção 1: Plano Premium**
- Plano Pro+ (R$ 39,90/mês)
- Inclui cobrança automática até 50 alunos
- Condutor paga as taxas do Asaas

**Opção 2: Split de Pagamento**
- Plano Pro Solo (R$ 14,90/mês)
- + 1,5% de cada transação processada
- Renda passiva escalável

**Exemplo prático:**
- Condutor com 30 alunos × R$ 250 = R$ 7.500/mês
- Seu lucro: R$ 39,90 (mensalidade) + R$ 112,50 (1,5% split) = **R$ 152,40/mês**

---

## 🔧 Como Testar

### **1. Criar conta Sandbox no Asaas:**
1. Acesse: https://sandbox.asaas.com
2. Crie uma conta gratuita
3. Vá em: Integrações → API Key
4. Copie a API Key

### **2. Configurar no app:**
1. Abra a tela de Configuração Asaas
2. Cole a API Key
3. Selecione "Sandbox"
4. Clique em "Testar Conexão"
5. Salve

### **3. Testar cobrança:**
1. Cadastre um aluno com:
   - CPF válido (pode ser fictício no sandbox)
   - Valor da mensalidade
   - Dia de vencimento
2. Vá em "Cobrança Automática"
3. Clique em "Ativar Cobrança"
4. Verifique no painel Asaas se a assinatura foi criada

---

## 📱 Próximos Passos

### **Para produção:**
1. ✅ Adicionar rotas no App.tsx
2. ✅ Adicionar menu de navegação
3. ✅ Salvar configurações no banco local
4. ✅ Implementar webhooks para atualizar status
5. ✅ Adicionar histórico de cobranças
6. ✅ Dashboard de inadimplência
7. ✅ Notificações push quando pagamento confirmado

### **Melhorias futuras:**
- Relatório de receita mensal
- Gráfico de inadimplência
- Exportar extrato para Excel
- Integração com WhatsApp Business API
- Envio automático de recibos

---

## 🚀 Vantagens para o Condutor

1. **Redução de Inadimplência**: 30-40% menos atrasos
2. **Profissionalização**: Cobranças formais e rastreáveis
3. **Economia de Tempo**: Sem precisar gerar boletos manualmente
4. **Respaldo Legal**: Contratos + negativação = seriedade
5. **Recebimento Garantido**: Asaas tem convênio com Serasa

---

## 📞 Suporte

Para dúvidas sobre a API do Asaas:
- Documentação: https://docs.asaas.com
- Suporte: suporte@asaas.com

---

## ⚠️ Importante

- Esta é uma **branch de teste**
- Não fazer merge para main sem testes completos
- Validar custos reais com Asaas antes de lançar
- Testar fluxo completo no Sandbox primeiro
- Considerar aspectos legais de negativação

---

**Status**: 🟡 Em desenvolvimento
**Branch**: `feature/asaas-cobranca-automatica`
**Última atualização**: Janeiro 2025
