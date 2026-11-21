/**
 * AUT0MARKETING - Lógica de Gerenciamento de Campanhas
 */

let campaignModalInstance = null;
let previewModalInstance = null;
let currentCampaigns = [];
let availableProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  const modalCampaignEl = document.getElementById('modalCampaign');
  if (modalCampaignEl) {
    campaignModalInstance = new bootstrap.Modal(modalCampaignEl);
  }

  const modalPreviewEl = document.getElementById('modalPreviewVariations');
  if (modalPreviewEl) {
    previewModalInstance = new bootstrap.Modal(modalPreviewEl);
  }

  loadProductsForSelect();
  loadCampaigns();

  document.getElementById('btn-open-create-campaign').addEventListener('click', openCreateModal);
  document.getElementById('form-campaign').addEventListener('submit', handleSaveCampaign);

  document.getElementById('btn-preview-variations').addEventListener('click', openVariationsPreview);
  document.getElementById('btn-regenerate-previews').addEventListener('click', openVariationsPreview);
});

async function loadProductsForSelect() {
  try {
    const data = await api.get('/products?activeOnly=true');
    if (data.success) {
      availableProducts = data.products;
      const select = document.getElementById('campaign-product-id');
      const currentSelected = select.value;
      select.innerHTML = '<option value="">✨ ROTAÇÃO INTELIGENTE (Alternar aleatoriamente entre produtos ativos)</option>';

      availableProducts.forEach(prod => {
        const opt = document.createElement('option');
        opt.value = prod.id;
        opt.textContent = `${prod.name} (${prod.platform}) - ${prod.category}`;
        select.appendChild(opt);
      });

      if (currentSelected) select.value = currentSelected;
    }
  } catch (error) {
    console.error('Erro ao carregar produtos para seleção:', error);
  }
}

