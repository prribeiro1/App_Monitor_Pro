#!/bin/bash

# Script de Deploy do Backend - Monitor Pro
# Execute: bash deploy-backend.sh

echo "🚀 Deploy do Backend - Monitor Pro"
echo "===================================="
echo ""

PROJECT_REF="nrkwrmksqhykfvgmfpcw"
ASAAS_API_KEY='$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJlYTg2MGU2LWZhOWItNGJkMi1hYjg1LTVhYmZiMmU0OGY0OTo6JGFhY2hfY2I3MGRhYTItZGJiOS00NzZiLWFkZWEtNGM1MjJjNWRlY2Y4'

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado!"
    echo "📦 Instalando..."
    npm install -g supabase
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Passo 1: Configurar Secrets
echo "📝 Passo 1: Configurando variáveis de ambiente..."
echo ""

echo "🔑 Configurando ASAAS_API_KEY_MASTER..."
npx supabase secrets set ASAAS_API_KEY_MASTER="$ASAAS_API_KEY" --project-ref $PROJECT_REF

echo "🌍 Configurando ASAAS_ENVIRONMENT..."
npx supabase secrets set ASAAS_ENVIRONMENT="sandbox" --project-ref $PROJECT_REF

echo ""
echo "✅ Secrets configurados!"
echo ""

# Verificar secrets
echo "🔍 Verificando secrets..."
npx supabase secrets list --project-ref $PROJECT_REF
echo ""

# Passo 2: Deploy Edge Functions
echo "📦 Passo 2: Deploy das Edge Functions..."
echo ""

echo "🚀 Deploy: create-asaas-account..."
npx supabase functions deploy create-asaas-account --project-ref $PROJECT_REF

echo ""
echo "🚀 Deploy: asaas-webhook..."
npx supabase functions deploy asaas-webhook --project-ref $PROJECT_REF

echo ""
echo "✅ Edge Functions deployed!"
echo ""

# Resumo
echo "===================================="
echo "✅ DEPLOY CONCLUÍDO!"
echo "===================================="
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Rodar SQL no Supabase:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "   Copie: supabase/migrations/001_webhook_tables.sql"
echo ""
echo "2. Configurar Webhook no Asaas:"
echo "   https://sandbox.asaas.com/config/webhooks"
echo "   URL: https://$PROJECT_REF.functions.supabase.co/asaas-webhook"
echo ""
echo "3. Gerar novo APK e testar!"
echo ""
echo "🔗 URLs das Edge Functions:"
echo "   - Create Account: https://$PROJECT_REF.functions.supabase.co/create-asaas-account"
echo "   - Webhook: https://$PROJECT_REF.functions.supabase.co/asaas-webhook"
echo ""
