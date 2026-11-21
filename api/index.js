/**
 * AUT0MARKETING - Vercel Serverless Function Entry Point
 * Versão simplificada para funcionar no ambiente serverless da Vercel
 */

const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
app.use(express.json());

// Middleware de CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

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

// Servir arquivo index.html para a rota raiz
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'index.html não encontrado' });
  }
});

// Servir arquivos estáticos do frontend (HTML, CSS, JS, imagens)
app.get('/(.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))', (req, res) => {
  const filePath = path.join(__dirname, '..', 'frontend', req.params[0]);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado: ' + req.params[0] });
  }
});

// Servir outras rotas do frontend (páginas HTML) - deve vir DEPOIS das rotas da API
app.get('/:page(.*)', (req, res) => {
  // Se já foi tratada por uma rota anterior, não entra aqui
  if (res.headersSent) return;
  
  const pagePath = path.join(__dirname, '..', 'frontend', req.params.page);
  if (fs.existsSync(pagePath)) {
    res.sendFile(pagePath);
  } else {
    res.status(404).json({ error: 'Página não encontrada: ' + req.params.page });
  }
});

// Endpoint de cron (placeholder)
app.post('/api/cron', (req, res) => {
  res.json({ success: false, message: 'Cron não configurado na versão serverless' });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

module.exports = app;
