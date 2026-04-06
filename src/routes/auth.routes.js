const express = require('express');
const bcrypt = require('bcryptjs');
const { getRandomColor } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Middleware to get db from app
function getDb(req) {
  return req.app.locals.db;
}

// ============================================================
// POST /api/auth/register
// ============================================================
router.post('/register', (req, res) => {
  try {
    const db = getDb(req);
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username phải có ít nhất 3 ký tự.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password phải có ít nhất 4 ký tự.' });
    }

    const existing = db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ error: 'Username đã tồn tại. Vui lòng chọn tên khác.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const color = getRandomColor();

    const result = db.run(
      `INSERT INTO users (username, password, display_name, role, avatar_color) VALUES (?, ?, ?, 'user', ?)`,
      [username, hash, displayName, color]
    );

    res.status(201).json({
      message: 'Đăng ký thành công!',
      user: { id: result.lastInsertRowid, username, displayName, role: 'user', avatarColor: color }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi server. Vui lòng thử lại.' });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', (req, res) => {
  try {
    const db = getDb(req);
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập username và password.' });
    }

    const user = db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Username hoặc password không đúng.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa. Liên hệ Admin.' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Username hoặc password không đúng.' });
    }

    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.displayName = user.display_name;
    req.session.role = user.role;
    req.session.avatarColor = user.avatar_color;

    res.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id, username: user.username,
        displayName: user.display_name, role: user.role, avatarColor: user.avatar_color
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi server. Vui lòng thử lại.' });
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Lỗi đăng xuất.' });
    res.json({ message: 'Đăng xuất thành công!' });
  });
});

// ============================================================
// GET /api/auth/me
// ============================================================
router.get('/me', requireAuth, (req, res) => {
  const db = getDb(req);
  const user = db.get('SELECT id, username, display_name, role, avatar_color FROM users WHERE id = ?', [req.session.userId]);
  if (!user) return res.status(404).json({ error: 'User không tồn tại.' });

  res.json({
    id: user.id, username: user.username,
    displayName: user.display_name, role: user.role, avatarColor: user.avatar_color
  });
});

// ============================================================
// ADMIN ROUTES
// ============================================================
router.get('/admin/users', requireAdmin, (req, res) => {
  const db = getDb(req);
  const users = db.all('SELECT id, username, display_name, role, avatar_color, is_active, created_at, last_login FROM users ORDER BY created_at DESC');
  res.json(users.map(u => ({
    id: u.id, username: u.username, displayName: u.display_name,
    role: u.role, avatarColor: u.avatar_color, isActive: u.is_active,
    createdAt: u.created_at, lastLogin: u.last_login
  })));
});

router.post('/admin/create-user', requireAdmin, (req, res) => {
  try {
    const db = getDb(req);
    const { username, password, displayName, role } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });
    }

    const existing = db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Username đã tồn tại.' });

    const hash = bcrypt.hashSync(password, 10);
    const color = getRandomColor();
    const userRole = role === 'admin' ? 'admin' : 'user';

    const result = db.run(
      'INSERT INTO users (username, password, display_name, role, avatar_color) VALUES (?, ?, ?, ?, ?)',
      [username, hash, displayName, userRole, color]
    );

    res.status(201).json({
      message: `Tạo user ${username} thành công!`,
      user: { id: result.lastInsertRowid, username, displayName, role: userRole, avatarColor: color }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

router.put('/admin/reset-password/:userId', requireAdmin, (req, res) => {
  try {
    const db = getDb(req);
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Password mới phải có ít nhất 4 ký tự.' });
    }

    const user = db.get('SELECT id, username FROM users WHERE id = ?', [parseInt(userId)]);
    if (!user) return res.status(404).json({ error: 'User không tồn tại.' });

    const hash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hash, parseInt(userId)]);

    res.json({ message: `Reset password cho ${user.username} thành công!` });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

router.put('/admin/toggle-active/:userId', requireAdmin, (req, res) => {
  try {
    const db = getDb(req);
    const { userId } = req.params;
    const user = db.get('SELECT id, username, is_active FROM users WHERE id = ?', [parseInt(userId)]);

    if (!user) return res.status(404).json({ error: 'User không tồn tại.' });
    if (user.id === req.session.userId) return res.status(400).json({ error: 'Không thể khóa chính mình.' });

    const newStatus = user.is_active ? 0 : 1;
    db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, parseInt(userId)]);

    res.json({
      message: newStatus ? `Mở khóa ${user.username} thành công!` : `Khóa ${user.username} thành công!`,
      isActive: newStatus
    });
  } catch (err) {
    console.error('Toggle active error:', err);
    res.status(500).json({ error: 'Lỗi server.' });
  }
});

// ============================================================
// GET /api/auth/users-list  (dùng cho dropdown invite member)
// ============================================================
router.get('/users-list', requireAuth, (req, res) => {
  const db = getDb(req);
  const users = db.all(
    'SELECT id, username, display_name, avatar_color FROM users WHERE is_active = 1 ORDER BY display_name ASC'
  );
  res.json(users.map(u => ({
    id: u.id, username: u.username, displayName: u.display_name, avatarColor: u.avatar_color
  })));
});

module.exports = router;

