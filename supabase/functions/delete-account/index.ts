import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Esta função deleta o usuário do Supabase Auth
// Deve ser chamada DEPOIS de deletar os dados do usuário nas tabelas

Deno.serve(async (req: Request) => {
    // CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        // Verificar autenticação
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Não autorizado" }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
        }

        // Cliente com token do usuário para verificar identidade
        const supabaseUser = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
        }

        // Verificar se a chave de serviço está disponível
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!serviceRoleKey) {
            console.error("❌ ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente!");
            return new Response(JSON.stringify({ error: "Erro interno: Chave de serviço não configurada. Contate o suporte." }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
        }

        // Cliente admin para deletar o usuário
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        console.log(`🗑️ Tentando deletar usuário Auth ID: ${user.id}`);

        // Deletar usuário do Auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error("❌ Erro ao deletar usuário do Auth:", deleteError);
            return new Response(JSON.stringify({ error: "Erro ao excluir conta Auth: " + deleteError.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
        }

        console.log("✅ Usuário deletado com sucesso:", user.id);

        return new Response(JSON.stringify({ success: true, message: "Conta excluída permanentemente" }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });

    } catch (err: any) {
        console.error("Erro na função delete-account:", err);
        return new Response(JSON.stringify({ error: err.message || "Erro desconhecido" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
});
