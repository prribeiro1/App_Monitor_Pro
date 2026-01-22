# Script de Deploy do Backend - Monitor Pro
# Execute: .\deploy-backend.ps1

Write-Host "🚀 Deploy do Backend - Monitor Pro" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_REF = "nrkwrmksqhykfvgmfpcw"
$ASAAS_API_KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJlYTg2MGU2LWZhOWItNGJkMi1hYjg1LTVhYmZiMmU0OGY0OTo6JGFhY2hfY2I3MGRhYTItZGJiOS00NzZiLWFkZWEtNGM1MjJjNWRlY2Y4'

# Verificar se Supabase CLI está instalado
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "📦 Instalando..." -ForegroundColor Yellow
    npm install -g supabase
}

Write-Host ""

# Passo 1: Configurar Secrets
Write-Host "📝 Passo 1: Configurando variáveis de ambiente..." -ForegroundColor Yellow
Write-Host ""

Write-Host "🔑 Configurando ASAAS_API_KEY_MASTER..."
npx supabase secrets set "ASAAS_API_KEY_MASTER=$ASAAS_API_KEY" --project-ref $PROJECT_REF

Write-Host "🌍 Configurando ASAAS_ENVIRONMENT..."
npx supabase secrets set "ASAAS_ENVIRONMENT=sandbox" --project-ref $PROJECT_REF

Write-Host ""
Write-Host "✅ Secrets configurados!" -ForegroundColor Green
Write-Host ""

# Verificar secrets
Write-Host "🔍 Verificando secrets..."
npx supabase secrets list --project-ref $PROJECT_REF
Write-Host ""

# Passo 2: Deploy Edge Functions
Write-Host "📦 Passo 2: Deploy das Edge Functions..." -ForegroundColor Yellow
Write-Host ""

Write-Host "🚀 Deploy: create-asaas-account..."
npx supabase functions deploy create-asaas-account --project-ref $PROJECT_REF

Write-Host ""
Write-Host "🚀 Deploy: asaas-webhook..."
npx supabase functions deploy asaas-webhook --project-ref $PROJECT_REF

Write-Host ""
Write-Host "✅ Edge Functions deployed!" -ForegroundColor Green
Write-Host ""

# Resumo
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Rodar SQL no Supabase:"
Write-Host "   https://supabase.com/dashboard/project/$PROJECT_REF/sql/new" -ForegroundColor Blue
Write-Host "   Copie: supabase/migrations/001_webhook_tables.sql"
Write-Host ""
Write-Host "2. Configurar Webhook no Asaas:"
Write-Host "   https://sandbox.asaas.com/config/webhooks" -ForegroundColor Blue
Write-Host "   URL: https://$PROJECT_REF.functions.supabase.co/asaas-webhook"
Write-Host ""
Write-Host "3. Gerar novo APK e testar!"
Write-Host ""
Write-Host "🔗 URLs das Edge Functions:" -ForegroundColor Cyan
Write-Host "   - Create Account: https://$PROJECT_REF.functions.supabase.co/create-asaas-account"
Write-Host "   - Webhook: https://$PROJECT_REF.functions.supabase.co/asaas-webhook"
Write-Host ""
