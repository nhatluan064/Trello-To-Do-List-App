const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function getDb(req) {
  return req.app.locals.db;
}

// GET /api/trash - Lay tat ca cac item bi xoa mem
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb(req);
    const userId = req.session.userId;

    // Get deleted boards where user is owner or member
    const boards = db.all(`
      SELECT DISTINCT b.id, b.title, 'board' as type, b.deleted_at
      FROM boards b
      LEFT JOIN board_members bm ON b.id = bm.board_id
      WHERE (b.owner_id = ? OR bm.user_id = ?) AND b.is_deleted = 1
      ORDER BY b.deleted_at DESC
    `, [userId, userId]);

    // Get deleted columns inside active or deleted boards
    const columns = db.all(`
      SELECT DISTINCT c.id, c.title, 'column' as type, c.deleted_at, b.title as parent_name
      FROM columns c
      JOIN boards b ON c.board_id = b.id
      LEFT JOIN board_members bm ON b.id = bm.board_id
      WHERE (b.owner_id = ? OR bm.user_id = ?) AND c.is_deleted = 1
      ORDER BY c.deleted_at DESC
    `, [userId, userId]);

    // Get deleted cards inside columns
    const cards = db.all(`
      SELECT DISTINCT card.id, card.title, 'card' as type, card.deleted_at, c.title as parent_name
      FROM cards card
      JOIN columns c ON card.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      LEFT JOIN board_members bm ON b.id = bm.board_id
      WHERE (b.owner_id = ? OR bm.user_id = ?) AND card.is_deleted = 1
      ORDER BY card.deleted_at DESC
    `, [userId, userId]);

    res.json([ ...boards, ...columns, ...cards ].sort((a,b) => new Date(b.deleted_at) - new Date(a.deleted_at)));
  } catch (err) {
    console.error('Fetch trash error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// POST /api/trash/restore
router.post('/restore', requireAuth, (req, res) => {
  try {
    const db = getDb(req);
    const { type, id } = req.body;

    if (!type || !id) return res.status(400).json({ error: 'Thiếu thông tin.' });

    if (type === 'board') {
      db.run('UPDATE boards SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id]);
    } else if (type === 'column') {
      db.run('UPDATE columns SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id]);
    } else if (type === 'card') {
      db.run('UPDATE cards SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [id]);
    } else {
      return res.status(400).json({ error: 'Type không hợp lệ.' });
    }

    res.json({ message: 'Phục hồi thành công!' });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// POST /api/trash/restore-batch
router.post('/restore-batch', requireAuth, (req, res) => {
  try {
    const db = getDb(req);
    const { items } = req.body; // Array of { type, id }

    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });

    db.run('BEGIN TRANSACTION');
    for (const item of items) {
      if (item.type === 'board') {
        db.run('UPDATE boards SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [item.id]);
      } else if (item.type === 'column') {
        db.run('UPDATE columns SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [item.id]);
      } else if (item.type === 'card') {
        db.run('UPDATE cards SET is_deleted = 0, deleted_at = NULL WHERE id = ?', [item.id]);
      }
    }
    db.run('COMMIT');

    res.json({ message: 'Phục hồi thành công!' });
  } catch (err) {
    console.error('Batch restore error:', err);
    getDb(req).run('ROLLBACK');
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// POST /api/trash/delete-batch
router.post('/delete-batch', requireAuth, (req, res) => {
  try {
    const db = getDb(req);
    const { items } = req.body; // Array of { type, id }

    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });

    db.run('BEGIN TRANSACTION');
    for (const item of items) {
      if (item.type === 'board') {
        db.run('DELETE FROM boards WHERE id = ?', [item.id]);
      } else if (item.type === 'column') {
        db.run('DELETE FROM columns WHERE id = ?', [item.id]);
      } else if (item.type === 'card') {
        db.run('DELETE FROM cards WHERE id = ?', [item.id]);
      }
    }
    db.run('COMMIT');

    res.json({ message: 'Xóa vĩnh viễn thành công!' });
  } catch (err) {
    console.error('Batch delete error:', err);
    getDb(req).run('ROLLBACK');
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

module.exports = router;
