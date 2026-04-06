// ============================================================
// AUTH MODULE
// Handles login/register forms and session management
// ============================================================

const Auth = {
  currentUser: null,

  init() {
    // Form toggle
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.remove('active');
      document.getElementById('register-form').classList.add('active');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-form').classList.remove('active');
      document.getElementById('login-form').classList.add('active');
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      const btn = document.getElementById('login-btn');

      if (!username || !password) {
        errorEl.textContent = 'Vui lòng nhập đầy đủ thông tin.';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Đang đăng nhập...';
      errorEl.textContent = '';

      try {
        const data = await API.login(username, password);
        this.currentUser = data.user;
        App.showApp();
        App.toast('Đăng nhập thành công! Xin chào ' + data.user.displayName, 'success');
      } catch (err) {
        errorEl.textContent = err.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Đăng nhập</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
      }
    });

    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('reg-display').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const errorEl = document.getElementById('register-error');
      const btn = document.getElementById('register-btn');

      if (!displayName || !username || !password) {
        errorEl.textContent = 'Vui lòng nhập đầy đủ thông tin.';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Đang đăng ký...';
      errorEl.textContent = '';

      try {
        await API.register(username, password, displayName);
        App.toast('Đăng ký thành công! Đang đăng nhập...', 'success');

        // Auto login after register
        const data = await API.login(username, password);
        this.currentUser = data.user;
        App.showApp();
      } catch (err) {
        errorEl.textContent = err.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Đăng ký</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
      }
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        await API.logout();
        this.currentUser = null;
        App.showAuth();
        App.toast('Đăng xuất thành công!', 'info');
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  },

  async checkSession() {
    try {
      const user = await API.me();
      this.currentUser = user;
      return true;
    } catch {
      return false;
    }
  },

  updateUserUI() {
    if (!this.currentUser) return;

    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    const initials = this.currentUser.displayName
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    avatar.textContent = initials;
    avatar.style.background = this.currentUser.avatarColor;
    name.textContent = this.currentUser.displayName;

    // Show admin button if admin
    const adminBtn = document.getElementById('admin-btn');
    if (this.currentUser.role === 'admin') {
      adminBtn.style.display = 'flex';
    } else {
      adminBtn.style.display = 'none';
    }
  }
};
