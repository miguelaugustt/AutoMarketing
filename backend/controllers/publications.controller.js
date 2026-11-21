const db = require('../database/db');
const telegramIntegration = require('../integrations/telegram.integration');
const metaIntegration = require('../integrations/meta.integration');

class PublicationsController {
  async list(req, res, next) {
    try {
      const { status, groupId, productId, campaignId, limit } = req.query;
      const publications = await db.getPublications({
        status,
        groupId,
        productId,
        campaignId,
        limit: limit || 100
      });

      return res.json({
        success: true,
        count: publications.length,
        publications
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const pubs = await db.getPublications();
      const pub = pubs.find(p => p.id === req.params.id);
      if (!pub) {
        return res.status(404).json({ success: false, error: 'Registro de publicação não encontrado.' });
      }
      return res.json({ success: true, publication: pub });
    } catch (error) {
      next(error);
    }
  }

  async retry(req, res, next) {
    try {
      const { id } = req.params;
      const pubs = await db.getPublications();
      const pub = pubs.find(p => p.id === id);
      if (!pub) {
        return res.status(404).json({ success: false, error: 'Publicação não encontrada.' });
      }

      const group = await db.getGroupById(pub.group_id);
      if (!group) {
        return res.status(400).json({ success: false, error: 'Grupo associado não encontrado.' });
      }

      let dispatchResult;
      if (group.platform.toLowerCase() === 'telegram') {
        const customToken = await db.getSetting('telegram_bot_token');
        dispatchResult = await telegramIntegration.sendMessage(
          group.external_group_id,
          pub.message,
          { parse_mode: 'Markdown' },
          customToken
        );
      } else if (group.platform.toLowerCase() === 'meta' || group.platform.toLowerCase() === 'facebook') {
        dispatchResult = await metaIntegration.publishToPage(group.external_group_id, pub.message);
      } else {
        dispatchResult = { success: false, error: 'Plataforma não suportada.' };
      }

      if (dispatchResult.success) {
        const now = new Date().toISOString();
        await db.updatePublication(id, {
          status: 'published',
          published_at: now,
          error_message: null
        });
        await db.updateGroupLastPublication(group.id, now);

        return res.json({
          success: true,
          message: 'Publicação reenviada com sucesso!'
        });
      } else {
        await db.updatePublication(id, {
          error_message: dispatchResult.error
        });
        return res.status(400).json({
          success: false,
          error: `Falha na reiteração: ${dispatchResult.error}`
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      await db.updatePublication(id, { status: 'canceled' });
      return res.json({
        success: true,
        message: 'Publicação cancelada com sucesso.'
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await db.deletePublication(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Publicação não encontrada.' });
      }
      return res.json({
        success: true,
        message: 'Publicação excluída com sucesso.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PublicationsController();
