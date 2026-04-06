const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getDb(req) { return req.app.locals.db; }

// ============================================================
// GET /api/boards/:boardId/labels  – DS labels của board
// ============================================================
router.get('/boards/:boardId/labels', (req, res) => {
  try {
    const db = getDb(req);
    const boardId = parseInt(req.params.boardId);

    const labels = db.all('SELECT id, name, color FROM labels WHERE board_id = ? ORDER BY id ASC', [boardId]);
    res.json(labels);
  } catch (err) {
    console.error('Get labels error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// POST /api/boards/:boardId/labels  { name, color }
// ============================================================
router.post('/boards/:boardId/labels', (req, res) => {
  try {
    const db = getDb(req);
    const boardId = parseInt(req.params.boardId);
    const { name, color } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Vui lòng nhập tên nhãn.' });

    const labelColor = color || '#6366f1';
    const result = db.run(
      'INSERT INTO labels (board_id, name, color) VALUES (?, ?, ?)',
      [boardId, name.trim(), labelColor]
    );

    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), color: labelColor, boardId });
  } catch (err) {
    console.error('Create label error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// DELETE /api/labels/:id
// ============================================================
router.delete('/labels/:id', (req, res) => {
  try {
    const db = getDb(req);
    const labelId = parseInt(req.params.id);

    // Xóa card_labels trước (cascade có thể không hoạt động với sql.js)
    db.run('DELETE FROM card_labels WHERE label_id = ?', [labelId]);
    db.run('DELETE FROM labels WHERE id = ?', [labelId]);

    res.json({ message: 'Xóa nhãn thành công!' });
  } catch (err) {
    console.error('Delete label error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// GET /api/cards/:cardId/labels
// ============================================================
router.get('/cards/:cardId/labels', (req, res) => {
  try {
    const db = getDb(req);
    const cardId = parseInt(req.params.cardId);

    const labels = db.all(`
      SELECT l.id, l.name, l.color
      FROM labels l JOIN card_labels cl ON l.id = cl.label_id
      WHERE cl.card_id = ?
    `, [cardId]);

    res.json(labels);
  } catch (err) {
    console.error('Get card labels error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// POST /api/cards/:cardId/labels  { labelId }
// ============================================================
router.post('/cards/:cardId/labels', (req, res) => {
  try {
    const db = getDb(req);
    const cardId = parseInt(req.params.cardId);
    const { labelId } = req.body;

    if (!labelId) return res.status(400).json({ error: 'Thiếu labelId.' });

    // Kiểm tra đã gán chưa
    const existing = db.get('SELECT 1 FROM card_labels WHERE card_id = ? AND label_id = ?', [cardId, parseInt(labelId)]);
    if (existing) return res.status(409).json({ error: 'Label đã được gán cho card này.' });

    db.run('INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)', [cardId, parseInt(labelId)]);

    res.status(201).json({ message: 'Đã gán nhãn cho card!' });
  } catch (err) {
    console.error('Add card label error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// DELETE /api/cards/:cardId/labels/:labelId
// ============================================================
router.delete('/cards/:cardId/labels/:labelId', (req, res) => {
  try {
    const db = getDb(req);
    const cardId = parseInt(req.params.cardId);
    const labelId = parseInt(req.params.labelId);

    db.run('DELETE FROM card_labels WHERE card_id = ? AND label_id = ?', [cardId, labelId]);

    res.json({ message: 'Đã gỡ nhãn khỏi card!' });
  } catch (err) {
    console.error('Remove card label error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

module.exports = router;
