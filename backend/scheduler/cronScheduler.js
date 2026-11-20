const cron = require('node-cron');
const distributionService = require('../services/distribution.service');

class CronScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
    this.cronExpression = process.env.SCHEDULER_CRON || '*/30 * * * *'; // A cada 30 minutos por padrão
  }

  /**
   * Inicia o agendador de tarefas
   */
  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Agendador já está em execução.');
      return;
    }

    console.log(`[Scheduler] Iniciando agendador cron com expressão: "${this.cronExpression}"`);

    this.task = cron.schedule(this.cronExpression, async () => {
      console.log(`[Scheduler] Disparando ciclo agendado em: ${new Date().toISOString()}`);
      this.lastRun = new Date().toISOString();
      try {
        await distributionService.runGlobalCycle();
      } catch (err) {
        console.error('[Scheduler] Erro durante ciclo agendado:', err.message);
      }
    });

    this.isRunning = true;
  }

  /**
   * Para o agendador
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.isRunning = false;
      console.log('[Scheduler] Agendador interrompido.');
    }
  }

  /**
   * Dispara um ciclo manual imediatamente
   */
  async triggerNow() {
    console.log('[Scheduler] Disparo manual solicitado.');
    this.lastRun = new Date().toISOString();
    return await distributionService.runGlobalCycle();
  }

  /**
   * Retorna o status operacional do agendador
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: this.cronExpression,
      lastRun: this.lastRun
    };
  }
}

module.exports = new CronScheduler();
