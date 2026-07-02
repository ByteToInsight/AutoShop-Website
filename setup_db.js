const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
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

  console.log('Database and tables created successfully.');
});

db.close();
