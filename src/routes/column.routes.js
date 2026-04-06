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

    // Manual cascade delete
    db.run('DELETE FROM comments WHERE card_id IN (SELECT id FROM cards WHERE column_id = ?)', [parseInt(id)]);
    db.run('DELETE FROM card_labels WHERE card_id IN (SELECT id FROM cards WHERE column_id = ?)', [parseInt(id)]);
    db.run('DELETE FROM cards WHERE column_id = ?', [parseInt(id)]);
    db.run('DELETE FROM columns WHERE id = ?', [parseInt(id)]);

    res.json({ message: 'Xóa column thành công!' });
  } catch (err) {
    console.error('Delete column error:', err);
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
