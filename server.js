const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

let db = null;

async function initDb() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(path.join(__dirname, 'database.sqlite'));
  db = new SQL.Database(buffer);
}

const ready = initDb();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/products/:handle', async (req, res) => {
  await ready;
  if (!db) return res.status(500).send('Database unavailable');
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE handle = ?');
    stmt.bind([req.params.handle]);
    if (stmt.step()) {
      const product = stmt.getAsObject();
      stmt.free();
      res.render('product', { product });
    } else {
      stmt.free();
      res.status(404).send('Product Not Found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/collections/:category', async (req, res) => {
  await ready;
  if (!db) return res.status(500).send('Database unavailable');
  try {
    const products = [];
    const stmt = db.prepare('SELECT * FROM products LIMIT 20');
    while (stmt.step()) {
      products.push(stmt.getAsObject());
    }
    stmt.free();
    res.render('collection', { category: req.params.category, products });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

const port = process.env.PORT || 3000;
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

module.exports = app;
