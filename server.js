const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

const dbPath = path.join(__dirname, 'database.sqlite');
let db;
try {
  db = new Database(dbPath, { readonly: true });
} catch (err) {
  console.error('Database init error:', err.message);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/products/:handle', (req, res) => {
  if (!db) return res.status(500).send('Database unavailable');
  try {
    const product = db.prepare('SELECT * FROM products WHERE handle = ?').get(req.params.handle);
    if (!product) return res.status(404).send('Product Not Found');
    res.render('product', { product });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/collections/:category', (req, res) => {
  if (!db) return res.status(500).send('Database unavailable');
  try {
    const products = db.prepare('SELECT * FROM products LIMIT 20').all();
    res.render('collection', { category, products });
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
