/**
 * AUT0MARKETING - Lógica de Gerenciamento de Grupos e Comunidades
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
          Nenhum grupo encontrado com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  const statusLabels = {
    pending: { label: 'Pendente de Verificação', class: 'pending', icon: 'bi-hourglass-split' },
    authorized: { label: 'Autorizado', class: 'authorized', icon: 'bi-check-circle' },
    unauthorized: { label: 'Não Autorizado', class: 'unauthorized', icon: 'bi-x-circle' },
    blocked: { label: 'Bloqueado', class: 'blocked', icon: 'bi-slash-circle' },
    unavailable: { label: 'Indisponível', class: 'unavailable', icon: 'bi-exclamation-triangle' }
  };

  tbody.innerHTML = groups.map(g => {
    const statusInfo = statusLabels[g.authorization_status] || statusLabels.pending;
    
    // Análise do cooldown de 24 horas
    let cooldownText = '<span class="text-success small">Apto para envio</span>';
    if (g.last_publication_at) {
      const elapsedHours = (Date.now() - new Date(g.last_publication_at).getTime()) / (1000 * 60 * 60);
      if (elapsedHours < 24) {
        const remaining = (24 - elapsedHours).toFixed(1);
        cooldownText = `<span class="text-warning small"><i class="bi bi-clock-history me-1"></i>Cooldown: restam ${remaining}h</span>`;
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
              Divulgação: ${g.advertising_permission ? 'Sim' : 'Não'}
            </div>
            <div>
              <i class="bi ${g.automation_permission ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} me-1"></i>
              Automação: ${g.automation_permission ? 'Sim' : 'Não'}
            </div>
          </div>
        </td>
        <td>${cooldownText}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-warning me-1" onclick="testGroupPermissions('${g.id}')" title="Testar Permissões do Bot">
            <i class="bi bi-robot"></i> Testar
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
  document.getElementById('modalGroupTitle').innerHTML = '<i class="bi bi-people text-primary me-2"></i>Cadastrar Grupo / Comunidade';
  document.getElementById('group-id').value = '';
  document.getElementById('group-name').value = '';
  document.getElementById('group-platform').value = 'Telegram';
  document.getElementById('group-external-id').value = '';
  document.getElementById('group-invite-url').value = '';
  document.getElementById('group-auth-status').value = 'pending';
  document.getElementById('group-advertising-permission').checked = false;
  document.getElementById('group-automation-permission').checked = false;
  document.getElementById('group-active').checked = true;

  if (groupModalInstance) groupModalInstance.show();
}

function openEditModal(id) {
  const g = currentGroups.find(item => item.id === id);
  if (!g) return;

  document.getElementById('modalGroupTitle').innerHTML = '<i class="bi bi-pencil-square text-primary me-2"></i>Editar Grupo / Comunidade';
  document.getElementById('group-id').value = g.id;
  document.getElementById('group-name').value = g.name;
  document.getElementById('group-platform').value = g.platform;
  document.getElementById('group-external-id').value = g.external_group_id || '';
  document.getElementById('group-invite-url').value = g.invite_url || '';
  document.getElementById('group-auth-status').value = g.authorization_status || 'pending';
  document.getElementById('group-advertising-permission').checked = Boolean(g.advertising_permission);
  document.getElementById('group-automation-permission').checked = Boolean(g.automation_permission);
  document.getElementById('group-active').checked = g.active;

  if (groupModalInstance) groupModalInstance.show();
}

async function handleSaveGroup(e) {
  e.preventDefault();
  const id = document.getElementById('group-id').value;
  const payload = {
    name: document.getElementById('group-name').value.trim(),
    platform: document.getElementById('group-platform').value,
    external_group_id: document.getElementById('group-external-id').value.trim(),
    invite_url: document.getElementById('group-invite-url').value.trim(),
    authorization_status: document.getElementById('group-auth-status').value,
    advertising_permission: document.getElementById('group-advertising-permission').checked,
    automation_permission: document.getElementById('group-automation-permission').checked,
    active: document.getElementById('group-active').checked
  };

  const btn = document.getElementById('btn-save-group');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    if (id) {
      await api.put(`/groups/${id}`, payload);
      showToast('Grupo atualizado com sucesso!', 'success');
    } else {
      await api.post('/groups', payload);
      showToast('Grupo cadastrado com sucesso!', 'success');
    }

    if (groupModalInstance) groupModalInstance.hide();
    loadGroups();
  } catch (error) {
    showToast(error.message || 'Erro ao salvar grupo.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Salvar Grupo';
  }
}

async function testGroupPermissions(id) {
  try {
    showToast('Consultando permissões do bot na plataforma...', 'info');
    const res = await api.post(`/groups/${id}/test-permissions`);
    if (res.success) {
      showToast(`Sucesso! ${res.message}`, 'success', 5000);
      loadGroups();
    }
  } catch (error) {
    showToast(`Erro na verificação: ${error.message}`, 'error', 6000);
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
