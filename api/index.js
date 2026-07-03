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

// Setup PostgreSQL database (Optional for Vercel)
let pool;
if (process.env.DATABASE_URL || !process.env.VERCEL) {
  try {
    pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'autoshop',
      password: '', // Trust auth enabled
      port: 5432,
    });

    pool.query(`CREATE TABLE IF NOT EXISTS cart (
      id SERIAL PRIMARY KEY,
      product_id TEXT,
      quantity INTEGER,
      title TEXT,
      price TEXT
    )`, (err) => {
      if (err) console.error("Error creating PostgreSQL table:", err);
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

// --- SMART HTML SCRAPER (AXIOS) ---
// Intercept main navigation routes to modify HTML robustly
app.use(async (req, res, next) => {
  const isHtmlRoute = req.path === '/' || 
                      req.path.startsWith('/collections') || 
                      req.path.startsWith('/products') || 
                      req.path.startsWith('/pages') || 
                      req.path.startsWith('/search');
                      
  if (!isHtmlRoute) return next();
  // Pass asset requests to proxy
  if (req.url.includes('.') && !req.url.includes('.html')) return next();

  try {
    const response = await axios.get(`${TARGET_URL}${req.originalUrl}`, {
      responseType: 'text',
      validateStatus: () => true // Allow all status codes
    });

    let html = response.data;
    
    // Ensure it's actually HTML
    if (typeof html === 'string' && html.includes('<html')) {
      // Replace physical logo images with our locally generated Autoshop logo
      html = html.replace(/src="[^"]*logo[^"]*"/gi, 'src="/autoshop_logo.png"');
      html = html.replace(/srcset="[^"]*logo[^"]*"/gi, 'srcset="/autoshop_logo.png"');

      // Replace brand names
      html = html.replace(/DriveStylish/gi, 'Autoshop');
      html = html.replace(/Drive Stylish/gi, 'Auto Shop');
      
      // Fix image/asset URLs that might have gotten broken if 'drivestylish' was replaced
      html = html.replace(/drivestylish\.com/gi, 'autoshop.com');
      html = html.replace(/autoshop\.com\/cdn/gi, 'drivestylish.com/cdn');
      html = html.replace(/autoshop\.com\/wpm/gi, 'drivestylish.com/wpm');
      html = html.replace(/autoshop\.com\/shop/gi, 'drivestylish.com/shop');

      return res.send(html);
    }
    
    // Fallback for non-HTML
    res.send(html);
  } catch (error) {
    console.error('Axios Fetch Error:', error.message);
    next(); // Fallback to proxy
  }
});

// --- STANDARD REVERSE PROXY ---
// This handles all assets (CSS, JS, Images) seamlessly
app.use('/', createProxyMiddleware({
  target: TARGET_URL,
  changeOrigin: true,
  autoRewrite: true,
  hostRewrite: true,
  cookieDomainRewrite: 'localhost'
}));

// Export for Vercel Serverless Function
module.exports = app;
