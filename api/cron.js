/**
 * AUT0MARKETING - Cron Job Endpoint para Vercel
 * 
 * Este endpoint é chamado pelo Vercel Cron (ou serviço externo de cron)
 * para processar campanhas agendadas.
 * 
 * Segurança: requer header Authorization: Bearer <CRON_SECRET>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../backend/database/db');
const distributionService = require('../backend/services/distribution.service');

module.exports = async (req, res) => {
  // Apenas permitir requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // Verificar token de segurança
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET não configurado no servidor.' });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Não autorizado. Token inválido.' });
  }

  try {
    // Buscar campanhas ativas
    const activeCampaigns = await db.getCampaigns({ status: 'active' });

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma campanha ativa encontrada.',
        processed: 0
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const campaign of activeCampaigns) {
      try {
        await distributionService.processCampaign(campaign.id);
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: 'processed'
        });
        successCount++;
      } catch (err) {
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: 'error',
          error: err.message
        });
        errorCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processamento concluído: ${successCount} sucesso(s), ${errorCount} erro(s).`,
      processed: successCount + errorCount,
      success: successCount,
      errors: errorCount,
      campaigns: results
    });
  } catch (error) {
    console.error('[Cron] Erro ao processar campanhas:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao processar campanhas.'
    });
  }
};
