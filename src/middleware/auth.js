// ============================================================
// AUTH MIDDLEWARE
// Bảo vệ routes: yêu cầu user đã đăng nhập
// ============================================================

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Chưa đăng nhập.' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền admin.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
