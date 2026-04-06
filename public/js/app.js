// ============================================================
// APP MODULE (Main Application Controller)
// Handles routing, modals, toasts, and initialization
// ============================================================

const App = {
  // ============================================================
  // INITIALIZATION
  // ============================================================
  async init() {
    // Check existing session
    const hasSession = await Auth.checkSession();

    if (hasSession) {
      this.showApp();
    } else {
      this.showAuth();
    }

    this.bindGlobalEvents();
  },

  // ============================================================
  // SCREEN MANAGEMENT
  // ============================================================
  showAuth() {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('app-screen').classList.remove('active');
    // Reset forms
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
  },

  showApp() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');

    Auth.updateUserUI();
    this.showView('boards');
    Board.loadBoards();
  },

  showView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    if (view === 'boards') {
      document.getElementById('boards-view').classList.add('active');
      document.getElementById('board-title-area').innerHTML = '';
      // Hide kanban-specific buttons
      document.getElementById('members-btn').style.display = 'none';
      document.getElementById('labels-btn').style.display = 'none';
      Board.loadBoards();
    } else if (view === 'kanban') {
      document.getElementById('kanban-view').classList.add('active');
    } else if (view === 'admin') {
      document.getElementById('admin-view').classList.add('active');
      document.getElementById('board-title-area').innerHTML = '';
      // Hide kanban-specific buttons
      document.getElementById('members-btn').style.display = 'none';
      document.getElementById('labels-btn').style.display = 'none';
      this.loadAdminUsers();
    }
  },

  // ============================================================
  // GLOBAL EVENTS
  // ============================================================
  bindGlobalEvents() {
    Auth.init();

    // Nav Home
    document.getElementById('nav-home-btn').addEventListener('click', () => {
      this.showView('boards');
    });

    // Admin panel
    document.getElementById('admin-btn').addEventListener('click', () => {
      this.showView('admin');
    });

    // User dropdown
    const userMenu = document.getElementById('user-menu');
    const dropdown = document.getElementById('user-dropdown');

    userMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal(btn.dataset.close);
      });
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('show');
        }
      });
    });

    // ESC to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
      }
    });

    // Board modal save
    document.getElementById('board-save-btn').addEventListener('click', () => {
      Board.saveBoard();
    });

    // Background picker
    document.querySelectorAll('.bg-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });

    // Card modal save/delete
    document.getElementById('card-save-btn').addEventListener('click', () => {
      Kanban.saveCard();
    });

    document.getElementById('card-delete-btn').addEventListener('click', () => {
      Kanban.deleteCard();
    });

    document.getElementById('card-comment-btn').addEventListener('click', () => {
      Kanban.addComment();
    });

    // Comment enter
    document.getElementById('card-comment-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        Kanban.addComment();
      }
    });

    // Admin create user
    document.getElementById('admin-create-user-btn').addEventListener('click', () => {
      this.openModal('admin-user-modal');
      document.getElementById('admin-user-display').value = '';
      document.getElementById('admin-user-username').value = '';
      document.getElementById('admin-user-password').value = '';
      document.getElementById('admin-user-role').value = 'user';
    });

    document.getElementById('admin-user-save-btn').addEventListener('click', () => {
      this.adminCreateUser();
    });

    document.getElementById('reset-pw-save-btn').addEventListener('click', () => {
      this.adminResetPassword();
    });

    // Members button
    document.getElementById('members-btn').addEventListener('click', () => {
      this.openMembersModal();
    });

    // Labels button
    document.getElementById('labels-btn').addEventListener('click', () => {
      this.openLabelsModal();
    });

    // Invite member button
    document.getElementById('invite-user-btn').addEventListener('click', () => {
      this.inviteMember();
    });

    // Create label button
    document.getElementById('create-label-btn').addEventListener('click', () => {
      this.createLabel();
    });

    // Label color picker
    document.querySelectorAll('.label-color-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.label-color-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  },

  // ============================================================
  // MODAL HELPERS
  // ============================================================
  openModal(id) {
    document.getElementById(id).classList.add('show');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('show');
  },

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    toast.innerHTML = `<span>${icon[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ============================================================
  // ADMIN FUNCTIONS
  // ============================================================
  resetUserId: null,

  async loadAdminUsers() {
    try {
      const users = await API.getUsers();
      const table = document.getElementById('admin-users-table');

      table.innerHTML = users.map(u => `
        <div class="admin-user-row">
          <div class="user-avatar" style="background:${u.avatarColor}">
            ${u.displayName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
          </div>
          <div class="admin-user-info">
            <span class="name">${Board.escapeHtml(u.displayName)}</span>
            <span class="username">@${Board.escapeHtml(u.username)}</span>
          </div>
          <span class="admin-badge ${u.role}">${u.role}</span>
          <span class="admin-badge ${u.isActive ? 'active' : 'inactive'}">${u.isActive ? 'Active' : 'Locked'}</span>
          <div class="admin-actions">
            <button class="admin-action-btn" onclick="App.openResetPwModal(${u.id}, '${Board.escapeHtml(u.displayName)}')">Reset PW</button>
            <button class="admin-action-btn danger" onclick="App.toggleUserActive(${u.id})">${u.isActive ? 'Khóa' : 'Mở khóa'}</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openResetPwModal(userId, displayName) {
    this.resetUserId = userId;
    document.getElementById('reset-pw-user-info').textContent = `Reset password cho: ${displayName}`;
    document.getElementById('reset-pw-input').value = '';
    this.openModal('reset-pw-modal');
    document.getElementById('reset-pw-input').focus();
  },

  async adminResetPassword() {
    if (!this.resetUserId) return;
    const newPassword = document.getElementById('reset-pw-input').value;

    if (!newPassword || newPassword.length < 4) {
      App.toast('Password mới phải có ít nhất 4 ký tự.', 'error');
      return;
    }

    try {
      const result = await API.resetPassword(this.resetUserId, newPassword);
      App.toast(result.message, 'success');
      this.closeModal('reset-pw-modal');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async adminCreateUser() {
    const displayName = document.getElementById('admin-user-display').value.trim();
    const username = document.getElementById('admin-user-username').value.trim();
    const password = document.getElementById('admin-user-password').value;
    const role = document.getElementById('admin-user-role').value;

    if (!displayName || !username || !password) {
      App.toast('Vui lòng nhập đầy đủ thông tin.', 'error');
      return;
    }

    try {
      const result = await API.createUser({ username, password, displayName, role });
      App.toast(result.message, 'success');
      this.closeModal('admin-user-modal');
      this.loadAdminUsers();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async toggleUserActive(userId) {
    try {
      const result = await API.toggleActive(userId);
      App.toast(result.message, 'success');
      this.loadAdminUsers();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // ============================================================
  // MEMBERS MANAGEMENT
  // ============================================================
  async openMembersModal() {
    const boardId = Kanban.currentBoard && Kanban.currentBoard.id;
    if (!boardId) return;

    try {
      // Load current members
      const members = await API.getBoardMembers(boardId);
      const memberList = document.getElementById('members-list');
      const ownerId = Kanban.currentBoard.ownerId;

      memberList.innerHTML = members.length === 0
        ? '<p class="empty-state-sm">Chưa có thành viên nào.</p>'
        : members.map(m => {
            const initials = m.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            const canRemove = m.id !== ownerId;
            return `
              <div class="member-item">
                <div class="user-avatar" style="background:${m.avatarColor}">${initials}</div>
                <div class="member-info">
                  <span class="member-name">${Board.escapeHtml(m.displayName)}</span>
                  <span class="member-username">@${Board.escapeHtml(m.username)}</span>
                </div>
                <span class="member-role-badge ${m.role}">${m.role === 'admin' ? 'Admin' : 'Member'}</span>
                ${canRemove ? `<button class="member-remove-btn" data-remove-member="${m.id}" title="Xóa khỏi board">×</button>` : ''}
              </div>`;
          }).join('');

      // Bind remove buttons (event delegation style)
      memberList.querySelectorAll('[data-remove-member]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = parseInt(btn.dataset.removeMember);
          if (!confirm('Xóa thành viên này khỏi board?')) return;
          try {
            const result = await API.removeBoardMember(boardId, userId);
            App.toast(result.message, 'success');
            // Refresh modal
            App.openMembersModal();
            // Refresh board data
            Kanban.boardMembers = (await API.getBoardMembers(boardId));
          } catch (err) {
            App.toast(err.message, 'error');
          }
        });
      });

      // Load users for invite dropdown
      const allUsers = await API.getUsersList();
      const memberIds = new Set(members.map(m => m.id));
      const inviteSelect = document.getElementById('invite-user-select');
      inviteSelect.innerHTML = '<option value="">-- Chọn người dùng --</option>';
      allUsers.filter(u => !memberIds.has(u.id)).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.displayName} (@${u.username})`;
        inviteSelect.appendChild(opt);
      });

      this.openModal('members-modal');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async inviteMember() {
    const boardId = Kanban.currentBoard && Kanban.currentBoard.id;
    const userId = document.getElementById('invite-user-select').value;
    if (!userId) {
      App.toast('Vui lòng chọn người dùng để mời.', 'error');
      return;
    }
    try {
      const result = await API.addBoardMember(boardId, parseInt(userId));
      App.toast(result.message, 'success');
      // Refresh members modal content
      App.openMembersModal();
      // Update board members cache
      Kanban.boardMembers = await API.getBoardMembers(boardId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // ============================================================
  // LABELS MANAGEMENT
  // ============================================================
  async openLabelsModal() {
    const boardId = Kanban.currentBoard && Kanban.currentBoard.id;
    if (!boardId) return;

    try {
      const labels = await API.getBoardLabels(boardId);
      Kanban.boardLabels = labels;

      const labelsList = document.getElementById('labels-list');
      labelsList.innerHTML = labels.length === 0
        ? '<p class="empty-state-sm">Chưa có nhãn nào. Tạo nhãn mới bên dưới!</p>'
        : labels.map(l => `
            <div class="label-item">
              <div class="label-dot" style="background:${l.color}"></div>
              <span class="label-name">${Board.escapeHtml(l.name)}</span>
              <button class="label-delete-btn" data-delete-label="${l.id}" title="Xóa nhãn">×</button>
            </div>`).join('');

      // Bind delete label buttons
      labelsList.querySelectorAll('[data-delete-label]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const labelId = parseInt(btn.dataset.deleteLabel);
          if (!confirm('Xóa nhãn này? Các card đang dùng nhãn này sẽ bị gỡ nhãn.')) return;
          try {
            await API.deleteLabel(labelId);
            App.toast('Xóa nhãn thành công!', 'success');
            App.openLabelsModal();
          } catch (err) {
            App.toast(err.message, 'error');
          }
        });
      });

      // Reset create form
      document.getElementById('new-label-name').value = '';
      document.querySelectorAll('.label-color-opt').forEach((opt, i) => {
        opt.classList.toggle('active', i === 0);
      });

      this.openModal('labels-modal');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async createLabel() {
    const boardId = Kanban.currentBoard && Kanban.currentBoard.id;
    const name = document.getElementById('new-label-name').value.trim();
    const activeColorOpt = document.querySelector('.label-color-opt.active');
    const color = activeColorOpt ? activeColorOpt.dataset.color : '#6366f1';

    if (!name) {
      App.toast('Vui lòng nhập tên nhãn.', 'error');
      return;
    }

    try {
      await API.createLabel(boardId, name, color);
      App.toast('Tạo nhãn thành công!', 'success');
      document.getElementById('new-label-name').value = '';
      // Refresh labels modal
      App.openLabelsModal();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};

// ============================================================
// START APP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
