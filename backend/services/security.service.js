const db = require('../database/db');

/**
 * Serviço de Segurança e Conformidade
 * Implementa as diretrizes da Seção 6 da especificação:
 * - Verificação rigorosa de autorizações e permissões
 * - Prevenção de duplicidades
 * - Controle individual de intervalos de publicação
 * - Interrupção geral de emergência
 */

class SecurityService {
  /**
   * Verifica se o sistema está em estado de interrupção geral (kill switch)
   */
  async isEmergencyPaused() {
    const setting = await db.getSetting('emergency_pause_all', 'false');
    return setting === 'true';
  }

  /**
   * Valida se um grupo está 100% autorizado e habilitado para automação
   */
  validateGroupAuthorization(group) {
    if (!group) {
      return { allowed: false, reason: 'Grupo inexistente no sistema.' };
    }

    if (!group.active) {
      return { allowed: false, reason: `Grupo "${group.name}" está marcado como inativo.` };
    }

    if (group.authorization_status !== 'authorized') {
      return {
        allowed: false,
        reason: `Grupo "${group.name}" não está autorizado (Status atual: ${group.authorization_status}). A publicação exige autorização expressa.`
      };
    }

    if (!group.advertising_permission) {
      return {
        allowed: false,
        reason: `Grupo "${group.name}" não possui permissão concedida para divulgação de anúncios.`
      };
    }

    if (!group.automation_permission) {
      return {
        allowed: false,
        reason: `Grupo "${group.name}" não possui autorização para publicações via automação/bot.`
      };
    }

    return { allowed: true };
  }

  /**
   * Valida se o produto está ativo e apto para divulgação
   */
  validateProduct(product) {
    if (!product) {
      return { allowed: false, reason: 'Produto inexistente.' };
    }

    if (!product.active) {
      return { allowed: false, reason: `Produto "${product.name}" está desativado.` };
    }

    if (!product.affiliate_url) {
      return { allowed: false, reason: `Produto "${product.name}" não possui link de afiliado cadastrado.` };
    }

    return { allowed: true };
  }

  /**
   * Verifica se o intervalo mínimo (ex: 24h) foi respeitado para este grupo específico
   * Conforme seção 5.3: Cada grupo tem seu próprio controle independente de agendamento.
   */
  checkIntervalRespected(group, frequencyHours = 24) {
    if (!group.last_publication_at) {
      return { allowed: true, hoursSinceLast: null };
    }

    const lastPubTime = new Date(group.last_publication_at).getTime();
    const now = Date.now();
    const elapsedHours = (now - lastPubTime) / (1000 * 60 * 60);

    if (elapsedHours < frequencyHours) {
      const remainingHours = (frequencyHours - elapsedHours).toFixed(1);
      return {
        allowed: false,
        reason: `Intervalo mínimo de ${frequencyHours}h não atingido para o grupo "${group.name}". Última publicação há ${elapsedHours.toFixed(1)}h (Aguarde mais ${remainingHours}h).`,
        hoursSinceLast: elapsedHours,
        remainingHours: remainingHours
      };
    }

    return { allowed: true, hoursSinceLast: elapsedHours };
  }

  /**
   * Previne publicação duplicada imediata de uma mesma mensagem em curto período
   */
  async checkDuplicateMessage(groupId, messageHash) {
    const recentPubs = await db.getRecentPublicationsForGroup(groupId, 3);
    for (const pub of recentPubs) {
      if (pub.message === messageHash) {
        return { isDuplicate: true, reason: 'Mensagem idêntica enviada recentemente para este grupo.' };
      }
    }
    return { isDuplicate: false };
  }

  /**
   * Pausa ou suspende o grupo caso o bot seja banido ou perca privilégios (Prevenção de spam/erros)
   */
  async handleGroupRestriction(group, errorMessage) {
    console.warn(`[Segurança] Restrição detectada para o grupo ${group.name} (${group.id}): ${errorMessage}`);

    let newStatus = 'blocked';
    if (errorMessage.toLowerCase().includes('kicked') || errorMessage.toLowerCase().includes('not a member') || errorMessage.toLowerCase().includes('chat not found')) {
      newStatus = 'unavailable';
    }

    await db.updateGroup(group.id, {
      authorization_status: newStatus,
      active: false
    });

    return newStatus;
  }
}

module.exports = new SecurityService();
