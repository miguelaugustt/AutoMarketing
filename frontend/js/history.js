/**
 * AUT0MARKETING - Lógica do Histórico e Auditoria
 */

let historyModalInstance = null;
let currentPublications = [];

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalHistoryDetails');
  if (modalEl) {
    historyModalInstance = new bootstrap.Modal(modalEl);
  }

  loadHistory();

  document.getElementById('filter-history-status').addEventListener('change', loadHistory);
  document.getElementById('filter-history-limit').addEventListener('change', loadHistory);
  document.getElementById('btn-reset-history-filters').addEventListener('click', () => {
    document.getElementById('filter-history-status').value = '';
    document.getElementById('filter-history-limit').value = '100';
    loadHistory();
  });
  document.getElementById('btn-refresh-history').addEventListener('click', loadHistory);
});

async function loadHistory() {
  const status = document.getElementById('filter-history-status').value;
  const limit = document.getElementById('filter-history-limit').value;

  let query = `?limit=${limit}&`;
  if (status) query += `status=${encodeURIComponent(status)}&`;

  try {
    const data = await api.get(`/publications${query}`);
    if (data.success) {
      currentPublications = data.publications;
      renderHistoryTable(currentPublications);
    }
  } catch (error) {
    showToast('Falha ao obter histórico de publicações: ' + error.message, 'error');
  }
}

function renderHistoryTable(publications) {
  const tbody = document.getElementById('history-tbody');
  if (!publications || publications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <i class="bi bi-clock-history fs-2 d-block mb-2"></i>
          Nenhum registro de publicação localizado.
        </td>
      </tr>
    `;
    return;
  }

  const statusMap = {
    published: { label: 'Publicada', class: 'published', icon: 'bi-check2-circle' },
    scheduled: { label: 'Agendada', class: 'scheduled', icon: 'bi-clock' },
    failed: { label: 'Falhou', class: 'failed', icon: 'bi-x-circle' },
    blocked_unauthorized: { label: 'Bloqueada (Sem Autorização)', class: 'blocked_unauthorized', icon: 'bi-shield-slash' },
    canceled: { label: 'Cancelada', class: 'unavailable', icon: 'bi-slash-circle' }
  };

  tbody.innerHTML = publications.map(pub => {
    const timeFormatted = new Date(pub.published_at || pub.created_at).toLocaleString();
    const statusInfo = statusMap[pub.status] || { label: pub.status, class: 'pending', icon: 'bi-info-circle' };
    const groupName = pub.group ? pub.group.name : 'Grupo Removido';
    const prodName = pub.product ? pub.product.name : 'Produto Removido';
    const campName = pub.campaign ? pub.campaign.name : 'Envio Direto';

    return `
      <tr>
        <td class="text-muted small">${timeFormatted}</td>
        <td>
          <div class="fw-bold text-white">${escapeHtml(groupName)}</div>
          <span class="badge-platform ${pub.group?.platform?.toLowerCase() || ''}">
            ${pub.group?.platform || 'Telegram'}
          </span>
        </td>
        <td>
          <div class="fw-semibold text-white small">${escapeHtml(prodName)}</div>
          <span class="text-secondary small">Campanha: ${escapeHtml(campName)}</span>
        </td>
        <td>
          <span class="badge-status ${statusInfo.class}">
            <i class="bi ${statusInfo.icon}"></i> ${statusInfo.label}
          </span>
        </td>
        <td>
          ${pub.error_message
            ? `<span class="text-danger small font-monospace d-inline-block text-truncate" style="max-width: 220px;" title="${escapeHtml(pub.error_message)}">
                <i class="bi bi-exclamation-circle me-1"></i>${escapeHtml(pub.error_message)}
               </span>`
            : '<span class="text-success small"><i class="bi bi-check-lg me-1"></i>Concluída sem erros</span>'
          }
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-info me-1" onclick="openDetailsModal('${pub.id}')" title="Ver Mensagem">
            <i class="bi bi-eye"></i> Detalhes
          </button>
          ${pub.status === 'failed' ? `
            <button class="btn btn-sm btn-outline-warning" onclick="retryPublication('${pub.id}')" title="Tentar Reenviar">
              <i class="bi bi-arrow-repeat"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function openDetailsModal(id) {
  const pub = currentPublications.find(p => p.id === id);
  if (!pub) return;

  document.getElementById('history-detail-id').textContent = pub.id;
  document.getElementById('history-detail-date').textContent = new Date(pub.published_at || pub.created_at).toLocaleString();
  document.getElementById('history-detail-message').textContent = pub.message || '(Sem mensagem registrada)';

  const errorContainer = document.getElementById('history-error-container');
  const errorBox = document.getElementById('history-detail-error');

  if (pub.error_message) {
    errorContainer.classList.remove('d-none');
    errorBox.textContent = pub.error_message;
  } else {
    errorContainer.classList.add('d-none');
    errorBox.textContent = '';
  }

  if (historyModalInstance) historyModalInstance.show();
}

async function retryPublication(id) {
  try {
    showToast('Reenviando publicação...', 'info');
    const res = await api.post(`/publications/${id}/retry`);
    if (res.success) {
      showToast('Publicação reenviada com sucesso!', 'success');
      loadHistory();
    }
  } catch (error) {
    showToast('Falha no reenvio: ' + error.message, 'error');
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
