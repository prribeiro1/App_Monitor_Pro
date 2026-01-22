# 📊 Sistema de Planos - Monitor Pro

## 🎯 Visão Geral

O Monitor Pro oferece 3 planos de assinatura:

| Plano | Preço Mensal | Preço Anual | Recursos |
|-------|--------------|-------------|----------|
| **Básico** | R$ 8,90 | R$ 69,90 | Funcionalidades básicas de monitoramento |
| **Pro** | R$ 14,90 | R$ 149,90 | Gestão completa (atual) |
| **Pro+** | R$ 24,90 | R$ 249,90 | Pro + Cobrança Automática + Split 1% |

---

## 🔑 Recursos por Plano

### Básico (R$ 8,90/mês)
- ✅ Dashboard
- ✅ Rotas básicas
- ✅ Cadastro de alunos
- ✅ Chamada
- ❌ Relatórios avançados
- ❌ Financeiro
- ❌ Manutenção
- ❌ Contratos
- ❌ Cobrança Automática

### Pro (R$ 14,90/mês)
- ✅ Tudo do Básico
- ✅ Relatórios completos
- ✅ Gestão financeira manual
- ✅ Manutenção de veículo
- ✅ Contratos digitais
- ✅ Lembretes
- ✅ GPS e navegação
- ❌ Cobrança Automática

### Pro+ (R$ 24,90/mês)
- ✅ Tudo do Pro
- ✅ **Cobrança Automática via Asaas**
- ✅ **Split de Pagamento (99% você / 1% Monitor Pro)**
- ✅ **Negativação automática (Serasa/SPC)**
- ✅ **Gestão de inadimplência**
- ✅ **Assinaturas recorrentes**
- ✅ **Boleto, PIX e Cartão**

---

## 🚀 Fluxo de Onboarding

### 1. Primeiro Login (Novo Usuário)

```
┌─────────────────────────────────────┐
│  Tela de Escolha de Plano           │
│                                     │
│  [ ] Básico - R$ 8,90/mês          │
│  [ ] Pro - R$ 14,90/mês            │
│  [ ] Pro+ - R$ 24,90/mês           │
│                                     │
│  [Continuar]                        │
└─────────────────────────────────────┘
```

### 2. Se escolher Pro+ → Onboarding Bancário

```
┌─────────────────────────────────────┐
│  Configuração Pro+                  │
│  Etapa 1 de 2                       │
│                                     │
│  Dados Pessoais:                    │
│  - Nome Completo                    │
│  - CPF                              │
│  - Email                            │
│  - Telefone                         │
│                                     │
│  [Próximo]                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Configuração Pro+                  │
│  Etapa 2 de 2                       │
│                                     │
│  Dados Bancários:                   │
│  - Banco                            │
│  - Agência                          │
│  - Conta                            │
│  - Tipo (Corrente/Poupança)         │
│                                     │
│  [Finalizar]                        │
└─────────────────────────────────────┘
```

### 3. Sistema cria subconta no Asaas

```javascript
// Automático ao finalizar onboarding
const account = await asaasService.createAccount({
  name: "João da Silva",
  cpfCnpj: "12345678900",
  email: "joao@exemplo.com",
  bankAccount: { ... }
});

// Salva walletId no banco local
settings.asaasWalletId = account.walletId;
settings.subscriptionTier = 'pro_plus';
```

---

## 💰 Como Funciona o Split de Pagamento

### Fluxo Completo

```
1. Condutor ativa cobrança para um aluno
   ↓
2. Sistema cria cliente no Asaas (responsável)
   ↓
3. Sistema cria assinatura recorrente COM SPLIT
   ↓
4. Responsável paga mensalidade (R$ 250)
   ↓
5. Asaas divide automaticamente:
   - R$ 247,50 (99%) → Conta do Condutor
   - R$ 2,50 (1%) → Conta Monitor Pro (você)
   ↓
6. Dinheiro cai na conta de cada um
```

### Exemplo Prático

**Condutor tem 30 alunos × R$ 250/mês = R$ 7.500**

| Descrição | Valor |
|-----------|-------|
| Total recebido | R$ 7.500,00 |
| Split Monitor Pro (1%) | - R$ 75,00 |
| Taxa Asaas (~1%) | - R$ 75,00 |
| **Líquido Condutor** | **R$ 7.350,00** |

**Seu lucro (Monitor Pro):**
- 1 condutor = R$ 75/mês
- 10 condutores = R$ 750/mês
- 100 condutores = **R$ 7.500/mês** 🚀

---

## 🔧 Implementação Técnica

### Estrutura de Dados

