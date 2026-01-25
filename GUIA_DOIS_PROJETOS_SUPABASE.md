# 🗄️ GUIA: Trabalhando com Dois Projetos Supabase

## 📋 O QUE FOI CONFIGURADO

Agora você tem uma estrutura que permite trabalhar com **dois projetos Supabase** simultaneamente:

1. **Projeto de PRODUÇÃO** (atual) - `nrkwrmksqhykfvgmfpcw`
   - Usado na branch `main`
   - Dados reais dos usuários
   - Não deve ser alterado

2. **Projeto de DESENVOLVIMENTO** (novo) - Que você acabou de criar
   - Usado na branch `feature/feedback-condutores`
   - Para testes e mudanças drásticas
   - Pode quebrar à vontade

---

## 🎯 COMO FUNCIONA

### Arquivos Criados:

```
.env                    ← Padrão (desenvolvimento)
.env.development        ← Projeto NOVO (testes)
.env.production         ← Projeto ATUAL (produção)
.gitignore              ← Atualizado para não subir .env
services/auth.ts        ← Atualizado para ler .env
```

### Lógica:

- Quando você roda `npm run dev` → Usa `.env.development` (projeto novo)
- Quando você faz `npm run build` → Usa `.env.production` (projeto atual)
- O código lê automaticamente as variáveis de ambiente

---

## 🚀 PASSO A PASSO: CONFIGURAR PROJETO NOVO

### 1. Pegar Credenciais do Projeto Novo

1. Vá no dashboard do Supabase: https://supabase.com/dashboard
2. Selecione o projeto NOVO que você criou
3. Clique em **"Settings"** (engrenagem no menu lateral)
4. Clique em **"API"**
5. Copie:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public** key (começa com `eyJ...`)

### 2. Colar no Arquivo `.env.development`

Abra o arquivo `.env.development` e cole as credenciais:

```env
# Cole aqui a URL do projeto NOVO
VITE_SUPABASE_URL=https://abcdefgh.supabase.co

# Cole aqui a Anon Key do projeto NOVO
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Ambiente
VITE_ENVIRONMENT=development
```

### 3. Aplicar Migrations no Projeto Novo

Agora você precisa criar as tabelas no projeto novo. Você tem duas opções:

#### Opção A: Via Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (se ainda não tem)
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Linkar com o projeto novo
supabase link --project-ref SEU_PROJETO_NOVO_ID

# 4. Aplicar todas as migrations
supabase db push
```

#### Opção B: Via SQL Editor (Manual)

1. Vá no dashboard do projeto novo
2. Clique em **"SQL Editor"**
3. Copie e cole o conteúdo de cada migration (na ordem):
   - `supabase/migrations/001_webhook_tables.sql`
   - `supabase/migrations/002_bank_data_table.sql`
   - `supabase/migrations/002_driver_tracking.sql`
   - `supabase/migrations/003_fix_rls_policies.sql`
   - `supabase/migrations/003_maintenance_storage.sql`
   - `supabase/migrations/004_expenses_table.sql`
   - `supabase/migrations/005_student_observation_birthdate.sql`
   - `supabase/migrations/006_delete_user_data_function.sql`
4. Execute cada uma

### 4. Configurar Edge Functions no Projeto Novo (Opcional)

Se você for usar as Edge Functions (Asaas), precisa deployar no projeto novo:

```bash
# Deploy das Edge Functions
supabase functions deploy create-asaas-account
supabase functions deploy asaas-webhook
supabase functions deploy asaas-proxy
supabase functions deploy delete-account

# Configurar secrets
supabase secrets set ASAAS_API_KEY_MASTER=sua_key_aqui
supabase secrets set ASAAS_ENVIRONMENT=sandbox
```

---

## 🧪 TESTANDO

### Testar no Navegador (Desenvolvimento)

```bash
# Vai usar o projeto NOVO automaticamente
npm run dev
```

Abra o console do navegador e veja:
```
🔧 Supabase Config: {
  url: "https://SEU_PROJETO_NOVO.supabase.co",
  environment: "development"
}
```

### Testar no APK (Produção)

```bash
# Vai usar o projeto ATUAL automaticamente
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

---

## 🔄 ALTERNANDO ENTRE PROJETOS

### Durante Desenvolvimento:

**Usar projeto NOVO (testes):**
```bash
# Já está configurado! Só rodar:
npm run dev
```

**Usar projeto ATUAL (produção) temporariamente:**
```bash
# Editar .env.development e trocar as credenciais
# OU
# Copiar .env.production para .env.development
```

### Para Build/APK:

**Build com projeto NOVO (testes):**
```bash
# Editar vite.config.ts para usar .env.development
npm run build
```

**Build com projeto ATUAL (produção):**
```bash
# Já está configurado! Só rodar:
npm run build
```

---

## 📊 RESUMO VISUAL

```
┌─────────────────────────────────────────────────────────┐
│                    SEU REPOSITÓRIO                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Branch: main                                           │
│  ├─ .env.production → Projeto ATUAL (nrkwrmk...)      │
│  └─ npm run build → APK com dados REAIS               │
│                                                         │
│  Branch: feature/feedback-condutores                    │
│  ├─ .env.development → Projeto NOVO (abcdefgh...)     │
│  └─ npm run dev → Testes com dados NOVOS              │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  PROJETOS SUPABASE                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Projeto ATUAL (Produção)                               │
│  ├─ ID: nrkwrmksqhykfvgmfpcw                           │
│  ├─ Dados: Usuários reais                              │
│  └─ Status: INTOCADO ✅                                 │
│                                                         │
│  Projeto NOVO (Desenvolvimento)                         │
│  ├─ ID: SEU_PROJETO_NOVO                               │
│  ├─ Dados: Testes                                       │
│  └─ Status: Pode quebrar tudo! 🔥                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ IMPORTANTE

### O que está protegido:

✅ Projeto de produção (atual) - Intocado  
✅ Branch main - Intocada  
✅ Tag v1.3.0-stable - Backup permanente  
✅ Dados dos usuários - Seguros  

### O que você pode quebrar:

🔥 Projeto novo (desenvolvimento)  
🔥 Branch feature/feedback-condutores  
🔥 Banco de dados do projeto novo  
🔥 Tudo que quiser testar  

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Pegar credenciais do projeto novo** (URL + Anon Key)
2. ✅ **Colar no `.env.development`**
3. ✅ **Aplicar migrations no projeto novo**
4. ✅ **Rodar `npm run dev` e testar**
5. ✅ **Fazer as mudanças drásticas!**

---

## 🆘 TROUBLESHOOTING

### Erro: "Invalid API key"
- Verifique se copiou a key correta do projeto novo
- Verifique se não tem espaços extras no `.env.development`

### Erro: "Table does not exist"
- Você esqueceu de aplicar as migrations no projeto novo
- Siga o passo 3 acima

### App continua usando projeto antigo
- Limpe o cache: `npm run dev` (Ctrl+C e rodar de novo)
- Verifique se o console mostra a URL correta

### Quero voltar para versão estável
```bash
git checkout main
# OU
git checkout v1.3.0-stable
```

---

## 📞 DÚVIDAS?

Se tiver qualquer problema, me chame! Estou aqui para ajudar.

**Última Atualização:** 25/01/2026 - 15:00
