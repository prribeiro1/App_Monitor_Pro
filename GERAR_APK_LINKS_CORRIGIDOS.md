# 🔧 GERAR APK COM LINKS CORRIGIDOS

## ✅ CORREÇÕES APLICADAS

1. ✅ Removido bloco duplicado que redirecionava rotas públicas
2. ✅ Rotas públicas agora funcionam sem sessão
3. ✅ Melhorada validação do código de rastreamento

## 🚀 COMANDOS PARA GERAR APK

Execute os comandos na ordem:

```bash
# 1. Build do projeto
npm run build

# 2. Sync com Android
npx cap sync android

# 3. Gerar APK
cd android
./gradlew assembleDebug

# 4. Copiar APK para raiz
copy app\build\outputs\apk\debug\app-debug.apk ..\MonitorPro-DEV-LINKS-OK.apk
cd ..
```

## 📦 ARQUIVO GERADO

**`MonitorPro-DEV-LINKS-OK.apk`**

## 🧪 COMO TESTAR

### 1. Instalar APK

1. Desinstale o APK antigo (se tiver)
2. Instale o novo: `MonitorPro-DEV-LINKS-OK.apk`

### 2. Testar Link de Cadastro

1. No app, vá em **Alunos**
2. Clique em **Compartilhar Link de Cadastro**
3. Envie o link via WhatsApp
4. Abra o link no celular (pode ser no mesmo ou outro)
5. **Deve abrir:** Formulário de cadastro
6. **NÃO deve:** Abrir landing page ou pedir login

### 3. Testar Link de Rastreamento

1. No app, inicie uma rota
2. Clique em **Compartilhar Rastreamento**
3. Envie o link via WhatsApp
4. Abra o link no celular (pode ser no mesmo ou outro)
5. **Deve abrir:** Mapa com localização
6. **NÃO deve:** Mostrar "código inválido"

## 🔍 SE AINDA DER ERRO

### Link de Cadastro abre Landing:

**Possível causa:** Cache do navegador no celular

**Solução:**
1. Limpe o cache do navegador
2. Ou abra o link em modo anônimo
3. Ou use outro navegador (Chrome, Firefox, etc)

### Código de Rastreamento Inválido:

**Possível causa:** Código não existe no banco

**Verificar no Supabase:**
```sql
SELECT * FROM tracking_links WHERE user_id = 'SEU_USER_ID';
```

**Se não existir, o app cria automaticamente quando você:**
1. Vai em Rotas
2. Inicia uma rota
3. Clica em Compartilhar

**Ou crie manualmente:**
```sql
INSERT INTO tracking_links (share_code, user_id, is_active)
VALUES ('ABC123', 'SEU_USER_ID', true);
```

## 📊 DIFERENÇA ENTRE OS APKs

- ❌ `MonitorPro-DEV.apk` - Antigo (com problema de login)
- ❌ `MonitorPro-DEV-CORRIGIDO.apk` - Corrigiu login, mas links ainda com problema
- ✅ **`MonitorPro-DEV-LINKS-OK.apk`** - **USE ESTE!** (login OK + links OK)

## 🎯 O QUE FOI CORRIGIDO

### Antes (❌):
```typescript
// Bloco que capturava rotas públicas ANTES
if (isPublicRoute && !session) {
  return <Routes>
    <Route path="/cadastro-aluno/:id" ... />
    <Route path="*" element={<Navigate to="/login" />} /> // ← Problema!
  </Routes>
}

// Depois tinha outro bloco de rotas
<Routes>
  <Route path="/cadastro-aluno/:id" ... />
  <Route path="/*" element={session ? ... : <Navigate to="/landing" />} />
</Routes>
```

**Problema:** Duas definições de rotas, uma redirecionava para login, outra para landing.

### Depois (✅):
```typescript
// Apenas um bloco de rotas
<Routes>
  {/* Rotas públicas sempre acessíveis */}
  <Route path="/cadastro-aluno/:id" element={<PublicStudentRegister />} />
  <Route path="/track/:code" element={<PublicTrackingPage />} />
  
  {/* Área restrita só se tiver sessão */}
  {session ? (
    <Route path="/*" element={<Layout>...</Layout>} />
  ) : (
    <Route path="*" element={<Navigate to="/landing" />} />
  )}
</Routes>
```

**Solução:** Rotas públicas declaradas primeiro, sem redirecionamento.

---

**Última atualização:** 26/01/2026 - 11:00
