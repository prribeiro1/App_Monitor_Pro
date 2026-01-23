// Edge Function: Webhook do Asaas
// Recebe notificações de pagamentos e atualiza o sistema automaticamente
// Deploy: npx supabase functions deploy asaas-webhook --project-ref nrkwrmksqhykfvgmfpcw

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Validar token (opcional)
    const authHeader = req.headers.get('asaas-access-token')
    if (WEBHOOK_TOKEN && authHeader !== WEBHOOK_TOKEN) {
      console.warn('Webhook recebido com token inválido')
    }

    const payload = await req.json()
    console.log(`📩 Webhook recebido: ${payload.event}`)

    // Processar eventos
    const { event, payment } = payload;

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      await handlePaymentSuccess(supabase, payment)
    } else if (event === 'PAYMENT_OVERDUE') {
      await handlePaymentOverdue(supabase, payment)
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      await handlePaymentCancelled(supabase, payment)
    }

    // Registrar Log (Sempre tenta, mas não trava se der erro)
    try {
      await supabase.from('webhook_logs').insert({
        event: event,
        payment_id: payment.id,
        customer_id: payment.customer,
        value: payment.value,
        external_reference: payment.externalReference,
        raw_payload: payload,
        processed_at: new Date().toISOString()
      });
    } catch (logError) {
      console.warn('⚠️ Erro ao salvar log (Tabela webhook_logs existe?):', logError.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Erro Fatal no Webhook:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Retornamos 200 para o Asaas não desativar o webhook enquanto debugamos, mas logamos o erro
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handlePaymentSuccess(supabase: any, payment: any) {
  const ref = payment.externalReference;
  if (!ref) return;

  // Suporte para "student:ID" ou apenas "ID" (fallback para students)
  let type = 'student';
  let id = ref;

  if (ref.includes(':')) {
    const parts = ref.split(':');
    type = parts[0];
    id = parts[1];
  }

  console.log(`✅ Processando Sucesso - Tipo: ${type}, ID: ${id}`);

  try {
    if (type === 'student') {
      const { error } = await supabase
        .from('students')
        .update({
          payment_status: 'paid',
          last_payment_date: payment.paymentDate || new Date().toISOString(),
          last_payment_value: payment.value
        })
        .eq('id', id);

      if (error) throw error;
      console.log(`📚 Status do aluno ${id} atualizado.`);
    }

    if (type === 'subscription') {
      const tier = payment.value >= 24.90 ? 'pro_plus' : (payment.value >= 14.90 ? 'pro' : 'basic');

      // Atualiza Perfil
      await supabase.from('profiles').update({ subscription_tier: tier }).eq('id', id);

      // Atualiza Metadata do Auth
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { subscription_tier: tier }
      });

      console.log(`👤 Plano do usuário ${id} atualizado para ${tier}.`);
    }
  } catch (dbError) {
    console.error(`❌ Erro ao atualizar banco de dados: ${dbError.message}`);
    console.error('Certifique-se de que a tabela e as colunas (payment_status, etc) existem.');
  }
}

async function handlePaymentOverdue(supabase: any, payment: any) {
  const ref = payment.externalReference;
  if (!ref) return;

  let type = 'student';
  let id = ref;
  if (ref.includes(':')) {
    const parts = ref.split(':');
    type = parts[0];
    id = parts[1];
  }

  if (type === 'student') {
    try {
      await supabase.from('students').update({ payment_status: 'overdue' }).eq('id', id);
    } catch (e) {
      console.warn('Erro ao marcar atraso:', e.message);
    }
  }
}

async function handlePaymentCancelled(supabase: any, payment: any) {
  const ref = payment.externalReference;
  if (!ref) return;

  let type = 'student';
  let id = ref;
  if (ref.includes(':')) {
    const parts = ref.split(':');
    type = parts[0];
    id = parts[1];
  }

  if (type === 'subscription') {
    try {
      await supabase.from('profiles').update({ subscription_tier: 'basic' }).eq('id', id);
      await supabase.auth.admin.updateUserById(id, { user_metadata: { subscription_tier: 'basic' } });
    } catch (e) {
      console.warn('Erro ao cancelar assinatura:', e.message);
    }
  }
}
