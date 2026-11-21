const db = require('../database/db');
const securityService = require('./security.service');
const adVariationService = require('./adVariation.service');
const telegramIntegration = require('../integrations/telegram.integration');
const metaIntegration = require('../integrations/meta.integration');
const userbotService = require('./userbot.service');

/**
 * Motor de Distribuição Automatizada
 * Responsável pelo ciclo de seleção, validação e entrega de anúncios.
 */
class DistributionService {
  /**
   * Algoritmo de Seleção Inteligente e Aleatória de Produtos para um Grupo
   * Atende aos requisitos da Seção 5.2:
   * - Evita repetir o último produto enviado para o grupo.
   * - Evita repetições excessivas usando histórico recente.
   * - Considera apenas produtos ativos e válidos.
   */
  async selectProductForGroup(group, campaign, activeProducts) {
    if (!activeProducts || activeProducts.length === 0) {
      return null;
    }

    // Se a campanha especifica um produto fixo, valida e retorna
    if (campaign.product_id) {
      const fixedProduct = activeProducts.find(p => p.id === campaign.product_id);
      return fixedProduct || null;
    }

    // Se houver apenas 1 produto ativo disponível no sistema
    if (activeProducts.length === 1) {
      return activeProducts[0];
    }

    // Consulta histórico recente de publicações deste grupo (últimos 5 envios)
    const recentPubs = await db.getRecentPublicationsForGroup(group.id, 5);
    const lastPublishedProductId = recentPubs.length > 0 ? recentPubs[0].product_id : null;
    const recentProductIds = recentPubs.map(p => p.product_id);

    // 1. Filtra candidatos excluindo o último produto enviado (Regra fundamental)
    let candidates = activeProducts.filter(p => p.id !== lastPublishedProductId);

    // 2. Tenta priorizar produtos que ainda não foram enviados nos últimos ciclos
    const notRecentlySent = candidates.filter(p => !recentProductIds.includes(p.id));

    // Se existirem produtos não enviados recentemente, sorteia entre eles
    if (notRecentlySent.length > 0) {
      candidates = notRecentlySent;
    }

    // 3. Seleção aleatória entre os candidatos mais qualificados
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  /**
   * Processa a distribuição de uma campanha ativa
   */
  async processCampaign(campaignId, options = {}) {
    console.log(`[Motor] Iniciando processamento da campanha: ${campaignId}`);

    // 1. Checa interrupção geral do sistema
    if (await securityService.isEmergencyPaused()) {
      console.warn('[Motor] Distribuição suspensa: Sistema em Modo de Interrupção Geral (Kill Switch).');
      return {
        success: false,
        reason: 'Sistema em pausa de emergência.',
        processed: 0
      };
    }

    // 2. Busca dados da campanha
    const campaign = await db.getCampaignById(campaignId);
    if (!campaign) {
      return { success: false, reason: 'Campanha não encontrada.', processed: 0 };
    }

    if (campaign.status !== 'active' && !options.force) {
      return { success: false, reason: `Campanha está ${campaign.status}.`, processed: 0 };
    }

    // 3. Busca produtos ativos
    const activeProducts = await db.getProducts({ activeOnly: true });
    if (activeProducts.length === 0) {
      console.warn('[Motor] Nenhum produto ativo cadastrado no sistema.');
      return { success: false, reason: 'Nenhum produto ativo disponível.', processed: 0 };
    }

    // 4. Busca grupos cadastrados
    const groups = await db.getGroups();
    const results = [];
    const frequencyHours = campaign.frequency_hours || 24;

    for (const group of groups) {
      // 4.1 Validação de Segurança e Autorização do Grupo
      const authCheck = securityService.validateGroupAuthorization(group);
      if (!authCheck.allowed) {
        // Se o grupo não estiver autorizado e a execução for automática, apenas ignora
        // Se for execução forçada/manual, registra o bloqueio no histórico
        if (options.force) {
          await db.createPublication({
            campaign_id: campaign.id,
            product_id: campaign.product_id || activeProducts[0].id,
            group_id: group.id,
            message: 'Publicação bloqueada por falta de autorização formal.',
            image_url: options.image_url || null,
            video_url: options.video_url || null,
            status: 'blocked_unauthorized',
            error_message: authCheck.reason
          });
        }
        results.push({
          group: group.name,
          status: 'skipped',
          reason: authCheck.reason
        });
        continue;
      }

      // 4.2 Verificação do Intervalo de 24 horas (ou configurado)
      if (!options.ignoreInterval) {
        const intervalCheck = securityService.checkIntervalRespected(group, frequencyHours);
        if (!intervalCheck.allowed) {
          results.push({
            group: group.name,
            status: 'cooldown',
            reason: intervalCheck.reason
          });
          continue;
        }
      }

      // 4.3 Seleção Inteligente de Produto (sem repetição do último)
      const selectedProduct = await this.selectProductForGroup(group, campaign, activeProducts);
      if (!selectedProduct) {
        results.push({
          group: group.name,
          status: 'error',
          reason: 'Não foi possível selecionar um produto ativo para este grupo.'
        });
        continue;
      }

      // 4.4 Geração da mensagem com variações éticas e Spintax
      const messageText = adVariationService.generateMessage(
        campaign.message_template,
        selectedProduct
      );

      // 4.5 Envio conforme a plataforma do grupo
      let dispatchResult;
      const startTime = new Date().toISOString();

      if (group.platform.toLowerCase() === 'telegram') {
        const customToken = await db.getSetting('telegram_bot_token');
        const userbotConnected = userbotService.isConnected;
        const simulationMode = process.env.SIMULATION_MODE === 'true';

        if (customToken) {
          dispatchResult = await telegramIntegration.sendMessage(
            group.external_group_id,
            messageText,
            { parse_mode: 'Markdown' },
            customToken,
            options.image_url || null,
            options.video_url || null
          );
        } else if (userbotConnected) {
          try {
            const userbotResult = await userbotService.sendMessage(
              group.external_group_id,
              messageText
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
          dispatchResult = await telegramIntegration.sendMessage(
            group.external_group_id,
            messageText,
            { parse_mode: 'Markdown' },
            null,
            options.image_url || null,
            options.video_url || null
          );
        } else {
          dispatchResult = {
            success: false,
            error: 'Nenhum meio de envio configurado para Telegram.'
          };
        }
      } else if (group.platform.toLowerCase() === 'meta' || group.platform.toLowerCase() === 'facebook') {
        dispatchResult = await metaIntegration.publishToPage(
          group.external_group_id,
          messageText,
          selectedProduct.affiliate_url,
          options.image_url || null,
          options.video_url || null
        );
      } else {
        dispatchResult = {
          success: false,
          error: `Plataforma "${group.platform}" ainda não suporta automação direta.`
        };
      }

      // 4.6 Tratamento do resultado e registro no histórico
      if (dispatchResult.success) {
        // Atualiza horário da última publicação no grupo
        await db.updateGroupLastPublication(group.id, startTime);

        // Registra publicação concluída
        const pub = await db.createPublication({
          campaign_id: campaign.id,
          product_id: selectedProduct.id,
          group_id: group.id,
          message: messageText,
          image_url: options.image_url || null,
          video_url: options.video_url || null,
          status: 'published',
          published_at: startTime
        });

        results.push({
          group: group.name,
          product: selectedProduct.name,
          status: 'published',
          simulated: dispatchResult.simulated || false,
          publicationId: pub.id
        });
      } else {
        // Registra falha de publicação
        await db.createPublication({
          campaign_id: campaign.id,
          product_id: selectedProduct.id,
          group_id: group.id,
          message: messageText,
          image_url: options.image_url || null,
          video_url: options.video_url || null,
          status: 'failed',
          error_message: dispatchResult.error
        });

        // Se o erro indicar perda de permissão ou banimento do bot no grupo
        if (dispatchResult.error && (
            dispatchResult.error.includes('Forbidden') ||
            dispatchResult.error.includes('bot was kicked') ||
            dispatchResult.error.includes('chat not found')
        )) {
          await securityService.handleGroupRestriction(group, dispatchResult.error);
        }

        results.push({
          group: group.name,
          product: selectedProduct.name,
          status: 'failed',
          error: dispatchResult.error
        });
      }
    }

    return {
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      processed: results.length,
      details: results
    };
  }

  /**
   * Executa a varredura global de todas as campanhas ativas
   */
  async runGlobalCycle() {
    console.log('[Motor] Iniciando ciclo global de verificação de campanhas...');

    if (await securityService.isEmergencyPaused()) {
      console.log('[Motor] Ciclo abortado: Interrupção geral ativada.');
      return { aborted: true, reason: 'Interrupção geral ativada' };
    }

    const activeCampaigns = await db.getCampaigns({ status: 'active' });
    const cycleSummary = [];

    for (const campaign of activeCampaigns) {
      try {
        const result = await this.processCampaign(campaign.id);
        cycleSummary.push(result);
      } catch (err) {
        console.error(`[Motor] Erro ao processar campanha ${campaign.id}:`, err);
        cycleSummary.push({
          campaignId: campaign.id,
          error: err.message
        });
      }
    }

    return cycleSummary;
  }
}

module.exports = new DistributionService();
