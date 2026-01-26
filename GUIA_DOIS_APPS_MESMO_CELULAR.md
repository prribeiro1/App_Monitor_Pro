# 📱 Guia: Instalar 2 Apps no Mesmo Celular

**Objetivo:** Ter o app da **main** (produção) e o app da **branch de desenvolvimento** instalados simultaneamente no mesmo celular.

---

## 🎯 Por Que Fazer Isso?

- ✅ Testar novas funcionalidades sem perder dados de produção
- ✅ Comparar versões lado a lado
- ✅ Usar dados reais em um e dados de teste no outro
- ✅ Não precisar desinstalar/reinstalar

---

## 🔧 Como Funciona

O Android identifica apps pelo **applicationId**. Se você mudar esse ID, o Android trata como um app diferente.

### Configuração Atual:
- **Main (Produção)**: `com.monitorescolar.pro`
- **Development**: Precisa ser diferente!

### Configuração Recomendada:
- **Main (Produção)**: `com.monitorescolar.pro`
- **Development**: `com.monitorescolar.pro.dev`

---

## 📝 Passo a Passo

### 1. Mudar o Application ID

**Arquivo:** `android/app/build.gradle`

**Linha 12:** Mudar de:
```groovy
applicationId "com.monitorescolar.pro"
```

Para:
```groovy
applicationId "com.monitorescolar.pro.dev"
```

### 2. Mudar o Nome do App (Opcional mas Recomendado)

Para diferenciar visualmente os dois apps na tela do celular.

**Arquivo:** `android/app/src/main/res/values/strings.xml`

Mudar de:
```xml
<string name="app_name">Monitor PRO</string>
```

Para:
```xml
<string name="app_name">Monitor PRO DEV</string>
```

### 3. Mudar o Namespace (Importante!)

**Arquivo:** `android/app/build.gradle`

**Linha 4:** Mudar de:
```groovy
namespace "com.monitorescolar.pro"
```

Para:
```groovy
namespace "com.monitorescolar.pro.dev"
```

### 4. Mudar o Package do MainActivity

**Arquivo:** `android/app/src/main/java/com/monitorescolar/pro/MainActivity.java`

**Linha 1:** Mudar de:
```java
package com.monitorescolar.pro;
```

Para:
```java
package com.monitorescolar.pro.dev;
```

### 5. Mover o Arquivo MainActivity (Opcional)

Se quiser ser 100% correto, mova o arquivo para a nova estrutura de pastas:

**De:**
```
android/app/src/main/java/com/monitorescolar/pro/MainActivity.java
```

**Para:**
```
android/app/src/main/java/com/monitorescolar/pro/dev/MainActivity.java
```

Mas isso não é obrigatório! O Android aceita o package diferente do caminho.

---

## 🚀 Gerar os APKs

### APK da Main (Produção)

1. Fazer checkout na main:
```bash
git checkout main
```

2. Gerar APK:
```bash
npm run build
npx cap sync
npx cap open android
```

3. No Android Studio:
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

4. Renomear APK:
```
MonitorPro-PRODUCAO.apk
```

### APK da Branch de Desenvolvimento

1. Fazer checkout na branch:
```bash
git checkout feature/feedback-condutores
```

2. **APLICAR AS MUDANÇAS ACIMA** (applicationId, namespace, etc.)

3. Gerar APK:
```bash
npm run build
npx cap sync
npx cap open android
```

4. No Android Studio:
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

5. Renomear APK:
```
MonitorPro-DEV.apk
```

---

## 📲 Instalar no Celular

1. Transferir os 2 APKs para o celular
2. Instalar `MonitorPro-PRODUCAO.apk`
3. Instalar `MonitorPro-DEV.apk`
4. Agora você terá 2 ícones na tela:
   - **Monitor PRO** (produção)
   - **Monitor PRO DEV** (desenvolvimento)

---

## 🎨 Diferenças Visuais

### Ícone do App (Opcional)

Para diferenciar ainda mais, você pode mudar a cor do ícone do app de desenvolvimento.

**Arquivo:** `android/app/src/main/res/values/ic_launcher_background.xml`

Mudar a cor de fundo do ícone.

### Splash Screen (Opcional)

Mudar a cor da splash screen para diferenciar.

**Arquivo:** `android/app/src/main/res/values/styles.xml`

---

## 🗄️ Bancos de Dados Separados

### Produção (Main):
- Projeto Supabase: `nrkwrmksqhykfvgmfpcw`
- Dados reais dos clientes

### Desenvolvimento (Branch):
- Projeto Supabase: `bkwrflgrfhsgeowjynou`
- Dados de teste

Como os apps têm `applicationId` diferentes, o IndexedDB também será separado automaticamente!

---

## ⚠️ Importante

### Antes de Gerar o APK de Desenvolvimento:

1. **Verificar se o hardcode do Supabase está correto**
   - Arquivo: `services/auth.ts`
   - Deve estar apontando para o projeto de desenvolvimento

2. **Não fazer merge na main com essas mudanças!**
   - As mudanças de `applicationId` são APENAS para desenvolvimento
   - Antes do merge, reverter para `com.monitorescolar.pro`

---

## 📋 Checklist

### Para o APK de Produção (Main):
- [ ] Checkout na main
- [ ] `applicationId`: `com.monitorescolar.pro`
- [ ] Nome do app: `Monitor PRO`
- [ ] Projeto Supabase: Produção
- [ ] Gerar APK
- [ ] Renomear: `MonitorPro-PRODUCAO.apk`

### Para o APK de Desenvolvimento:
- [ ] Checkout na branch
- [ ] `applicationId`: `com.monitorescolar.pro.dev`
- [ ] `namespace`: `com.monitorescolar.pro.dev`
- [ ] Nome do app: `Monitor PRO DEV`
- [ ] Package MainActivity: `com.monitorescolar.pro.dev`
- [ ] Projeto Supabase: Desenvolvimento (hardcoded)
- [ ] Gerar APK
- [ ] Renomear: `MonitorPro-DEV.apk`

---

## 🎯 Resultado Final

Você terá no celular:

```
📱 Tela do Celular
├─ 🚐 Monitor PRO (Produção)
│   └─ Dados reais
│   └─ Banco: nrkwrmksqhykfvgmfpcw
│
└─ 🚐 Monitor PRO DEV (Desenvolvimento)
    └─ Dados de teste
    └─ Banco: bkwrflgrfhsgeowjynou
```

---

## 💡 Dica Extra

### Cores Diferentes para Diferenciar

No app de desenvolvimento, você pode mudar a cor primária para diferenciar visualmente:

**Arquivo:** `index.css` ou `tailwind.config.js`

Mudar a cor primária de azul para laranja, por exemplo.

---

**Última Atualização:** 25/01/2026 - 22:00
