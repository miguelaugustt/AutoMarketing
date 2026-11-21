/**
 * AUT0MARKETING - Vercel Serverless Function
 * Versão mínima para funcionar no servidor serverless
 */

const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', app: 'AUT0MARKETING', version: '1.0.0' });
});

// Página principal
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  res.sendFile(indexPath);
});

// Arquivos estáticos (CSS, JS, imagens)
app.get('/css/:file', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'css', req.params.file);
  res.sendFile(filePath);
});

app.get('/js/:file', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', 'js', req.params.file);
  res.sendFile(filePath);
});

// Páginas HTML do frontend
app.get('/:page.html', (req, res) => {
  const pagePath = path.join(__dirname, '..', 'frontend', req.params.page + '.html');
  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.status(404).send('Página não encontrada');
  }
});

// Cron placeholder
app.post('/api/cron', (req, res) => {
  res.json({ success: false, message: 'Cron não configurado na versão serverless' });
});

// Erro 404
app.use((req, res) => {
  res.status(404).send('Rota não encontrada');
});

// Erro 500 com detalhes
app.use((err, req, res, next) => {
  console.error('ERRO:', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

module.exports = app;
