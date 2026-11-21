/**
 * AUT0MARKETING - Lógica de Gerenciamento de Grupos e Comunidades (Permissões Automáticas)
 */

let groupModalInstance = null;
let currentGroups = [];

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalGroup');
  if (modalEl) {
    groupModalInstance = new bootstrap.Modal(modalEl);
  }

  loadGroups();

  document.getElementById('filter-group-search').addEventListener('input', debounce(loadGroups, 300));
  document.getElementById('filter-group-platform').addEventListener('change', loadGroups);
  document.getElementById('filter-group-status').addEventListener('change', loadGroups);
  document.getElementById('btn-clear-group-filters').addEventListener('click', () => {
    document.getElementById('filter-group-search').value = '';
    document.getElementById('filter-group-platform').value = '';
    document.getElementById('filter-group-status').value = '';
    loadGroups();
  });

  document.getElementById('btn-open-create-group').addEventListener('click', openCreateModal);
  document.getElementById('form-group').addEventListener('submit', handleSaveGroup);
  document.getElementById('btn-sync-all').addEventListener('click', syncAllGroupsPermissions);
  document.getElementById('btn-check-all-groups').addEventListener('click', checkAllGroupsActive);

  const btnDetectChat = document.getElementById('btn-detect-chat-id');
  if (btnDetectChat) {
    btnDetectChat.addEventListener('click', detectChatIdAutomatically);
  }
});

async function loadGroups() {
  const search = document.getElementById('filter-group-search').value.trim();
  const platform = document.getElementById('filter-group-platform').value;
  const statusFilter = document.getElementById('filter-group-status').value;

  let query = '?';
  if (search) query += `search=${encodeURIComponent(search)}&`;
  if (platform) query += `platform=${encodeURIComponent(platform)}&`;
  if (statusFilter === 'authorized') query += 'authorizedOnly=true&';

  try {
    const data = await api.get(`/groups${query}`);
    if (data.success) {
      currentGroups = data.groups;
      if (statusFilter && statusFilter !== 'authorized') {
        currentGroups = currentGroups.filter(g => g.authorization_status === statusFilter);
      }
      renderGroupsTable(currentGroups);
    }
  } catch (error) {
    showToast('Falha ao listar grupos: ' + error.message, 'error');
  }
}

