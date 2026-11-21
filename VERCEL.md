# Deploy na Vercel - AUT0MARKETING

Este guia explica como hospedar o AUT0MARKETING na Vercel usando Serverless Functions.

## ⚠️ Limitações Importantes (Serverless)

A Vercel é uma plataforma serverless. Algumas funcionalidades têm limitações:

| Recurso | Status | Observação |
|---------|--------|------------|
| API REST (Express) | ✅ Funciona | Via função serverless `api/index.js` |
| Banco de dados Supabase | ✅ Funciona | Conecta normalmente via variáveis de ambiente |
| Upload de arquivos (imagem/vídeo) | ❌ Não funciona | Sistema de arquivos é efêmero no serverless |
| Agendador cron interno | ❌ Não funciona | Sem processo persistente |
| Userbot (Telegram MTProto) | ⚠️ Limitado | Precisa de conexão persistente; pode não funcionar |
| WebSockets | ❌ Não funciona | Não suportado em serverless |

**Recomendação:** Para upload de arquivos e agendamento, use o Supabase Storage e um serviço externo de cron (ex: Vercel Cron, GitHub Actions, ou um cron job em outro servidor).

---

## 1. Preparar o Repositório

Certifique-se de que o projeto está no GitHub:

```bash
git remote add origin https://github.com/seu-usuario/AutoMarketing.git
git push -u origin master
```

Os arquivos já preparados para Vercel:
- `vercel.json` — configuração de rotas e cron
- `api/index.js` — entry point da função serverless
- `backend/server.js` — já exporta o app (`module.exports = app`)

---

## 2. Conectar o GitHub à Vercel

1. Acesse [https://vercel.com](https://vercel.com) e faça login.
2. Clique em **"Add New Project"**.
3. Selecione seu repositório `AutoMarketing` e clique em **Import**.
4. No passo de configuração, deixe as opções padrão:
   - **Framework Preset:** Other
   - **Build Command:** (deixe em branco ou `npm install`)
   - **Development Command:** `npm run dev`
   - **Output Directory:** (deixe em branco)
5. Clique em **Deploy**.

---

## 3. Configurar Variáveis de Ambiente

No painel da Vercel, vá em **Settings > Environment Variables** e adicione:

| Variável | Valor | Obrigatório |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Sim |
| `PORT` | `3000` | Não |
| `JWT_SECRET` | `sua_chave_jwt_super_secreta` | Sim |
| `ADMIN_USER` | `admin` | Não |
| `ADMIN_PASSWORD` | `admin123` | Não |
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` | Sim (para banco) |
| `SUPABASE_ANON_KEY` | `sua_chave_anon` | Sim (para banco) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sua_chave_service_role` | Sim (para banco) |
| `TELEGRAM_BOT_TOKEN` | `seu_token_do_bot` | Não (opcional) |
| `META_PAGE_ACCESS_TOKEN` | `seu_token_meta` | Não (opcional) |
| `SIMULATION_MODE` | `false` | Não |
| `SCHEDULER_CRON` | `*/30 * * * *` | Não |

> **Importante:** Não suba o arquivo `.env` para o GitHub. Ele está no `.gitignore`.

---

## 4. Configurar Banco de Dados no Supabase

Antes de usar na Vercel, configure o Supabase:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute o conteúdo de `database/schema.sql`.
3. Anote as credenciais (URL, ANON_KEY, SERVICE_ROLE_KEY).
4. Adicione essas credenciais nas Environment Variables da Vercel (passo 3).

---

## 5. Configurar Cron Externo (Opcional)

O agendador interno (`cronScheduler`) não funciona em serverless. Para executar campanhas agendadas automaticamente:

#### Limitação do plano Hobby da Vercel

Contas no plano **Hobby (gratuito)** permitem apenas **cron jobs diários** (no máximo 1 vez por dia). Se você precisa de execução mais frequente (ex: a cada 30 minutos), use um serviço externo de cron.

#### Opção A: Vercel Cron (apenas plano Hobby - 1x por dia)

O `vercel.json` já inclui uma configuração de cron diário:

```json
"crons": [
  {
    "path": "/api/cron",
    "schedule": "0 0 * * *"
  }
]
```

Isso executa o endpoint `/api/cron` uma vez por dia à meia-noite (UTC).

#### Opção B: Cron Externo (recomendado para frequência maior)

Use um serviço gratuito como [cron-job.org](https://cron-job.org) ou GitHub Actions para fazer uma requisição HTTP para:

```
POST https://seu-dominio.vercel.app/api/cron
```

Com cabeçalho de autorização:
```
Authorization: Bearer SEU_CRON_SECRET
```

Você precisará criar um endpoint `/api/cron` que dispare o processamento das campanhas:

```javascript
// api/cron.js
const app = require('../backend/server');
const distributionService = require('../backend/services/distribution.service');

module.exports = async (req, res) => {
  // Verificar token de segurança
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const activeCampaigns = await db.getCampaigns({ status: 'active' });
    for (const campaign of activeCampaigns) {
      await distributionService.processCampaign(campaign.id);
    }
    res.status(200).json({ success: true, processed: activeCampaigns.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 6. Upload de Arquivos (Imagem/Vídeo)

O upload via `multer` salva arquivos em disco local, que é efêmero na Vercel. Para usar uploads de mídia:

### Opção A: Supabase Storage

1. No Supabase, crie um bucket chamado `uploads` (público).
2. Adicione as credenciais do Supabase nas Environment Variables da Vercel.
3. Adapte `backend/controllers/manual-post.controller.js` para fazer upload para o bucket do Supabase em vez de salvar em disco.

Exemplo de upload para Supabase Storage:

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`image-${Date.now()}.jpg`, fileBuffer, {
    contentType: 'image/jpeg',
    upsert: false
  });
```

### Opção B: Desabilitar Upload

Se não precisar de upload de arquivos, os campos de URL (imagem_url, vídeo_url) continuam funcionando normalmente — o usuário pode colar links diretos.

---

## 7. Verificar o Deploy

Após o deploy, acesse:
- **Health check:** `https://seu-dominio.vercel.app/api/health`
- **Login:** `https://seu-dominio.vercel.app/index.html`
- **Dashboard:** `https://seu-dominio.vercel.app/dashboard.html`

Credenciais padrão: `admin` / `admin123`

---

## 7. Estrutura de Arquivos para Vercel

```
AutoMarketing/
├── api/
│   └── index.js          # Entry point serverless
├── backend/
│   ├── server.js         # App Express (exporta app)
│   ├── controllers/
│   ├── routes/
│   ├── integrations/
│   ├── services/
│   └── database/
├── frontend/
│   ├── *.html
│   ├── css/
│   └── js/
├── vercel.json           # Configuração Vercel
├── package.json
└── .env                  # (não subir para o GitHub)
```

---

## 8. Solução de Problemas

| Problema | Solução |
|----------|---------|
| Erro 500 em todas as rotas | Verifique se as variáveis de ambiente estão configuradas na Vercel |
| Banco não conecta | Verifique `SUPABASE_URL` e `SUPABASE_ANON_KEY` |
| Upload de arquivo falha | Limitação do serverless; use Supabase Storage ou links diretos |
| Campanhas não disparam sozinhas | Configure um cron externo (Vercel Cron ou GitHub Actions) |
| Login não funciona | Verifique `JWT_SECRET` e `ADMIN_PASSWORD` |

---

## Links Úteis

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Projeto no GitHub](https://github.com/miguelaugustt/AutoMarketing)