```typescript
// types.ts
export type SubscriptionTier = 'basic' | 'pro' | 'pro_plus';

export interface UserSettings {
  subscriptionTier?: SubscriptionTier;
  asaasConfig?: AsaasConfig;
  asaasWalletId?: string; // ID da subconta no Asaas
}
```

### Controle de Acesso

```typescript
// App.tsx
const isPro = metadata.subscription_tier !== 'basic' || isSuperUser;
const isProPlus = metadata.subscription_tier === 'pro_plus' || isSuperUser;

const canViewFinancial = checkPermission('financial', isPro);
const canViewAutoBilling = isProPlus;
```

### Rotas Protegidas

```typescript
// Apenas Pro e Pro+
{canViewFinancial && <Route path="/financial" element={<FinancialScreen />} />}

// Apenas Pro+
{isProPlus && <Route path="/automatic-billing" element={<AutomaticBillingScreen />} />}
{isProPlus && <Route path="/onboarding-bank" element={<OnboardingBankScreen />} />}
```

---

## 📱 Fluxo de Uso (Pro+)

### 1. Configurar API Key (Admin - Você)

```
Configurações → Asaas Config
- API Key: $aact_YTU5YTE0...
- Ambiente: Production
- Split: 1%
```

### 2. Configurar Dados Bancários (Condutor)

```
Primeiro Login → Escolher Pro+
→ Preencher dados pessoais
→ Preencher dados bancários
→ Sistema cria subconta Asaas
→ walletId salvo automaticamente
```

### 3. Ativar Cobrança para Aluno

```
Financeiro → Cobrança Automática
→ Selecionar aluno
→ Clicar "Ativar Cobrança"
→ Sistema cria assinatura com split
→ Pronto! Pagamentos automáticos
```

---

## 🎨 UI/UX

### Badge de Plano

```tsx
// Mostrar badge no perfil
{settings.subscriptionTier === 'pro_plus' && (
  <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
    ⭐ PRO+
  </span>
)}
```

### Upgrade Prompt

```tsx
// Quando usuário Básico tenta acessar recurso Pro
<div className="bg-gradient-to-br from-primary-600 to-accent-600 p-6 rounded-2xl text-center">
  <Icon name="zap" size={48} className="mx-auto mb-4" />
  <h3 className="text-xl font-bold mb-2">Recurso Pro</h3>
  <p className="text-sm mb-4">
    Faça upgrade para acessar relatórios avançados e muito mais!
  </p>
  <button className="bg-white text-primary-600 font-bold py-3 px-6 rounded-xl">
    Fazer Upgrade → R$ 14,90/mês
  </button>
</div>
```

---

## 🔐 Segurança

### API Key Master (Você)
- Armazenada no backend (Supabase)
- Nunca exposta no frontend
- Usada apenas para criar subcontas

### API Key Condutor
- Cada condutor tem sua própria subconta
- Não precisa de API Key própria
- Split configurado automaticamente

### Dados Bancários
- Enviados diretamente para Asaas (HTTPS)
- Não armazenados no app
- Apenas walletId é salvo localmente

---

## 📊 Métricas e Dashboard (Futuro)

### Para Você (Admin)
```
┌─────────────────────────────────────┐
│  Dashboard Monitor Pro              │
│                                     │
│  Condutores Ativos: 47              │
│  Plano Básico: 12                   │
│  Plano Pro: 28                      │
│  Plano Pro+: 7                      │
│                                     │
│  Receita Mensal:                    │
│  - Assinaturas: R$ 658,30           │
│  - Split (1%): R$ 525,00            │
│  - Total: R$ 1.183,30               │
└─────────────────────────────────────┘
```

### Para Condutor (Pro+)
```
┌─────────────────────────────────────┐
│  Cobrança Automática                │
│                                     │
│  Alunos com cobrança: 28/30         │
│  Cobranças ativas: 28               │
│  Pagas este mês: 25                 │
│  Pendentes: 3                       │
│                                     │
│  Receita Esperada: R$ 7.000,00      │
│  Recebido: R$ 6.250,00              │
│  A receber: R$ 750,00               │
└─────────────────────────────────────┘
```

---

## 🚧 Próximos Passos

- [ ] Criar tela de escolha de plano no onboarding
- [ ] Implementar controle de acesso por plano
- [ ] Adicionar badge de plano no perfil
- [ ] Criar upgrade prompts para recursos bloqueados
- [ ] Implementar webhook para atualizar status de pagamento
- [ ] Dashboard de métricas para admin
- [ ] Sistema de upgrade/downgrade de plano
- [ ] Política de Privacidade e Termos de Uso atualizados

---

**Status**: 🟡 Em desenvolvimento  
**Branch**: `feature/asaas-cobranca-automatica`  
**Última atualização**: Janeiro 2025
