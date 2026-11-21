const userbotService = require('../services/userbot.service');
const db = require('../database/db');

class UserbotController {
  async getStatus(req, res, next) {
    try {
      const status = await userbotService.getStatus();
      return res.json({ success: true, ...status });
    } catch (error) {
      next(error);
    }
  }

  async sendCode(req, res, next) {
    try {
      const { apiId, apiHash, phone } = req.body;
      const result = await userbotService.sendLoginCode(apiId, apiHash, phone);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async signIn(req, res, next) {
    try {
      const { code, password } = req.body;
      const result = await userbotService.signInWithCode(code, password);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async disconnect(req, res, next) {
    try {
      const result = await userbotService.disconnect();
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async joinGroup(req, res, next) {
    try {
      const { inviteLink } = req.body;
      const result = await userbotService.autoJoinGroup(inviteLink);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async testLogin(req, res, next) {
    try {
      const status = await userbotService.getStatus();
      if (!status.connected) {
        return res.status(400).json({ success: false, error: 'Userbot não está conectado.' });
      }

      const groupName = 'Confirmador de Login - Teste';
      const created = await db.createGroup({
        name: groupName,
        platform: 'Telegram',
        external_group_id: `@teste_${Date.now()}`,
        invite_url: `https://t.me/teste_${Date.now()}`,
        authorization_status: 'authorized',
        advertising_permission: true,
        automation_permission: true,
        active: true
      });

      // Agenda exclusão após 1 minuto
      setTimeout(async () => {
        try {
          await db.deleteGroup(created.id);
          console.log(`[Teste Userbot] Grupo "${groupName}" removido após 1 minuto.`);
        } catch (e) {
          console.error(`[Teste Userbot] Erro ao remover grupo de teste:`, e.message);
        }
      }, 60000);

      return res.json({
        success: true,
        message: `Grupo de teste "${groupName}" criado. Será removido automaticamente em 1 minuto.`,
        group: created
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserbotController();
