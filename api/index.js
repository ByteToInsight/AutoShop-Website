const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;
const TARGET_URL = 'https://drivestylish.com';

// Serve local static assets (like our newly generated logo)
app.use(express.static(path.join(__dirname, '../public')));

// Setup PostgreSQL database
let pool;
// Only connect if explicitly provided a database URL, OR if running locally (not in Vercel production)
if (process.env.DATABASE_URL || !process.env.VERCEL_ENV) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Fallback for local testing
      user: process.env.DATABASE_URL ? undefined : 'postgres',
      host: process.env.DATABASE_URL ? undefined : 'localhost',
      database: process.env.DATABASE_URL ? undefined : 'autoshop',
      password: process.env.DATABASE_URL ? undefined : '', // Trust auth enabled
      port: process.env.DATABASE_URL ? undefined : 5432,
    });

    // CRITICAL FIX: The pg Pool emits 'error' events on its own when idle clients drop or fail.
    // Without this listener, Node.js sees an unhandled 'error' event and crashes the entire Serverless Function.
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle database client', err.message);
    });

    pool.query(`CREATE TABLE IF NOT EXISTS cart (
      id SERIAL PRIMARY KEY,
      product_id TEXT,
      quantity INTEGER,
      title TEXT,
      price TEXT
    )`, (err) => {
      if (err) console.error("Error creating PostgreSQL table:", err.message);
      else console.log("PostgreSQL cart table initialized.");
    });
  } catch (err) {
    console.error("Database initialization skipped due to error:", err.message);
  }
} else {
  console.log("Running in Vercel without DATABASE_URL. Database features disabled.");
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- DATABASE CART API ROUTES ---
app.post('/cart/add.js', async (req, res) => {
  const { id, quantity } = req.body;
  if (!pool) {
    return res.json({ success: true, id, quantity: quantity || 1, local_db_inserted: false, message: 'Database skipped' });
  }
  try {
    await pool.query(`INSERT INTO cart (product_id, quantity) VALUES ($1, $2)`, [id, quantity || 1]);
    res.json({ success: true, id, quantity: quantity || 1, local_db_inserted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cart.js', async (req, res) => {
  if (!pool) {
    return res.json({ items: [], item_count: 0, total_price: 0 });
  }
  try {
    const result = await pool.query(`SELECT * FROM cart`);
    res.json({ items: result.rows, item_count: result.rows.length, total_price: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SMART AXIOS PROXY ---
// This handles ALL proxying seamlessly and is 100% compatible with Vercel Serverless
app.use(async (req, res, next) => {
  // Skip our custom APIs and local static assets
  if (req.path.startsWith('/cart') || req.path === '/autoshop_logo.png') return next();

  try {
    const isAsset = req.path.includes('.');
    const response = await axios.get(`${TARGET_URL}${req.originalUrl}`, {
      responseType: isAsset ? 'arraybuffer' : 'text',
      validateStatus: () => true // Allow all status codes
    });

    // Pass through critical headers
    if (response.headers['content-type']) {
      res.setHeader('content-type', response.headers['content-type']);
    }

    let data = response.data;
    
    // Only intercept and modify HTML pages
    if (!isAsset && typeof data === 'string' && data.includes('<html')) {
      // Replace physical logo images with our locally generated Autoshop logo
      data = data.replace(/src="[^"]*logo[^"]*"/gi, 'src="/autoshop_logo.png"');
      data = data.replace(/srcset="[^"]*logo[^"]*"/gi, 'srcset="/autoshop_logo.png"');

      // Replace brand names
      data = data.replace(/DriveStylish/gi, 'Autoshop');
      data = data.replace(/Drive Stylish/gi, 'Auto Shop');
      
      // Fix image/asset URLs that might have gotten broken if 'drivestylish' was replaced
      data = data.replace(/drivestylish\.com/gi, 'autoshop.com');
      data = data.replace(/autoshop\.com\/cdn/gi, 'drivestylish.com/cdn');
      data = data.replace(/autoshop\.com\/wpm/gi, 'drivestylish.com/wpm');
      data = data.replace(/autoshop\.com\/shop/gi, 'drivestylish.com/shop');
    }
    
    return res.send(data);
  } catch (error) {
    console.error('Axios Fetch Error:', error.message);
    res.status(500).send('Smart Proxy Error');
  }
});

// Export for Vercel Serverless Function
module.exports = app;
