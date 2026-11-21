/**
 * AUT0MARKETING - Vercel Serverless Function Entry Point
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let app;

try {
  app = require('../backend/server');
} catch (err) {
  // Criar um app Express mínimo para retornar erro detalhado
  const express = require('express');
  app = express();
  app.use(express.json());
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'Falha ao carregar o servidor backend',
      details: err.message,
      stack: err.stack
    });
  });
}

module.exports = app;
