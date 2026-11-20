/**
 * AUT0MARKETING - Lógica do Dashboard Principal
 */

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();

  // Evento do botão Kill Switch (Interrupção Geral)
  const killSwitchBtn = document.getElementById('btn-kill-switch');
  if (killSwitchBtn) {
    killSwitchBtn.addEventListener('click', toggleEmergencyKillSwitch);
  }

  // Evento do botão Reativar Sistema no alerta
  const resumeBtn = document.getElementById('btn-resume-system');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', toggleEmergencyKillSwitch);
  }

  // Evento do botão Disparar Ciclo Agora
  const triggerCycleBtn = document.getElementById('btn-trigger-cycle');
  if (triggerCycleBtn) {
    triggerCycleBtn.addEventListener('click', triggerManualDistribution);
  }
});

async function loadDashboardData() {
  try {
    const data = await api.get('/dashboard/stats');
    if (!data.success) return;

    const { stats, recentPublications, scheduler, database } = data;

    // Atualiza contadores de produtos
    document.getElementById('stat-products-total').textContent = stats.products.total;
    document.getElementById('stat-products-active').textContent = `${stats.products.active} ativos`;

    // Atualiza contadores de grupos
    document.getElementById('stat-groups-authorized').textContent = stats.groups.authorized;
    document.getElementById('stat-groups-total').textContent = stats.groups.total;
    document.getElementById('stat-groups-pending').textContent = stats.groups.pending;

    // Atualiza contadores de campanhas
    document.getElementById('stat-campaigns-active').textContent = stats.campaigns.active;

    // Atualiza publicações
    document.getElementById('stat-publications-published').textContent = stats.publications.published;
    document.getElementById('stat-publications-failed').textContent = `${stats.publications.failed} falhas`;
    document.getElementById('stat-publications-blocked').textContent = `${stats.publications.blocked} bloqueios`;

    // Atualiza badges de infraestrutura
    document.getElementById('db-type-badge').textContent = database.type === 'supabase' ? 'Supabase' : 'Local (JSON)';
    if (scheduler.lastRun) {
      const date = new Date(scheduler.lastRun);
      document.getElementById('scheduler-last-run').textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Atualiza estado do Kill Switch (Pausa Geral)
    updateEmergencyUI(stats.system.emergency_pause_all);

    // Renderiza atividades recentes
    renderRecentPublications(recentPublications);
  } catch (error) {
    showToast('Falha ao sincronizar dados do painel: ' + error.message, 'error');
  }
}

function updateEmergencyUI(isPaused) {
  const statusBadge = document.getElementById('system-status-badge');
  const alertKillSwitch = document.getElementById('alert-kill-switch');
  const killSwitchBtn = document.getElementById('btn-kill-switch');

  if (isPaused) {
    statusBadge.className = 'badge-status blocked';
    statusBadge.innerHTML = '<i class="bi bi-pause-circle-fill"></i> Sistema Pausado (Kill Switch)';
    alertKillSwitch.classList.remove('d-none');
    alertKillSwitch.classList.add('d-flex');
    killSwitchBtn.className = 'btn-emergency active-paused';
    killSwitchBtn.innerHTML = '<i class="bi bi-play-circle-fill"></i> Reativar Sistema';
  } else {
    statusBadge.className = 'badge-status authorized';
    statusBadge.innerHTML = '<i class="bi bi-check-circle-fill"></i> Sistema Operacional';
    alertKillSwitch.classList.remove('d-flex');
    alertKillSwitch.classList.add('d-none');
    killSwitchBtn.className = 'btn-emergency';
    killSwitchBtn.innerHTML = '<i class="bi bi-stop-circle-fill"></i> Interrupção Geral';
  }
}

async function toggleEmergencyKillSwitch() {
  const isCurrentlyPaused = document.getElementById('btn-kill-switch').classList.contains('active-paused');
  const confirmMsg = isCurrentlyPaused
    ? 'Deseja reativar o sistema e retomar as publicações automáticas?'
    : 'ATENÇÃO: Deseja acionar a Interrupção Geral de Emergência? Todas as divulgações serão imediatamente congeladas!';

  if (!confirm(confirmMsg)) return;

  try {
    const res = await api.post('/dashboard/toggle-emergency');
    if (res.success) {
      showToast(res.message, res.emergency_pause_all ? 'warning' : 'success');
      updateEmergencyUI(res.emergency_pause_all);
    }
  } catch (error) {
    showToast('Erro ao alternar status do sistema: ' + error.message, 'error');
  }
}

async function triggerManualDistribution() {
  const btn = document.getElementById('btn-trigger-cycle');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';

    const res = await api.post('/dashboard/trigger-run');
    if (res.success) {
      showToast('Ciclo de automação disparado com sucesso!', 'success');
      loadDashboardData();
    }
  } catch (error) {
    showToast(error.message || 'Erro ao executar automação.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-play-circle"></i> Executar Ciclo Agora';
  }
}

function renderRecentPublications(publications) {
  const tbody = document.getElementById('recent-pubs-tbody');
  if (!publications || publications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-2"></i>
          Nenhuma publicação registrada até o momento.
        </td>
      </tr>
    `;
    return;
  }

  const statusMap = {
    published: { label: 'Publicada', class: 'published', icon: 'bi-check2-circle' },
    scheduled: { label: 'Agendada', class: 'scheduled', icon: 'bi-clock' },
    failed: { label: 'Falhou', class: 'failed', icon: 'bi-x-circle' },
    blocked_unauthorized: { label: 'Bloqueada (Sem Permissão)', class: 'blocked_unauthorized', icon: 'bi-shield-slash' },
    canceled: { label: 'Cancelada', class: 'unavailable', icon: 'bi-slash-circle' }
  };

  tbody.innerHTML = publications.map(pub => {
    const timeFormatted = new Date(pub.published_at || pub.created_at).toLocaleString([], {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    const statusInfo = statusMap[pub.status] || { label: pub.status, class: 'pending', icon: 'bi-info-circle' };
    const groupName = pub.group ? pub.group.name : 'Grupo Removido';
    const prodName = pub.product ? pub.product.name : 'Produto Removido';

    return `
      <tr>
        <td class="text-muted small">${timeFormatted}</td>
        <td>
          <div class="fw-semibold text-white">${escapeHtml(groupName)}</div>
          <span class="badge-platform ${pub.group?.platform?.toLowerCase() || ''}">
            ${pub.group?.platform || 'Telegram'}
          </span>
        </td>
        <td>
          <div class="fw-semibold text-white">${escapeHtml(prodName)}</div>
          <span class="small text-muted">${pub.product?.platform || 'Kiwify'}</span>
        </td>
        <td>
          <span class="badge-status ${statusInfo.class}">
            <i class="bi ${statusInfo.icon}"></i> ${statusInfo.label}
          </span>
        </td>
      </tr>
    `;
  }).join('');
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
