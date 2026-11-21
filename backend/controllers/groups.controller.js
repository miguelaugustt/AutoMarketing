const db = require('../database/db');
const telegramIntegration = require('../integrations/telegram.integration');
const userbotService = require('../services/userbot.service');

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
        active
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Nome do grupo é obrigatório.' });
      }

      if (!external_group_id || !external_group_id.trim()) {
        return res.status(400).json({ success: false, error: 'ID Externo do grupo (ex: -100...) é obrigatório para validação automática.' });
      }

      const plat = platform ? platform.trim() : 'Telegram';
      const extId = external_group_id.trim();

      // Verificação AUTOMÁTICA de permissões com o Telegram (opcional - requer token configurado)
      let autoAuthStatus = 'pending';
      let autoAdvPerm = false;
      let autoAutoPerm = false;
      let verificationMessage = 'Verificação pendente. Configure o token do Telegram para validação automática.';

      if (plat.toLowerCase() === 'telegram') {
        const customToken = await db.getSetting('telegram_bot_token');
        if (customToken) {
          const checkResult = await telegramIntegration.checkGroupAccess(extId, customToken);

          autoAuthStatus = checkResult.authorization_status || 'pending';
          autoAdvPerm = Boolean(checkResult.advertising_permission);
          autoAutoPerm = Boolean(checkResult.automation_permission);
          verificationMessage = checkResult.message || checkResult.error || 'Verificado via Telegram.';
        } else if (userbotService.isConnected) {
          // Usar Userbot (conta do usuário logada) para validação automática
          autoAuthStatus = 'authorized';
          autoAdvPerm = true;
          autoAutoPerm = true;
          verificationMessage = 'Grupo autorizado automaticamente via Userbot (conta do usuário conectada no Telegram).';
        } else {
          verificationMessage = 'Cadastro concluído. Grupo aguardando validação.';
        }
      } else {
        // Meta ou outras plataformas
        autoAuthStatus = 'pending';
        autoAdvPerm = false;
        autoAutoPerm = false;
      }

      const group = await db.createGroup({
        name: name.trim(),
        invite_url: invite_url ? invite_url.trim() : '',
        platform: plat,
        external_group_id: extId,
        authorization_status: autoAuthStatus,
        advertising_permission: autoAdvPerm,
        automation_permission: autoAutoPerm,
        active: active !== undefined ? Boolean(active) : true
      });

      return res.status(201).json({
        success: true,
        message: `Grupo cadastrado! Status determinado automaticamente: ${autoAuthStatus}.`,
        verificationMessage,
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

      // Se o ID externo mudou ou foi solicitada re-validação automática
      if (updates.external_group_id && updates.external_group_id !== existing.external_group_id) {
        const customToken = await db.getSetting('telegram_bot_token');
        if (customToken) {
          const checkResult = await telegramIntegration.checkGroupAccess(updates.external_group_id, customToken);
          updates.authorization_status = checkResult.authorization_status || existing.authorization_status;
          updates.advertising_permission = Boolean(checkResult.advertising_permission);
          updates.automation_permission = Boolean(checkResult.automation_permission);
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
   * Testa e atualiza AUTOMATICAMENTE a permissão real do Bot no grupo via Telegram API
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
      if (!customToken) {
        if (userbotService.isConnected) {
          // Usar Userbot (conta do usuário logada) para validação automática
          const updatedGroup = await db.updateGroup(group.id, {
            authorization_status: 'authorized',
            advertising_permission: true,
            automation_permission: true,
            active: true
          });

          return res.json({
            success: true,
            message: 'Grupo autorizado automaticamente via Userbot (conta do usuário conectada no Telegram).',
            group: updatedGroup
          });
        }

        return res.json({
          success: true,
          message: 'Token do Telegram não configurado. Grupo mantido como pendente.',
          group: group
        });
      }

      const testResult = await telegramIntegration.checkGroupAccess(group.external_group_id, customToken);

      // Atualiza automaticamente o registro no banco com os dados reais retornados
      const updatedGroup = await db.updateGroup(group.id, {
        authorization_status: testResult.authorization_status,
        advertising_permission: testResult.advertising_permission,
        automation_permission: testResult.automation_permission,
        active: testResult.canPost
      });

      return res.json({
        success: testResult.success,
        message: testResult.message || testResult.error,
        group: updatedGroup,
        details: testResult
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sincroniza em lote as permissões de TODOS os grupos cadastrados com a API do Telegram
   */
  async syncAllPermissions(req, res, next) {
    try {
      const groups = await db.getGroups();
      const customToken = await db.getSetting('telegram_bot_token');
      if (!customToken && !userbotService.isConnected) {
        return res.json({
          success: true,
          message: 'Token do Telegram não configurado. Nenhuma sincronização automática realizada.',
          results: []
        });
      }
      const results = [];

      for (const group of groups) {
        if (group.platform.toLowerCase() === 'telegram' && group.external_group_id) {
          if (customToken) {
            const testResult = await telegramIntegration.checkGroupAccess(group.external_group_id, customToken);
            const updated = await db.updateGroup(group.id, {
              authorization_status: testResult.authorization_status,
              advertising_permission: testResult.advertising_permission,
              automation_permission: testResult.automation_permission,
              active: testResult.canPost
            });
            results.push({
              id: group.id,
              name: group.name,
              status: testResult.authorization_status,
              canPost: testResult.canPost,
              message: testResult.message || testResult.error
            });
          } else if (userbotService.isConnected) {
            const updated = await db.updateGroup(group.id, {
              authorization_status: 'authorized',
              advertising_permission: true,
              automation_permission: true,
              active: true
            });
            results.push({
              id: group.id,
              name: group.name,
              status: 'authorized',
              canPost: true,
              message: 'Autorizado via Userbot (conta do usuário conectada no Telegram).'
            });
          }
        }
      }

      return res.json({
        success: true,
        message: `Sincronização concluída para ${results.length} grupos.`,
        results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifica em lote se TODOS os grupos cadastrados ainda existem e estão ativos no Telegram
   * Detecta grupos deletados, banidos ou onde o bot foi removido
   */
  async checkAllGroupsActive(req, res, next) {
    try {
      const groups = await db.getGroups();
      const customToken = await db.getSetting('telegram_bot_token');
      const results = [];
      let deletedCount = 0;
      let activeCount = 0;

      for (const group of groups) {
        if (group.platform.toLowerCase() !== 'telegram' || !group.external_group_id) {
          continue;
        }

        let isActive = false;
        let isDeleted = false;
        let statusMessage = '';

        if (customToken) {
          const checkResult = await telegramIntegration.checkGroupAccess(group.external_group_id, customToken);
          isDeleted = !checkResult.success || checkResult.authorization_status === 'unavailable';
          isActive = checkResult.canPost === true && !isDeleted;
          statusMessage = checkResult.message || checkResult.error || (isActive ? 'Ativo' : 'Inativo');
        } else if (userbotService.isConnected) {
          // Usar Userbot (conta do usuário conectada) para verificar se o grupo ainda existe
          try {
            // Remove '@' do início se houver (Telegram aceita username com ou sem @)
            const cleanExtId = group.external_group_id.replace(/^@/, '');
            const checkResult = await userbotService.checkGroupExists(cleanExtId);
            isDeleted = !checkResult.exists;
            isActive = checkResult.exists && checkResult.canPost;
            if (checkResult.exists && checkResult.canPost) {
              statusMessage = `Ativo (verificado via Userbot: ${checkResult.title || cleanExtId})`;
            } else if (checkResult.exists && !checkResult.canPost) {
              statusMessage = `Não é membro deste grupo (não foi possível verificar se existe)`;
            } else {
              statusMessage = `Não encontrado/deletado no Telegram: ${checkResult.error}`;
            }
          } catch (err) {
            isDeleted = false;
            isActive = false;
            statusMessage = `Não verificável via Userbot: ${err.message}`;
          }
        } else {
          isActive = false;
          isDeleted = false;
          statusMessage = 'Não verificável (Token do Telegram não configurado)';
        }

        if (isDeleted) deletedCount++;
        if (isActive) activeCount++;

        // Atualiza o registro no banco se o grupo foi deletado ou inativado
        if (isDeleted && group.active) {
          await db.updateGroup(group.id, {
            active: false,
            authorization_status: 'blocked',
            advertising_permission: false,
            automation_permission: false
          });
        }

        results.push({
          id: group.id,
          name: group.name,
          external_group_id: group.external_group_id,
          platform: group.platform,
          isActive,
          isDeleted,
          previouslyActive: group.active,
          message: statusMessage
        });
      }

      return res.json({
        success: true,
        message: `Verificação concluída: ${activeCount} ativo(s), ${deletedCount} deletado(s)/inativo(s) de ${results.length} grupo(s).`,
        total: results.length,
        active: activeCount,
        deleted: deletedCount,
        results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detecta grupos e canais onde o bot foi adicionado recentemente
   */
  async detectRecentChats(req, res, next) {
    try {
      const customToken = await db.getSetting('telegram_bot_token');
      const result = await telegramIntegration.getRecentChats(customToken);
      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new GroupsController();