function renderGroupsTable(groups) {
  const tbody = document.getElementById('groups-tbody');
  if (!groups || groups.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <i class="bi bi-people fs-2 d-block mb-2"></i>
          Nenhuma comunidade cadastrada até o momento.
        </td>
      </tr>
    `;
    return;
  }

  const statusLabels = {
    pending: { label: 'Pendente de Verificação', class: 'pending', icon: 'bi-hourglass-split' },
    authorized: { label: 'Autorizado pelo Bot', class: 'authorized', icon: 'bi-check-circle' },
    unauthorized: { label: 'Sem Permissão no Chat', class: 'unauthorized', icon: 'bi-x-circle' },
    blocked: { label: 'Bloqueado', class: 'blocked', icon: 'bi-slash-circle' },
    unavailable: { label: 'Bot Ausente no Chat', class: 'unavailable', icon: 'bi-exclamation-triangle' }
  };

  tbody.innerHTML = groups.map(g => {
    const statusInfo = statusLabels[g.authorization_status] || statusLabels.pending;
    
    // Cooldown de 24h
    let cooldownText = '<span class="text-success small">Apto para envio</span>';
    if (g.last_publication_at) {
      const elapsedHours = (Date.now() - new Date(g.last_publication_at).getTime()) / (1000 * 60 * 60);
      if (elapsedHours < 24) {
        const remaining = (24 - elapsedHours).toFixed(1);
        cooldownText = `<span class="text-warning small"><i class="bi bi-clock-history me-1"></i>Aguarde ${remaining}h</span>`;
      } else {
        cooldownText = `<span class="text-muted small">Há ${Math.floor(elapsedHours)}h (Liberado)</span>`;
      }
    } else {
      cooldownText = '<span class="text-info small">Nunca publicado</span>';
    }

    return `
      <tr>
        <td>
          <div class="fw-bold text-white fs-6">${escapeHtml(g.name)}</div>
          ${g.invite_url ? `<a href="${g.invite_url}" target="_blank" class="small text-info text-decoration-none"><i class="bi bi-link-45deg"></i>Link do Grupo</a>` : ''}
        </td>
        <td>
          <span class="badge-platform ${g.platform?.toLowerCase() || ''}">${g.platform}</span>
          <div class="text-secondary small font-monospace mt-1">${escapeHtml(g.external_group_id || 'ID Pendente')}</div>
        </td>
        <td>
          <span class="badge-status ${statusInfo.class}">
            <i class="bi ${statusInfo.icon}"></i> ${statusInfo.label}
          </span>
          ${!g.active ? '<span class="badge bg-danger bg-opacity-25 text-danger small ms-1">Inativo</span>' : ''}
        </td>
        <td>
          <div class="d-flex flex-column gap-1 small">
            <div>
              <i class="bi ${g.advertising_permission ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} me-1"></i>
              Divulgação: ${g.advertising_permission ? 'Autorizada' : 'Negada'}
            </div>
            <div>
              <i class="bi ${g.automation_permission ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} me-1"></i>
              Automação: ${g.automation_permission ? 'Ativa' : 'Inativa'}
            </div>
          </div>
        </td>
        <td>
          <span class="badge-status ${g.active ? 'authorized' : 'blocked'}">
            <i class="bi ${g.active ? 'bi-check-circle-fill' : 'bi-x-circle'}"></i>
            ${g.active ? 'Ativo no Sistema' : 'Inativo / Deletado'}
          </span>
        </td>
        <td>${cooldownText}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-warning me-1" onclick="testGroupPermissions('${g.id}')" title="Re-verificar Permissões Agora">
            <i class="bi bi-robot"></i> Revalidar
          </button>
          <button class="btn btn-sm btn-outline-info me-1" onclick="openEditModal('${g.id}')" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteGroup('${g.id}')" title="Excluir">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateModal() {
  document.getElementById('modalGroupTitle').innerHTML = '<i class="bi bi-people text-primary me-2"></i>Cadastrar Grupo / Canal';
  document.getElementById('group-id').value = '';
  document.getElementById('group-name').value = '';
  document.getElementById('group-platform').value = 'Telegram';
  document.getElementById('group-external-id').value = '';
  document.getElementById('group-invite-url').value = '';
  document.getElementById('group-active').checked = true;

  const box = document.getElementById('detected-chats-box');
  if (box) box.classList.add('d-none');

  if (groupModalInstance) groupModalInstance.show();
}

function openEditModal(id) {
  const g = currentGroups.find(item => item.id === id);
  if (!g) return;

  document.getElementById('modalGroupTitle').innerHTML = '<i class="bi bi-pencil-square text-primary me-2"></i>Editar Grupo / Canal';
  document.getElementById('group-id').value = g.id;
  document.getElementById('group-name').value = g.name;
  document.getElementById('group-platform').value = g.platform;
  document.getElementById('group-external-id').value = g.external_group_id || '';
  document.getElementById('group-invite-url').value = g.invite_url || '';
  document.getElementById('group-active').checked = g.active;

  const box = document.getElementById('detected-chats-box');
  if (box) box.classList.add('d-none');

  if (groupModalInstance) groupModalInstance.show();
}

async function handleSaveGroup(e) {
  e.preventDefault();
  const id = document.getElementById('group-id').value;
  const extIdInput = document.getElementById('group-external-id');
  const inviteUrlInput = document.getElementById('group-invite-url');

  let extId = extIdInput.value.trim();
  let inviteUrl = inviteUrlInput.value.trim();

  // Se o usuário colou um link de convite privado com '+' no campo de ID Externo
  if (extId.includes('t.me/+') || extId.includes('joinchat/')) {
    if (!inviteUrl) {
      inviteUrlInput.value = extId;
    }
    showToast('Atenção: "https://t.me/+..." é um link de convite! O Telegram exige o ID numérico do chat (que começa com -100). Clique em "Detectar ID" ou use o bot @RawDataBot no grupo para pegar o número.', 'warning', 8000);
    return;
  }

  const payload = {
    name: document.getElementById('group-name').value.trim(),
    platform: document.getElementById('group-platform').value,
    external_group_id: extId,
    invite_url: inviteUrl,
    active: document.getElementById('group-active').checked
  };

  const btn = document.getElementById('btn-save-group');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validando com Bot...';

    if (id) {
      await api.put(`/groups/${id}`, payload);
      showToast('Grupo atualizado com sucesso!', 'success');
    } else {
      const res = await api.post('/groups', payload);
      showToast(res.message || 'Grupo cadastrado com sucesso!', 'success', 5000);
    }

    if (groupModalInstance) groupModalInstance.hide();
    loadGroups();
  } catch (error) {
    showToast(error.message || 'Erro ao salvar grupo.', 'error', 7000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Salvar e Validar com Bot';
  }
}

async function detectChatIdAutomatically() {
  const box = document.getElementById('detected-chats-box');
  const btn = document.getElementById('btn-detect-chat-id');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Detectando...';
    box.classList.remove('d-none');
    box.innerHTML = '<span class="text-info"><i class="bi bi-arrow-repeat spin me-1"></i> Consultando atualizações do seu bot no Telegram...</span>';

    const res = await api.get('/groups/detect-chats');
    if (res.success && res.chats && res.chats.length > 0) {
      box.innerHTML = `
        <div class="fw-bold text-success mb-1 small"><i class="bi bi-check-circle me-1"></i> Grupos detectados onde seu bot foi adicionado:</div>
        <div class="d-flex flex-column gap-1">
          ${res.chats.map(chat => `
            <div class="d-flex justify-content-between align-items-center p-1 px-2 rounded bg-black bg-opacity-40">
              <div class="small">
                <strong>${escapeHtml(chat.title)}</strong>
                <code class="text-info ms-1">${chat.id}</code>
              </div>
              <button type="button" class="btn btn-sm btn-primary py-0 px-2" style="font-size:0.75rem;" onclick="selectDetectedChat('${chat.id}', '${escapeHtml(chat.title)}')">
                Usar este ID
              </button>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="text-warning mb-1 small">
          <i class="bi bi-info-circle me-1"></i> Nenhum grupo novo detectado nas últimas mensagens do bot.
        </div>
        <div class="text-secondary" style="font-size:0.75rem;">
          <strong>Como pegar o ID numérico do seu grupo em 10 segundos:</strong>
          <ol class="ps-3 mb-0 mt-1">
            <li>Abra seu grupo no Telegram e adicione o bot <code class="text-info">@RawDataBot</code>.</li>
            <li>Ele responderá na hora com uma mensagem contendo <strong class="text-white">"id": -100...</strong>.</li>
            <li>Copie o número (com o sinal de menos), cole no campo de ID e pode remover o @RawDataBot!</li>
          </ol>
        </div>
      `;
    }
  } catch (error) {
    box.innerHTML = `
      <div class="text-danger small">
        <i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(error.message || 'Configure o token do bot em Configurações & API primeiro.')}
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-magic me-1"></i> Detectar ID Automaticamente';
  }
}

