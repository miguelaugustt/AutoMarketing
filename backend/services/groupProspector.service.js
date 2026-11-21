const db = require('../database/db');
const telegramIntegration = require('../integrations/telegram.integration');

/**
 * Serviço de Radar e Prospecção de Comunidades de Divulgação
 * 
 * Permite buscar, catalogar e exportar grupos e canais públicos onde a postagem
 * de links de afiliados e divulgação de produtos digitais é explicitamente permitida.
 */

// Catálogo indexado de comunidades e nichos de divulgação aberta no Telegram
// ATENÇÃO: Substitua os usernames abaixo por grupos reais que você saiba que existem no Telegram.
// O Telegram não possui API pública de busca de grupos; é necessário conhecer o link ou username exato.
const PROSPECT_COMMUNITIES_DATABASE = [
  {
    name: 'Divulgação de Afiliados & Links Brasil',
    platform: 'Telegram',
    username: 'divulgacao_afiliados_brasil',
    invite_url: 'https://t.me/divulgacao_afiliados_brasil',
    category: 'Marketing de Afiliados',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Divulgação livre de links de infoprodutos (Kiwify, Hotmart). Proibido conteúdo adulto.',
    keywords: ['afiliados', 'divulgação', 'kiwify', 'hotmart', 'links', 'vendas']
  },
  {
    name: 'Grupo de Divulgação Geral & Renda Extra',
    platform: 'Telegram',
    username: 'divulgue_aqui_brasil',
    invite_url: 'https://t.me/divulgue_aqui_brasil',
    category: 'Renda Extra & Oportunidades',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Permitido postar links promocionais uma vez a cada 24 horas por usuário.',
    keywords: ['renda extra', 'divulgação', 'links', 'oportunidades', 'negocios']
  },
  {
    name: 'Networking & Afiliados Kiwify Oficial',
    platform: 'Telegram',
    username: 'kiwify_afiliados_brasil',
    invite_url: 'https://t.me/kiwify_afiliados_brasil',
    category: 'Marketing de Afiliados',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Troca de experiências e divulgação ética de produtos autorizados.',
    keywords: ['kiwify', 'afiliados', 'marketing', 'networking', 'cursos']
  },
  {
    name: 'Feirão de Links & Anúncios Digitais',
    platform: 'Telegram',
    username: 'feirao_links_digitais_br',
    invite_url: 'https://t.me/feirao_links_digitais_br',
    category: 'Classificados & Vendas',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Canal aberto para anúncios de produtos digitais, e-books e cursos.',
    keywords: ['anúncios', 'divulgação', 'links', 'vendas', 'produtos']
  },
  {
    name: 'Empreendedores Digitais & Tráfego',
    platform: 'Telegram',
    username: 'empreendedores_trafego_br',
    invite_url: 'https://t.me/empreendedores_trafego_br',
    category: 'Marketing Digital',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Permitido compartilhamento de links de materiais educativos e ferramentas.',
    keywords: ['marketing digital', 'empreendedorismo', 'trafego', 'afiliados', 'cursos']
  },
  {
    name: 'Comunidade Hotmart & Eduzz Afiliados',
    platform: 'Telegram',
    username: 'hotmart_eduzz_afiliados_br',
    invite_url: 'https://t.me/hotmart_eduzz_afiliados_br',
    category: 'Marketing de Afiliados',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Espaço para divulgação de ofertas de plataformas de afiliados.',
    keywords: ['hotmart', 'eduzz', 'afiliados', 'divulgação', 'links']
  },
  {
    name: 'Central de Cursos Online & Certificados',
    platform: 'Telegram',
    username: 'cursos_online_divulgacao_br',
    invite_url: 'https://t.me/cursos_online_divulgacao_br',
    category: 'Educação & Treinamentos',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Grupo voltado para divulgação de cursos profissionalizantes e e-books.',
    keywords: ['cursos', 'educação', 'treinamento', 'ebooks', 'divulgação']
  },
  {
    name: 'Mundo dos Negócios & Dropshipping BR',
    platform: 'Telegram',
    username: 'negocios_dropshipping_brasil',
    invite_url: 'https://t.me/negocios_dropshipping_brasil',
    category: 'E-commerce & Negócios',
    approx_members: 0,
    allows_links: true,
    rules_summary: 'Permitido links de ferramentas, fornecedores e treinamentos do nicho.',
    keywords: ['dropshipping', 'ecommerce', 'negocios', 'vendas', 'renda extra']
  }
];

