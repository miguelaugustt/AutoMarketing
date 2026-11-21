const db = require('../database/db');
const telegramIntegration = require('../integrations/telegram.integration');
const metaIntegration = require('../integrations/meta.integration');
const axios = require('axios');

class SettingsController {
  async getSettings(req, res, next) {
    try {
      const settings = await db.getSettings();
      const token = settings.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
      const maskedToken = token ? `${token.substring(0, 6)}...${token.slice(-4)}` : '';

      return res.json({
        success: true,
        settings: {
          ...settings,
          telegram_bot_token: token,
          telegram_token_masked: maskedToken
        },
        database: db.getConnectionInfo(),
        environment: {
          node_env: process.env.NODE_ENV || 'development',
          has_supabase_env: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
          scheduler_cron: process.env.SCHEDULER_CRON || '*/30 * * * *'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const updates = req.body;
      const allowedKeys = [
        'emergency_pause_all',
        'default_frequency_hours',
        'simulation_mode',
        'telegram_bot_token',
        'meta_page_access_token'
      ];

      for (const [key, val] of Object.entries(updates)) {
        if (allowedKeys.includes(key)) {
          await db.setSetting(key, String(val));
        }
      }

      return res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso.'
      });
    } catch (error) {
      next(error);
    }
  }

  async testTelegramBot(req, res, next) {
    try {
      const { token } = req.body;
      const testToken = token || (await db.getSetting('telegram_bot_token')) || process.env.TELEGRAM_BOT_TOKEN;

      const result = await telegramIntegration.getMe(testToken);
      if (result.success) {
        return res.json({
          success: true,
          message: result.simulated
            ? 'Bot em modo simulação (Nenhum token real configurado).'
            : `Bot conectado com sucesso! Nome: @${result.bot.username} (${result.bot.first_name})`,
          bot: result.bot,
          simulated: result.simulated
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async testMetaToken(req, res, next) {
    try {
      const { token } = req.body;
      const testToken = token || process.env.META_PAGE_ACCESS_TOKEN || '';

      if (!testToken) {
        return res.status(400).json({
          success: false,
          error: 'Page Access Token do Facebook não informado.'
        });
      }

      try {
        const response = await axios.get('https://graph.facebook.com/v19.0/me', {
          params: {
            access_token: testToken,
            fields: 'id,name'
          },
          timeout: 8000
        });

        if (response.data && response.data.id) {
          return res.json({
            success: true,
            message: `Token válido! Usuário: ${response.data.name || response.data.id}`,
            user: response.data
          });
        }

        return res.status(400).json({
          success: false,
          error: 'Resposta inválida da API do Facebook.'
        });
      } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        return res.status(400).json({
          success: false,
          error: `Erro Facebook: ${errMsg}`
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
