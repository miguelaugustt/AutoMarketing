# Configuração do Supabase - AUT0MARKETING

Este guia explica como configurar o banco de dados PostgreSQL no Supabase para hospedar o AUT0MARKETING.

## 1. Criar projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta (ou faça login).
2. Clique em **"New Project"**.
3. Escolha sua organização, dê um nome ao projeto (ex: `automarketing`), senha do banco de dados e região.
4. Aguarde a criação do projeto (pode levar alguns minutos).

## 2. Obter credenciais de acesso

No painel do Supabase, vá em **Settings > API** e anote:

- **Project URL** → `SUPABASE_URL`
- **Project API keys > anon public** → `SUPABASE_ANON_KEY`
- **Project API keys > service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` (ou edite o `.env` existente) e preencha:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=sua_chave_jwt_super_secreta_aqui
ADMIN_USER=admin
ADMIN_PASSWORD=admin123

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

TELEGRAM_BOT_TOKEN=
META_PAGE_ACCESS_TOKEN=
SCHEDULER_CRON=*/30 * * * *
SIMULATION_MODE=false
```

> **Nota:** Nunca suba o arquivo `.env` com tokens reais para o GitHub. Ele está no `.gitignore`.

## 4. Criar as tabelas no Supabase

No painel do Supabase, vá em **SQL Editor** e cole o conteúdo do arquivo:

```
database/schema.sql
```

Clique em **Run** para executar. Isso criará:

- `products` — Produtos afiliados
- `groups` — Grupos e comunidades
- `campaigns` — Campanhas de divulgação
- `publications` — Histórico e fila de publicações
- `settings` — Configurações do sistema

Incluindo índices de performance e configurações iniciais.

## 5. Configurar Storage (para uploads de imagem/vídeo)

A postagem manual permite upload de arquivos. No Supabase:

1. Vá em **Storage**.
2. Crie um bucket chamado `uploads` (público).
3. Configure as políticas de acesso (ex: público para leitura, autenticado para escrita).

O backend salva arquivos localmente na pasta `backend/uploads/` por padrão. Para usar o Supabase Storage, você precisará adaptar o controller `manual-post.controller.js` para fazer upload para o bucket do Supabase em vez de salvar em disco.

## 6. Instalar dependências e iniciar

```bash
npm install
npm start
```

O servidor detecta automaticamente as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` e conecta ao Supabase. Se não encontrar, fallback para armazenamento local (`data/local_db.json`).

## 7. Verificar conexão

Acesse: `http://localhost:3000/api/health`

Deve retornar:

```json
{
  "status": "ONLINE",
  "database": {
    "type": "supabase",
    "connected": true,
    ...
  }
}
```

## Tabelas e campos esperados

| Tabela | Campos principais |
|--------|------------------|
| `products` | id, name, description, affiliate_url, category, platform, promotional_text, active, created_at |
| `groups` | id, name, invite_url, platform, external_group_id, authorization_status, advertising_permission, automation_permission, last_publication_at, active, created_at |
| `campaigns` | id, name, product_id, message_template, frequency_hours, status, start_at, created_at |
| `publications` | id, campaign_id, product_id, group_id, message, image_url, video_url, status, scheduled_at, published_at, error_message, created_at |
| `settings` | id, setting_name, setting_value, updated_at |

## Segurança (RLS - Row Level Security)

Por padrão, o Supabase ativa RLS em todas as tabelas. Se quiser permitir acesso total via API com a `service_role` key (que o backend usa), desative o RLS ou crie políticas permissivas:

```sql
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE publications DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
```

Ou crie políticas específicas conforme sua necessidade de segurança.