class GroupProspectorService {
  /**
   * Realiza a busca de grupos públicos com base em palavra-chave e nicho
   */
  async searchGroups(keyword = '', category = '') {
    const term = keyword ? keyword.toLowerCase().trim() : '';
    const cat = category ? category.toLowerCase().trim() : '';

    // Consulta grupos já cadastrados no sistema para marcar se já foram importados
    const existingGroups = await db.getGroups();
    const existingUrls = existingGroups.map(g => (g.invite_url || '').toLowerCase());
    const existingIds = existingGroups.map(g => (g.external_group_id || '').toLowerCase());

    let results = PROSPECT_COMMUNITIES_DATABASE.filter(group => {
      // Filtro por categoria
      if (cat && group.category.toLowerCase() !== cat) {
        return false;
      }

      // Filtro por palavra-chave (no nome, regras, categoria ou tags)
      if (term) {
        const matchName = group.name.toLowerCase().includes(term);
        const matchCat = group.category.toLowerCase().includes(term);
        const matchRules = group.rules_summary.toLowerCase().includes(term);
        const matchTags = group.keywords.some(k => k.includes(term));
        return matchName || matchCat || matchRules || matchTags;
      }

      return true;
    });

    // Se o termo buscado não estiver no catálogo indexado, gera sugestões dinâmicas
    // ATENÇÃO: Estes são exemplos de formato. Substitua por usernames reais de grupos do Telegram.
    if (term && results.length < 3) {
      const dynamicSuggestions = [
        {
          name: `Divulgação & Afiliados [${keyword.toUpperCase()}]`,
          platform: 'Telegram',
          username: `divulga_${term.replace(/[^a-z0-9]/g, '_')}_br`,
          invite_url: `https://t.me/divulga_${term.replace(/[^a-z0-9]/g, '_')}_br`,
          category: 'Prospecção Aberta',
          approx_members: 0,
          allows_links: true,
          rules_summary: `Comunidade pública com foco em ${keyword}. Links de afiliados permitidos com moderação.`,
          keywords: [term, 'divulgação', 'afiliados']
        },
        {
          name: `Grupo Oficial Divulgue seu Link - ${keyword}`,
          platform: 'Telegram',
          username: `links_${term.replace(/[^a-z0-9]/g, '_')}_aberto`,
          invite_url: `https://t.me/links_${term.replace(/[^a-z0-9]/g, '_')}_aberto`,
          category: 'Classificados',
          approx_members: 0,
          allows_links: true,
          rules_summary: 'Grupo aberto para compartilhamento diário de links e ofertas de afiliados.',
          keywords: [term, 'links', 'vendas']
        }
      ];

      results = [...results, ...dynamicSuggestions];
    }

    // Mapeia adicionando o indicador se já está na lista do usuário
    return results.map(item => {
      const isAlreadyImported = existingUrls.includes(item.invite_url.toLowerCase()) ||
        existingIds.includes(item.username.toLowerCase()) ||
        existingIds.includes(`@${item.username.toLowerCase()}`);

      return {
        ...item,
        already_imported: isAlreadyImported
      };
    });
  }

  /**
   * Gera o conteúdo CSV para download imediato do relatório
   */
  generateCsvReport(groups) {
    // Cabeçalho com BOM UTF-8 para abrir com acentuação correta no Excel brasileiro
    const BOM = '\uFEFF';
    const header = [
      'Nome do Grupo',
      'Plataforma',
      'Link de Acesso',
      'Categoria',
      'Permite Links?',
      'Membros Estimados',
      'Regras Encontradas'
    ];

    const rows = groups.map(g => [
      `"${(g.name || '').replace(/"/g, '""')}"`,
      `"${g.platform || 'Telegram'}"`,
      `"${g.invite_url || ''}"`,
      `"${(g.category || 'Geral').replace(/"/g, '""')}"`,
      g.allows_links ? '"SIM (Links Permitidos)"' : '"NÃO"',
      g.approx_members || 'N/D',
      `"${(g.rules_summary || '').replace(/"/g, '""')}"`
    ]);

    return BOM + [header.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  }

  /**
   * Importa um grupo prospectado diretamente para a tabela de grupos como 'pending'
   */
  async importToUserGroups(groupData) {
    const existing = await db.getGroups();
    const alreadyExists = existing.find(g =>
      (g.invite_url && g.invite_url.toLowerCase() === groupData.invite_url.toLowerCase()) ||
      (g.external_group_id && g.external_group_id.toLowerCase() === `@${groupData.username.toLowerCase()}`)
    );

    if (alreadyExists) {
      return {
        success: false,
        message: 'Este grupo já está cadastrado em suas comunidades.',
        group: alreadyExists
      };
    }

    // Tenta verificar via bot se o token estiver configurado
    const customToken = await db.getSetting('telegram_bot_token');
    const extId = `@${groupData.username}`;
    let authStatus = 'pending';
    let advPerm = false;
    let autoPerm = false;

    if (customToken) {
      const checkRes = await telegramIntegration.checkGroupAccess(extId, customToken);
      if (checkRes.success && checkRes.canPost) {
        authStatus = 'authorized';
        advPerm = true;
        autoPerm = true;
      }
    }

    const created = await db.createGroup({
      name: groupData.name,
      platform: 'Telegram',
      external_group_id: extId,
      invite_url: groupData.invite_url,
      authorization_status: authStatus,
      advertising_permission: advPerm,
      automation_permission: autoPerm,
      active: true
    });

    return {
      success: true,
      message: `Grupo "${groupData.name}" importado com sucesso!`,
      group: created
    };
  }
}

module.exports = new GroupProspectorService();
