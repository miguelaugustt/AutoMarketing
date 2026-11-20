/**
 * AUT0MARKETING - Controle de Autenticação e Sessão
 */

document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '';

  if (isLoginPage) {
    // Se o usuário já estiver logado na página de login, redireciona para o dashboard
    if (api.isAuthenticated()) {
      window.location.href = 'dashboard.html';
      return;
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('btn-login-submit');

        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Entrando...';

          const res = await api.post('/auth/login', { username, password });
          if (res.success && res.token) {
            api.setSession(res.token, res.user);
            showToast('Login realizado com sucesso!', 'success');
            setTimeout(() => {
              window.location.href = 'dashboard.html';
            }, 500);
          }
        } catch (error) {
          showToast(error.message || 'Credenciais inválidas.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Acessar Painel';
        }
      });
    }
  } else {
    // Páginas protegidas: verifica sessão
    if (!api.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }

    // Atualiza nome do usuário logado na interface
    const userDisplay = document.getElementById('current-user-display');
    const user = api.getUser();
    if (userDisplay && user) {
      userDisplay.textContent = user.username || 'Administrador';
    }

    // Botão de Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Deseja realmente sair do sistema?')) {
          api.clearSession();
          window.location.href = 'index.html';
        }
      });
    }
  }
});
