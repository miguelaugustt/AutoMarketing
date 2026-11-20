# AUT0MARKETING - Plataforma de Automação de Marketing de Afiliados

> **Versão:** 1.0  
> **Tipo:** Sistema web para automação ética e gerenciamento de campanhas de afiliados (Kiwify, Hotmart, Eduzz) em comunidades autorizadas (Telegram e Meta).

---

## 1. Visão Geral

O **AUT0MARKETING** centraliza a gestão de produtos afiliados, grupos de divulgação e campanhas promocionais em um painel administrativo web moderno e intuitivo.

### Principais Diferenciais:
- **Motor de Distribuição Inteligente:** Seleção aleatória de produtos ativos respeitando o histórico recente de cada grupo (evita repetições consecutivas).
- **Controle Rigoroso de 24 Horas:** Intervalo de frequência individual e independente por comunidade.
- **Conformidade Ética & Permissões:** Exige autorização formal dos administradores de cada comunidade (`authorization_status === 'authorized'`) e confirmação de permissão para anúncios e automação antes de qualquer publicação.
- **Interrupção Geral de Emergência (Kill Switch):** Botão único para congelamento instantâneo de todas as publicações agendadas e campanhas.
- **Modelos com Variação Dinâmica (Spintax):** Geração ética de variações de texto autênticas (`{opção 1|opção 2}`) e marcadores dinâmicos (`{product_name}`, `{affiliate_url}`, etc.).
- **Arquitetura Custo Zero:** Funciona 100% de imediato sem custos, com suporte nativo ao **Supabase (PostgreSQL)** e contingência local resiliente.

---

## 2. Arquitetura do Sistema

```
AUT0MARKETING/
├── backend/
│   ├── controllers/            # Controladores MVC da API
│   │   ├── auth.controller.js
│   │   ├── campaigns.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── groups.controller.js
│   │   ├── products.controller.js
│   │   ├── publications.controller.js
│   │   └── settings.controller.js
│   ├── database/               # Camada de banco de dados
│   │   ├── db.js               # Conector Supabase + fallback local
│   │   └── schema.sql          # DDL e seeds para Supabase PostgreSQL
│   ├── integrations/           # Integrações oficiais
│   │   ├── meta.integration.js # Meta Graph API (Facebook Pages)
│   │   └── telegram.integration.js # Telegram Bot API
│   ├── middleware/             # Middlewares (JWT e Error Handler)
│   │   ├── auth.middleware.js
│   │   └── errorHandler.js
│   ├── routes/                 # Definição das rotas REST
│   │   ├── auth.routes.js
│   │   ├── campaigns.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── groups.routes.js
│   │   ├── products.routes.js
│   │   ├── publications.routes.js
│   │   └── settings.routes.js
│   ├── scheduler/              # Agendador automatizado de tarefas
│   │   └── cronScheduler.js    # Motor Cron periódico
│   ├── services/               # Regras de negócio centrais
│   │   ├── adVariation.service.js # Spintax e interpolação de cópias
│   │   ├── distribution.service.js# Motor de distribuição e seleção
│   │   └── security.service.js    # Verificação de segurança e intervalos
│   └── server.js               # Servidor Express e inicialização
├── config/
│   └── environment.example     # Modelo de variáveis de ambiente
├── data/                       # Armazenamento local contingencial
│   └── local_db.json
├── database/                   # Script de banco
│   └── schema.sql
├── frontend/                   # Interface Administrativa Web
│   ├── css/
│   │   └── styles.css          # Estilização customizada moderna (Dark/Violet)
│   ├── js/
│   │   ├── api.js              # Cliente HTTP e sistema de Toasts
│   │   ├── auth.js             # Gestão de sessão e login JWT
│   │   ├── campaigns.js        # Gestão de campanhas e Spintax
│   │   ├── dashboard.js        # Métricas, Kill Switch e atalhos
│   │   ├── groups.js           # Gestão de comunidades e teste de bots
│   │   ├── history.js          # Auditoria de publicações e reenvio
│   │   ├── products.js         # Catálogo de produtos afiliados
│   │   └── settings.js         # Parâmetros e testes de integração
│   ├── campaigns.html
│   ├── dashboard.html
│   ├── groups.html
│   ├── history.html
│   ├── index.html              # Tela de Login Administrativo
│   ├── products.html
│   └── settings.html
├── .env                        # Variáveis de ambiente locais
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Instalação e Execução Local

### Pré-requisitos:
- **Node.js** v18+ instalado.
- **npm** instalado.

### Passo 1: Instalação de dependências
Na raiz do projeto:
```bash
npm install
```

### Passo 2: Configuração das Variáveis de Ambiente
O projeto já conta com o arquivo `.env` configurado para desenvolvimento local. Você também pode consultar o modelo em `config/environment.example`:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=seu_segredo_jwt_aqui
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
```

