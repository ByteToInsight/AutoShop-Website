const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const products = require('./products.json');

let cachedIndex = null;

function cleanIndex() {
  if (cachedIndex) return cachedIndex;

  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  const removals = [
    /<script[\s\S]*?<\/script>/gi,
    /onclick\s*=\s*"[^"]*"/gi,
    /onclick\s*=\s*'[^']*'/gi,
    /<noscript[\s\S]*?<\/noscript>/gi
  ];

  removals.forEach(re => { html = html.replace(re, ''); });

  let result = html.replace(/<head>/i, `<head>
<style>
  html, body { display: block !important; }
  .product-item__title a { display: block; text-decoration: none; color: inherit; }
  .product-item { cursor: pointer; }
</style>
<script>
document.addEventListener('click', function(e) {
  var a = e.target.closest('a');
  if (a && a.href && !a.hasAttribute('onclick') && a.href.indexOf('javascript:') !== 0) return;
  var item = e.target.closest('.product-item');
  if (item) {
    var link = item.querySelector('.product-item__title a') || item.querySelector('a');
    if (link && link.href && link.href.indexOf('javascript:') !== 0) {
      e.preventDefault();
      window.location.href = link.href;
    }
  }
});
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.product-item').forEach(function(el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function(e) {
      if (e.target.closest('a') || e.target.closest('button')) return;
      var link = el.querySelector('.product-item__title a') || el.querySelector('a[href*="/products/"]');
      if (link && link.href) window.location.href = link.href;
    });
  });
});
<\/script>
`);

  cachedIndex = result;
  return result;
}

app.get('/', (req, res) => {
  res.send(cleanIndex());
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
