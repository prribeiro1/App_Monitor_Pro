// Edge Function: Webhook do Asaas
// Recebe notificações de pagamentos e atualiza o sistema automaticamente
// Deploy: npx supabase functions deploy asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') // Token opcional para validar origem

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
}

// Tipos de eventos do Asaas
type AsaasEvent = 
  | 'PAYMENT_CREATED'
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_ANTICIPATED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_REFUND_IN_PROGRESS'
  | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
  | 'PAYMENT_DUNNING_RECEIVED'
  | 'PAYMENT_DUNNING_REQUESTED'
  | 'PAYMENT_BANK_SLIP_VIEWED'
  | 'PAYMENT_CHECKOUT_VIEWED'

interface AsaasWebhookPayload {
  event: AsaasEvent
  payment: {
    id: string
    customer: string
    value: number
    netValue: number
    status: string
    billingType: string
    dueDate: string
    paymentDate?: string
    invoiceUrl?: string
    bankSlipUrl?: string
    externalReference?: string // Usamos para identificar o aluno/condutor
    description?: string
    split?: Array<{
      walletId: string
      fixedValue?: number
      percentualValue?: number
      totalValue?: number
      status: string
    }>
  }
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Validar token do webhook (opcional mas recomendado)
    const authHeader = req.headers.get('asaas-access-token')
    if (WEBHOOK_TOKEN && authHeader !== WEBHOOK_TOKEN) {
      console.warn('Webhook recebido com token inválido')
      // Não retornamos erro para não dar dicas a atacantes
    }

    const payload: AsaasWebhookPayload = await req.json()
    
    console.log(`📩 Webhook recebido: ${payload.event}`)
    console.log(`💰 Pagamento ID: ${payload.payment.id}`)
    console.log(`👤 Cliente: ${payload.payment.customer}`)
    console.log(`💵 Valor: R$ ${payload.payment.value}`)
    
    // Processar eventos de pagamento
    switch (payload.event) {
      
      // ✅ PAGAMENTO CONFIRMADO - Liberar acesso
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await handlePaymentSuccess(supabase, payload)
        break
      
      // ⚠️ PAGAMENTO EM ATRASO
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(supabase, payload)
        break
      
      // ❌ PAGAMENTO ESTORNADO/CANCELADO
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        await handlePaymentCancelled(supabase, payload)
        break
      
      // 📋 COBRANÇA CRIADA (log apenas)
      case 'PAYMENT_CREATED':
        console.log(`Nova cobrança criada: ${payload.payment.id}`)
        break
      
      // 👀 BOLETO VISUALIZADO
      case 'PAYMENT_BANK_SLIP_VIEWED':
      case 'PAYMENT_CHECKOUT_VIEWED':
        console.log(`Cliente visualizou cobrança: ${payload.payment.id}`)
        break
      
      default:
        console.log(`Evento não tratado: ${payload.event}`)
    }

    // Registrar evento no banco para histórico
    await supabase.from('webhook_logs').insert({
      event: payload.event,
      payment_id: payload.payment.id,
      customer_id: payload.payment.customer,
      value: payload.payment.value,
      external_reference: payload.payment.externalReference,
      raw_payload: payload,
      processed_at: new Date().toISOString()
    }).catch(err => {
      // Tabela pode não existir ainda, apenas loga
      console.warn('Não foi possível salvar log do webhook:', err.message)
    })

    return new Response(
      JSON.stringify({ success: true, event: payload.event }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================
// HANDLERS DE EVENTOS
// ============================================

async function handlePaymentSuccess(supabase: any, payload: AsaasWebhookPayload) {
  const { payment } = payload
  console.log(`✅ Pagamento confirmado: R$ ${payment.value}`)
  
  // Se tiver externalReference, é um pagamento de aluno
  if (payment.externalReference) {
    const [type, id] = payment.externalReference.split(':')
    
    if (type === 'student') {
      // Atualizar status do aluno como adimplente
      await supabase
        .from('students')
        .update({ 
          payment_status: 'paid',
          last_payment_date: payment.paymentDate || new Date().toISOString(),
          last_payment_value: payment.value
        })
        .eq('id', id)
      
      console.log(`📚 Aluno ${id} marcado como PAGO`)
    }
    
    if (type === 'subscription') {
      // Atualizar tier do usuário (para assinatura do app)
      const tier = payment.value >= 24.90 ? 'pro_plus' : (payment.value >= 14.90 ? 'pro' : 'basic')
      
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { subscription_tier: tier }
      })
      
      await supabase
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('id', id)
      
      console.log(`👤 Usuário ${id} atualizado para plano ${tier}`)
    }
  }
  
  // Log do split (quanto cada parte recebeu)
  if (payment.split && payment.split.length > 0) {
    for (const s of payment.split) {
      console.log(`💸 Split: Wallet ${s.walletId} recebeu R$ ${s.totalValue || s.fixedValue}`)
    }
  }
}

async function handlePaymentOverdue(supabase: any, payload: AsaasWebhookPayload) {
  const { payment } = payload
  console.log(`⚠️ Pagamento em atraso: ${payment.id}`)
  
  if (payment.externalReference) {
    const [type, id] = payment.externalReference.split(':')
    
    if (type === 'student') {
      await supabase
        .from('students')
        .update({ payment_status: 'overdue' })
        .eq('id', id)
      
      console.log(`📚 Aluno ${id} marcado como INADIMPLENTE`)
    }
  }
}

async function handlePaymentCancelled(supabase: any, payload: AsaasWebhookPayload) {
  const { payment } = payload
  console.log(`❌ Pagamento cancelado/estornado: ${payment.id}`)
  
  if (payment.externalReference) {
    const [type, id] = payment.externalReference.split(':')
    
    if (type === 'subscription') {
      // Rebaixar para plano básico
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { subscription_tier: 'basic' }
      })
      
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'basic' })
        .eq('id', id)
      
      console.log(`👤 Usuário ${id} rebaixado para plano basic`)
    }
  }
}
