# 🔍 TESTE DOS LINKS COM DEBUG

## ✅ CORREÇÕES APLICADAS

1. ✅ Removido bloco duplicado que redirecionava rotas públicas
2. ✅ Adicionados logs para debug
3. ✅ Rotas públicas agora são sempre acessíveis

## 🧪 COMO TESTAR

### 1. Rodar o App

```bash
npm run dev
```

### 2. Abrir DevTools

Pressione **F12** e vá na aba **Console**

### 3. Testar Link de Cadastro

1. Abra uma aba anônima (Ctrl+Shift+N)
2. Cole o link: `http://localhost:5173/#/cadastro-aluno/abc-123`
3. **Observe o console:**
   - Deve aparecer: `🔍 Renderizando PublicStudentRegister`
   - **NÃO deve** redirecionar para landing

4. **Resultado esperado:**
   - ✅ Mostra formulário de cadastro
   - ✅ Não redireciona para landing
   - ✅ Não pede login

### 4. Testar Link de Rastreamento

1. Abra uma aba anônima (Ctrl+Shift+N)
2. Cole o link: `http://localhost:5173/#/track/ABC123`
3. **Observe o console:**
   - Deve aparecer: `🔍 Renderizando PublicTrackingPage`
   - Deve aparecer: `[Tracking] Validating code: ABC123`
   - Deve aparecer: `[Tracking] Query result: { linkData: ..., linkError: ... }`

4. **Resultado esperado:**
   - ✅ Mostra tela de rastreamento
   - ✅ Não redireciona para landing
   - ✅ Mostra erro claro se código inválido

## 🔍 O QUE PROCURAR NO CONSOLE

### Se redirecionar para landing:

Procure por:
```
Navigate to="/landing"
```

Isso indica que ainda há algum redirecionamento acontecendo.

### Se mostrar "Código inválido":

Procure por:
```
[Tracking] Query result: { linkData: null, linkError: ... }
```

Isso indica que o código não existe no banco.

### Se não renderizar nada:

Procure por erros em vermelho no console.

## 🛠️ TROUBLESHOOTING

### Problema: Ainda redireciona para landing

**Solução 1:** Limpar cache do navegador
```
Ctrl+Shift+Delete → Limpar dados de navegação
```

**Solução 2:** Verificar se há outro redirecionamento
```
# No console, digite:
window.location.hash
# Deve mostrar: "#/cadastro-aluno/abc-123" ou "#/track/ABC123"
```

### Problema: Código de rastreamento inválido

**Verificar se existe no banco:**
```sql
-- No Supabase SQL Editor
SELECT * FROM tracking_links WHERE share_code = 'ABC123';
```

**Se não existir, criar:**
```sql
-- Pegar seu user_id primeiro
SELECT id FROM auth.users WHERE email = 'seu@email.com';

-- Criar o link
INSERT INTO tracking_links (share_code, user_id, is_active)
VALUES ('ABC123', 'SEU_USER_ID_AQUI', true);
```

### Problema: Link de cadastro não funciona

**Verificar se o driverId é válido:**
```sql
-- No Supabase SQL Editor
SELECT id, email FROM auth.users;
```

Use um dos IDs retornados no link:
```
http://localhost:5173/#/cadastro-aluno/ID_AQUI
```

## 📊 LOGS ESPERADOS

### Link de Cadastro (Sucesso):
```
🔍 Renderizando PublicStudentRegister
```

### Link de Rastreamento (Sucesso):
```
🔍 Renderizando PublicTrackingPage
[Tracking] Validating code: ABC123
[Tracking] Query result: { linkData: { user_id: '...', is_active: true }, linkError: null }
```

### Link de Rastreamento (Código Inválido):
```
🔍 Renderizando PublicTrackingPage
[Tracking] Validating code: ABC123
[Tracking] Query result: { linkData: null, linkError: null }
[Tracking] Code not found: ABC123
```

## 🎯 PRÓXIMOS PASSOS

Se ainda não funcionar após essas correções:

1. **Me envie os logs do console** (copie tudo)
2. **Me diga qual link está testando** (cadastro ou rastreamento)
3. **Me diga o que aparece na tela** (landing, erro, etc)

Com essas informações vou conseguir identificar o problema exato.

---

**Última atualização:** 26/01/2026 - 10:45
