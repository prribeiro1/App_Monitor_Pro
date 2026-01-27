-- =====================================================
-- TABELA DE CONSTANTES DO APP (PREÇOS E LINKS)
-- =====================================================
-- Projeto: bkwrflgrfhsgeowjynou
-- 
-- Permite alterar preços e configurações sem atualizar o APK.
-- =====================================================

CREATE TABLE IF NOT EXISTS app_constants (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Preços Iniciais
INSERT INTO app_constants (key, value) VALUES 
('plan_prices', '{
    "basic": {"monthly": 8.90, "annual": 69.90},
    "pro": {"monthly": 14.90, "annual": 149.90},
    "pro_plus": {"monthly": 24.90, "annual": 249.90}
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Inserir Configurações de Contato
INSERT INTO app_constants (key, value) VALUES 
('contact_links', '{
    "whatsapp_team": "https://wa.me/5522999837547?text=Olá! Gostaria de saber mais sobre o plano para equipes do Monitor Pro."
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Habilitar leitura pública para usuários autenticados
ALTER TABLE app_constants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for authenticated users" ON app_constants FOR SELECT USING (true);

-- ✅ PRONTO! Agora os preços podem ser mudados aqui no SQL e refletirão no App.
