const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getDb(req) { return req.app.locals.db; }

// POST /api/columns
router.post('/', (req, res) => {
  try {
    const db = getDb(req);
    const { boardId, title } = req.body;

    if (!boardId || !title || !title.trim()) return res.status(400).json({ error: 'Vui lòng nhập tên column.' });

    const maxPos = db.get('SELECT MAX(position) as maxPos FROM columns WHERE board_id = ?', [parseInt(boardId)]);
    const position = (maxPos && maxPos.maxPos !== null ? maxPos.maxPos : -1) + 1;

    const result = db.run('INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)', [parseInt(boardId), title.trim(), position]);

    res.status(201).json({ id: result.lastInsertRowid, boardId, title: title.trim(), position, cards: [] });

    // Socket: thông báo board reload
    req.app.get('io').to('board-' + boardId).emit('board-updated', { action: 'column-created' });
  } catch (err) {
    console.error('Create column error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/columns/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Vui lòng nhập tên column.' });

    db.run('UPDATE columns SET title = ? WHERE id = ?', [title.trim(), parseInt(id)]);
    res.json({ message: 'Cập nhật column thành công!' });
  } catch (err) {
    console.error('Update column error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// DELETE /api/columns/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;

    const column = db.get('SELECT * FROM columns WHERE id = ?', [parseInt(id)]);
    if (!column) return res.status(404).json({ error: 'Column không tồn tại.' });

    const board = db.get('SELECT owner_id FROM boards WHERE id = ?', [column.board_id]);
    
    const isMember = db.get('SELECT role FROM board_members WHERE board_id = ? AND user_id = ?', [column.board_id, req.session.userId]);
    if (!isMember && board.owner_id !== req.session.userId) {
      return res.status(403).json({ error: 'Không có quyền xóa column này.' });
    }

    // Soft delete the column
    db.run('UPDATE columns SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [parseInt(id)]);
    
    // Also soft delete all cards recursively (technically optional, but good practice so they appear individually in trash)
    db.run('UPDATE cards SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE column_id = ? AND is_deleted = 0', [parseInt(id)]);

    res.json({ message: 'Đã đưa column vào Thùng rác.' });

    // Socket: thông báo board reload
    req.app.get('io').to('board-' + column.board_id).emit('board-updated', { action: 'column-deleted' });
  } catch (err) {
    console.error('Trash column error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/columns/reorder/batch
router.put('/reorder/batch', (req, res) => {
  try {
    const db = getDb(req);
    const { columns } = req.body;

    if (!columns || !Array.isArray(columns)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });

    columns.forEach(col => {
      db.run('UPDATE columns SET position = ? WHERE id = ?', [col.position, col.id]);
    });

    res.json({ message: 'Sắp xếp columns thành công!' });
  } catch (err) {
    console.error('Reorder columns error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

module.exports = router;
