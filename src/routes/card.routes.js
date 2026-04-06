const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getDb(req) { return req.app.locals.db; }

// POST /api/cards
router.post('/', (req, res) => {
  try {
    const db = getDb(req);
    const { columnId, title, description, priority } = req.body;

    if (!columnId || !title || !title.trim()) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề card.' });

    const maxPos = db.get('SELECT MAX(position) as maxPos FROM cards WHERE column_id = ?', [parseInt(columnId)]);
    const position = (maxPos && maxPos.maxPos !== null ? maxPos.maxPos : -1) + 1;

    const result = db.run(
      'INSERT INTO cards (column_id, title, description, position, priority, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [parseInt(columnId), title.trim(), description || '', position, priority || 'medium', req.session.userId]
    );

    const card = db.get(`
      SELECT c.*, u.display_name as creator_name, u.avatar_color as creator_color
      FROM cards c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({
      id: card.id, title: card.title, description: card.description,
      position: card.position, priority: card.priority, dueDate: card.due_date,
      createdBy: card.created_by, creatorName: card.creator_name, creatorColor: card.creator_color,
      assignedTo: card.assigned_to, assigneeName: null, assigneeColor: null,
      createdAt: card.created_at, updatedAt: card.updated_at
    });
  } catch (err) {
    console.error('Create card error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/cards/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { title, description, priority, dueDate, assignedTo } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề card.' });

    db.run(
      'UPDATE cards SET title = ?, description = ?, priority = ?, due_date = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title.trim(), description || '', priority || 'medium', dueDate || null, assignedTo || null, parseInt(id)]
    );

    res.json({ message: 'Cập nhật card thành công!' });
  } catch (err) {
    console.error('Update card error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// DELETE /api/cards/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;

    db.run('DELETE FROM comments WHERE card_id = ?', [parseInt(id)]);
    db.run('DELETE FROM card_labels WHERE card_id = ?', [parseInt(id)]);
    db.run('DELETE FROM cards WHERE id = ?', [parseInt(id)]);

    res.json({ message: 'Xóa card thành công!' });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/cards/:id/move
router.put('/:id/move', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { columnId, position } = req.body;

    if (columnId === undefined || position === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin column hoặc position.' });
    }

    const card = db.get('SELECT column_id, position FROM cards WHERE id = ?', [parseInt(id)]);
    if (!card) return res.status(404).json({ error: 'Card không tồn tại.' });

    const oldColumnId = card.column_id;
    const oldPosition = card.position;

    if (oldColumnId === parseInt(columnId)) {
      // Same column
      if (oldPosition < position) {
        db.run('UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ?',
          [parseInt(columnId), oldPosition, position]);
      } else if (oldPosition > position) {
        db.run('UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ?',
          [parseInt(columnId), position, oldPosition]);
      }
    } else {
      // Different column
      db.run('UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?',
        [oldColumnId, oldPosition]);
      db.run('UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
        [parseInt(columnId), position]);
    }

    db.run('UPDATE cards SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [parseInt(columnId), position, parseInt(id)]);

    res.json({ message: 'Di chuyển card thành công!' });
  } catch (err) {
    console.error('Move card error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// POST /api/cards/:id/comments
router.post('/:id/comments', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) return res.status(400).json({ error: 'Vui lòng nhập nội dung comment.' });

    const result = db.run('INSERT INTO comments (card_id, user_id, content) VALUES (?, ?, ?)',
      [parseInt(id), req.session.userId, content.trim()]);

    const comment = db.get(`
      SELECT c.*, u.display_name, u.avatar_color
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({
      id: comment.id, content: comment.content, userId: comment.user_id,
      displayName: comment.display_name, avatarColor: comment.avatar_color, createdAt: comment.created_at
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// GET /api/cards/:id/comments
router.get('/:id/comments', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const comments = db.all(`
      SELECT c.*, u.display_name, u.avatar_color
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.card_id = ? ORDER BY c.created_at ASC
    `, [parseInt(id)]);

    res.json(comments.map(c => ({
      id: c.id, content: c.content, userId: c.user_id,
      displayName: c.display_name, avatarColor: c.avatar_color, createdAt: c.created_at
    })));
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

module.exports = router;
