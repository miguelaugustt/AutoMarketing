/**
 * AUT0MARKETING - Vercel Serverless Function Entry Point
 * Versão com estrutura de resposta correta para o frontend
 */

const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Middleware de erro global - SEMPRE retorna JSON
app.use((err, req, res, next) => {
  console.error('ERRO:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    success: false
  });
});

// ============================================================================
// ROTAS DE API - AUTENTICAÇÃO
// ============================================================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    const token = 'vercel-demo-token-' + Date.now();
    return res.json({
      success: true,
      message: 'Autenticação realizada com sucesso.',
      token,
      user: { username: 'admin', role: 'admin' }
    });
  }
  return res.status(401).json({
    success: false,
    error: 'Usuário ou senha inválidos.'
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logout realizado.' });
});

app.post('/api/auth/change-password', (req, res) => {
  res.json({ success: true, message: 'Senha alterada com sucesso.' });
});

// ============================================================================
// ROTAS DE API - SETTINGS
// ============================================================================

app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    settings: {
      emergency_pause_all: 'false',
      default_frequency_hours: '24',
      simulation_mode: 'false',
      telegram_bot_token: '',
      admin_password_hash: ''
    },
    database: {
      type: 'local',
      connected: true
    },
    environment: {
      has_supabase_env: false
    }
  });
});

app.put('/api/settings', (req, res) => {
  res.json({ success: true, message: 'Configurações salvas.' });
});

app.post('/api/settings/test-meta', (req, res) => {
  res.json({ success: true, message: 'Token Meta testado com sucesso.' });
});

// ============================================================================
// ROTAS DE API - USERBOT
// ============================================================================

app.get('/api/userbot/status', (req, res) => {
  res.json({
    success: true,
    connected: false,
    simulation: true,
    phone: '+55 37 99172-3499',
    username: 'Miguel',
    message: 'Modo simulação (não conectado realmente)'
  });
});

app.post('/api/userbot/send-code', (req, res) => {
  res.json({
    success: true,
    message: 'Código de verificação enviado para o seu Telegram (modo simulação).'
  });
});

app.post('/api/userbot/sign-in', (req, res) => {
  res.json({
    success: true,
    message: 'Login realizado com sucesso! (modo simulação)'
  });
});

app.post('/api/userbot/disconnect', (req, res) => {
  res.json({ success: true, message: 'Conta desconectada.' });
});

// ============================================================================
// ROTAS DE API - PRODUCTS
// ============================================================================

app.get('/api/products', (req, res) => {
  res.json({ success: true, products: [], count: 0 });
});

app.post('/api/products', (req, res) => {
  res.json({ success: true, message: 'Produto cadastrado (simulação).' });
});

app.put('/api/products/:id', (req, res) => {
  res.json({ success: true, message: 'Produto atualizado (simulação).' });
});

app.delete('/api/products/:id', (req, res) => {
  res.json({ success: true, message: 'Produto removido (simulação).' });
});

// ============================================================================
// ROTAS DE API - GROUPS
// ============================================================================

app.get('/api/groups', (req, res) => {
  res.json({ success: true, groups: [], count: 0 });
});

app.post('/api/groups', (req, res) => {
  res.json({ success: true, message: 'Grupo cadastrado (simulação).' });
});

app.put('/api/groups/:id', (req, res) => {
  res.json({ success: true, message: 'Grupo atualizado (simulação).' });
});

app.delete('/api/groups/:id', (req, res) => {
  res.json({ success: true, message: 'Grupo removido (simulação).' });
});

app.get('/api/groups/detect-chats', (req, res) => {
  res.json({ success: true, chats: [], message: 'Nenhum grupo detectado.' });
});

app.post('/api/groups/sync-all', (req, res) => {
  res.json({ success: true, message: 'Sincronização concluída (simulação).', results: [] });
});

app.post('/api/groups/check-all', (req, res) => {
  res.json({ success: true, message: 'Verificação concluída (simulação).', results: [], active: 0, deleted: 0, total: 0 });
});

app.post('/api/groups/:id/test-permissions', (req, res) => {
  res.json({ success: true, message: 'Permissões verificadas (simulação).' });
});

// ============================================================================
// ROTAS DE API - CAMPAIGNS
// ============================================================================

app.get('/api/campaigns', (req, res) => {
  res.json({ success: true, campaigns: [], count: 0 });
});

app.post('/api/campaigns', (req, res) => {
  res.json({ success: true, message: 'Campanha criada (simulação).' });
});

app.put('/api/campaigns/:id', (req, res) => {
  res.json({ success: true, message: 'Campanha atualizada (simulação).' });
});

app.delete('/api/campaigns/:id', (req, res) => {
  res.json({ success: true, message: 'Campanha removida (simulação).' });
});

app.post('/api/campaigns/:id/trigger', (req, res) => {
  res.json({ success: true, message: 'Disparo executado (simulação).' });
});

app.post('/api/campaigns/preview', (req, res) => {
  res.json({ success: true, preview: 'Pré-visualização (simulação).' });
});

// ============================================================================
// ROTAS DE API - PUBLICATIONS (HISTÓRICO)
// ============================================================================

app.get('/api/publications', (req, res) => {
  res.json({ success: true, publications: [], count: 0 });
});

app.post('/api/publications/:id/retry', (req, res) => {
  res.json({ success: true, message: 'Reenvio executado (simulação).' });
});

// ============================================================================
// ROTAS DE API - DASHBOARD (estrutura que o frontend espera)
// ============================================================================

app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      products: { total: 0, active: 0 },
      groups: { total: 0, authorized: 0, pending: 0 },
      campaigns: { active: 0 },
      publications: { published: 0, failed: 0, blocked: 0 },
      system: { emergency_pause_all: 'false' }
    },
    recentPublications: [],
    scheduler: {
      lastRun: null,
      isRunning: false
    },
    database: {
      type: 'local',
      connected: true
    }
  });
});

app.post('/api/dashboard/toggle-emergency', (req, res) => {
  res.json({ success: true, message: 'Status de emergência alterado (simulação).' });
});

app.post('/api/dashboard/trigger-run', (req, res) => {
  res.json({ success: true, message: 'Ciclo executado (simulação).' });
});

// ============================================================================
// ROTAS DE API - MANUAL POST
// ============================================================================

app.get('/api/manual-post/groups', (req, res) => {
  res.json({ success: true, groups: [] });
});

app.post('/api/manual-post/send', (req, res) => {
  res.json({
    success: true,
    message: 'Modo simulação: postagem registrada.',
    publication: { id: 'demo-' + Date.now(), status: 'published', created_at: new Date().toISOString() }
  });
});

// ============================================================================
// ROTA DE CRON
// ============================================================================

app.post('/api/cron', (req, res) => {
  res.json({
    success: false,
    message: 'Cron não configurado na versão serverless da Vercel.'
  });
});

// ============================================================================
// ARQUIVOS ESTÁTICOS DO FRONTEND
// ============================================================================

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'index.html não encontrado' });
  }
});

app.get('/css/:file', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'css', req.params.file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo CSS não encontrado' });
  }
});

app.get('/js/:file', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'js', req.params.file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo JS não encontrado' });
  }
});

app.get('/:page.html', (req, res) => {
  const pagePath = path.join(__dirname, '..', 'frontend', req.params.page + '.html');
  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.status(404).json({ error: 'Página não encontrada' });
  }
});

// 404 - sempre JSON
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada', success: false });
});

module.exports = app;
