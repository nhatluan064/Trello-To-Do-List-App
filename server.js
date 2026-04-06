require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { database } = require('./src/db/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'internal-trello-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Share io instance with routes
app.set('io', io);

// ============================================================
// SOCKET.IO — Realtime Room Management
// ============================================================
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Client joins a board room
  socket.on('join-board', (boardId) => {
    socket.join('board-' + boardId);
    console.log(`  → Socket ${socket.id} joined board-${boardId}`);
  });

  // Client leaves a board room
  socket.on('leave-board', (boardId) => {
    socket.leave('board-' + boardId);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/boards', require('./src/routes/board.routes'));
app.use('/api/columns', require('./src/routes/column.routes'));
app.use('/api/cards', require('./src/routes/card.routes'));
app.use('/api/trash', require('./src/routes/trash.routes'));
app.use('/api/templates', require('./src/routes/template.routes'));
app.use('/api', require('./src/routes/label.routes'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START (async because sql.js needs async init)
// ============================================================
async function start() {
  try {
    // Initialize database
    await database.init();

    // Share db instance with routes via app.locals
    app.locals.db = database;

    server.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║   🚀 Internal Trello is running! (Socket!)  ║');
      console.log('╠══════════════════════════════════════════════╣');
      console.log(`║  Local:   http://localhost:${PORT}             ║`);
      console.log(`║  Network: http://0.0.0.0:${PORT}              ║`);
      console.log('║                                              ║');
      console.log('║  Admin:   admin / admin123                   ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
