const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const initSqlJs = require('sql.js');

async function scrapeProducts() {
  console.log('Starting local scrape from index.html...');

  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const $ = cheerio.load(html);

  const products = [];

  $('.product-item').each((i, el) => {
    const $el = $(el);

    const titleElement = $el.find('.product-item__title');
    const title = titleElement.text().trim();
    if (!title) return;

    let url = titleElement.attr('href') || $el.find('a.product-item__image-wrapper').attr('href');
    if (!url) return;
    const handle = url.split('/').pop().split('?')[0];

    const imgEl = $el.find('img.product-item__primary-image');
    let imageUrl = imgEl.attr('src') || imgEl.attr('data-src');
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }

    let price = '';
    let originalPrice = '';

    const priceList = $el.find('.price-list');
    if (priceList.length) {
      price = priceList.find('.price--highlight').text().trim() || priceList.find('.price').first().text().trim();
      originalPrice = priceList.find('.price--compare').text().trim() || '';
    } else {
      price = $el.find('.price').text().trim();
    }

    price = price.replace(/\s+/g, ' ').replace('Sale price', '').trim();
    originalPrice = originalPrice.replace(/\s+/g, ' ').replace('Regular price', '').trim();

    products.push({
      handle,
      title,
      price,
      originalPrice,
      imageUrl,
      url,
      description: `Premium quality ${title} engineered for the best fitment.`,
      category: 'Trending'
    });
  });

  console.log(`Found ${products.length} products. Inserting into database...`);

  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'database.sqlite');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  products.forEach(p => {
    const existing = db.exec(`SELECT id FROM products WHERE handle = '${p.handle.replace(/'/g, "''")}'`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      db.run(
        'INSERT INTO products (handle, title, price, original_price, image_url, description, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.handle, p.title, p.price, p.originalPrice, p.imageUrl, p.description, p.category]
      );
    }
  });

  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(dbPath, bufferOut);
  db.close();

  console.log('Database population complete.');
}

scrapeProducts().catch(err => {
  console.error(err);
  process.exit(1);
});
