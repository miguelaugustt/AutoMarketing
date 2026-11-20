const db = require('../database/db');
const telegramIntegration = require('../integrations/telegram.integration');

class GroupsController {
  async list(req, res, next) {
    try {
      const { authorizedOnly, platform, search } = req.query;
      const groups = await db.getGroups({
        authorizedOnly: authorizedOnly === 'true',
        platform,
        search
      });

      return res.json({
        success: true,
        count: groups.length,
        groups
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const group = await db.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ success: false, error: 'Grupo não encontrado.' });
      }
      return res.json({ success: true, group });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const {
        name,
        invite_url,
        platform,
        external_group_id,
        authorization_status,
        advertising_permission,
        automation_permission,
        active
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Nome do grupo é obrigatório.' });
      }

      const validStatuses = ['pending', 'authorized', 'unauthorized', 'blocked', 'unavailable'];
      const status = validStatuses.includes(authorization_status) ? authorization_status : 'pending';

      const group = await db.createGroup({
        name: name.trim(),
        invite_url: invite_url ? invite_url.trim() : '',
        platform: platform ? platform.trim() : 'Telegram',
        external_group_id: external_group_id ? external_group_id.trim() : '',
        authorization_status: status,
        advertising_permission: Boolean(advertising_permission),
        automation_permission: Boolean(automation_permission),
        active: active !== undefined ? Boolean(active) : true
      });

      return res.status(201).json({
        success: true,
        message: 'Grupo cadastrado com sucesso.',
        group
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await db.getGroupById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Grupo não encontrado.' });
      }

      if (updates.authorization_status) {
        const validStatuses = ['pending', 'authorized', 'unauthorized', 'blocked', 'unavailable'];
        if (!validStatuses.includes(updates.authorization_status)) {
          return res.status(400).json({ success: false, error: 'Status de autorização inválido.' });
        }
      }

      const updated = await db.updateGroup(id, updates);
      return res.json({
        success: true,
        message: 'Grupo atualizado com sucesso.',
        group: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await db.getGroupById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Grupo não encontrado.' });
      }

      await db.deleteGroup(id);
      return res.json({
        success: true,
        message: 'Grupo removido com sucesso.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Testa e verifica a permissão real do Bot no grupo via Telegram API
   */
  async testPermissions(req, res, next) {
    try {
      const { id } = req.params;
      const group = await db.getGroupById(id);
      if (!group) {
        return res.status(404).json({ success: false, error: 'Grupo não encontrado.' });
      }

      if (!group.external_group_id) {
        return res.status(400).json({
          success: false,
          error: 'ID Externo do grupo (ex: -100...) não está configurado para este registro.'
        });
      }

      const customToken = await db.getSetting('telegram_bot_token');
      const testResult = await telegramIntegration.checkGroupAccess(group.external_group_id, customToken);

      if (testResult.success) {
        return res.json({
          success: true,
          message: testResult.simulated
            ? 'Acesso verificado (Modo Simulação ou sem token cadastrado).'
            : 'Permissões verificadas com sucesso no Telegram!',
          details: testResult
        });
      } else {
        return res.status(400).json({
          success: false,
          error: testResult.error
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GroupsController();
