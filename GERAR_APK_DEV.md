# 🚀 Gerar APK de Desenvolvimento

**Status:** ✅ Configurações aplicadas!

---

## ✅ Mudanças Aplicadas

1. **Application ID**: `com.monitorescolar.pro.dev`
2. **Namespace**: `com.monitorescolar.pro.dev`
3. **Nome do App**: `MonitorPro DEV`
4. **Versão**: `1.2.9-dev`
5. **Package**: `com.monitorescolar.pro.dev`

---

## 📱 Agora Você Pode Ter 2 Apps no Mesmo Celular!

### App 1: Produção (Main)
- Nome: **MonitorPro**
- ID: `com.monitorescolar.pro`
- Banco: Produção (`nrkwrmksqhykfvgmfpcw`)

### App 2: Desenvolvimento (Esta Branch)
- Nome: **MonitorPro DEV**
- ID: `com.monitorescolar.pro.dev`
- Banco: Desenvolvimento (`bkwrflgrfhsgeowjynou`)

---

## 🔧 Como Gerar o APK

### 1. Build do Projeto (USAR ESTE COMANDO PARA DEV)
```bash
npm run build:test
```

### 2. Sincronizar com Android
```bash
npx cap sync
```

### 3. Abrir no Android Studio
```bash
npx cap open android
```

### 4. Gerar APK no Android Studio
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### 5. Localizar o APK
```
android/app/build/outputs/apk/release/app-release.apk
```

### 6. Renomear (Opcional)
```
MonitorPro-DEV.apk
```

---

## 📲 Instalar no Celular

1. Transferir APK para o celular
2. Instalar normalmente
3. Você verá o ícone: **MonitorPro DEV**

---

## ⚠️ IMPORTANTE

### Antes de Fazer Merge na Main:

**REVERTER ESTAS MUDANÇAS!**

Os arquivos que precisam voltar ao normal:
1. `android/app/build.gradle`
   - `applicationId`: `com.monitorescolar.pro`
   - `namespace`: `com.monitorescolar.pro`
   - `versionName`: `1.2.9` (sem "-dev")

2. `android/app/src/main/res/values/strings.xml`
   - `app_name`: `MonitorPro` (sem "DEV")
   - `package_name`: `com.monitorescolar.pro`

3. `android/app/src/main/java/com/monitorescolar/pro/MainActivity.java`
   - `package`: `com.monitorescolar.pro`

4. `services/auth.ts`
   - Remover hardcode do Supabase
   - Usar variáveis de ambiente

---

## 🎯 Resultado

Após instalar, você terá na tela do celular:

```
📱 Tela Inicial
├─ 🚐 MonitorPro          (Produção)
└─ 🚐 MonitorPro DEV      (Desenvolvimento)
```

Cada um com seu próprio banco de dados e dados independentes!

---

**Última Atualização:** 25/01/2026 - 22:00