### Passo 3: Iniciar o Servidor
Execute:
```bash
npm start
```
O painel administrativo estará acessível em:
👉 **http://localhost:3000** ou **http://localhost:3000/dashboard.html**

**Credenciais padrão:**
- **Usuário:** `admin`
- **Senha:** `admin123`

---

## 4. Configuração do Supabase (Banco de Dados em Nuvem)

O sistema opera de forma resiliente tanto localmente (zero configuração) quanto conectado ao Supabase PostgreSQL gratuito:

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Crie um novo projeto (ex: `automarketing-db`).
3. No menu lateral do Supabase, acesse **SQL Editor**.
4. Copie todo o conteúdo do arquivo `database/schema.sql` e execute no SQL Editor. As tabelas `products`, `groups`, `campaigns`, `publications` e `settings` serão criadas com índices e dados de exemplo.
5. Em **Project Settings -> API**, copie:
   - **Project URL**
   - **anon / public key** (ou `service_role` key para permissão total do backend)
6. Preencha no seu arquivo `.env`:
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
7. Reinicie o servidor (`npm start`). O conector reconhecerá automaticamente o Supabase!

---

## 5. Configuração do Bot do Telegram

1. No aplicativo do Telegram, procure pelo usuário oficial `@BotFather`.
2. Envie o comando `/newbot` e defina um nome e username para o seu bot.
3. O `@BotFather` responderá com um **Token HTTP API** (ex: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
4. Acesse o **AutoMarketing** em **Configurações & API** e cole o token no campo do Telegram, ou defina no `.env` em `TELEGRAM_BOT_TOKEN`.
5. Clique no botão **"Testar Conexão do Bot"** para validar a comunicação em tempo real.
6. Adicione o bot criado nos grupos autorizados como **Administrador** (para permitir que ele publique mensagens).
7. Cadastre o grupo na tela **Grupos & Canais** informando o ID do chat (ex: `-100123456789`) e marque as autorizações expressas.
8. Use o botão **"Testar Permissões"** ao lado de cada grupo para verificar se o bot tem autorização de envio.

---

## 6. Regras de Negócio e Algoritmo de Distribuição

### Rotação Inteligente de Produtos (Seção 5.2):
- Ao processar uma campanha em modo de rotação aleatória:
  1. O motor consulta o histórico recente das últimas 5 publicações daquele grupo específico.
  2. **Regra Obrigatória:** O último produto publicado para aquele grupo é imediatamente excluído dos candidatos.
  3. Entre os produtos restantes, o algoritmo prioriza aqueles que não foram enviados recentemente.
  4. Seleciona aleatoriamente entre os produtos mais qualificados.
  5. Garante que produtos inativos ou desativados nunca sejam selecionados.

### Intervalo de 24 Horas por Grupo (Seção 5.3):
- Cada grupo possui seu próprio contador independente (`last_publication_at`).
- Publicações no Grupo A não afetam o agendamento do Grupo B.
- Se o intervalo de 24h não foi atingido, o grupo entra em estado de cooldown seguro e a publicação é adiada.

### Interrupção Geral (Kill Switch - Seção 6):
- Em caso de restrição em contas, manutenções ou emergências, o administrador pode clicar em **"Interrupção Geral"** no topo do painel.
- Todas as execuções automáticas e agendadas são suspensas instantaneamente até a reativação expressa pelo administrador.

---

## 7. Publicação e Hospedagem Gratuita (Custo R$ 0)

Para manter o custo de infraestrutura em R$ 0 conforme a Seção 9 da especificação:

| Componente | Hospedagem Recomendada (Gratuita) | Função |
|---|---|---|
| **Painel Web (Frontend)** | GitHub Pages ou Render Static Site | Interface de administração |
| **Backend Node.js** | Render (Free Web Service), Fly.io ou Railway | Execução da API e Scheduler Cron |
| **Banco de Dados** | Supabase (Free Tier PostgreSQL 500MB) | Tabelas, relacionamentos e histórico |

---

## 8. Licença e Ética

Este software foi concebido estritamente para automação de marketing em comunidades onde os administradores concederam permissão formal. O sistema bloqueia disparos não autorizados e não deve ser utilizado para práticas de spam.
