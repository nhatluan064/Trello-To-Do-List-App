// ============================================================
// KANBAN MODULE
// Core kanban board: columns, cards, drag-and-drop
// ============================================================

const Kanban = {
  currentBoard: null,
  draggedCard: null,
  draggedCardId: null,
  boardMembers: [],
  boardLabels: [],
  activeCardLabels: [],
  
  // Phase 3A: Search & Filter state
  currentFilters: { keyword: '', labelId: '', assigneeId: '' },
  lastBoardId: null,

  async loadBoard(boardId) {
    try {
      if (this.lastBoardId !== boardId) {
        this.currentFilters = { keyword: '', labelId: '', assigneeId: '' };
        this.lastBoardId = boardId;
        
        // Reset DOM inputs for filters
        document.getElementById('filter-keyword').value = '';
        document.getElementById('clear-filters-btn').style.display = 'none';
      }

      this.currentBoard = await API.getBoard(boardId);
      // Load members and labels for assignee dropdown + label picker
      this.boardMembers = this.currentBoard.members || [];
      this.boardLabels = await API.getBoardLabels(boardId);
      App.showView('kanban');

      // Show kanban-specific nav buttons
      document.getElementById('members-btn').style.display = 'flex';
      document.getElementById('labels-btn').style.display = 'flex';

      // Update nav title
      document.getElementById('board-title-area').innerHTML = `
        <span class="board-title-display">${Board.escapeHtml(this.currentBoard.title)}</span>
      `;

      this.initFilterDropdowns();

      this.render();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  render() {
    const container = document.getElementById('kanban-container');
    if (!this.currentBoard) return;

    const columnsHtml = this.currentBoard.columns.map(col => `
      <div class="kanban-column" data-column-id="${col.id}">
        <div class="column-header">
          <div class="column-title-wrapper">
            <input class="column-title" value="${Board.escapeHtml(col.title)}" 
              data-column-id="${col.id}" spellcheck="false">
            <span class="column-count">${col.cards.length}</span>
          </div>
          <div class="column-actions">
            <button class="column-btn" title="Xóa column" data-delete-column="${col.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="cards-container" data-column-id="${col.id}">
          ${col.cards.map(card => this.renderCard(card)).join('')}
        </div>
        <div class="column-footer">
          <button class="add-card-btn" data-column-id="${col.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Thêm thẻ
          </button>
          <div class="add-card-form" style="display:none" data-form-column="${col.id}">
            <textarea class="add-card-input" placeholder="Nhập tiêu đề thẻ..." rows="2" 
              data-input-column="${col.id}"></textarea>
            <div class="add-card-actions">
              <button class="btn btn-primary btn-sm" data-save-card="${col.id}">Thêm</button>
              <button class="btn btn-ghost btn-sm" data-cancel-card="${col.id}">Hủy</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = columnsHtml + `
      <button class="add-column-btn" id="add-column-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Thêm column
      </button>
    `;

    this.bindEvents();
    this.applyFilters(); // Phase 3A: apply filters immediately on render
  },

  renderCard(card) {
    // Labels row
    const labelsHtml = (card.labels && card.labels.length > 0)
      ? `<div class="card-labels-row">${card.labels.map(l =>
          `<span class="card-label-pill" style="background:${l.color}">${Board.escapeHtml(l.name)}</span>`
        ).join('')}</div>`
      : '';

    const dueDateHtml = card.dueDate
      ? `<span class="card-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${new Date(card.dueDate).toLocaleDateString('vi-VN')}
        </span>`
      : '';

    const assigneeHtml = card.assigneeName
      ? `<span class="card-assignee-avatar" style="background:${card.assigneeColor}" title="${Board.escapeHtml(card.assigneeName)}">
          ${card.assigneeName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
        </span>`
      : '';

    return `
      <div class="kanban-card" draggable="true" data-card-id="${card.id}" data-card='${JSON.stringify(card).replace(/'/g, "&#39;")}'>
        <div class="card-priority-bar ${card.priority}"></div>
        ${labelsHtml}
        <div class="card-title">${Board.escapeHtml(card.title)}</div>
        <div class="card-meta">
          ${dueDateHtml}
          ${card.description ? '<span class="card-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>' : ''}
          ${assigneeHtml}
        </div>
      </div>
    `;
  },

  bindEvents() {
    // ---- Column Title Edit ----
    document.querySelectorAll('.column-title').forEach(input => {
      input.addEventListener('blur', async () => {
        const colId = input.dataset.columnId;
        const title = input.value.trim();
        if (!title) {
          input.value = 'Untitled';
          return;
        }
        try {
          await API.updateColumn(colId, { title });
        } catch (err) {
          App.toast(err.message, 'error');
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      });
    });

    // ---- Delete Column ----
    document.querySelectorAll('[data-delete-column]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const colId = btn.dataset.deleteColumn;
        if (confirm('Xóa column này? Tất cả thẻ bên trong sẽ bị xóa.')) {
          try {
            await API.deleteColumn(colId);
            App.toast('Xóa column thành công!', 'success');
            this.loadBoard(this.currentBoard.id);
          } catch (err) {
            App.toast(err.message, 'error');
          }
        }
      });
    });

    // ---- Add Card ----
    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.dataset.columnId;
        btn.style.display = 'none';
        const form = document.querySelector(`[data-form-column="${colId}"]`);
        form.style.display = 'block';
        form.querySelector('textarea').focus();
      });
    });

    document.querySelectorAll('[data-cancel-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const colId = btn.dataset.cancelCard;
        const form = document.querySelector(`[data-form-column="${colId}"]`);
        form.style.display = 'none';
        form.querySelector('textarea').value = '';
        document.querySelector(`.add-card-btn[data-column-id="${colId}"]`).style.display = 'flex';
      });
    });

    document.querySelectorAll('[data-save-card]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const colId = btn.dataset.saveCard;
        const input = document.querySelector(`[data-input-column="${colId}"]`);
        const title = input.value.trim();

        if (!title) {
          App.toast('Vui lòng nhập tiêu đề thẻ.', 'error');
          return;
        }

        try {
          await API.createCard({ columnId: parseInt(colId), title });
          input.value = '';
          this.loadBoard(this.currentBoard.id);
        } catch (err) {
          App.toast(err.message, 'error');
        }
      });
    });

    // Enter to submit card
    document.querySelectorAll('.add-card-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const colId = input.dataset.inputColumn;
          document.querySelector(`[data-save-card="${colId}"]`).click();
        }
        if (e.key === 'Escape') {
          const colId = input.dataset.inputColumn;
          document.querySelector(`[data-cancel-card="${colId}"]`).click();
        }
      });
    });

    // ---- Add Column ----
    document.getElementById('add-column-btn').addEventListener('click', async () => {
      const title = prompt('Nhập tên column mới:');
      if (!title || !title.trim()) return;

      try {
        await API.createColumn({ boardId: this.currentBoard.id, title: title.trim() });
        App.toast('Thêm column thành công!', 'success');
        this.loadBoard(this.currentBoard.id);
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });

    // ---- Card Click (open detail) ----
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (card.classList.contains('dragging')) return;
        const cardData = JSON.parse(card.dataset.card);
        this.openCardModal(cardData);
      });
    });

    // ---- Drag and Drop ----
    this.initDragAndDrop();
  },

  // ============================================================
  // DRAG AND DROP
  // ============================================================
  initDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.cards-container');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedCard = card;
        this.draggedCardId = card.dataset.cardId;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.cardId);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.draggedCard = null;
        this.draggedCardId = null;
        // Remove all drag-over indicators
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      });
    });

    columns.forEach(container => {
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const column = container.closest('.kanban-column');
        column.classList.add('drag-over');

        // Find the position to insert
        const afterElement = this.getDragAfterElement(container, e.clientY);

        // Remove existing indicators
        container.querySelectorAll('.drop-indicator').forEach(el => el.remove());

        // Add indicator
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';

        if (afterElement) {
          container.insertBefore(indicator, afterElement);
        } else {
          container.appendChild(indicator);
        }
      });

      container.addEventListener('dragleave', (e) => {
        const column = container.closest('.kanban-column');
        if (!container.contains(e.relatedTarget)) {
          column.classList.remove('drag-over');
          container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        }
      });

      container.addEventListener('drop', async (e) => {
        e.preventDefault();
        const column = container.closest('.kanban-column');
        column.classList.remove('drag-over');
        container.querySelectorAll('.drop-indicator').forEach(el => el.remove());

        const cardId = e.dataTransfer.getData('text/plain');
        const columnId = parseInt(container.dataset.columnId);

        // Calculate position
        const afterElement = this.getDragAfterElement(container, e.clientY);
        let position = 0;

        const existingCards = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
        if (afterElement) {
          position = existingCards.indexOf(afterElement);
        } else {
          position = existingCards.length;
        }

        try {
          await API.moveCard(cardId, columnId, position);
          this.loadBoard(this.currentBoard.id);
        } catch (err) {
          App.toast(err.message, 'error');
        }
      });
    });
  },

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  },

  // ============================================================
  // CARD DETAIL MODAL
  // ============================================================
  editingCardId: null,
  editingCardColumnId: null,

  openCardModal(card) {
    this.editingCardId = card.id;
    this.editingCardColumnId = card.columnId;
    this.activeCardLabels = (card.labels || []).map(l => l.id);

    document.getElementById('card-modal-title').textContent = 'Chi tiết thẻ';
    document.getElementById('card-title-input').value = card.title || '';
    document.getElementById('card-desc-input').value = card.description || '';
    document.getElementById('card-priority-input').value = card.priority || 'medium';
    document.getElementById('card-due-input').value = card.dueDate || '';

    // Populate assignee dropdown
    const assigneeSelect = document.getElementById('card-assignee-input');
    assigneeSelect.innerHTML = '<option value="">-- Chưa phân công --</option>';
    this.boardMembers.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.displayName} (@${m.username})`;
      if (m.id === card.assignedTo) opt.selected = true;
      assigneeSelect.appendChild(opt);
    });

    // Populate labels picker
    const picker = document.getElementById('card-labels-picker');
    if (this.boardLabels.length === 0) {
      picker.innerHTML = '<span style="color:var(--text-tertiary);font-size:0.83rem">Chưa có nhãn. Tạo nhãn trong menu "Nhãn" trên nav.</span>';
    } else {
      picker.innerHTML = this.boardLabels.map(l => {
        const isActive = this.activeCardLabels.includes(l.id);
        return `<button class="label-toggle-btn ${isActive ? 'active' : ''}" 
          data-label-id="${l.id}" style="background:${l.color}">
          <span class="label-toggle-check">${isActive ? '✓' : ''}</span>
          ${Board.escapeHtml(l.name)}
        </button>`;
      }).join('');

      picker.querySelectorAll('.label-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const labelId = parseInt(btn.dataset.labelId);
          const idx = this.activeCardLabels.indexOf(labelId);
          if (idx === -1) {
            this.activeCardLabels.push(labelId);
            btn.classList.add('active');
            btn.querySelector('.label-toggle-check').textContent = '✓';
          } else {
            this.activeCardLabels.splice(idx, 1);
            btn.classList.remove('active');
            btn.querySelector('.label-toggle-check').textContent = '';
          }
        });
      });
    }

    // Load comments
    this.loadComments(card.id);

    App.openModal('card-modal');
  },

  async loadComments(cardId) {
    const list = document.getElementById('card-comments-list');
    try {
      const comments = await API.getComments(cardId);
      list.innerHTML = comments.map(c => `
        <div class="comment-item">
          <div class="user-avatar" style="background:${c.avatarColor}">
            ${c.displayName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
          </div>
          <div class="comment-content">
            <div class="comment-author">${Board.escapeHtml(c.displayName)}</div>
            <div class="comment-text">${Board.escapeHtml(c.content)}</div>
            <div class="comment-time">${new Date(c.createdAt).toLocaleString('vi-VN')}</div>
          </div>
        </div>
      `).join('');

      if (comments.length === 0) {
        list.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.85rem;text-align:center;padding:12px">Chưa có bình luận nào.</p>';
      }
    } catch (err) {
      list.innerHTML = '';
    }
  },

  async saveCard() {
    if (!this.editingCardId) return;

    const title = document.getElementById('card-title-input').value.trim();
    const description = document.getElementById('card-desc-input').value.trim();
    const priority = document.getElementById('card-priority-input').value;
    const dueDate = document.getElementById('card-due-input').value;
    const assignedTo = document.getElementById('card-assignee-input').value || null;

    if (!title) {
      App.toast('Vui lòng nhập tiêu đề thẻ.', 'error');
      return;
    }

    try {
      // Save basic card info + assignee
      await API.updateCard(this.editingCardId, {
        title, description, priority,
        dueDate: dueDate || null,
        assignedTo: assignedTo ? parseInt(assignedTo) : null
      });

      // Sync labels: get current labels, add new, remove old
      const currentLabels = await API.getCardLabels(this.editingCardId);
      const currentIds = currentLabels.map(l => l.id);

      // Add new labels
      const toAdd = this.activeCardLabels.filter(id => !currentIds.includes(id));
      // Remove old labels
      const toRemove = currentIds.filter(id => !this.activeCardLabels.includes(id));

      await Promise.all([
        ...toAdd.map(id => API.addCardLabel(this.editingCardId, id)),
        ...toRemove.map(id => API.removeCardLabel(this.editingCardId, id))
      ]);

      App.toast('Cập nhật thẻ thành công!', 'success');
      App.closeModal('card-modal');
      this.loadBoard(this.currentBoard.id);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteCard() {
    if (!this.editingCardId) return;
    if (!confirm('Bạn có chắc muốn xóa thẻ này?')) return;

    try {
      await API.deleteCard(this.editingCardId);
      App.toast('Xóa thẻ thành công!', 'success');
      App.closeModal('card-modal');
      this.loadBoard(this.currentBoard.id);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async addComment() {
    if (!this.editingCardId) return;
    const input = document.getElementById('card-comment-input');
    const content = input.value.trim();
    if (!content) return;

    try {
      await API.addComment(this.editingCardId, content);
      input.value = '';
      this.loadComments(this.editingCardId);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  // ============================================================
  // PHASE 3A: SEARCH & FILTER
  // ============================================================
  initFilterDropdowns() {
    const labelSelect = document.getElementById('filter-label');
    const assigneeSelect = document.getElementById('filter-assignee');
    const clearBtn = document.getElementById('clear-filters-btn');
    const keywordInput = document.getElementById('filter-keyword');

    // Populate Labels
    labelSelect.innerHTML = '<option value="">Tất cả nhãn</option>';
    this.boardLabels.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.name;
      if (this.currentFilters.labelId === l.id.toString()) opt.selected = true;
      labelSelect.appendChild(opt);
    });

    // Populate Assignees
    assigneeSelect.innerHTML = '<option value="">Tất cả thành viên</option>';
    this.boardMembers.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.displayName;
      if (this.currentFilters.assigneeId === m.id.toString()) opt.selected = true;
      assigneeSelect.appendChild(opt);
    });

    // We only bind events once per initialization
    if (!this._filtersBound) {
      this._filtersBound = true;
      
      keywordInput.addEventListener('input', (e) => {
        this.currentFilters.keyword = e.target.value.trim().toLowerCase();
        this.applyFilters();
      });

      labelSelect.addEventListener('change', (e) => {
        this.currentFilters.labelId = e.target.value;
        this.applyFilters();
      });

      assigneeSelect.addEventListener('change', (e) => {
        this.currentFilters.assigneeId = e.target.value;
        this.applyFilters();
      });

      clearBtn.addEventListener('click', () => {
        this.currentFilters = { keyword: '', labelId: '', assigneeId: '' };
        keywordInput.value = '';
        labelSelect.value = '';
        assigneeSelect.value = '';
        this.applyFilters();
      });
    }
  },

  applyFilters() {
    const cards = document.querySelectorAll('.kanban-card:not(.dragging)');
    let hasFilter = this.currentFilters.keyword || this.currentFilters.labelId || this.currentFilters.assigneeId;

    document.getElementById('clear-filters-btn').style.display = hasFilter ? 'inline-flex' : 'none';

    cards.forEach(cardEl => {
      let isMatch = true;
      let cardData;
      
      try {
        cardData = JSON.parse(cardEl.dataset.card);
      } catch(e) {
        return; // skip parsing errors
      }

      // Keyword match
      if (this.currentFilters.keyword) {
        const titleMatch = (cardData.title || '').toLowerCase().includes(this.currentFilters.keyword);
        const descMatch = (cardData.description || '').toLowerCase().includes(this.currentFilters.keyword);
        if (!titleMatch && !descMatch) isMatch = false;
      }

      // Label match
      if (this.currentFilters.labelId && isMatch) {
        const labelIdNum = parseInt(this.currentFilters.labelId);
        const hasLabel = cardData.labels && cardData.labels.some(l => l.id === labelIdNum);
        if (!hasLabel) isMatch = false;
      }

      // Assignee match
      if (this.currentFilters.assigneeId && isMatch) {
        const assigneeIdNum = parseInt(this.currentFilters.assigneeId);
        if (cardData.assignedTo !== assigneeIdNum) isMatch = false;
      }

      // Toggle visibility class
      if (isMatch) {
        cardEl.classList.remove('card-hidden');
      } else {
        cardEl.classList.add('card-hidden');
      }
    });
  }
};