async function loadCampaigns() {
  const container = document.getElementById('campaigns-list-container');
  try {
    const data = await api.get('/campaigns');
    if (data.success) {
      currentCampaigns = data.campaigns;
      renderCampaignsCards(currentCampaigns);
    }
  } catch (error) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-danger">
        <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
        Falha ao listar campanhas: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

function renderCampaignsCards(campaigns) {
  const container = document.getElementById('campaigns-list-container');
  if (!campaigns || campaigns.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-megaphone fs-2 d-block mb-2"></i>
        Nenhuma campanha cadastrada. Clique em "Nova Campanha" para iniciar sua primeira automação.
      </div>
    `;
    return;
  }

  container.innerHTML = campaigns.map(c => {
    const isRotation = !c.product_id;
    const prodName = isRotation ? '✨ Rotação Inteligente Aleatória' : (c.product ? c.product.name : 'Produto Fixo');
    const isActive = c.status === 'active';

    return `
      <div class="col-12 col-lg-6">
        <div class="glass-card h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h4 class="fw-bold text-white mb-1 fs-5">${escapeHtml(c.name)}</h4>
                <div class="d-flex align-items-center gap-2 mt-1">
                  <span class="badge ${isRotation ? 'bg-primary' : 'bg-info bg-opacity-25 text-info'} small">
                    ${escapeHtml(prodName)}
                  </span>
                  <span class="badge bg-secondary bg-opacity-25 text-white small">
                    <i class="bi bi-clock me-1"></i>A cada ${c.frequency_hours || 24}h
                  </span>
                </div>
              </div>

              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" ${isActive ? 'checked' : ''} onchange="toggleCampaignStatus('${c.id}')" title="Ativar/Pausar">
              </div>
            </div>

            <div class="p-3 rounded bg-dark border border-secondary border-opacity-25 mb-3">
              <span class="small text-secondary d-block mb-1 fw-bold">Modelo de Mensagem / Template:</span>
              <pre class="text-white font-monospace mb-0 text-wrap" style="white-space: pre-wrap; font-size: 0.8rem; max-height: 140px; overflow-y: auto;">${escapeHtml(c.message_template)}</pre>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 mt-2">
            <span class="badge-status ${isActive ? 'authorized' : 'unavailable'}">
              <i class="bi ${isActive ? 'bi-check-circle-fill' : 'bi-pause-circle-fill'}"></i>
              ${isActive ? 'Campanha Ativa' : 'Pausada'}
            </span>

            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-success" onclick="triggerCampaign('${c.id}')" title="Disparar Agora">
                <i class="bi bi-play-circle me-1"></i> Disparar
              </button>
              <button class="btn btn-sm btn-outline-info" onclick="openEditModal('${c.id}')" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteCampaign('${c.id}')" title="Excluir">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openCreateModal() {
  document.getElementById('modalCampaignTitle').innerHTML = '<i class="bi bi-megaphone text-primary me-2"></i>Nova Campanha de Marketing';
  document.getElementById('campaign-id').value = '';
  document.getElementById('campaign-name').value = '';
  document.getElementById('campaign-frequency').value = '24';
  document.getElementById('campaign-product-id').value = '';
  document.getElementById('campaign-template').value = `{Está procurando uma maneira prática de se qualificar?|Quer conhecer novas oportunidades de aprendizado?|Se você busca materiais relevantes para sua carreira, confira:}

📌 *{product_name}*
_{product_description}_

💡 *Destaque:* {promotional_text}
👉 Saiba mais no link oficial: {affiliate_url}

#aprendizado #oportunidade #{category}`;
  document.getElementById('campaign-status').checked = true;
  document.getElementById('campaign-image-url').value = '';
  document.getElementById('campaign-video-url').value = '';

  if (campaignModalInstance) campaignModalInstance.show();
}

function openEditModal(id) {
  const c = currentCampaigns.find(item => item.id === id);
  if (!c) return;

  document.getElementById('modalCampaignTitle').innerHTML = '<i class="bi bi-pencil-square text-primary me-2"></i>Editar Campanha de Marketing';
  document.getElementById('campaign-id').value = c.id;
  document.getElementById('campaign-name').value = c.name;
  document.getElementById('campaign-frequency').value = String(c.frequency_hours || 24);
  document.getElementById('campaign-product-id').value = c.product_id || '';
  document.getElementById('campaign-template').value = c.message_template;
  document.getElementById('campaign-status').checked = c.status === 'active';
  document.getElementById('campaign-image-url').value = c.image_url || '';
  document.getElementById('campaign-video-url').value = c.video_url || '';

  if (campaignModalInstance) campaignModalInstance.show();
}

function insertTag(tag) {
  const textarea = document.getElementById('campaign-template');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + tag + text.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
}

  async function handleSaveCampaign(e) {
  e.preventDefault();
  const id = document.getElementById('campaign-id').value;
  const payload = {
    name: document.getElementById('campaign-name').value.trim(),
    frequency_hours: parseInt(document.getElementById('campaign-frequency').value, 10),
    product_id: document.getElementById('campaign-product-id').value || null,
    message_template: document.getElementById('campaign-template').value.trim(),
    status: document.getElementById('campaign-status').checked ? 'active' : 'paused'
  };

  const btn = document.getElementById('btn-save-campaign');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    if (id) {
      await api.put(`/campaigns/${id}`, payload);
      showToast('Campanha atualizada com sucesso!', 'success');
    } else {
      await api.post('/campaigns', payload);
      showToast('Campanha criada com sucesso!', 'success');
    }

    if (campaignModalInstance) campaignModalInstance.hide();
    loadCampaigns();
  } catch (error) {
    showToast(error.message || 'Erro ao salvar campanha.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Salvar Campanha';
  }
}

async function toggleCampaignStatus(id) {
  try {
    const res = await api.patch(`/campaigns/${id}/toggle-status`);
    if (res.success) {
      showToast(res.message, 'success');
      loadCampaigns();
    }
  } catch (error) {
    showToast('Erro ao alternar status da campanha: ' + error.message, 'error');
  }
}

  async function triggerCampaign(id) {
  if (!confirm('Deseja disparar esta campanha imediatamente para os grupos autorizados que cumpriram o intervalo de 24h?')) {
    return;
  }

  try {
    showToast('Processando disparo da campanha...', 'info');

    const imageUrl = document.getElementById('campaign-image-url')?.value.trim() || null;
    const videoUrl = document.getElementById('campaign-video-url')?.value.trim() || null;

    const res = await api.post(`/campaigns/${id}/trigger`, {
      ignoreInterval: true,
      force: true,
      image_url: imageUrl,
      video_url: videoUrl
    });
    if (res.success) {
      showToast(`Executado! ${res.result.processed} grupos processados.`, 'success', 5000);
      loadCampaigns();
    }
  } catch (error) {
    showToast('Erro no disparo da campanha: ' + error.message, 'error');
  }
}

async function openVariationsPreview() {
  const template = (currentCampaigns[0]?.message_template) ||
    document.getElementById('campaign-template')?.value ||
    '{Está procurando novas oportunidades?|Conheça este conteúdo exclusivo:} {product_name} - {affiliate_url}';

  const container = document.getElementById('preview-variations-container');
  container.innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm text-info"></span> Gerando variações...</div>';

  if (previewModalInstance) previewModalInstance.show();

  try {
    const res = await api.post('/campaigns/preview', { message_template: template });
    if (res.success) {
      container.innerHTML = res.previews.map(p => `
        <div class="p-3 rounded bg-dark border border-secondary border-opacity-50">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge bg-primary bg-opacity-25 text-info fw-bold">Variação ${p.version}</span>
            <span class="small text-muted">Simulação com: ${escapeHtml(res.sampleProduct?.name)}</span>
          </div>
          <pre class="text-white font-monospace mb-0 text-wrap" style="white-space: pre-wrap; font-size: 0.85rem;">${escapeHtml(p.text)}</pre>
        </div>
      `).join('');
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
  }
}

async function deleteCampaign(id) {
  if (!confirm('Deseja realmente excluir esta campanha? As publicações já efetuadas permanecerão no histórico.')) {
    return;
  }

  try {
    await api.delete(`/campaigns/${id}`);
    showToast('Campanha excluída com sucesso.', 'success');
    loadCampaigns();
  } catch (error) {
    showToast('Erro ao excluir campanha: ' + error.message, 'error');
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
