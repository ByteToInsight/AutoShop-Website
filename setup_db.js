const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function setupDatabase() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handle TEXT UNIQUE,
      title TEXT,
      price TEXT,
      original_price TEXT,
      image_url TEXT,
      description TEXT,
      category TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT,
      quantity INTEGER,
      title TEXT,
      price TEXT
    )
  `);

  const data = db.export();
  const buffer = Buffer.from(data);
  const dbPath = path.join(__dirname, 'database.sqlite');
  fs.writeFileSync(dbPath, buffer);
  db.close();

  console.log('Database and tables created successfully at', dbPath);
}

setupDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
