// ============================================================
// API CLIENT
// Centralized HTTP client for all API calls
// ============================================================

const API = {
  BASE: '/api',

  async request(method, path, body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(this.BASE + path, options);
      const data = await res.json();

      if (!res.ok) {
        // If unauthorized, redirect to login
        if (res.status === 401) {
          App.showAuth();
        }
        throw new Error(data.error || 'Đã xảy ra lỗi.');
      }

      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối server. Kiểm tra mạng.');
      }
      throw err;
    }
  },

  // Auth
  login(username, password) { return this.request('POST', '/auth/login', { username, password }); },
  register(username, password, displayName) { return this.request('POST', '/auth/register', { username, password, displayName }); },
  logout() { return this.request('POST', '/auth/logout'); },
  me() { return this.request('GET', '/auth/me'); },

  // Admin
  getUsers() { return this.request('GET', '/auth/admin/users'); },
  createUser(data) { return this.request('POST', '/auth/admin/create-user', data); },
  resetPassword(userId, newPassword) { return this.request('PUT', `/auth/admin/reset-password/${userId}`, { newPassword }); },
  toggleActive(userId) { return this.request('PUT', `/auth/admin/toggle-active/${userId}`); },

  // Boards
  getBoards() { return this.request('GET', '/boards'); },
  createBoard(data) { return this.request('POST', '/boards', data); },
  getBoard(id) { return this.request('GET', `/boards/${id}`); },
  updateBoard(id, data) { return this.request('PUT', `/boards/${id}`, data); },
  deleteBoard(id) { return this.request('DELETE', `/boards/${id}`); },

  // Columns
  createColumn(data) { return this.request('POST', '/columns', data); },
  updateColumn(id, data) { return this.request('PUT', `/columns/${id}`, data); },
  deleteColumn(id) { return this.request('DELETE', `/columns/${id}`); },

  // Templates
  getTemplates() { return this.request('GET', '/templates'); },
  createTemplate(data) { return this.request('POST', '/templates', data); },
  updateTemplate(id, data) { return this.request('PUT', `/templates/${id}`, data); },
  deleteTemplate(id) { return this.request('DELETE', `/templates/${id}`); },

  reorderColumns(columns) { return this.request('PUT', '/columns/reorder/batch', { columns }); },

  // Cards
  createCard(data) { return this.request('POST', '/cards', data); },
  updateCard(id, data) { return this.request('PUT', `/cards/${id}`, data); },
  deleteCard(id) { return this.request('DELETE', `/cards/${id}`); },
  moveCard(id, columnId, position) { return this.request('PUT', `/cards/${id}/move`, { columnId, position }); },

  // Comments
  getComments(cardId) { return this.request('GET', `/cards/${cardId}/comments`); },
  addComment(cardId, content) { return this.request('POST', `/cards/${cardId}/comments`, { content }); },

  // Users list (for member invite dropdown)
  getUsersList() { return this.request('GET', '/auth/users-list'); },

  // Board Members
  getBoardMembers(boardId) { return this.request('GET', `/boards/${boardId}/members`); },
  addBoardMember(boardId, userId) { return this.request('POST', `/boards/${boardId}/members`, { userId }); },
  removeBoardMember(boardId, userId) { return this.request('DELETE', `/boards/${boardId}/members/${userId}`); },

  // Labels
  getBoardLabels(boardId) { return this.request('GET', `/boards/${boardId}/labels`); },
  createLabel(boardId, name, color) { return this.request('POST', `/boards/${boardId}/labels`, { name, color }); },
  deleteLabel(labelId) { return this.request('DELETE', `/labels/${labelId}`); },
  getCardLabels(cardId) { return this.request('GET', `/cards/${cardId}/labels`); },
  addCardLabel(cardId, labelId) { return this.request('POST', `/cards/${cardId}/labels`, { labelId }); },
  removeCardLabel(cardId, labelId) { return this.request('DELETE', `/cards/${cardId}/labels/${labelId}`) }
};
