// ============================================================
// BOARD MODULE
// Board list view + board CRUD
// ============================================================

const Board = {
  boards: [],
  editingBoardId: null,

  async loadBoards() {
    try {
      this.boards = await API.getBoards();
      this.renderBoardList();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  renderBoardList() {
    const grid = document.getElementById('boards-grid');

    const boardCards = this.boards.map(b => `
      <div class="board-card" style="background:${b.background}" data-board-id="${b.id}">
        <button class="board-delete-btn" data-delete-board="${b.id}" title="Xóa board">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="board-card-content">
          <div class="board-card-title">${this.escapeHtml(b.title)}</div>
        </div>
        <div class="board-card-meta">
          <span>📋 ${b.columnCount} columns</span>
          <span>🗂️ ${b.cardCount} cards</span>
        </div>
      </div>
    `).join('');

    grid.innerHTML = boardCards + `
      <div class="board-card board-card-create" id="create-board-card">
        <div class="create-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Tạo Board Mới</span>
        </div>
      </div>
    `;

    // Event: Click board card
    grid.querySelectorAll('.board-card[data-board-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.board-delete-btn')) return;
        const boardId = card.dataset.boardId;
        Kanban.loadBoard(boardId);
      });
    });

    // Event: Delete board
    grid.querySelectorAll('.board-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const boardId = btn.dataset.deleteBoard;
        if (confirm('Bạn có chắc muốn xóa board này? Tất cả columns và cards sẽ bị xóa.')) {
          try {
            await API.deleteBoard(boardId);
            App.toast('Xóa board thành công!', 'success');
            this.loadBoards();
          } catch (err) {
            App.toast(err.message, 'error');
          }
        }
      });
    });

    // Event: Create board
    document.getElementById('create-board-card').addEventListener('click', () => {
      this.openBoardModal();
    });
  },

  openBoardModal(board = null) {
    this.editingBoardId = board ? board.id : null;

    document.getElementById('board-modal-title').textContent = board ? 'Chỉnh sửa Board' : 'Tạo Board Mới';
    document.getElementById('board-name-input').value = board ? board.title : '';
    document.getElementById('board-desc-input').value = board ? board.description : '';
    document.getElementById('board-save-btn').textContent = board ? 'Lưu' : 'Tạo Board';

    // Reset background selection
    const bgOptions = document.querySelectorAll('.bg-option');
    bgOptions.forEach(opt => opt.classList.remove('active'));
    if (board && board.background) {
      const matchOpt = Array.from(bgOptions).find(opt => opt.dataset.bg === board.background);
      if (matchOpt) matchOpt.classList.add('active');
      else bgOptions[0].classList.add('active');
    } else {
      bgOptions[0].classList.add('active');
    }

    App.openModal('board-modal');
    document.getElementById('board-name-input').focus();
  },

  getSelectedBackground() {
    const active = document.querySelector('.bg-option.active');
    return active ? active.dataset.bg : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  },

  async saveBoard() {
    const title = document.getElementById('board-name-input').value.trim();
    const description = document.getElementById('board-desc-input').value.trim();
    const background = this.getSelectedBackground();

    if (!title) {
      App.toast('Vui lòng nhập tên board.', 'error');
      return;
    }

    try {
      if (this.editingBoardId) {
        await API.updateBoard(this.editingBoardId, { title, description, background });
        App.toast('Cập nhật board thành công!', 'success');
      } else {
        const result = await API.createBoard({ title, description, background });
        App.toast('Tạo board thành công!', 'success');
      }
      App.closeModal('board-modal');
      this.loadBoards();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
