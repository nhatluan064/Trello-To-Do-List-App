const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'kanban.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ============================================================
// DATABASE WRAPPER
// Wraps sql.js to provide a synchronous-like API similar to better-sqlite3
// ============================================================
class Database {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async init() {
    const SQL = await initSqlJs();

    // Load existing database or create new
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA foreign_keys = ON');

    this.createTables();
    this.seedAdmin();
    this.save();
    this.ready = true;

    // Auto-save every 30 seconds
    setInterval(() => this.save(), 30000);

    console.log('✅ Database initialized');
    return this;
  }

  save() {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  run(sql, params = []) {
    this.db.run(sql, params);
    // Get last insert rowid using prepared statement (more reliable than exec)
    const stmt = this.db.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const lastId = stmt.get()[0];
    stmt.free();
    const changes = this.db.getRowsModified();
    this.save();
    return { lastInsertRowid: lastId, changes };
  }

  get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      row = {};
      columns.forEach((col, i) => { row[col] = values[i]; });
    }
    stmt.free();
    return row;
  }

  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    const columns = stmt.getColumnNames();
    while (stmt.step()) {
      const values = stmt.get();
      const row = {};
      columns.forEach((col, i) => { row[col] = values[i]; });
      rows.push(row);
    }
    stmt.free();
    return rows;
  }

  exec(sql) {
    this.db.run(sql);
    this.save();
  }

  // ============================================================
  // SCHEMA
  // ============================================================
  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        avatar_color TEXT DEFAULT '#6366f1',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS boards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        background TEXT DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS board_members (
        board_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (board_id, user_id),
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS columns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        column_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        position INTEGER NOT NULL DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        created_by INTEGER NOT NULL,
        assigned_to INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS card_labels (
        card_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        PRIMARY KEY (card_id, label_id),
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Indexes
    try { this.db.run('CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id)'); } catch(e) {}
    try { this.db.run('CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id)'); } catch(e) {}
    try { this.db.run('CREATE INDEX IF NOT EXISTS idx_board_members_user ON board_members(user_id)'); } catch(e) {}
    try { this.db.run('CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id)'); } catch(e) {}
  }

  // ============================================================
  // SEED ADMIN
  // ============================================================
  seedAdmin() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = this.get('SELECT id FROM users WHERE username = ?', [adminUsername]);
    if (!existing) {
      const hash = bcrypt.hashSync(adminPassword, 10);
      this.db.run(
        `INSERT INTO users (username, password, display_name, role, avatar_color) VALUES (?, ?, ?, 'admin', '#ef4444')`,
        [adminUsername, hash, 'Administrator']
      );
      console.log(`✅ Admin account created: ${adminUsername}`);
    }
  }
}

// ============================================================
// AVATAR COLORS
// ============================================================
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1'
];

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// Singleton instance
const database = new Database();

module.exports = { database, getRandomColor };
