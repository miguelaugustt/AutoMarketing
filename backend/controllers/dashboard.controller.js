const db = require('../database/db');
const cronScheduler = require('../scheduler/cronScheduler');
const distributionService = require('../services/distribution.service');

class DashboardController {
  async getStats(req, res, next) {
    try {
      const stats = await db.getDashboardStats();
      const recentPublications = await db.getPublications({ limit: 10 });
      const schedulerStatus = cronScheduler.getStatus();

      return res.json({
        success: true,
        stats,
        recentPublications,
        scheduler: schedulerStatus,
        database: db.getConnectionInfo()
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleEmergencyPause(req, res, next) {
    try {
      const current = await db.getSetting('emergency_pause_all', 'false');
      const newState = current === 'true' ? 'false' : 'true';
      await db.setSetting('emergency_pause_all', newState);

      return res.json({
        success: true,
        emergency_pause_all: newState === 'true',
        message: newState === 'true'
          ? 'ALERTA: Interrupção geral ativada! Todas as publicações e campanhas foram pausadas.'
          : 'Sistema reativado com sucesso. Campanhas autorizadas voltarão a operar.'
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerManualRun(req, res, next) {
    try {
      const isPaused = (await db.getSetting('emergency_pause_all', 'false')) === 'true';
      if (isPaused) {
        return res.status(400).json({
          success: false,
          error: 'Não é possível disparar: o sistema está em Interrupção Geral. Desative o Kill Switch primeiro.'
        });
      }

      const results = await distributionService.runGlobalCycle();

      return res.json({
        success: true,
        message: 'Ciclo de distribuição executado com sucesso.',
        results
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
