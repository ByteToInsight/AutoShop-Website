const express = require('express');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const products = require('./products.json');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/products/:handle', (req, res) => {
  const product = products.find(p => p.handle === req.params.handle);
  if (!product) return res.status(404).send('Product Not Found');
  res.render('product', { product });
});

app.get('/collections/:category', (req, res) => {
  res.render('collection', { category: req.params.category, products: products.slice(0, 20) });
});

const port = process.env.PORT || 3000;
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

module.exports = app;
