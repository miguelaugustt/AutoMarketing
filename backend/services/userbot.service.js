const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const db = require('../database/db');

/**
 * Serviço de Automação por Conta de Usuário (Userbot - MTProto)
 * Permite que o sistema entre automaticamente em grupos por links de convite (t.me/+...)
 * e envie mensagens sem depender de bots oficiais ou aprovação de administradores.
 */
class UserbotService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.pendingAuth = null;
    this.init();
  }

  async init() {
    try {
      const sessionString = await db.getSetting('telegram_userbot_session');
      const apiId = await db.getSetting('telegram_userbot_api_id');
      const apiHash = await db.getSetting('telegram_userbot_api_hash');

      if (sessionString && apiId && apiHash) {
        console.log('[Userbot] Restaurando sessão salva do Telegram...');
        const session = new StringSession(sessionString);
        this.client = new TelegramClient(session, parseInt(apiId, 10), apiHash, {
          connectionRetries: 5
        });

        await this.client.connect();
        const me = await this.client.getMe();
        if (me) {
          this.isConnected = true;
          console.log(`[Userbot] Conectado com sucesso como: ${me.firstName || ''} (@${me.username || me.phone})`);
        }
      }
    } catch (err) {
      console.warn('[Userbot] Não foi possível restaurar sessão salva:', err.message);
      this.isConnected = false;
      this.client = null;
    }
  }

  async getStatus() {
    if (this.isConnected && this.client) {
      try {
        const me = await this.client.getMe();
        return {
          connected: true,
          user: {
            id: String(me.id),
            firstName: me.firstName,
            username: me.username ? `@${me.username}` : null,
            phone: me.phone
          }
        };
      } catch (e) {
        this.isConnected = false;
      }
    }
    return { connected: false };
  }

  /**
   * Passo 1: Solicita código de login para o telefone do usuário
   */
  async sendLoginCode(apiId, apiHash, phoneNumber) {
    try {
      const cleanApiId = parseInt(String(apiId).trim(), 10);
      const cleanApiHash = String(apiHash).trim();
      const cleanPhone = String(phoneNumber).trim().replace(/\s+/g, '');

      if (!cleanApiId || !cleanApiHash || !cleanPhone) {
        throw new Error('API ID, API Hash e Número de Telefone são obrigatórios.');
      }

      const session = new StringSession('');
      const client = new TelegramClient(session, cleanApiId, cleanApiHash, {
        connectionRetries: 3
      });

      await client.connect();

      const sendCodeResult = await client.sendCode(
        {
          apiId: cleanApiId,
          apiHash: cleanApiHash
        },
        cleanPhone
      );

      this.pendingAuth = {
        client,
        apiId: cleanApiId,
        apiHash: cleanApiHash,
        phone: cleanPhone,
        phoneCodeHash: sendCodeResult.phoneCodeHash
      };

      return {
        success: true,
        message: 'Código de confirmação enviado para o seu Telegram!',
        phoneCodeHash: sendCodeResult.phoneCodeHash
      };
    } catch (error) {
      console.error('[Userbot sendLoginCode Error]:', error);
      throw new Error(`Falha ao solicitar código: ${error.message}`);
    }
  }

  /**
   * Passo 2: Confirma o código recebido no Telegram e salva a sessão
   */
  async signInWithCode(code, password = '') {
    if (!this.pendingAuth || !this.pendingAuth.client) {
      throw new Error('Nenhuma solicitação de login pendente. Solicite o código primeiro.');
    }

    try {
      const { client, apiId, apiHash, phone, phoneCodeHash } = this.pendingAuth;

      let signInResult;
      try {
        signInResult = await client.invoke(
          new Api.auth.SignIn({
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash,
            phoneCode: String(code).trim()
          })
        );
      } catch (err) {
        if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          if (!password) {
            return {
              needsPassword: true,
              message: 'Sua conta possui senha de duas etapas (2FA). Por favor, informe sua senha.'
            };
          }
          signInResult = await client.signInWithPassword({
            apiId,
            apiHash,
            password
          });
        } else {
          throw err;
        }
      }

      const sessionString = client.session.save();

      // Salva no banco de dados para persistência
      await db.setSetting('telegram_userbot_session', sessionString);
      await db.setSetting('telegram_userbot_api_id', String(apiId));
      await db.setSetting('telegram_userbot_api_hash', apiHash);
      await db.setSetting('telegram_userbot_phone', phone);

      this.client = client;
      this.isConnected = true;
      this.pendingAuth = null;

      const me = await this.client.getMe();
      return {
        success: true,
        message: `Conta conectada com sucesso! Bem-vindo(a), ${me.firstName || ''}!`,
        user: {
          id: String(me.id),
          firstName: me.firstName,
          username: me.username ? `@${me.username}` : null,
          phone: me.phone
        }
      };
    } catch (error) {
      console.error('[Userbot signInWithCode Error]:', error);
      throw new Error(`Código inválido ou expirado: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (e) {}
    }
    this.client = null;
    this.isConnected = false;
    this.pendingAuth = null;

    await db.setSetting('telegram_userbot_session', '');
    return { success: true, message: 'Conta desconectada com sucesso.' };
  }

  /**
   * Entra AUTOMATICAMENTE em um grupo ou canal por link de convite (t.me/+ ou t.me/...)
   */
  async autoJoinGroup(inviteLink) {
    if (!this.isConnected || !this.client) {
      throw new Error('Sua conta do Telegram não está conectada. Conecte sua conta em "Configurações & API" para entrada automática em links.');
    }

    const cleanLink = String(inviteLink).trim();
    let hash = '';

    try {
      // 1. Link Privado com '+' (ex: https://t.me/+iGZK2wmpASQ4N2Mx)
      if (cleanLink.includes('t.me/+')) {
        hash = cleanLink.split('t.me/+')[1].split('/')[0].split('?')[0].trim();
      } else if (cleanLink.includes('joinchat/')) {
        hash = cleanLink.split('joinchat/')[1].split('/')[0].split('?')[0].trim();
      }

      if (hash) {
        console.log(`[Userbot] Entrando automaticamente no grupo privado com hash: ${hash}...`);
        try {
          const result = await this.client.invoke(
            new Api.messages.ImportChatInvite({ hash: hash })
          );
          const chat = result.chats && result.chats[0];
          if (chat) {
            const formattedId = chat.id ? `-100${chat.id}` : '';
            return {
              success: true,
              chatId: formattedId || String(chat.id),
              title: chat.title || 'Grupo Importado',
              message: `Entrou no grupo "${chat.title}" automaticamente!`
            };
          }
        } catch (inviteErr) {
          // Se já for membro do chat
          if (inviteErr.errorMessage === 'USER_ALREADY_PARTICIPANT') {
            const check = await this.client.invoke(
              new Api.messages.CheckChatInvite({ hash: hash })
            );
            const chat = check.chat;
            const formattedId = chat?.id ? `-100${chat.id}` : '';
            return {
              success: true,
              chatId: formattedId || '',
              title: chat?.title || 'Grupo Privado',
              message: `Sua conta já é membro do grupo "${chat?.title || ''}".`
            };
          }
          throw inviteErr;
        }
      }

      // 2. Link Público (ex: https://t.me/grupoteste31231 ou @grupoteste31231)
      let username = cleanLink.replace('https://t.me/', '').replace('t.me/', '').replace('@', '').split('/')[0].split('?')[0].trim();
      if (username) {
        console.log(`[Userbot] Entrando automaticamente no canal/grupo público: @${username}...`);
        const result = await this.client.invoke(
          new Api.channels.JoinChannel({ channel: username })
        );
        const chat = result.chats && result.chats[0];
        const formattedId = chat?.id ? `-100${chat.id}` : `@${username}`;
        return {
          success: true,
          chatId: formattedId,
          title: chat?.title || username,
          message: `Entrou no grupo/canal "${chat?.title || username}" com sucesso!`
        };
      }

      throw new Error('Link de grupo inválido.');
    } catch (error) {
      console.error('[Userbot autoJoinGroup Error]:', error);
      throw new Error(`Não foi possível entrar no grupo: ${error.message || error.errorMessage}`);
    }
  }

  /**
   * Verifica se um grupo/canal ainda existe e o userbot tem acesso a ele
   * Retorna { exists: boolean, canPost: boolean, title?: string, error?: string }
   *
   * LIMITAÇÃO: o Userbot (conta de usuário normal) só consegue verificar grupos
   * onde já é membro. Se não for membro, não é possível confirmar existência.
   */
  async checkGroupExists(chatId) {
    if (!this.isConnected || !this.client) {
      throw new Error('Conta do Telegram desconectada.');
    }

    try {
      const cleanId = String(chatId).trim();
      let peer = cleanId;

      if (cleanId.startsWith('-100')) {
        peer = parseInt(cleanId.replace('-100', ''), 10);
      } else if (!isNaN(cleanId)) {
        peer = parseInt(cleanId, 10);
      }

      // Tenta resolver a entidade do chat (só funciona se o userbot for membro)
      const entity = await this.client.getEntity(peer);

      return {
        exists: true,
        canPost: true,
        title: entity.title || entity.username || String(chatId),
        error: null
      };
    } catch (error) {
      const errMsg = error.message || error.errorMessage || 'Erro ao verificar grupo.';

      // Erros que indicam que o grupo foi deletado, banido ou o userbot foi removido
      const isDefinitelyDeleted = (
        errMsg.includes('PEER_ID_INVALID') ||
        errMsg.includes('Chat not found') ||
        errMsg.includes('not found') ||
        errMsg.includes('No user has') ||
        errMsg.includes('as username')
      );

      // Erros que indicam que o userbot não é mais membro (não sabemos se o grupo existe)
      const isNotMember = (
        errMsg.includes('USER_NOT_PARTICIPANT') ||
        errMsg.includes('CHANNEL_PRIVATE') ||
        errMsg.includes('CHAT_ADMIN_REQUIRED') ||
        errMsg.includes('CHAT_WRITE_FORBIDDEN')
      );

      let exists = true;
      let canPost = false;
      let statusMessage = errMsg;

      if (isDefinitelyDeleted) {
        exists = false;
        canPost = false;
        statusMessage = 'Grupo deletado ou não existe mais no Telegram';
      } else if (isNotMember) {
        exists = true; // Pode existir, mas não somos membros para confirmar
        canPost = false;
        statusMessage = 'Não é membro deste grupo (não foi possível verificar se existe)';
      }

      return {
        exists,
        canPost,
        title: null,
        error: statusMessage
      };
    }
  }

  /**
   * Envia mensagem no grupo como a conta do usuário conectado
   */
  async sendMessage(chatId, text) {
    if (!this.isConnected || !this.client) {
      throw new Error('Conta do Telegram desconectada.');
    }

    try {
      const cleanId = String(chatId).trim();
      let peer = cleanId;

      if (cleanId.startsWith('-100')) {
        peer = parseInt(cleanId.replace('-100', ''), 10);
      } else if (!isNaN(cleanId)) {
        peer = parseInt(cleanId, 10);
      }

      const res = await this.client.sendMessage(peer, { message: text });
      return {
        success: true,
        messageId: res.id,
        date: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Userbot sendMessage Error]:', error);
      return {
        success: false,
        error: error.message || error.errorMessage || 'Falha ao enviar mensagem.'
      };
    }
  }
}

module.exports = new UserbotService();
