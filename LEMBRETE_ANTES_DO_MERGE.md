# ⚠️ LEMBRETE IMPORTANTE: ANTES DE FAZER MERGE NA MAIN

## 🔴 AÇÃO OBRIGATÓRIA

Antes de fazer merge da branch `feature/feedback-condutores` na `main`, você **DEVE** reverter o hardcode do Supabase!

---

## 📝 O QUE FAZER

### 1. Abrir o arquivo `services/auth.ts`

### 2. Substituir esta parte:

```typescript
// ⚠️⚠️⚠️ ATENÇÃO: HARDCODED PARA DESENVOLVIMENTO ⚠️⚠️⚠️
const SUPABASE_URL = 'https://bkwrflgrfhsgeowjynou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

### 3. Por esta parte:

```typescript
// --- CONFIGURAÇÃO DO SUPABASE ---
// Lê das variáveis de ambiente (.env.development ou .env.production)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nrkwrmksqhykfvgmfpcw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_I-rsXf9WcK3BOrGjVLj4UA_WhAKix0x';
```

---

## ⚠️ POR QUE ISSO É IMPORTANTE?

Se você fizer merge sem reverter:
- ❌ O app de **PRODUÇÃO** vai conectar no banco de **TESTES**
- ❌ Usuários reais vão ver dados de teste
- ❌ Dados de teste vão misturar com dados reais
- ❌ **DESASTRE TOTAL!**

---

## ✅ CHECKLIST ANTES DO MERGE

- [ ] Abrir `services/auth.ts`
- [ ] Remover hardcode do Supabase
- [ ] Voltar a usar `import.meta.env.VITE_SUPABASE_URL`
- [ ] Testar `npm run build` para garantir que usa produção
- [ ] Fazer commit: `git commit -m "fix: Reverter hardcode do Supabase para usar .env"`
- [ ] Fazer merge na main

---

## 🔍 COMO VERIFICAR SE ESTÁ CORRETO

Depois de reverter, rode:

```bash
npm run build
```

E verifique se o build usa o projeto de **PRODUÇÃO** (`nrkwrmksqhykfvgmfpcw`).

---

**Última Atualização:** 25/01/2026 - 16:00
