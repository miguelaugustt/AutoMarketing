/**
 * AUT0MARKETING - Lógica do Radar de Grupos e Prospecção
 */

let currentProspects = [];

document.addEventListener('DOMContentLoaded', () => {
  loadProspects();

  document.getElementById('btn-run-search').addEventListener('click', () => loadProspects());
  document.getElementById('prospector-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadProspects();
  });
  document.getElementById('prospector-category').addEventListener('change', () => loadProspects());
  document.getElementById('btn-download-csv').addEventListener('click', downloadCsvReport);
});

async function loadProspects() {
  const keyword = document.getElementById('prospector-search').value.trim();
  const category = document.getElementById('prospector-category').value;
  const tbody = document.getElementById('prospector-tbody');

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-5 text-muted">
        <span class="spinner-border spinner-border-sm me-2 text-primary"></span>
        Varrendo comunidades públicas e regras de links...
      </td>
    </tr>
  `;

  try {
    let query = '?';
    if (keyword) query += `keyword=${encodeURIComponent(keyword)}&`;
    if (category) query += `category=${encodeURIComponent(category)}&`;

    const data = await api.get(`/prospector/search${query}`);
    if (data.success) {
      currentProspects = data.groups;
      document.getElementById('results-count').textContent = data.count;
      renderProspectorTable(currentProspects);
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
          Falha na busca de grupos: ${escapeHtml(error.message)}
        </td>
      </tr>
    `;
  }
}

function renderProspectorTable(groups) {
  const tbody = document.getElementById('prospector-tbody');
  if (!groups || groups.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <i class="bi bi-search fs-2 d-block mb-2"></i>
          Nenhum grupo localizado para este termo. Tente buscar por palavras mais amplas como "afiliados" ou "divulgação".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = groups.map((g, index) => {
    return `
      <tr>
        <td>
          <div class="fw-bold text-white fs-6">${escapeHtml(g.name)}</div>
          <span class="badge-platform telegram small">Telegram</span>
        </td>
        <td>
          <span class="badge bg-secondary bg-opacity-25 text-info small">${escapeHtml(g.category)}</span>
        </td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <a href="${g.invite_url}" target="_blank" class="small text-decoration-none text-info text-truncate d-inline-block" style="max-width: 170px;">
              <i class="bi bi-box-arrow-up-right me-1"></i>${escapeHtml(g.invite_url)}
            </a>
            <button class="btn btn-sm btn-outline-secondary p-1" onclick="copyToClipboard('${g.invite_url}')" title="Copiar Link">
              <i class="bi bi-clipboard"></i>
            </button>
          </div>
        </td>
        <td>
          <span class="small text-white fw-semibold">${(g.approx_members || 0).toLocaleString()}</span>
          <span class="small text-muted d-block" style="font-size: 0.7rem;">membros</span>
        </td>
        <td>
          <span class="badge-status authorized">
            <i class="bi bi-check-circle-fill"></i> Permitido
          </span>
        </td>
        <td>
          <span class="small text-muted d-inline-block text-truncate" style="max-width: 250px;" title="${escapeHtml(g.rules_summary)}">
            ${escapeHtml(g.rules_summary)}
          </span>
        </td>
        <td class="text-end">
          ${g.already_imported ? `
            <span class="badge bg-secondary bg-opacity-50 text-white small p-2">
              <i class="bi bi-check2 me-1"></i> Na Minha Lista
            </span>
          ` : `
            <button class="btn btn-sm btn-outline-success" onclick="importProspect(${index})" title="Adicionar aos Meus Grupos">
              <i class="bi bi-plus-circle me-1"></i> Adicionar
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function quickSearch(term) {
  document.getElementById('prospector-search').value = term;
  loadProspects();
}

async function importProspect(index) {
  const group = currentProspects[index];
  if (!group) return;

  try {
    showToast(`Importando "${group.name}" para sua lista de grupos...`, 'info');
    const res = await api.post('/prospector/import', { groupData: group });
    if (res.success) {
      showToast(res.message, 'success', 5000);
      currentProspects[index].already_imported = true;
      renderProspectorTable(currentProspects);
    }
  } catch (error) {
    showToast(error.message || 'Erro ao importar grupo.', 'error');
  }
}

async function downloadCsvReport() {
  const keyword = document.getElementById('prospector-search').value.trim();
  const category = document.getElementById('prospector-category').value;
  const btn = document.getElementById('btn-download-csv');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Gerando Relatório...';

    let query = '?';
    if (keyword) query += `keyword=${encodeURIComponent(keyword)}&`;
    if (category) query += `category=${encodeURIComponent(category)}&`;

    const token = api.getToken();
    const url = `/api/prospector/export-csv${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Falha ao baixar relatório CSV');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `relatorio_grupos_afiliados_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);

    showToast('Relatório CSV baixado com sucesso!', 'success');
  } catch (error) {
    showToast('Erro ao baixar relatório: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-file-earmark-spreadsheet-fill me-1"></i> Baixar Relatório (CSV / Excel)';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Link do grupo copiado!', 'info');
  });
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
