const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');

// Importação das rotas
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const productsRoutes = require('./routes/products.routes');
const groupsRoutes = require('./routes/groups.routes');
const campaignsRoutes = require('./routes/campaigns.routes');
const publicationsRoutes = require('./routes/publications.routes');
const settingsRoutes = require('./routes/settings.routes');
const prospectorRoutes = require('./routes/prospector.routes');

// Importação de middlewares e serviços
const errorHandler = require('./middleware/errorHandler');
const cronScheduler = require('./scheduler/cronScheduler');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Middlewares Globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Registro das Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/publications', publicationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/prospector', prospectorRoutes);

// Endpoint de verificação de integridade (Health Check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '1.0.0',
    app: 'AUT0MARKETING',
    timestamp: new Date().toISOString(),
    database: db.getConnectionInfo()
  });
});

// Redirecionamento amigável para rotas estáticas
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Middleware Central de Erros
app.use(errorHandler);

// Inicialização do Servidor
const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log('  🚀 AUT0MARKETING - Plataforma de Automação de Marketing');
  console.log(`  🌐 Servidor em execução em: http://localhost:${PORT}`);
  console.log(`  📊 Painel Administrativo:  http://localhost:${PORT}/dashboard.html`);
  console.log(`  🔑 Credenciais Padrão:     admin / admin123`);
  console.log(`  💾 Banco de Dados:         ${db.getConnectionInfo().type}`);
  console.log('================================================================');

  // Inicializa o motor agendador de tarefas
  cronScheduler.start();
});

// Tratamento de encerramento gracioso
const shutdown = () => {
  console.log('\n[Servidor] Encerrando processos com segurança...');
  cronScheduler.stop();
  server.close(() => {
    console.log('[Servidor] Encerrado com sucesso.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
