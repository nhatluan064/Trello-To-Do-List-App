const initSqlJs = require('sql.js');

async function testSqlJs() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, v TEXT); INSERT INTO test (v) VALUES ('a');");
  
  // Custom run
  function run(sql) {
    db.run(sql);
    let s = db.prepare('SELECT last_insert_rowid()'); s.step(); s.free();
    db.export(); // simulate save()
  }
  
  run("BEGIN TRANSACTION");
  run("DELETE FROM test WHERE id = 1");
  try {
    run("COMMIT");
  } catch(e) {
    console.error("error:", e.message);
  }
}
testSqlJs();
