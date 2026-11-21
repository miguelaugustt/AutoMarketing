const axios = require('axios');

/**
 * Integração Oficial com a Meta Graph API (Facebook Pages)
 * Em conformidade com a especificação técnica:
 * - Publicações estritamente em Páginas compatíveis onde o usuário detém permissões de administrador.
 * - Não realiza spam nem scraping de grupos pessoais descontinuados.
 */
class MetaIntegration {
  constructor() {
    this.graphApiVersion = 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  getAccessToken() {
    return process.env.META_PAGE_ACCESS_TOKEN || '';
  }

  /**
   * Verifica permissões e dados da Página do Facebook
   */
  async checkPageAccess(pageId) {
    const token = this.getAccessToken();
    if (!token) {
      return {
        success: true,
        simulated: true,
        message: 'Token da Meta Graph API não configurado. Modo de simulação ativo.',
        pageName: 'Página Meta Demonstrativa'
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: token,
          fields: 'id,name,category,tasks'
        },
        timeout: 8000
      });

      return {
        success: true,
        simulated: false,
        pageId: response.data.id,
        pageName: response.data.name,
        category: response.data.category,
        canPost: Array.isArray(response.data.tasks) && response.data.tasks.includes('CREATE_CONTENT')
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Publica mensagem no Feed da Página Oficial (suporta imagem e vídeo opcionais)
   */
  async publishToPage(pageId, message, link = null, image_url = null, video_url = null) {
    const token = this.getAccessToken();
    if (!token || process.env.SIMULATION_MODE === 'true') {
      console.log(`[Meta Simulado] Publicando na Página ${pageId}: ${message.substring(0, 100)}...${image_url ? ` [IMAGEM: ${image_url}]` : ''}${video_url ? ` [VÍDEO: ${video_url}]` : ''}`);
      return {
        success: true,
        simulated: true,
        postId: `${pageId}_${Date.now()}`
      };
    }

    try {
      const payload = {
        message: message,
        access_token: token
      };
      if (link) payload.link = link;
      if (image_url) payload.url = image_url;
      if (video_url) payload.file_url = video_url;

      const response = await axios.post(`${this.baseUrl}/${pageId}/feed`, payload, { timeout: 12000 });
      return {
        success: true,
        simulated: false,
        postId: response.data.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

module.exports = new MetaIntegration();
