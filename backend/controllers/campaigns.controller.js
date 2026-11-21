const db = require('../database/db');
const distributionService = require('../services/distribution.service');
const adVariationService = require('../services/adVariation.service');

class CampaignsController {
  async list(req, res, next) {
    try {
      const { status } = req.query;
      const campaigns = await db.getCampaigns({ status });

      return res.json({
        success: true,
        count: campaigns.length,
        campaigns
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const campaign = await db.getCampaignById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campanha não encontrada.' });
      }
      return res.json({ success: true, campaign });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { name, product_id, message_template, frequency_hours, status, start_at } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Nome da campanha é obrigatório.' });
      }
      if (!message_template || !message_template.trim()) {
        return res.status(400).json({ success: false, error: 'Modelo de mensagem (template) é obrigatório.' });
      }

      const campaign = await db.createCampaign({
        name: name.trim(),
        product_id: product_id || null, // null = Rotação Inteligente Aleatória
        message_template: message_template.trim(),
        frequency_hours: parseInt(frequency_hours, 10) || 24,
        status: status || 'active',
        start_at: start_at || new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Campanha criada com sucesso.',
        campaign
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await db.getCampaignById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Campanha não encontrada.' });
      }

      const updated = await db.updateCampaign(id, updates);
      return res.json({
        success: true,
        message: 'Campanha atualizada com sucesso.',
        campaign: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await db.getCampaignById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Campanha não encontrada.' });
      }

      const newStatus = existing.status === 'active' ? 'paused' : 'active';
      const updated = await db.updateCampaign(id, { status: newStatus });

      return res.json({
        success: true,
        message: `Campanha alterada para ${newStatus}.`,
        campaign: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await db.getCampaignById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Campanha não encontrada.' });
      }

      await db.deleteCampaign(id);
      return res.json({
        success: true,
        message: 'Campanha removida com sucesso.'
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerRun(req, res, next) {
    try {
      const { id } = req.params;
      const { ignoreInterval, force, image_url, video_url } = req.body;

      const result = await distributionService.processCampaign(id, {
        ignoreInterval: Boolean(ignoreInterval),
        force: Boolean(force),
        image_url: image_url || null,
        video_url: video_url || null
      });

      return res.json({
        success: true,
        message: 'Disparo manual da campanha executado.',
        result
      });
    } catch (error) {
      next(error);
    }
  }

  async previewTemplate(req, res, next) {
    try {
      const { message_template, product_id } = req.body;
      let product = null;

      if (product_id) {
        product = await db.getProductById(product_id);
      } else {
        const products = await db.getProducts({ activeOnly: true });
        product = products[0] || {
          name: 'Produto Exemplo',
          description: 'Descrição de alta qualidade',
          affiliate_url: 'https://kiwify.app/exemplo?af=123',
          category: 'Marketing',
          platform: 'Kiwify',
          promotional_text: 'Oferta especial de lançamento'
        };
      }

      const previews = adVariationService.generatePreviews(message_template, product, 3);
      return res.json({
        success: true,
        previews,
        sampleProduct: product
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CampaignsController();
