const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

function scrapeProducts() {
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
      original_price: originalPrice,
      image_url: imageUrl,
      description: `Premium quality ${title} engineered for the best fitment.`,
      category: 'Trending'
    });
  });

  const outPath = path.join(__dirname, 'products.json');

  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  } catch (e) {}

  const merged = {};
  existing.forEach(p => { merged[p.handle] = p; });
  products.forEach(p => { merged[p.handle] = p; });

  const result = Object.values(merged);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Found ${products.length} new products. Merged into ${result.length} total in products.json`);
}

scrapeProducts();
