/**
 * AUT0MARKETING - Lógica de Gerenciamento de Produtos
 */

let productModalInstance = null;
let currentProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('modalProduct');
  if (modalEl) {
    productModalInstance = new bootstrap.Modal(modalEl);
  }

  loadProducts();

  // Filtros
  document.getElementById('filter-search').addEventListener('input', debounce(loadProducts, 300));
  document.getElementById('filter-platform').addEventListener('change', loadProducts);
  document.getElementById('filter-status').addEventListener('change', loadProducts);
  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-platform').value = '';
    document.getElementById('filter-status').value = '';
    loadProducts();
  });

  // Botão Criar
  document.getElementById('btn-open-create-modal').addEventListener('click', openCreateModal);

  // Form Submit
  document.getElementById('form-product').addEventListener('submit', handleSaveProduct);
});

async function loadProducts() {
  const search = document.getElementById('filter-search').value.trim();
  const platform = document.getElementById('filter-platform').value;
  const statusFilter = document.getElementById('filter-status').value;

  let query = '?';
  if (search) query += `search=${encodeURIComponent(search)}&`;
  if (platform) query += `platform=${encodeURIComponent(platform)}&`;
  if (statusFilter === 'active') query += 'activeOnly=true&';

  try {
    const data = await api.get(`/products${query}`);
    if (data.success) {
      currentProducts = data.products;
      if (statusFilter === 'inactive') {
        currentProducts = currentProducts.filter(p => !p.active);
      }
      renderProductsTable(currentProducts);
    }
  } catch (error) {
    showToast('Falha ao listar produtos: ' + error.message, 'error');
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-tbody');
  if (!products || products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <i class="bi bi-box2 fs-2 d-block mb-2"></i>
          Nenhum produto encontrado com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const dateFormatted = new Date(p.created_at).toLocaleDateString();
    return `
      <tr>
        <td>
          <div class="fw-bold text-white fs-6">${escapeHtml(p.name)}</div>
          <span class="badge bg-secondary bg-opacity-25 text-info small">${escapeHtml(p.category)}</span>
          ${p.description ? `<p class="text-muted small mb-0 mt-1">${escapeHtml(p.description.substring(0, 90))}...</p>` : ''}
        </td>
        <td>
          <span class="badge-platform ${p.platform?.toLowerCase() || ''}">${p.platform || 'Kiwify'}</span>
        </td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <input type="text" class="form-control form-control-sm text-truncate bg-transparent border-0 text-secondary" style="max-width: 170px;" value="${p.affiliate_url}" readonly>
            <button class="btn btn-sm btn-outline-secondary" onclick="copyToClipboard('${p.affiliate_url}')" title="Copiar Link">
              <i class="bi bi-clipboard"></i>
            </button>
          </div>
        </td>
        <td>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" role="switch" ${p.active ? 'checked' : ''} onchange="toggleProductActive('${p.id}')">
            <label class="form-check-label small ${p.active ? 'text-success fw-bold' : 'text-muted'}">
              ${p.active ? 'Ativo' : 'Inativo'}
            </label>
          </div>
        </td>
        <td class="text-muted small">${dateFormatted}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-info me-1" onclick="openEditModal('${p.id}')" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')" title="Excluir">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateModal() {
  document.getElementById('modalProductTitle').innerHTML = '<i class="bi bi-box-seam text-primary me-2"></i>Cadastrar Produto Afiliado';
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-platform').value = 'Kiwify';
  document.getElementById('product-category').value = '';
  document.getElementById('product-affiliate-url').value = '';
  document.getElementById('product-description').value = '';
  document.getElementById('product-promotional-text').value = '';
  document.getElementById('product-active').checked = true;

  if (productModalInstance) productModalInstance.show();
}

function openEditModal(id) {
  const p = currentProducts.find(item => item.id === id);
  if (!p) return;

  document.getElementById('modalProductTitle').innerHTML = '<i class="bi bi-pencil-square text-primary me-2"></i>Editar Produto Afiliado';
  document.getElementById('product-id').value = p.id;
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-platform').value = p.platform;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-affiliate-url').value = p.affiliate_url;
  document.getElementById('product-description').value = p.description || '';
  document.getElementById('product-promotional-text').value = p.promotional_text || '';
  document.getElementById('product-active').checked = p.active;

  if (productModalInstance) productModalInstance.show();
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const payload = {
    name: document.getElementById('product-name').value.trim(),
    platform: document.getElementById('product-platform').value,
    category: document.getElementById('product-category').value.trim(),
    affiliate_url: document.getElementById('product-affiliate-url').value.trim(),
    description: document.getElementById('product-description').value.trim(),
    promotional_text: document.getElementById('product-promotional-text').value.trim(),
    active: document.getElementById('product-active').checked
  };

  const btn = document.getElementById('btn-save-product');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    if (id) {
      await api.put(`/products/${id}`, payload);
      showToast('Produto atualizado com sucesso!', 'success');
    } else {
      await api.post('/products', payload);
      showToast('Produto cadastrado com sucesso!', 'success');
    }

    if (productModalInstance) productModalInstance.hide();
    loadProducts();
  } catch (error) {
    showToast(error.message || 'Erro ao salvar produto.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Salvar Produto';
  }
}

async function toggleProductActive(id) {
  try {
    const res = await api.patch(`/products/${id}/toggle-active`);
    if (res.success) {
      showToast(res.message, 'success');
      loadProducts();
    }
  } catch (error) {
    showToast('Erro ao alternar status do produto: ' + error.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Deseja realmente remover este produto? O histórico de publicações será mantido.')) {
    return;
  }

  try {
    await api.delete(`/products/${id}`);
    showToast('Produto removido com sucesso.', 'success');
    loadProducts();
  } catch (error) {
    showToast('Erro ao excluir produto: ' + error.message, 'error');
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Link copiado para a área de transferência!', 'info');
  });
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
