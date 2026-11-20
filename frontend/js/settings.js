/**
 * AUT0MARKETING - Lógica de Configurações do Sistema
 */

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Submissão do formulário de parâmetros operacionais
  document.getElementById('form-settings-operational').addEventListener('submit', handleSaveOperational);

  // Submissão do formulário de token Telegram
  document.getElementById('form-settings-telegram').addEventListener('submit', handleSaveTelegram);

  // Testar conexão do Bot Telegram
  document.getElementById('btn-test-telegram').addEventListener('click', testTelegramBot);

  // Toggle visibilidade do token
  document.getElementById('btn-toggle-token-visibility').addEventListener('click', () => {
    const input = document.getElementById('setting-telegram-token');
    const icon = document.querySelector('#btn-toggle-token-visibility i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'bi bi-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'bi bi-eye';
    }
  });

  // Alteração de senha administrativa
  document.getElementById('form-change-password').addEventListener('submit', handleChangePassword);
});

async function loadSettings() {
  try {
    const data = await api.get('/settings');
    if (data.success) {
      const { settings, database, environment } = data;

      document.getElementById('setting-emergency-pause').checked = settings.emergency_pause_all === 'true';
      document.getElementById('setting-frequency').value = settings.default_frequency_hours || '24';
      document.getElementById('setting-simulation-mode').checked = settings.simulation_mode === 'true';

      if (settings.telegram_bot_token) {
        document.getElementById('setting-telegram-token').value = settings.telegram_bot_token;
      }

      // Status do Banco
      const dbBadge = document.getElementById('db-status-badge');
      if (database.type === 'supabase') {
        dbBadge.className = 'badge bg-success';
        dbBadge.textContent = 'Supabase Conectado';
      } else {
        dbBadge.className = 'badge bg-primary';
        dbBadge.textContent = 'Local Resiliente (JSON)';
      }

      const envBadge = document.getElementById('db-supabase-env-badge');
      envBadge.textContent = environment.has_supabase_env ? 'Configuradas em .env' : 'Não configuradas';
      envBadge.className = environment.has_supabase_env ? 'small text-success fw-bold' : 'small text-muted';
    }
  } catch (error) {
    showToast('Falha ao carregar configurações: ' + error.message, 'error');
  }
}

async function handleSaveOperational(e) {
  e.preventDefault();
  const emergencyPause = document.getElementById('setting-emergency-pause').checked;
  const frequency = document.getElementById('setting-frequency').value;
  const simulationMode = document.getElementById('setting-simulation-mode').checked;

  const btn = document.getElementById('btn-save-operational');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    const res = await api.put('/settings', {
      emergency_pause_all: emergencyPause,
      default_frequency_hours: frequency,
      simulation_mode: simulationMode
    });

    if (res.success) {
      showToast('Parâmetros operacionais salvos com sucesso!', 'success');
    }
  } catch (error) {
    showToast(error.message || 'Erro ao salvar configurações.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Salvar Parâmetros';
  }
}

async function handleSaveTelegram(e) {
  e.preventDefault();
  const token = document.getElementById('setting-telegram-token').value.trim();
  const btn = document.getElementById('btn-save-telegram');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    const res = await api.put('/settings', {
      telegram_bot_token: token
    });

    if (res.success) {
      showToast('Token do Telegram salvo com sucesso!', 'success');
    }
  } catch (error) {
    showToast(error.message || 'Erro ao salvar token.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Salvar Token';
  }
}

async function testTelegramBot() {
  const token = document.getElementById('setting-telegram-token').value.trim();
  const resultBox = document.getElementById('telegram-test-result');
  const btn = document.getElementById('btn-test-telegram');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Testando...';
    resultBox.classList.add('d-none');

    const res = await api.post('/settings/test-telegram', { token });
    if (res.success) {
      resultBox.className = 'alert alert-success small font-monospace mb-3';
      resultBox.innerHTML = `<i class="bi bi-check-circle me-1"></i> ${escapeHtml(res.message)}`;
      resultBox.classList.remove('d-none');
      showToast('Comunicação com Telegram verificada com sucesso!', 'success');
    }
  } catch (error) {
    resultBox.className = 'alert alert-danger small font-monospace mb-3';
    resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> Falha: ${escapeHtml(error.message)}`;
    resultBox.classList.remove('d-none');
    showToast('Falha no teste do bot: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-robot me-1"></i> Testar Conexão do Bot';
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const btn = document.getElementById('btn-change-password');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Atualizando...';

    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    if (res.success) {
      showToast('Senha administrativa alterada com sucesso!', 'success');
      document.getElementById('form-change-password').reset();
    }
  } catch (error) {
    showToast(error.message || 'Erro ao alterar senha.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-shield-lock me-1"></i> Atualizar Senha';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
