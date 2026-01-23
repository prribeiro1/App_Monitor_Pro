import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY_MASTER')!
const ASAAS_ENV = Deno.env.get('ASAAS_ENVIRONMENT') || 'sandbox'
const ASAAS_BASE_URL = ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, walletId, ...payload } = await req.json()
        console.log(`Action: ${action}, WalletId: ${walletId}`)

        let endpoint = ''
        let method = 'POST'
        let body: any = { ...payload }

        switch (action) {
            case 'create-customer':
                endpoint = '/customers'
                break
            case 'get-customer':
                endpoint = `/customers?cpfCnpj=${payload.cpfCnpj}`
                method = 'GET'
                body = null
                break
            case 'create-payment':
                endpoint = '/payments'
                if (walletId) {
                    body.split = [{
                        walletId: walletId,
                        percentualValue: 99 // 99% para o condutor, 1% fica na master
                    }]
                }
                break
            case 'create-subscription':
                endpoint = '/subscriptions'
                if (walletId) {
                    body.split = [{
                        walletId: walletId,
                        percentualValue: 99
                    }]
                }
                break
            default:
                throw new Error(`Ação inválida: ${action}`)
        }

        const response = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY
            },
            body: body ? JSON.stringify(body) : null
        })

        let data = await response.json()

        if (!response.ok) {
            console.error('Erro na API Asaas:', data)
            return new Response(JSON.stringify({ error: data.errors?.[0]?.description || 'Erro na API Asaas' }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Se for criação de assinatura, vamos buscar o link do primeiro pagamento
        if (action === 'create-subscription' && data.id) {
            console.log(`Buscando pagamentos para a assinatura: ${data.id}`)
            try {
                const paymentsResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions/${data.id}/payments`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'access_token': ASAAS_API_KEY
                    }
                })
                const paymentsData = await paymentsResponse.json()
                if (paymentsData.data && paymentsData.data.length > 0) {
                    // Adiciona os links do primeiro pagamento ao objeto da assinatura
                    data.invoiceUrl = paymentsData.data[0].invoiceUrl
                    data.bankSlipUrl = paymentsData.data[0].bankSlipUrl
                    console.log(`Link de checkout encontrado: ${data.invoiceUrl}`)
                }
            } catch (pError) {
                console.warn('Erro ao buscar link de pagamento da assinatura:', pError)
            }
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Erro no Proxy:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
