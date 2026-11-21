const path = require('path');
const db = require('../database/db');
const telegramIntegration = require('../integrations/telegram.integration');
const metaIntegration = require('../integrations/meta.integration');
const userbotService = require('../services/userbot.service');

class ManualPostController {
  async listGroupsForManualPost(req, res, next) {
    try {
      const groups = await db.getGroups({});
      // Retorna apenas dados necessários para seleção manual
      const groupsForSelection = groups.map(g => ({
        id: g.id,
        name: g.name,
        platform: g.platform,
        external_group_id: g.external_group_id,
        authorization_status: g.authorization_status,
        advertising_permission: g.advertising_permission,
        automation_permission: g.automation_permission,
        active: g.active,
        last_publication_at: g.last_publication_at
      }));

      return res.json({
        success: true,
        groups: groupsForSelection
      });
    } catch (error) {
      next(error);
    }
  }

  async sendManualPost(req, res, next) {
    try {
      const { group_id, message, image_url, video_url, scheduled_at, send_now } = req.body;

      if (!group_id || !message) {
        return res.status(400).json({
          success: false,
          error: 'Grupo e mensagem são obrigatórios.'
        });
      }

      const group = await db.getGroupById(group_id);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo não encontrado.'
        });
      }

      // Processar arquivos enviados (imagem e vídeo)
      let finalImageUrl = image_url || null;
      let finalVideoUrl = video_url || null;

      if (req.files) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        if (req.files.image_file && req.files.image_file[0]) {
          finalImageUrl = `${baseUrl}/uploads/${req.files.image_file[0].filename}`;
        }
        if (req.files.video_file && req.files.video_file[0]) {
          finalVideoUrl = `${baseUrl}/uploads/${req.files.video_file[0].filename}`;
        }
      }

      // Determinar horário de publicação
      let publicationStatus = 'scheduled';
      let scheduledAt = scheduled_at || new Date().toISOString();

      if (send_now) {
        publicationStatus = 'published';
        scheduledAt = new Date().toISOString();
      }

      // Registrar publicação no banco
      const pub = await db.createPublication({
        campaign_id: null,
        product_id: null,
        group_id: group.id,
        message: message,
        image_url: finalImageUrl,
        video_url: finalVideoUrl,
        status: publicationStatus,
        scheduled_at: scheduledAt,
        published_at: publicationStatus === 'published' ? new Date().toISOString() : null
      });

      // Tentar envio imediato se solicitado
      let dispatchResult = { success: true, simulated: true };
      if (send_now) {
        const customToken = await db.getSetting('telegram_bot_token');
        const userbotConnected = userbotService.isConnected;
        const simulationMode = process.env.SIMULATION_MODE === 'true';

        if (!customToken && !userbotConnected && !simulationMode) {
          return res.status(500).json({
            success: false,
            error: 'Nenhum meio de envio configurado. Configure o Token do Bot do Telegram em "Configurações & API" ou conecte sua conta via Userbot para enviar mensagens.'
          });
        }

        if (group.platform.toLowerCase() === 'telegram') {
          if (customToken) {
            dispatchResult = await telegramIntegration.sendMessage(
              group.external_group_id,
              message,
              { parse_mode: 'Markdown' },
              customToken,
              finalImageUrl,
              finalVideoUrl
            );
          } else if (userbotConnected) {
            // Usar userbot como meio de envio real quando não há token do bot
            try {
              const userbotResult = await userbotService.sendMessage(
                group.external_group_id,
                message
              );
              dispatchResult = {
                success: userbotResult.success,
                simulated: false,
                message: userbotResult.success ? 'Mensagem enviada via Userbot.' : userbotResult.error,
                messageId: userbotResult.messageId,
                chatId: group.external_group_id
              };
            } catch (err) {
              dispatchResult = { success: false, simulated: false, error: err.message };
            }
          } else if (simulationMode) {
            dispatchResult = { success: true, simulated: true, message: 'Modo simulação (sem token configurado)' };
          } else {
            dispatchResult = { success: false, error: 'Nenhum meio de envio disponível para Telegram.' };
          }
        } else if (group.platform.toLowerCase() === 'meta' || group.platform.toLowerCase() === 'facebook') {
          dispatchResult = await metaIntegration.publishToPage(
            group.external_group_id,
            message,
            null,
            finalImageUrl,
            finalVideoUrl
          );
        } else {
          dispatchResult = { success: false, error: `Plataforma "${group.platform}" não suporta envio direto.` };
        }

        if (dispatchResult.success) {
          await db.updateGroupLastPublication(group.id, new Date().toISOString());
          await db.updatePublication(pub.id, {
            status: 'published',
            published_at: new Date().toISOString(),
            error_message: null
          });
        } else {
          await db.updatePublication(pub.id, {
            status: 'failed',
            error_message: dispatchResult.error
          });
        }
      }

      // Atualizar status final da publicação
      if (send_now && dispatchResult.success) {
        await db.updatePublication(pub.id, {
          status: 'published',
          published_at: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        message: send_now
          ? dispatchResult.success
            ? 'Mensagem enviada com sucesso!'
            : 'Mensagem agendada com erro de envio.'
          : 'Mensagem agendada com sucesso.',
        publication: pub,
        dispatchResult: send_now ? dispatchResult : null
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ManualPostController();
