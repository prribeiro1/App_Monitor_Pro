# 🎯 MODELO CORRETO - Split de Pagamento

## Como Funciona (Versão Correta)

### 1. VOCÊ (Monitor Pro)
- ✅ Cria UMA conta Asaas com seu CNPJ
- ✅ Gera UMA API Key Master
- ✅ Configura no BACKEND (não no app do condutor)
- ✅ Recebe 1% automaticamente de cada pagamento

### 2. CONDUTOR (Seu Cliente)
- ✅ Instala o app
- ✅ Escolhe plano Pro+ (R$ 24,90/mês)
- ✅ Fornece dados bancários (para RECEBER)
- ✅ Sistema cria subconta Asaas automaticamente
- ✅ Recebe 99% direto na conta dele
- ❌ NÃO vê nem configura nada do Asaas
- ❌ NÃO precisa criar conta no Asaas

### 3. RESPONSÁVEL (Pai do Aluno)
- ✅ Recebe cobrança (PIX/Boleto/Cartão)
- ✅ Paga normalmente
- ✅ Asaas divide automaticamente:
  - 99% → Conta do Condutor
  - 1% → Sua conta (Monitor Pro)

---

## 🔒 Segurança e Confiança

### Por que o condutor vai confiar?

**1. Transparência Total**
```
"Você receberá 99% direto na sua conta bancária.
Apenas 1% fica com o Monitor Pro pela tecnologia."
```

**2. Recebimento Automático**
- Dinheiro cai DIRETO na conta do condutor
- Você NÃO toca no dinheiro dele
- Split é feito pelo Asaas (empresa regulamentada)

**3. Comprovantes**
- Condutor vê no extrato bancário: "Asaas - Mensalidade Aluno X"
- Pode acompanhar no painel do app
- Histórico completo de pagamentos

**4. Dados Bancários Seguros**
- Enviados direto para Asaas (HTTPS)
- NÃO ficam armazenados no app
- Asaas é certificado PCI-DSS (padrão bancário)

---

## 💰 Argumentos de Venda

### "Por que pagar R$ 24,90/mês?"

**Sem Monitor Pro:**
- ❌ Emitir boleto manualmente: R$ 3,50 cada
- ❌ 30 alunos = R$ 105/mês só de boletos
- ❌ Inadimplência alta (sem consequência)
- ❌ Trabalho manual de cobrança
- ❌ Sem negativação automática

**Com Monitor Pro:**
- ✅ Cobrança automática: R$ 24,90/mês
- ✅ PIX, Boleto e Cartão inclusos
- ✅ Negativação Serasa/SPC automática
- ✅ Split transparente (99% para você)
- ✅ Dashboard de inadimplência
- ✅ Economia de R$ 80/mês + tempo

**ROI:**
```
Custo: R$ 24,90/mês
Economia: R$ 105/mês (boletos) + tempo
Lucro: R$ 80/mês + redução de inadimplência
```

---

## 📊 Comparação de Modelos

| Item | Modelo Antigo (Errado) | Modelo Novo (Correto) |
|------|------------------------|----------------------|
| **Quem configura Asaas?** | Cada condutor | Você (1x) |
| **Condutor precisa criar conta?** | Sim | Não |
| **Onde cai o dinheiro?** | Sua conta → repasse | Direto no condutor |
| **Transparência** | Baixa | Alta |
| **Confiança** | Baixa | Alta |
| **Complexidade** | Alta | Baixa |

---

## 🎯 Fluxo Correto

```
┌─────────────────────────────────────────────────────────┐
│                    VOCÊ (Monitor Pro)                   │
│  - Cria conta Asaas com CNPJ                           │
│  - Gera API Key Master                                  │
│  - Configura no backend (variável de ambiente)          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  CONDUTOR (Seu Cliente)                 │
│  1. Instala app                                         │
│  2. Escolhe Pro+ (R$ 24,90/mês)                        │
│  3. Fornece dados bancários                             │
│  4. Sistema cria subconta Asaas (automático)            │
│  5. Ativa cobrança para alunos                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              RESPONSÁVEL (Pai do Aluno)                 │
│  1. Recebe cobrança (PIX/Boleto/Cartão)               │
│  2. Paga R$ 250                                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    ASAAS (Automático)                   │
│  - R$ 247,50 (99%) → Conta do Condutor                │
│  - R$ 2,50 (1%) → Sua conta (Monitor Pro)             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementação Técnica

### Backend (Supabase Edge Function)

```typescript
// Variável de ambiente (configurada 1x por você)
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY_MASTER')

// Quando condutor ativa Pro+
async function createConductorAccount(conductorData) {
  // Usa SUA API Key para criar subconta
  const response = await fetch('https://api.asaas.com/v3/accounts', {
    headers: { 'access_token': ASAAS_API_KEY },
    body: JSON.stringify(conductorData)
  })
  
  // Retorna walletId para o app
  return response.walletId
}
```

### App (Frontend)

```typescript
// Condutor NÃO vê nem configura Asaas
// Apenas fornece dados bancários

// Quando ativa Pro+
const walletId = await backend.createSubAccount({
  name: "João Condutor",
  cpf: "123.456.789-00",
  bankAccount: { ... }
})

// Salva walletId localmente
settings.asaasWalletId = walletId
```

---

## 📝 Termos de Uso (Sugestão)

```
COBRANÇA AUTOMÁTICA (PLANO PRO+)

Ao ativar a Cobrança Automática, você concorda que:

1. RECEBIMENTO
   - Você receberá 99% de cada pagamento direto na sua conta bancária
   - O Monitor Pro receberá 1% pela tecnologia e infraestrutura

2. PROCESSAMENTO
   - Pagamentos são processados pelo Asaas (empresa regulamentada)
   - Split é feito automaticamente pelo Asaas
   - Monitor Pro NÃO tem acesso ao seu dinheiro

3. DADOS BANCÁRIOS
   - Seus dados são enviados direto para o Asaas (HTTPS)
   - NÃO ficam armazenados no aplicativo
   - Asaas é certificado PCI-DSS (padrão bancário)

4. TRANSPARÊNCIA
   - Você pode acompanhar todos os pagamentos no app
   - Extrato bancário mostra origem: "Asaas - Mensalidade"
   - Histórico completo disponível

5. CANCELAMENTO
   - Você pode cancelar a qualquer momento
   - Sem multa ou taxa de cancelamento
```

---

## ✅ Checklist de Implementação

- [ ] Remover tela de configuração Asaas do app
- [ ] Criar Edge Function para criar subcontas
- [ ] Configurar API Key Master no backend
- [ ] Atualizar OnboardingBankScreen (enviar para backend)
- [ ] Atualizar AutomaticBillingScreen (usar backend)
- [ ] Adicionar Termos de Uso
- [ ] Adicionar FAQ sobre split
- [ ] Testar fluxo completo

---

**Status**: 🔴 Precisa correção urgente
**Prioridade**: Alta
**Impacto**: Confiança do cliente
