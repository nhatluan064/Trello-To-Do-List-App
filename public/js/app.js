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
  // CONFIRM MODAL (Thay thế window.confirm)
  // ============================================================
  async confirm(message) {
    return new Promise((resolve) => {
      document.getElementById('confirm-message').textContent = message;
      this.openModal('confirm-modal');
      
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      
      const okBtn = document.getElementById('confirm-ok-btn');
      const cancelBtn = document.getElementById('confirm-cancel-btn');
      
      // Cleanup event listeners
      const cleanup = () => {
        this.closeModal('confirm-modal');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
      };
      
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
    });
  },

  // ============================================================
  // TRASH UI (Thùng Rác)
  // ============================================================
  async loadTrash() {
    this.openModal('trash-modal');
    const container = document.getElementById('trash-list');
    const actionsBar = document.getElementById('trash-actions');
    const selectAllCheckbox = document.getElementById('trash-select-all');
    
    container.innerHTML = '<div style="text-align:center; padding: 20px;">Đang tải...</div>';
    actionsBar.style.display = 'none';
    selectAllCheckbox.checked = false;
    
    try {
      const res = await API.request('GET', '/trash');
      if (res.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-tertiary);">Thùng rác trống.</div>';
        return;
      }
      
      actionsBar.style.display = 'flex';
      let html = '';
      res.forEach(item => {
        const typeMap = { 'board': 'Bảng', 'column': 'Cột', 'card': 'Thẻ' };
        html += `
          <div class="trash-item" data-type="${item.type}" data-id="${item.id}" style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="checkbox" class="trash-item-checkbox" style="width:16px; height:16px; cursor:pointer;" value='{"type":"${item.type}","id":${item.id}}'>
              <div>
                <div style="font-weight: 700; color: white;">${Board.escapeHtml(item.title)}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                  Loại: ${typeMap[item.type] || item.type}
                  ${item.parent_name ? ` • Thuộc: ${Board.escapeHtml(item.parent_name)}` : ''}
                </div>
                <div style="font-size: 0.8rem; color: var(--danger); margin-top: 4px;">
                  Xóa lúc: ${new Date(item.deleted_at).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-ghost btn-sm" onclick="App.deleteTrash('${item.type}', ${item.id})" style="color:var(--danger); flex-shrink: 0;" title="Xóa vĩnh viễn">Xóa</button>
              <button class="btn btn-primary btn-sm" onclick="App.restoreTrash('${item.type}', ${item.id})" style="flex-shrink: 0;">Khôi phục</button>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;

      // Event listener for select all
      selectAllCheckbox.onchange = function() {
        const checks = document.querySelectorAll('.trash-item-checkbox');
        checks.forEach(c => c.checked = this.checked);
      };

      // Event checking when individual checkbox changed to update "Select All"
      document.querySelectorAll('.trash-item-checkbox').forEach(chk => {
        chk.onchange = () => {
          const allChecks = document.querySelectorAll('.trash-item-checkbox');
          const checked = document.querySelectorAll('.trash-item-checkbox:checked');
          selectAllCheckbox.checked = (allChecks.length === checked.length);
        };
      });

      // Bind Batch Actions
      document.getElementById('trash-restore-selected-btn').onclick = () => App.processBatchTrash('restore');
      document.getElementById('trash-delete-selected-btn').onclick = () => App.processBatchTrash('delete');

    } catch (err) {
      console.error(err);
      App.showToast('Lỗi tải thùng rác', 'error');
    }
  },

  async deleteTrash(type, id) {
    const ok = await App.confirm('Hành động này sẽ XÓA VĨNH VIỄN dữ liệu. Bạn có chắc chắn không?');
    if (!ok) return;
    try {
      await API.request('POST', '/trash/delete-batch', { items: [{ type, id }] });
      App.showToast('Đã xóa vĩnh viễn!');
      this.loadTrash(); // Reload danh sách
    } catch (err) {
      App.showToast('Lỗi khi xóa', 'error');
    }
  },

  async processBatchTrash(actionStr) {
    const checked = Array.from(document.querySelectorAll('.trash-item-checkbox:checked'));
    if (checked.length === 0) {
      App.showToast('Vui lòng chọn ít nhất 1 mục.', 'error');
      return;
    }
    
    const items = checked.map(c => JSON.parse(c.value));
    const isDelete = actionStr === 'delete';

    if (isDelete) {
      const ok = await App.confirm(`Bạn sắp XÓA VĨNH VIỄN ${items.length} mục. Không thể khôi phục. Bạn có chắc không?`);
      if (!ok) return;
    }

    try {
      const endpoint = isDelete ? '/trash/delete-batch' : '/trash/restore-batch';
      await API.request('POST', endpoint, { items });
      App.showToast(`Đã ${isDelete ? 'xóa vĩnh viễn' : 'khôi phục'} ${items.length} mục!`);
      this.loadTrash();

      if (!isDelete) {
        // Load lại trang tương ứng nếu đang mở Board
        const isBoardsView = document.getElementById('boards-view').classList.contains('active');
        const isKanbanView = document.getElementById('kanban-view').classList.contains('active');
        if (isBoardsView) Board.loadBoards();
        else if (isKanbanView && Kanban.lastBoardId) Kanban.loadBoard(Kanban.lastBoardId);
      }
    } catch (err) {
      App.showToast(`Lỗi xử lý hàng loạt`, 'error');
    }
  },

  async restoreTrash(type, id) {
    try {
      await API.request('POST', '/trash/restore', { type, id });
      App.showToast('Đã khôi phục dữ liệu!');
      this.loadTrash(); // Reload danh sách
      
      // Load lại trang tương ứng nếu đang mở Board
      const isBoardsView = document.getElementById('boards-view').classList.contains('active');
      const isKanbanView = document.getElementById('kanban-view').classList.contains('active');
      
      if (isBoardsView) Board.loadBoards();
      else if (isKanbanView && Kanban.lastBoardId) Kanban.loadBoard(Kanban.lastBoardId);
    } catch (err) {
      App.showToast('Lỗi khôi phục', 'error');
    }
  },

  // ============================================================
  // GLOBAL EVENTS
  // ============================================================
  bindGlobalEvents() {
    Auth.init();

    // Custom Triggers: Home & Trash
    document.getElementById('nav-home-btn').addEventListener('click', () => {
      this.showView('boards');
    });

    const trashBtn = document.getElementById('trash-btn');
    if (trashBtn) trashBtn.addEventListener('click', () => this.loadTrash());

    // Admin panel
    document.getElementById('admin-btn')?.addEventListener('click', () => {
      this.showView('admin');
      this.initAdmin(); // Initialize tabs & events
      this.loadAdminUsers(); // Default load current tab
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
  editingTemplateId: null,

  async initAdmin() {
    // Check if we already bound
    if (this._adminBound) return;
    this._adminBound = true;

    document.getElementById('admin-tab-users').addEventListener('click', (e) => {
      e.target.classList.add('active');
      document.getElementById('admin-tab-templates').classList.remove('active');
      document.getElementById('admin-users-section').style.display = 'block';
      document.getElementById('admin-templates-section').style.display = 'none';
      this.loadAdminUsers();
    });

    document.getElementById('admin-tab-templates').addEventListener('click', (e) => {
      e.target.classList.add('active');
      document.getElementById('admin-tab-users').classList.remove('active');
      document.getElementById('admin-users-section').style.display = 'none';
      document.getElementById('admin-templates-section').style.display = 'block';
      this.loadAdminTemplates();
    });

    document.getElementById('admin-create-template-btn').addEventListener('click', () => {
      this.openTemplateModal();
    });

    document.getElementById('template-save-btn').addEventListener('click', () => {
      this.adminSaveTemplate();
    });
  },

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
  // ADMIN TEMPLATES
  // ============================================================
  async loadAdminTemplates() {
    try {
      const templates = await API.getTemplates();
      const table = document.getElementById('admin-templates-table');
      if (templates.length === 0) {
        table.innerHTML = '<div style="padding:20px; text-align:center;">Chưa có form mẫu nào.</div>';
        return;
      }
      
      table.innerHTML = templates.map(t => `
        <div class="admin-user-row" style="align-items:flex-start;">
          <div class="admin-user-info" style="flex:1;">
            <span class="name">🚀 ${Board.escapeHtml(t.name)}</span>
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">Tiêu đề: ${Board.escapeHtml(t.template_title || '(Trống)')}</div>
            <pre style="font-size:0.8rem; color:var(--text-tertiary); margin-top:4px; max-height: 60px; overflow:hidden; text-overflow:ellipsis;">${Board.escapeHtml(t.template_desc || '')}</pre>
          </div>
          <div class="admin-actions">
            <button class="admin-action-btn" onclick='App.openTemplateModal(${JSON.stringify(t).replace(/'/g, "&#39;")})'>Sửa</button>
            <button class="admin-action-btn danger" onclick="App.deleteTemplate(${t.id})">Xóa</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  openTemplateModal(t = null) {
    this.editingTemplateId = t ? t.id : null;
    document.getElementById('template-modal-title').textContent = t ? 'Sửa Form Mẫu' : 'Tạo Form Mẫu Mới';
    document.getElementById('template-name-input').value = t ? t.name : '';
    document.getElementById('template-title-input').value = t ? t.template_title : '';
    document.getElementById('template-desc-input').value = t ? t.template_desc : '';
    this.openModal('admin-template-modal');
  },

  async adminSaveTemplate() {
    const name = document.getElementById('template-name-input').value;
    const template_title = document.getElementById('template-title-input').value;
    const template_desc = document.getElementById('template-desc-input').value;

    if (!name.trim()) return App.toast('Tên gợi nhớ là bắt buộc', 'error');

    try {
      if (this.editingTemplateId) {
        await API.updateTemplate(this.editingTemplateId, { name, template_title, template_desc });
        App.toast('Cập nhật mẫu thành công!', 'success');
      } else {
        await API.createTemplate({ name, template_title, template_desc });
        App.toast('Tạo mẫu mới thành công!', 'success');
      }
      this.closeModal('admin-template-modal');
      this.loadAdminTemplates();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteTemplate(id) {
    const ok = await this.confirm('Bạn có chắc muốn xóa vĩnh viễn Form mẫu này?');
    if (!ok) return;
    try {
      await API.deleteTemplate(id);
      App.toast('Xóa mẫu thành công!', 'success');
      this.loadAdminTemplates();
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
          const ok = await App.confirm('Chắc chắn muốn xóa thành viên này khỏi board?');
          if (!ok) return;
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
          const ok = await App.confirm('Xóa nhãn này vĩnh viễn? Các card đang dùng nhãn này sẽ bị mất nhãn (Hành động này không qua thùng rác).');
          if (!ok) return;
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
