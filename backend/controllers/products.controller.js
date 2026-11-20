const db = require('../database/db');

class ProductsController {
  async list(req, res, next) {
    try {
      const { activeOnly, category, platform, search } = req.query;
      const products = await db.getProducts({
        activeOnly: activeOnly === 'true',
        category,
        platform,
        search
      });

      return res.json({
        success: true,
        count: products.length,
        products
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await db.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
      }
      return res.json({ success: true, product });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { name, description, affiliate_url, category, platform, promotional_text, active } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Nome do produto é obrigatório.' });
      }
      if (!affiliate_url || !affiliate_url.trim()) {
        return res.status(400).json({ success: false, error: 'Link de afiliado é obrigatório.' });
      }

      const product = await db.createProduct({
        name: name.trim(),
        description: description ? description.trim() : '',
        affiliate_url: affiliate_url.trim(),
        category: category ? category.trim() : 'Geral',
        platform: platform ? platform.trim() : 'Kiwify',
        promotional_text: promotional_text ? promotional_text.trim() : '',
        active: active !== undefined ? Boolean(active) : true
      });

      return res.status(201).json({
        success: true,
        message: 'Produto cadastrado com sucesso.',
        product
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await db.getProductById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
      }

      const updated = await db.updateProduct(id, updates);
      return res.json({
        success: true,
        message: 'Produto atualizado com sucesso.',
        product: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await db.getProductById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
      }

      const updated = await db.updateProduct(id, { active: !existing.active });
      return res.json({
        success: true,
        message: `Produto ${updated.active ? 'ativado' : 'desativado'} com sucesso.`,
        product: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const existing = await db.getProductById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
      }

      await db.deleteProduct(id);
      return res.json({
        success: true,
        message: 'Produto removido com sucesso.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductsController();
