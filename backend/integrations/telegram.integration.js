const axios = require('axios');

class TelegramIntegration {
  constructor() {
    this.baseUrl = 'https://api.telegram.org';
  }

  /**
   * Obtém o token atual da integração a partir de parâmetros ou ambiente
   */
  getToken(customToken = null) {
    return customToken || process.env.TELEGRAM_BOT_TOKEN || '';
  }

  /**
   * Verifica a validade do Token do Bot chamando getMe
   */
  async getMe(customToken = null) {
    const token = this.getToken(customToken);
    if (!token) {
      return {
        success: false,
        simulated: true,
        message: 'Token do Telegram não configurado.',
        bot: { username: 'BotNaoConfigurado', first_name: 'Modo Simulação' }
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/bot${token}/getMe`, { timeout: 8000 });
      if (response.data && response.data.ok) {
        return {
          success: true,
          simulated: false,
          bot: response.data.result
        };
      }
      return { success: false, simulated: false, error: 'Resposta inválida da API do Telegram' };
    } catch (error) {
      const errMsg = error.response?.data?.description || error.message;
      return {
        success: false,
        simulated: false,
        error: `Erro Telegram getMe: ${errMsg}`
      };
    }
  }

  /**
   * Consulta os dados do grupo/canal e status real do bot no grupo
   * Determina automaticamente status de autorização e permissões de postagem
   */
  async checkGroupAccess(chatId, customToken = null) {
    const token = this.getToken(customToken);
    const simulationMode = process.env.SIMULATION_MODE === 'true';

    // Se estiver em modo de simulação explícito
    if (simulationMode) {
      return {
        success: true,
        simulated: true,
        canPost: true,
        authorization_status: 'authorized',
        advertising_permission: true,
        automation_permission: true,
        chatTitle: 'Grupo Simulado (Modo Simulação)',
        message: 'Permissões autorizadas automaticamente em Modo Simulação.'
      };
    }

    // Se não houver token configurado no sistema
    if (!token) {
      return {
        success: false,
        simulated: true,
        canPost: false,
        authorization_status: 'pending',
        advertising_permission: false,
        automation_permission: false,
        error: 'Token do Telegram não configurado nas Configurações do Sistema. Configure o token para validação automática com o Telegram.'
      };
    }

    try {
      // 1. Obtém dados do bot
      const meRes = await this.getMe(token);
      if (!meRes.success) {
        return {
          success: false,
          canPost: false,
          authorization_status: 'pending',
          advertising_permission: false,
          automation_permission: false,
          error: `Falha ao validar bot: ${meRes.error}`
        };
      }
      const botId = meRes.bot.id;

      // 2. Consulta informações do chat
      const chatRes = await axios.get(`${this.baseUrl}/bot${token}/getChat`, {
        params: { chat_id: chatId },
        timeout: 8000
      });

      if (!chatRes.data?.ok) {
        return {
          success: false,
          canPost: false,
          authorization_status: 'unavailable',
          advertising_permission: false,
          automation_permission: false,
          error: 'Comunidade não encontrada ou o bot ainda não foi adicionado ao chat.'
        };
      }

      const chatInfo = chatRes.data.result;

      // 3. Consulta status de membro do bot no grupo
      const memberRes = await axios.get(`${this.baseUrl}/bot${token}/getChatMember`, {
        params: { chat_id: chatId, user_id: botId },
        timeout: 8000
      });

      if (!memberRes.data?.ok) {
        return {
          success: false,
          canPost: false,
          authorization_status: 'unavailable',
          advertising_permission: false,
          automation_permission: false,
          error: 'Não foi possível verificar status de membro do bot no grupo.'
        };
      }

      const member = memberRes.data.result;
      const status = member.status; // 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'

      let canPost = false;
      let authStatus = 'unauthorized';

      if (status === 'creator' || status === 'administrator') {
        const canPostMessages = member.can_post_messages !== false && member.can_send_messages !== false;
        if (canPostMessages) {
          canPost = true;
          authStatus = 'authorized';
        } else {
          canPost = false;
          authStatus = 'unauthorized';
        }
      } else if (status === 'member') {
        // Em canais apenas administradores podem postar
        if (chatInfo.type === 'channel') {
          canPost = false;
          authStatus = 'unauthorized';
        } else {
          canPost = true;
          authStatus = 'authorized';
        }
      } else if (status === 'kicked' || status === 'left') {
        canPost = false;
        authStatus = 'unavailable';
      } else if (status === 'restricted') {
        canPost = Boolean(member.can_send_messages);
        authStatus = canPost ? 'authorized' : 'blocked';
      }

      return {
        success: true,
        simulated: false,
        chatTitle: chatInfo.title || chatInfo.username || chatId,
        chatType: chatInfo.type,
        botStatus: status,
        canPost: canPost,
        authorization_status: authStatus,
        advertising_permission: canPost,
        automation_permission: canPost,
        message: canPost
          ? `Bot verificado como ${status} com permissão de publicação confirmada.`
          : `Bot encontrado no chat (${status}), mas sem permissão suficiente para postar mensagens.`
      };
    } catch (error) {
      const errMsg = error.response?.data?.description || error.message;
      return {
        success: false,
        simulated: false,
        canPost: false,
        authorization_status: 'unavailable',
        advertising_permission: false,
        automation_permission: false,
        error: `Falha na verificação com o Telegram: ${errMsg}`
      };
    }
  }

  /**
   * Envia uma mensagem para o grupo/canal
   */
  async sendMessage(chatId, text, options = {}, customToken = null) {
    const token = this.getToken(customToken);
    const simulationMode = process.env.SIMULATION_MODE === 'true';

    // Se estiver em modo de simulação ou sem token configurado, simula o envio
    if (!token || simulationMode) {
      console.log(`[Telegram Simulado] Mensagem para ${chatId}: \n${text.substring(0, 100)}...`);
      return {
        success: true,
        simulated: true,
        messageId: Math.floor(Math.random() * 1000000),
        chatId: chatId,
        date: new Date().toISOString()
      };
    }

    try {
      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: options.parse_mode || 'Markdown',
        disable_web_page_preview: options.disable_preview !== undefined ? options.disable_preview : false
      };

      const response = await axios.post(`${this.baseUrl}/bot${token}/sendMessage`, payload, {
        timeout: 12000
      });

      if (response.data && response.data.ok) {
        return {
          success: true,
          simulated: false,
          messageId: response.data.result.message_id,
          chatId: response.data.result.chat.id,
          date: new Date(response.data.result.date * 1000).toISOString()
        };
      }

      return {
        success: false,
        simulated: false,
        error: 'Telegram não confirmou o envio da mensagem.'
      };
    } catch (error) {
      const errMsg = error.response?.data?.description || error.message;
      const errorCode = error.response?.data?.error_code;
      console.error(`[Telegram Error] Falha ao enviar para ${chatId}:`, errMsg);

      return {
        success: false,
        simulated: false,
        errorCode: errorCode,
        error: `Telegram Error (${errorCode || 'HTTP'}): ${errMsg}`
      };
    }
  }
}

module.exports = new TelegramIntegration();
