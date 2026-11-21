/**
 * AUT0MARKETING - Lógica de Configurações do Sistema
 */

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Submissão do formulário de parâmetros operacionais
  document.getElementById('form-settings-operational').addEventListener('submit', handleSaveOperational);

  // Alteração de senha administrativa
  document.getElementById('form-change-password').addEventListener('submit', handleChangePassword);

  // Userbot: enviar código de login
  document.getElementById('btn-userbot-send-code').addEventListener('click', handleUserbotSendCode);

  // Userbot: confirmar login com código
  document.getElementById('form-userbot-login').addEventListener('submit', handleUserbotSignIn);

  // Userbot: cancelar fluxo de código
  document.getElementById('btn-userbot-cancel-code').addEventListener('click', () => {
    document.getElementById('userbot-code-section').classList.add('d-none');
    document.getElementById('userbot-login-result').classList.add('d-none');
  });

  // Userbot: desconectar conta
  document.getElementById('btn-userbot-disconnect').addEventListener('click', handleUserbotDisconnect);

  // Meta/Facebook: testar conexão
  document.getElementById('btn-test-meta').addEventListener('click', testMetaToken);

  // Meta/Facebook: salvar token
  document.getElementById('form-settings-meta').addEventListener('submit', handleSaveMeta);

  // Meta/Facebook: desconectar
  document.getElementById('btn-meta-disconnect').addEventListener('click', handleMetaDisconnect);

  // Meta/Facebook: toggle visibilidade do token
  document.getElementById('btn-toggle-meta-visibility').addEventListener('click', () => {
    const input = document.getElementById('setting-meta-token');
    const icon = document.querySelector('#btn-toggle-meta-visibility i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'bi bi-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'bi bi-eye';
    }
  });
});

