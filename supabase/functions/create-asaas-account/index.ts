// Edge Function: Criar Subconta Asaas
// Esta função usa SUA API Key Master para criar subcontas para condutores
// Deploy: npx supabase functions deploy create-asaas-account --project-ref nrkwrmksqhykfvgmfpcw

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ASAAS_API_KEY_MASTER = Deno.env.get('ASAAS_API_KEY_MASTER')! // SUA API Key
const ASAAS_ENVIRONMENT = Deno.env.get('ASAAS_ENVIRONMENT') || 'production' // sandbox ou production

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_BASE_URL = ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Requisição recebida');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const authHeader = req.headers.get('Authorization')
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id;
    }

    const body = await req.json();
    const {
      name,
      cpfCnpj,
      email,
      phone,
      mobilePhone,
      bankAccount,
      birthDate
    } = body;

    console.log(`📝 Iniciando setup para: ${name} (CPF: ${cpfCnpj})`)

    let accountId = '';
    let walletId = '';
    let isExisting = false;

    // 1. Verificar se já existe conta com este CPF
    const searchResponse = await fetch(`${ASAAS_BASE_URL}/accounts?cpfCnpj=${cpfCnpj}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY_MASTER
      }
    })

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json()
      if (searchResult.data && searchResult.data.length > 0) {
        accountId = searchResult.data[0].id;
        walletId = searchResult.data[0].walletId;
        isExisting = true;
        console.log(`✅ Conta já existente encontrada: ${accountId}`);
      }
    }

    if (!accountId) {
      console.log(`✨ Criando NOVA subconta Asaas...`)
      const response = await fetch(`${ASAAS_BASE_URL}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY_MASTER
        },
        body: JSON.stringify({
          name,
          email,
          cpfCnpj,
          companyType: 'INDIVIDUAL',
          phone,
          mobilePhone,
          birthDate: birthDate || '1990-01-01',
          incomeValue: 5000,
          address: 'Rua Padrão',
          addressNumber: '100',
          province: 'Centro',
          postalCode: '01001-000',
          bankAccount
        })
      })

      if (!response.ok) {
        const textError = await response.text();
        console.error('Erro Asaas (Raw):', textError);
        try {
          const jsonError = JSON.parse(textError);
          throw new Error(jsonError.errors?.[0]?.description || 'Erro ao criar subconta');
        } catch (e) {
          throw new Error(`Erro na API Asaas (HTML): ${response.status}`);
        }
      }

      const result = await response.json()
      accountId = result.id;
      walletId = result.walletId;
      console.log(`✅ Subconta criada: ${accountId}`);
    }

    // 3. Buscar Link de Onboarding (para envio de documentos)
    let onboardingUrl = '';
    if (accountId) {
      try {
        const obResponse = await fetch(`${ASAAS_BASE_URL}/accounts/${accountId}/onboardingUrl`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY_MASTER
          }
        });

        if (obResponse.ok && obResponse.headers.get('content-type')?.includes('application/json')) {
          const obResult = await obResponse.json();
          if (obResult.onboardingUrl) {
            onboardingUrl = obResult.onboardingUrl;
            console.log(`🔗 Link de Onboarding gerado`);
          }
        } else {
          console.warn(`⚠️ Onboarding não disponível para esta conta (${obResponse.status})`);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao tentar obter link de onboarding:', err);
      }
    }

    // Salvar walletId no perfil do usuário
    if (userId && walletId) {
      await supabase
        .from('profiles')
        .update({
          asaas_wallet_id: walletId,
          subscription_tier: 'pro_plus'
        })
        .eq('id', userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        walletId,
        accountId,
        onboardingUrl,
        isExisting
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Erro no Webhook:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
