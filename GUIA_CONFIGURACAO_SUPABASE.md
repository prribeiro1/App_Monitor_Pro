# 🚀 Guia de Configuração - Projeto Supabase (Monitor Pro)

Sempre que criar um novo projeto no Supabase para testes ou produção, siga estes passos na ordem:

## 1. Configurações de Autenticação
No menu lateral, vá em **Authentication** -> **Providers** -> **Email**:
- **Confirm Email:** DESATIVAR (OFF) - *Necessário porque usamos e-mails fictícios.*
- **Secure password change:** DESATIVAR (OFF) - *Opcional, facilita trocas manuais.*
- **Allow signup:** ATIVAR (ON).

## 2. Criação do Banco de Dados
No menu lateral, vá em **SQL Editor** -> **New Query**:
1. Copie o conteúdo do arquivo `SETUP_COMPLETO_PROJETO_NOVO.sql` e execute.
2. Copie o conteúdo do arquivo `SETUP_ADMIN_FUNCTIONS.sql` e execute.
   - *Isso criará todas as tabelas, permissões RLS e as funções de Gestão de Equipe.*

## 3. Gestão de Usuários
No menu **Authentication** -> **Users**:
- **Criar Usuário:** Clique em "Add User" -> "Create new user". Lembre-se que o e-mail deve terminar em `@monitorescolar.app` (ex: `joao@monitorescolar.app`).
- **Trocar Senha:** Clique nos três pontinhos ao lado do usuário -> "Change Password".

## 4. Variáveis de Ambiente
Atualize o arquivo `.env.development` no VS Code com a nova **URL** e **Anon Key** do projeto disponível em **Settings** -> **API**.

---
*Dica: O usuário ADM padrão do sistema é `teste` com a senha que você definiu. Ele tem acesso automático ao botão "Gerenciar Equipe" nas configurações.*
