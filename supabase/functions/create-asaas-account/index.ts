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
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autenticado')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Token inválido')
    }

    const { 
      name, 
      cpfCnpj, 
      email, 
      phone, 
      mobilePhone,
      bankAccount 
    } = await req.json()

    console.log(`📝 Criando subconta Asaas para: ${name}`)

    // Criar subconta no Asaas usando SUA API Key Master
    const response = await fetch(`${ASAAS_BASE_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY_MASTER // SUA API Key
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj,
        companyType: 'INDIVIDUAL',
        phone,
        mobilePhone,
        bankAccount
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('❌ Erro Asaas:', result)
      throw new Error(result.errors?.[0]?.description || 'Erro ao criar subconta')
    }

    console.log(`✅ Subconta criada: ${result.id}`)
    console.log(`💰 Wallet ID: ${result.walletId}`)

    // Salvar walletId no perfil do usuário
    await supabase
      .from('profiles')
      .update({ 
        asaas_wallet_id: result.walletId,
        subscription_tier: 'pro_plus'
      })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        walletId: result.walletId,
        accountId: result.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