function selectDetectedChat(id, title) {
  document.getElementById('group-external-id').value = id;
  const nameInput = document.getElementById('group-name');
  if (!nameInput.value.trim() && title) {
    nameInput.value = title;
  }
  showToast(`ID ${id} selecionado com sucesso!`, 'success');
  document.getElementById('detected-chats-box').classList.add('d-none');
}

async function testGroupPermissions(id) {
  try {
    showToast('Revalidando permissões diretamente com o Telegram...', 'info');
    const res = await api.post(`/groups/${id}/test-permissions`);
    if (res.success) {
      showToast(`Permissões atualizadas automaticamente! ${res.message}`, 'success', 5000);
      loadGroups();
    } else {
      showToast(`Atenção: ${res.message || 'Bot sem permissão no chat.'}`, 'warning', 6000);
      loadGroups();
    }
  } catch (error) {
    showToast(`Erro na verificação: ${error.message}`, 'error', 6000);
  }
}

async function syncAllGroupsPermissions() {
  const btn = document.getElementById('btn-sync-all');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sincronizando...';

    const res = await api.post('/groups/sync-all');
    if (res.success) {
      showToast(res.message, 'success', 5000);
      loadGroups();
    }
  } catch (error) {
    showToast('Erro ao sincronizar grupos: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Sincronizar Permissões com Telegram';
  }
}

async function checkAllGroupsActive() {
  const btn = document.getElementById('btn-check-all-groups');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verificando...';
    showToast('Verificando se grupos ainda existem no Telegram...', 'info');

    const res = await api.post('/groups/check-all');
    if (res.success) {
      showToast(res.message, 'success', 6000);
      loadGroups();
    } else {
      showToast(res.message || 'Falha na verificação.', 'error');
    }
  } catch (error) {
    showToast('Erro ao verificar grupos: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-shield-check me-1"></i> Verificar Grupos Ativos/Deletados';
  }
}

async function deleteGroup(id) {
  if (!confirm('Deseja realmente remover esta comunidade do sistema?')) {
    return;
  }

  try {
    await api.delete(`/groups/${id}`);
    showToast('Grupo removido com sucesso.', 'success');
    loadGroups();
  } catch (error) {
    showToast('Erro ao excluir grupo: ' + error.message, 'error');
  }
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
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
