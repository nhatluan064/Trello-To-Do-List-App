const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function getDb(req) {
  return req.app.locals.db;
}

// GET /api/templates
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb(req);
    const templates = db.all('SELECT * FROM templates ORDER BY created_at DESC');
    res.json(templates);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// POST /api/templates (Admin only)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb(req);
    const { name, template_title, template_desc } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Thiếu tên Form mẫu.' });

    db.run(
      'INSERT INTO templates (name, template_title, template_desc, created_by) VALUES (?, ?, ?, ?)',
      [name, template_title || '', template_desc || '', req.session.userId]
    );
    res.status(201).json({ message: 'Tạo form mẫu thành công!' });
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// PUT /api/templates/:id (Admin only)
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb(req);
    const { name, template_title, template_desc } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Thiếu tên Form mẫu.' });

    db.run(
      'UPDATE templates SET name = ?, template_title = ?, template_desc = ? WHERE id = ?',
      [name, template_title || '', template_desc || '', parseInt(req.params.id)]
    );
    res.json({ message: 'Cập nhật form mẫu thành công!' });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// DELETE /api/templates/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = getDb(req);
    db.run('DELETE FROM templates WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Xóa form mẫu thành công!' });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

module.exports = router;
