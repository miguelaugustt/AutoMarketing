/**
 * AUT0MARKETING - Lógica de Postagem Manual
 */

document.addEventListener('DOMContentLoaded', () => {
  loadGroupsForManualPost();

  // Toggle seção de agendamento
  const sendNowCheckbox = document.getElementById('manual-post-send-now');
  const scheduleSection = document.getElementById('manual-post-schedule-section');
  const scheduleInput = document.getElementById('manual-post-scheduled-at');

  sendNowCheckbox.addEventListener('change', () => {
    if (sendNowCheckbox.checked) {
      scheduleSection.classList.add('d-none');
      scheduleInput.required = false;
      scheduleInput.value = '';
    } else {
      scheduleSection.classList.remove('d-none');
      scheduleInput.required = true;
      // Definir data/hora padrão para 1 hora a partir de agora
      const now = new Date();
      now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + 60); // +1 hora
      scheduleInput.value = now.toISOString().slice(0, 16);
    }
  });

  // Submissão do formulário
  document.getElementById('form-manual-post').addEventListener('submit', handleSendManualPost);
});

async function loadGroupsForManualPost() {
  try {
    const data = await api.get('/manual-post/groups');
    if (!data.success) return;

    const select = document.getElementById('manual-post-group');
    select.innerHTML = '<option value="">-- Escolha um grupo ou canal --</option>';

    data.groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      let label = g.name;
      if (g.platform) label += ` (${g.platform})`;
      if (!g.active) label += ' [Inativo]';
      if (g.authorization_status !== 'authorized') label += ' [Não autorizado]';
      opt.textContent = label;
      opt.title = g.external_group_id || 'ID Pendente';
      select.appendChild(opt);
    });

  } catch (error) {
    showToast('Falha ao carregar grupos: ' + error.message, 'error');
  }
}

async function handleSendManualPost(e) {
  e.preventDefault();

  const groupId = document.getElementById('manual-post-group').value;
  const message = document.getElementById('manual-post-message').value.trim();
  const imageUrl = document.getElementById('manual-post-image-url').value.trim() || null;
  const videoUrl = document.getElementById('manual-post-video-url').value.trim() || null;
  const sendNow = document.getElementById('manual-post-send-now').checked;
  const scheduledAt = document.getElementById('manual-post-scheduled-at').value;

  const imageFile = document.getElementById('manual-post-image-file').files[0] || null;
  const videoFile = document.getElementById('manual-post-video-file').files[0] || null;

  if (!groupId) {
    showToast('Selecione um grupo ou canal.', 'error');
    return;
  }
  if (!message) {
    showToast('Digite a mensagem.', 'error');
    return;
  }

  const btn = document.getElementById('btn-send-manual-post');
  const resultBox = document.getElementById('manual-post-result');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
    resultBox.classList.add('d-none');

    const hasFiles = imageFile || videoFile;

    if (hasFiles) {
      // Envio com upload de arquivos (multipart/form-data)
      const formData = new FormData();
      formData.append('group_id', groupId);
      formData.append('message', message);
      formData.append('image_url', imageUrl);
      formData.append('video_url', videoUrl);
      formData.append('scheduled_at', scheduledAt || null);
      formData.append('send_now', sendNow);
      if (imageFile) formData.append('image_file', imageFile);
      if (videoFile) formData.append('video_file', videoFile);

      const token = localStorage.getItem('automarketing_jwt_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? `${window.location.origin}/api`
        : '/api';

      const response = await fetch(`${apiBase}/manual-post/send`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (response.status === 401) {
        localStorage.removeItem('automarketing_jwt_token');
        localStorage.removeItem('automarketing_user_data');
        if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
          window.location.href = 'index.html';
        }
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.error || 'Falha ao enviar postagem.');
      }

      if (res.success) {
        resultBox.className = 'alert alert-success small font-monospace mt-3';
        resultBox.innerHTML = `<i class="bi bi-check-circle me-1"></i> ${escapeHtml(res.message)}`;
        resultBox.classList.remove('d-none');
        showToast(res.message, 'success');

        // Limpar formulário
        document.getElementById('form-manual-post').reset();
        document.getElementById('manual-post-schedule-section').classList.add('d-none');
        document.getElementById('manual-post-send-now').checked = false;
      } else {
        resultBox.className = 'alert alert-danger small font-monospace mt-3';
        resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(res.error || 'Falha ao enviar.')}`;
        resultBox.classList.remove('d-none');
      }
    } else {
      // Envio sem arquivos (JSON)
      const payload = {
        group_id: groupId,
        message: message,
        image_url: imageUrl,
        video_url: videoUrl,
        scheduled_at: scheduledAt || null,
        send_now: sendNow
      };

      const res = await api.post('/manual-post/send', payload);
      if (res.success) {
        resultBox.className = 'alert alert-success small font-monospace mt-3';
        resultBox.innerHTML = `<i class="bi bi-check-circle me-1"></i> ${escapeHtml(res.message)}`;
        resultBox.classList.remove('d-none');
        showToast(res.message, 'success');

        // Limpar formulário
        document.getElementById('form-manual-post').reset();
        document.getElementById('manual-post-schedule-section').classList.add('d-none');
        document.getElementById('manual-post-send-now').checked = false;
      } else {
        resultBox.className = 'alert alert-danger small font-monospace mt-3';
        resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(res.error || 'Falha ao enviar.')}`;
        resultBox.classList.remove('d-none');
      }
    }
  } catch (error) {
    resultBox.className = 'alert alert-danger small font-monospace mt-3';
    resultBox.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> ${escapeHtml(error.message || 'Falha ao enviar postagem.')}`;
    resultBox.classList.remove('d-none');
    showToast('Erro ao enviar postagem: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send me-1"></i> Enviar Postagem';
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
