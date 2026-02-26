const express = require('express');
const db = require('./db');
const util = require('util');

const app = express();
app.use(express.json());

const path = require('path');
// Serve product images uploaded to the frontend public folder
app.use('/products', express.static(path.join(__dirname, '..', 'frontend', 'public', 'products')));

// Allow CORS for frontend dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => {
  res.send('Online Grocery API is running');
});

// 🔒 SECURITY: Only allow specific Team IPs
app.use((req, res, next) => {
  const allowedIps = ['10.29.172.242', '10.29.172.228', '127.0.0.1', '::1'];
  let clientIp = req.ip || req.connection.remoteAddress;

  // Clean up IPv6 prefixes if they exist
  if (clientIp.includes("::ffff:")) {
    clientIp = clientIp.split("::ffff:")[1];
  }

  const isAllowed = allowedIps.some(ip => clientIp.includes(ip));

  if (!isAllowed) {
    console.warn(`Blocked unauthorized access attempt from: ${clientIp}`);
    return res.status(403).json({ error: "Access Forbidden: Unauthorized System" });
  }
  next();
});

// Routes
app.use('/', require('./routes'));

const PORT = process.env.PORT || 3000;
// Run simple migrations to ensure DB has expected columns used by the server
async function runMigrations() {
  try {
    const q = util.promisify(db.query).bind(db);
    const rows = await q("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'");
    const cols = new Set((rows || []).map(r => r.COLUMN_NAME));

    if (!cols.has('stock')) {
      console.log('Adding missing column `stock` to products');
      await q('ALTER TABLE products ADD COLUMN stock INT DEFAULT 10');
    }
    if (!cols.has('image_location')) {
      console.log('Adding missing column `image_location` to products');
      await q("ALTER TABLE products ADD COLUMN image_location VARCHAR(255) NULL");
    }
    if (!cols.has('active')) {
      console.log('Adding missing column `active` to products');
      await q('ALTER TABLE products ADD COLUMN active TINYINT(1) DEFAULT 1');
    }

    // Ensure alerts table exists
    const tables = await q("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alerts'");
    if (!tables.length) {
      console.log('Creating missing table `alerts`');
      await q(`CREATE TABLE alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        message VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL
      )`);
    }

    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration error (continuing):', err && err.message ? err.message : err);
  }
}

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