async function loadSettings() {
  try {
    const data = await api.get('/settings');
    if (data.success) {
      const { settings, database, environment } = data;

      document.getElementById('setting-emergency-pause').checked = settings.emergency_pause_all === 'true';
      document.getElementById('setting-frequency').value = settings.default_frequency_hours || '24';
      document.getElementById('setting-simulation-mode').checked = settings.simulation_mode === 'true';

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

    // Carregar status do Userbot
    try {
      const ubRes = await api.get('/userbot/status');
      renderUserbotStatus(ubRes);
    } catch (e) {
      // falha silenciosa ao carregar status do userbot
    }

    // Carregar status do Meta/Facebook
    try {
      const metaToken = settings.meta_page_access_token || '';
      renderMetaStatus(!!metaToken);
      if (metaToken) {
        document.getElementById('setting-meta-token').value = metaToken;
      }
    } catch (e) {
      // falha silenciosa
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

// ==========================================
// USERBOT - LOGIN DA CONTA DO USUÁRIO TELEGRAM
// ==========================================

function renderUserbotStatus(data) {
  const statusCard = document.getElementById('userbot-status-card');
  const loginForm = document.getElementById('form-userbot-login');
  const connectedBadge = document.getElementById('userbot-connected-badge');
  const connectedUser = document.getElementById('userbot-connected-user');

  if (data.connected) {
    statusCard.classList.remove('d-none');
    loginForm.classList.add('d-none');
    connectedBadge.className = 'badge bg-success';
    connectedBadge.textContent = 'Conectado';
    connectedUser.innerHTML = `<strong>${data.user.firstName || ''}</strong> ${data.user.username || ''} ${data.user.phone || ''}`.trim();
  } else {
    statusCard.classList.add('d-none');
    loginForm.classList.remove('d-none');
    document.getElementById('userbot-code-section').classList.add('d-none');
    document.getElementById('userbot-login-result').classList.add('d-none');
  }
}

async function handleUserbotSendCode() {
  const apiId = document.getElementById('userbot-api-id').value.trim();
  const apiHash = document.getElementById('userbot-api-hash').value.trim();
  const phone = document.getElementById('userbot-phone') ? document.getElementById('userbot-phone').value.trim() : '';
  const btn = document.getElementById('btn-userbot-send-code');
  const resultBox = document.getElementById('userbot-login-result');

  if (!apiId || !apiHash || !phone) {
    showToast('API ID, API Hash e Número de Telefone são obrigatórios.', 'error');
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
    resultBox.classList.add('d-none');

    const res = await api.post('/userbot/send-code', { apiId, apiHash, phone });
    if (res.success) {
      document.getElementById('userbot-code-section').classList.remove('d-none');
      resultBox.className = 'alert alert-success small font-monospace mt-3';
      resultBox.innerHTML = `<i class="bi bi-check-circle me-1"></i> ${escapeHtml(res.message)}`;
      resultBox.classList.remove('d-none');
      showToast('Código enviado para o seu Telegram!', 'success');
    }
  } catch (error) {
    resultBox.className = 'alert alert-danger small font-monospace mt-3';
    resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(error.message || 'Falha ao enviar código.')}`;
    resultBox.classList.remove('d-none');
    showToast('Falha ao enviar código: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send me-1"></i> Enviar Código de Login';
  }
}

async function handleUserbotSignIn(e) {
  e.preventDefault();
  const code = document.getElementById('userbot-code').value.trim();
  const password = document.getElementById('userbot-password').value.trim();
  const btn = document.getElementById('btn-userbot-sign-in');
  const resultBox = document.getElementById('userbot-login-result');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logando...';
    resultBox.classList.add('d-none');

    const res = await api.post('/userbot/sign-in', { code, password });
    if (res.success) {
      const ubRes = await api.get('/userbot/status');
      renderUserbotStatus(ubRes);
      showToast(res.message || 'Login realizado com sucesso!', 'success');
    }
  } catch (error) {
    resultBox.className = 'alert alert-danger small font-monospace mt-3';
    resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(error.message || 'Falha ao confirmar login.')}`;
    resultBox.classList.remove('d-none');
    showToast('Falha ao confirmar login: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Confirmar Login';
  }
}

async function handleUserbotDisconnect() {
  const btn = document.getElementById('btn-userbot-disconnect');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Desconectando...';

    const res = await api.post('/userbot/disconnect');
    if (res.success) {
      const ubRes = await api.get('/userbot/status');
      renderUserbotStatus(ubRes);
      showToast('Conta desconectada com sucesso.', 'success');
    }
  } catch (error) {
    showToast('Erro ao desconectar: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i> Desconectar Conta';
  }
}

// ==========================================
// META / FACEBOOK - INTEGRAÇÃO DE PÁGINA
// ==========================================

function renderMetaStatus(connected) {
  const statusCard = document.getElementById('meta-status-card');
  const loginForm = document.getElementById('form-settings-meta');
  const connectedBadge = document.getElementById('meta-connected-badge');
  const connectedPage = document.getElementById('meta-connected-page');

  if (connected) {
    statusCard.classList.remove('d-none');
    loginForm.classList.add('d-none');
    connectedBadge.className = 'badge bg-success';
    connectedBadge.textContent = 'Conectado';
    connectedPage.textContent = 'Token da Página configurado';
  } else {
    statusCard.classList.add('d-none');
    loginForm.classList.remove('d-none');
    document.getElementById('meta-test-result').classList.add('d-none');
  }
}

async function testMetaToken() {
  const token = document.getElementById('setting-meta-token').value.trim();
  const resultBox = document.getElementById('meta-test-result');
  const btn = document.getElementById('btn-test-meta');

  if (!token) {
    showToast('Informe o Page Access Token do Facebook.', 'error');
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Testando...';
    resultBox.classList.add('d-none');

    const res = await api.post('/settings/test-meta', { token });
    if (res.success) {
      resultBox.className = 'alert alert-success small font-monospace mb-3';
      resultBox.innerHTML = `<i class="bi bi-check-circle me-1"></i> ${escapeHtml(res.message)}`;
      resultBox.classList.remove('d-none');
      showToast('Conexão com Facebook verificada com sucesso!', 'success');
    } else {
      resultBox.className = 'alert alert-danger small font-monospace mb-3';
      resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(res.error || 'Falha ao testar.')}`;
      resultBox.classList.remove('d-none');
    }
  } catch (error) {
    resultBox.className = 'alert alert-danger small font-monospace mb-3';
    resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(error.message || 'Falha ao testar conexão.')}`;
    resultBox.classList.remove('d-none');
    showToast('Falha ao testar Facebook: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-facebook me-1"></i> Testar Conexão';
  }
}

async function handleSaveMeta(e) {
  e.preventDefault();
  const token = document.getElementById('setting-meta-token').value.trim();
  const btn = document.getElementById('btn-save-meta');

  if (!token) {
    showToast('Informe o Page Access Token do Facebook.', 'error');
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    const res = await api.put('/settings', {
      meta_page_access_token: token
    });

    if (res.success) {
      renderMetaStatus(true);
      showToast('Token do Facebook salvo com sucesso!', 'success');
    }
  } catch (error) {
    showToast(error.message || 'Erro ao salvar token do Facebook.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Salvar Token';
  }
}

async function handleMetaDisconnect() {
  const btn = document.getElementById('btn-meta-disconnect');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Desconectando...';

    const res = await api.put('/settings', {
      meta_page_access_token: ''
    });

    if (res.success) {
      renderMetaStatus(false);
      document.getElementById('setting-meta-token').value = '';
      showToast('Página do Facebook desconectada com sucesso.', 'success');
    }
  } catch (error) {
    showToast('Erro ao desconectar Facebook: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i> Desconectar Página';
  }
}
