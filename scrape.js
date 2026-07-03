const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function scrapeProducts() {
  console.log('Starting local scrape from index.html...');
  
  // Read the previously fetched index.html
  const htmlPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const $ = cheerio.load(html);
  
  const products = [];
  
  // Find all product items
  $('.product-item').each((i, el) => {
    const $el = $(el);
    
    // Extract title
    const titleElement = $el.find('.product-item__title');
    const title = titleElement.text().trim();
    if (!title) return; // Skip if no title
    
    // Extract handle / url
    let url = titleElement.attr('href') || $el.find('a.product-item__image-wrapper').attr('href');
    if (!url) return;
    const handle = url.split('/').pop().split('?')[0]; // simple handle extraction
    
    // Extract image
    const imgEl = $el.find('img.product-item__primary-image');
    let imageUrl = imgEl.attr('src') || imgEl.attr('data-src');
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }
    
    // Extract price
    let price = '';
    let originalPrice = '';
    
    const priceList = $el.find('.price-list');
    if (priceList.length) {
      price = priceList.find('.price--highlight').text().trim() || priceList.find('.price').first().text().trim();
      originalPrice = priceList.find('.price--compare').text().trim() || '';
    } else {
      // Fallback
      price = $el.find('.price').text().trim();
    }
    
    // Clean up prices (remove extra spaces/newlines)
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

  db.serialize(() => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO products (handle, title, price, original_price, image_url, description, category) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    products.forEach(p => {
      stmt.run(p.handle, p.title, p.price, p.originalPrice, p.imageUrl, p.description, p.category);
    });

    stmt.finalize(() => {
      console.log('Database population complete.');
      db.close();
    });
  });
}

scrapeProducts();
