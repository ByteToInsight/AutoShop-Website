const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files (if we had any local assets, but we rely on CDN)
app.use(express.static('public'));

// Database connection
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Routes
app.get('/', (req, res) => {
  // We serve the raw index.html as the homepage for perfect fidelity
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Dynamic Product Detail Page
app.get('/products/:handle', (req, res) => {
  const handle = req.params.handle;
  
  db.get('SELECT * FROM products WHERE handle = ?', [handle], (err, product) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server Error');
    }
    if (!product) {
      return res.status(404).send('Product Not Found');
    }
    
    res.render('product', { product });
  });
});

// Dynamic Categories/Collections (Mock routing to generic collection view)
app.get('/collections/:category', (req, res) => {
  const category = req.params.category;
  
  db.all('SELECT * FROM products LIMIT 20', [], (err, products) => {
    if (err) {
      return res.status(500).send('Server Error');
    }
    res.render('collection', { category, products });
  });
});

app.listen(port, () => {
  console.log(`DriveStylish replica server running at http://localhost:${port}`);
});
