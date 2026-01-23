# 📋 Lista de Tarefas (Prioridades)

## 1. Fluxo de Assinatura do Motorista (SaaS) 💰
- [ ] **Link de Pagamento Real**: Ao escolher "Pro" ou "Pro+", o app deve gerar o checkout no Asaas e redirecionar o motorista para pagar.
- [ ] **Liberação Automática**: O app deve aguardar a confirmação do pagamento (Webhooks) para mudar o status de "Basic" para "Pro" automaticamente.
- [ ] **Opção Manual (Fallback)**: Confirmar e mostrar como alterar manualmente o `subscription_tier` no Supabase.

## 2. Otimização de Dados (UX) 🧠
- [ ] **Fim da Repetição**: Sincronizar dados entre "Meu Perfil" e "Onboarding Bancário".
- [ ] **Badge de Plano**: Exibir no Menu Lateral ou Topo qual plano está ativo (Ex: uma etiqueta dourada "PRO+").

## 3. Automação da Cobrança Escolar 🔄
- [ ] **Baixa Automática**: Testar se o status no app muda para "Pago" via Webhook quando o pai paga o boleto.
- [ ] **Botão de Negativação**: 
    - [ ] Corrigir o alerta (mostrar o nome do Responsável, não do Aluno).
    - [ ] Verificar a conexão com a API de negativação do Asaas.

## 4. Portal dos Pais (Rastreamento) 🛰️
- [ ] **Pesquisa de Viabilidade**: Analisar criação de link web simples para rastreio em tempo real.

## ✅ Concluído
- [x] Edge Functions Deployed (`create-asaas-account`, `asaas-webhook`)
- [x] Initial Asaas Integration (Services and Frontend Screens)
