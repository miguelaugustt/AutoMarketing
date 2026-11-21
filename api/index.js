/**
 * AUT0MARKETING - Vercel Serverless Function Entry Point
 * 
 * Este arquivo exporta o app Express como uma função serverless compatível com a Vercel.
 * O server.js já exporta o app com `module.exports = app`, então basta importá-lo aqui.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = require('../backend/server');

// Na Vercel, não iniciamos o servidor com app.listen()
// O Vercel gerencia o servidor e chama esta função para cada requisição
module.exports = app;
