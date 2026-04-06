const { database } = require('./src/db/database');
async function test() {
  await database.init();
  const db = database;
  
  // Create a board
  const b = db.run("INSERT INTO boards (title, owner_id, is_deleted) VALUES ('Test Board', 1, 1)");
  console.log("Inserted board:", b.lastInsertRowid);
  
  const before = db.get("SELECT * FROM boards WHERE id = ?", [b.lastInsertRowid]);
  console.log("Before delete:", before);
  
  try {
    db.run("BEGIN TRANSACTION");
    db.run("DELETE FROM boards WHERE id = ?", [b.lastInsertRowid]);
    db.run("COMMIT");
  } catch (e) {
    console.error("Delete Error:", e);
  }
  
  const after = db.get("SELECT * FROM boards WHERE id = ?", [b.lastInsertRowid]);
  console.log("After delete:", after);
}
test();
