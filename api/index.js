/**
 * AUT0MARKETING - Vercel Serverless Function Entry Point
 * Versão completa com rotas de API e resposta sempre em JSON
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

// Middleware para garantir que TODA resposta de erro seja JSON
app.use((err, req, res, next) => {
  console.error('ERRO:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    success: false
  });
});

// ============================================================================
// ROTAS DE API
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '1.0.0',
    app: 'AUT0MARKETING',
    environment: 'vercel-serverless',
    timestamp: new Date().toISOString()
  });
});

// Login
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

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logout realizado.' });
});

// Grupos
app.get('/api/groups', (req, res) => {
  res.json({
    success: true,
    groups: [],
    count: 0
  });
});

// Campanhas
app.get('/api/campaigns', (req, res) => {
  res.json({
    success: true,
    campaigns: [],
    count: 0
  });
});

// Produtos
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    products: [],
    count: 0
  });
});

// Configurações
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    settings: {
      simulation_mode: 'false',
      telegram_bot_token: '',
      admin_password_hash: ''
    }
  });
});

// Histórico
app.get('/api/history', (req, res) => {
  res.json({
    success: true,
    publications: [],
    count: 0
  });
});

// Postagem manual - listar grupos
app.get('/api/manual-post/groups', (req, res) => {
  res.json({
    success: true,
    groups: []
  });
});

// Postagem manual - enviar
app.post('/api/manual-post/send', (req, res) => {
  res.json({
    success: true,
    message: 'Modo simulação: postagem registrada (servidor serverless).',
    publication: {
      id: 'demo-' + Date.now(),
      status: 'published',
      created_at: new Date().toISOString()
    }
  });
});

// Cron placeholder
app.post('/api/cron', (req, res) => {
  res.json({
    success: false,
    message: 'Cron não configurado na versão serverless da Vercel (plano Hobby permite apenas 1x/dia).'
  });
});

// ============================================================================
// ARQUIVOS ESTÁTICOS DO FRONTEND
// ============================================================================

// Página principal
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'index.html não encontrado' });
  }
});

// CSS
app.get('/css/:file', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'css', req.params.file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo CSS não encontrado' });
  }
});

// JS
app.get('/js/:file', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'js', req.params.file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo JS não encontrado' });
  }
});

// Páginas HTML do frontend
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
