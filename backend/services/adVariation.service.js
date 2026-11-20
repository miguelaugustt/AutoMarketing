/**
 * Serviço de Variação de Anúncios e Processamento de Modelos
 * 
 * Atende à Seção 4.1 da especificação:
 * - Geração de diferentes versões de anúncios autênticos.
 * - Suporte a Spintax {opção 1|opção 2|opção 3}.
 * - Substituição segura de marcadores: {product_name}, {affiliate_url}, etc.
 * - Conteúdo ético e transparente, sem promessas milagrosas.
 */

class AdVariationService {
  /**
   * Substitui os marcadores do produto na mensagem
   */
  interpolate(template, product) {
    if (!template || !product) return template || '';

    const replacements = {
      '{product_name}': product.name || '',
      '{product_description}': product.description || '',
      '{affiliate_url}': product.affiliate_url || '',
      '{category}': product.category || 'Geral',
      '{platform}': product.platform || 'Kiwify',
      '{promotional_text}': product.promotional_text || ''
    };

    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.split(key).join(value);
    }

    return result;
  }

  /**
   * Resolve sintaxe Spintax recursivamente: {opção A|opção B|opção C}
   * Só processa chaves que contenham o delimitador de alternativas '|'
   */
  processSpintax(text) {
    if (!text) return '';
    const spintaxRegex = /\{([^{}]+)\}/g;
    let result = text;
    let iteration = 0;
    const maxIterations = 10; // previne loops infinitos

    while (spintaxRegex.test(result) && iteration < maxIterations) {
      iteration++;
      result = result.replace(spintaxRegex, (match, choices) => {
        if (!choices.includes('|')) {
          // Não é spintax (ex: tag sem valor ou chaves literais), mantém inalterado
          return match;
        }
        const options = choices.split('|');
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex].trim();
      });
    }

    return result;
  }

  /**
   * Gera a mensagem final pronta para publicação a partir de um template e produto
   */
  generateMessage(template, product) {
    if (!template) return '';

    // 1. Substitui primeiro os campos do produto para que fiquem disponíveis dentro de variações
    const interpolated = this.interpolate(template, product);

    // 2. Processa Spintax para selecionar a variação do texto
    const spintaxResolved = this.processSpintax(interpolated);

    return spintaxResolved.trim();
  }

  /**
   * Modelos predefinidos de anúncio ético baseados na especificação
   */
  getDefaultTemplates() {
    return [
      {
        id: 'curated-discovery',
        name: 'Descoberta de Conteúdo',
        template: 'Está procurando uma maneira prática de aprender algo novo?\n\nConheça: *{product_name}*\n_{product_description}_\n\n💡 *Resumo:* {promotional_text}\n🔗 Acesse o material completo e confira os detalhes: {affiliate_url}\n\n#qualificacao #desenvolvimento #{category}'
      },
      {
        id: 'value-highlight',
        name: 'Destaque de Oportunidade',
        template: 'Confira esta oportunidade e conheça o conteúdo disponível neste material:\n\n📘 *{product_name}* ({platform})\n{promotional_text}\n\n👉 Para saber mais, veja a página oficial aqui: {affiliate_url}'
      },
      {
        id: 'interest-based',
        name: 'Interesse Temático',
        template: 'Se você tem interesse no assunto *{category}*, vale a pena conhecer este material:\n\n✨ *{product_name}*\n{product_description}\n\n🔗 Saiba todos os detalhes no link autorizado: {affiliate_url}'
      }
    ];
  }

  /**
   * Gera amostras de pré-visualização para o painel administrativo
   */
  generatePreviews(template, product, count = 3) {
    const previews = [];
    for (let i = 0; i < count; i++) {
      previews.push({
        version: i + 1,
        text: this.generateMessage(template, product)
      });
    }
    return previews;
  }
}

module.exports = new AdVariationService();
