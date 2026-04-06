const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getDb(req) { return req.app.locals.db; }

// ============================================================
// GET /api/boards
// ============================================================
router.get('/', (req, res) => {
  try {
    const db = getDb(req);
    const userId = req.session.userId;

    const boards = db.all(`
      SELECT DISTINCT b.*, u.display_name as owner_name, u.avatar_color as owner_color
      FROM boards b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN board_members bm ON b.id = bm.board_id
      WHERE (b.owner_id = ? OR bm.user_id = ?) AND b.is_deleted = 0
      ORDER BY b.created_at DESC
    `, [userId, userId]);

    const result = boards.map(b => {
      const colCount = db.get('SELECT COUNT(*) as cnt FROM columns WHERE board_id = ? AND is_deleted = 0', [b.id]);
      const cardCount = db.get('SELECT COUNT(*) as cnt FROM cards c JOIN columns col ON c.column_id = col.id WHERE col.board_id = ? AND c.is_deleted = 0', [b.id]);
      return {
        id: b.id, title: b.title, description: b.description, background: b.background,
        ownerId: b.owner_id, ownerName: b.owner_name, ownerColor: b.owner_color,
        columnCount: colCount ? colCount.cnt : 0,
        cardCount: cardCount ? cardCount.cnt : 0,
        createdAt: b.created_at, updatedAt: b.updated_at
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get boards error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// POST /api/boards
// ============================================================
router.post('/', (req, res) => {
  try {
    const db = getDb(req);
    const { title, description, background } = req.body;
    const userId = req.session.userId;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Vui lòng nhập tên board.' });

    const bg = background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const result = db.run(
      'INSERT INTO boards (title, description, background, owner_id) VALUES (?, ?, ?, ?)',
      [title.trim(), description || '', bg, userId]
    );

    const boardId = result.lastInsertRowid;

    db.run('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)', [boardId, userId, 'admin']);

    const defaultColumns = ['📋 To Do', '🔄 In Progress', '✅ Done'];
    defaultColumns.forEach((col, i) => {
      db.run('INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)', [boardId, col, i]);
    });

    res.status(201).json({ message: 'Tạo board thành công!', boardId });
  } catch (err) {
    console.error('Create board error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// GET /api/boards/:id
// ============================================================
router.get('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const userId = req.session.userId;

    const board = db.get(`
      SELECT b.*, u.display_name as owner_name
      FROM boards b JOIN users u ON b.owner_id = u.id WHERE b.id = ? AND b.is_deleted = 0
    `, [parseInt(id)]);

    if (!board) return res.status(404).json({ error: 'Board không tồn tại.' });

    const isMember = db.get('SELECT 1 as ok FROM board_members WHERE board_id = ? AND user_id = ?', [parseInt(id), userId]);
    if (!isMember && board.owner_id !== userId) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập board này.' });
    }

    const columns = db.all('SELECT * FROM columns WHERE board_id = ? AND is_deleted = 0 ORDER BY position ASC', [parseInt(id)]);

    const columnsWithCards = columns.map(col => {
      const cards = db.all(`
        SELECT c.*,
          u1.display_name as creator_name, u1.avatar_color as creator_color
        FROM cards c
        LEFT JOIN users u1 ON c.created_by = u1.id
        WHERE c.column_id = ? AND c.is_deleted = 0 ORDER BY c.position ASC
      `, [col.id]);

      return {
        id: col.id, title: col.title, position: col.position,
        cards: cards.map(c => {
          const cardLabels = db.all(`
            SELECT l.id, l.name, l.color
            FROM labels l JOIN card_labels cl ON l.id = cl.label_id
            WHERE cl.card_id = ?
          `, [c.id]);

          const cardAssignees = db.all(`
            SELECT u.id, u.username, u.display_name, u.avatar_color
            FROM users u JOIN card_assignees ca ON u.id = ca.user_id
            WHERE ca.card_id = ?
          `, [c.id]);

          return {
            id: c.id, title: c.title, description: c.description,
            position: c.position, priority: c.priority, dueDate: c.due_date,
            startDate: c.start_date, isLongTerm: c.is_long_term === 1,
            createdBy: c.created_by, creatorName: c.creator_name, creatorColor: c.creator_color,
            assignees: cardAssignees.map(a => ({
              id: a.id,
              username: a.username,
              displayName: a.display_name,
              avatarColor: a.avatar_color
            })),
            labels: cardLabels,
            createdAt: c.created_at, updatedAt: c.updated_at
          };
        })
      };
    });

    const members = db.all(`
      SELECT u.id, u.username, u.display_name, u.avatar_color, bm.role
      FROM board_members bm JOIN users u ON bm.user_id = u.id WHERE bm.board_id = ?
    `, [parseInt(id)]);

    res.json({
      id: board.id, title: board.title, description: board.description,
      background: board.background, ownerId: board.owner_id, ownerName: board.owner_name,
      columns: columnsWithCards,
      members: members.map(m => ({
        id: m.id, username: m.username, displayName: m.display_name,
        avatarColor: m.avatar_color, role: m.role
      })),
      createdAt: board.created_at, updatedAt: board.updated_at
    });
  } catch (err) {
    console.error('Get board error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// PUT /api/boards/:id
// ============================================================
router.put('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { title, description, background } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Vui lòng nhập tên board.' });

    db.run(
      'UPDATE boards SET title = ?, description = ?, background = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title.trim(), description || '', background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', parseInt(id)]
    );

    res.json({ message: 'Cập nhật board thành công!' });
  } catch (err) {
    console.error('Update board error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// DELETE /api/boards/:id
// ============================================================
router.delete('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const board = db.get('SELECT owner_id FROM boards WHERE id = ?', [parseInt(id)]);

    if (!board) return res.status(404).json({ error: 'Board không tồn tại.' });
    if (board.owner_id !== req.session.userId && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ owner hoặc admin mới xóa được board.' });
    }

    // Soft Delete: Just update is_deleted to 1
    db.run('UPDATE boards SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [parseInt(id)]);

    res.json({ message: 'Đã đưa board vào thùng rác.' });
  } catch (err) {
    console.error('Trash board error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// GET /api/boards/:id/members
// ============================================================
router.get('/:id/members', (req, res) => {
  try {
    const db = getDb(req);
    const boardId = parseInt(req.params.id);
    const userId = req.session.userId;

    const isMember = db.get('SELECT 1 as ok FROM board_members WHERE board_id = ? AND user_id = ?', [boardId, userId]);
    const board = db.get('SELECT owner_id FROM boards WHERE id = ?', [boardId]);
    if (!board) return res.status(404).json({ error: 'Board không tồn tại.' });
    if (!isMember && board.owner_id !== userId) return res.status(403).json({ error: 'Không có quyền.' });

    const members = db.all(`
      SELECT u.id, u.username, u.display_name, u.avatar_color, bm.role
      FROM board_members bm JOIN users u ON bm.user_id = u.id
      WHERE bm.board_id = ? ORDER BY bm.joined_at ASC
    `, [boardId]);

    res.json(members.map(m => ({
      id: m.id, username: m.username, displayName: m.display_name,
      avatarColor: m.avatar_color, role: m.role
    })));
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// POST /api/boards/:id/members  { userId }
// ============================================================
router.post('/:id/members', (req, res) => {
  try {
    const db = getDb(req);
    const boardId = parseInt(req.params.id);
    const { userId } = req.body;
    const currentUserId = req.session.userId;

    if (!userId) return res.status(400).json({ error: 'Thiếu userId.' });

    const board = db.get('SELECT owner_id FROM boards WHERE id = ?', [boardId]);
    if (!board) return res.status(404).json({ error: 'Board không tồn tại.' });

    // Chỉ owner hoặc board-admin mới invite được
    const currentMember = db.get('SELECT role FROM board_members WHERE board_id = ? AND user_id = ?', [boardId, currentUserId]);
    const isOwner = board.owner_id === currentUserId;
    const isBoardAdmin = currentMember && currentMember.role === 'admin';
    if (!isOwner && !isBoardAdmin) {
      return res.status(403).json({ error: 'Chỉ owner hoặc admin board mới thêm thành viên được.' });
    }

    // Kiểm tra đã là member chưa
    const existing = db.get('SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?', [boardId, parseInt(userId)]);
    if (existing) return res.status(409).json({ error: 'Người dùng đã là thành viên của board này.' });

    // Kiểm tra user tồn tại
    const targetUser = db.get('SELECT id, display_name FROM users WHERE id = ? AND is_active = 1', [parseInt(userId)]);
    if (!targetUser) return res.status(404).json({ error: 'Người dùng không tồn tại.' });

    db.run('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)', [boardId, parseInt(userId), 'member']);

    res.status(201).json({ message: `Đã thêm ${targetUser.display_name} vào board!` });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// DELETE /api/boards/:id/members/:userId
// ============================================================
router.delete('/:id/members/:userId', (req, res) => {
  try {
    const db = getDb(req);
    const boardId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const currentUserId = req.session.userId;

    const board = db.get('SELECT owner_id FROM boards WHERE id = ?', [boardId]);
    if (!board) return res.status(404).json({ error: 'Board không tồn tại.' });

    // Không thể xóa owner
    if (targetUserId === board.owner_id) {
      return res.status(400).json({ error: 'Không thể xóa owner khỏi board.' });
    }

    // Chỉ owner/board-admin mới xóa được (hoặc tự rời board)
    const currentMember = db.get('SELECT role FROM board_members WHERE board_id = ? AND user_id = ?', [boardId, currentUserId]);
    const isOwner = board.owner_id === currentUserId;
    const isBoardAdmin = currentMember && currentMember.role === 'admin';
    const isSelf = targetUserId === currentUserId;
    if (!isOwner && !isBoardAdmin && !isSelf) {
      return res.status(403).json({ error: 'Không có quyền xóa thành viên này.' });
    }

    db.run('DELETE FROM board_members WHERE board_id = ? AND user_id = ?', [boardId, targetUserId]);

    res.json({ message: 'Đã xóa thành viên khỏi board.' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

module.exports = router;
