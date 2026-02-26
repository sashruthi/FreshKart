const express = require('express');
const router = express.Router();
const db = require('./db');
const util = require('util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const query = util.promisify(db.query).bind(db);
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload directory points to frontend/public/products so images are available to the dev server
const uploadDir = path.join(__dirname, '..', 'frontend', 'public', 'products');
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { /* ignore */ }

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, uploadDir); },
  filename(req, file, cb) {
    const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Endpoint to upload product image. Requires authentication.
// Allow uploads without auth for development so the merchant UI can upload images
// (images are stored in frontend/public/products and served by the backend static route)
router.post('/upload/product-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image file required' });
  res.json({ filename: req.file.filename });
});

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

/* ================= LOGIN ================= */
router.post('/login', async (req, res) => {
  let { username, password } = req.body || {};
  const original = username;
  if (username) username = String(username).trim();
  console.log('Login attempt for:', username);
  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).json({ error: 'username and password required', message: 'username and password required' });
  }
  try {
    // Try exact match first
    let rows = await query('SELECT id, username, password, name, role FROM users WHERE username = ?', [username]);

    // If not found and the provided identifier looks like an email, try local-part fallback
    if ((!rows || !rows.length) && original && String(original).includes('@')) {
      const local = String(original).split('@')[0];
      console.log('No exact user; trying local-part lookup for:', local);
      rows = await query('SELECT id, username, password, name, role FROM users WHERE username = ?', [local]);
    }

    if (!rows.length) {
      console.log('User not found:', username || original);
      return res.status(401).json({ error: 'Invalid username or password', message: 'Invalid username or password' });
    }

    const user = rows[0];
    console.log('User found:', user.username, 'Role:', user.role);

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.password);
    } catch (e) {
      ok = false;
    }

    // Fallback for existing seed data that used plaintext passwords:
    // allow direct equality, then upgrade to a hashed password.
    if (!ok && user.password === password) {
      ok = true;
      try {
        const newHash = await bcrypt.hash(password, 10);
        await query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
      } catch (err) {
        console.error('failed to upgrade plaintext password to hash', err);
      }
    }

    if (!ok) {
      console.log('Password mismatch for user:', username || original);
      return res.status(401).json({ error: 'Invalid username or password', message: 'Invalid username or password' });
    }
    console.log('Login successful for:', username || original);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    delete user.password;
    res.json({ token, user });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ================= SIGNUP ================= */
router.post('/signup', async (req, res) => {
  const { username, password, name, phone } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await query('INSERT INTO users (name, username, password, phone, role) VALUES (?, ?, ?, ?, ?)', [name || null, username, hash, phone || null, 'customer']);
    res.json({ message: 'Signup successful' });
  } catch (err) {
    console.error('signup error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'username already exists' });
    res.status(500).json({ error: 'server error' });
  }
});


/* ================= MERCHANTS ================= */
router.get('/merchants', (req, res) => {
  db.query("SELECT * FROM merchants", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// Create a new merchant
router.post('/merchants', async (req, res) => {
  const { name, type, username, password, mobile } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const t = type === 'nuts' ? 'nuts' : 'grocery';
  try {
    const r = await query('INSERT INTO merchants (name, type) VALUES (?, ?)', [name, t]);
    const rows = await query('SELECT * FROM merchants WHERE id = ?', [r.insertId]);

    if (username && password) {
      try {
        const existing = await query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing && existing.length) {
          await query('DELETE FROM merchants WHERE id = ?', [r.insertId]);
          return res.status(400).json({ error: 'username already exists' });
        }
        const hash = await bcrypt.hash(password, 10);
        await query(
          'INSERT INTO users (name, username, password, phone, role) VALUES (?, ?, ?, ?, ?)',
          [name, username, hash, mobile || null, 'merchant']
        );
      } catch (err) {
        await query('DELETE FROM merchants WHERE id = ?', [r.insertId]);
        throw err;
      }
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('create merchant error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Update product fields (price, stock, gst, unit, unit_amount, category, name)
router.put('/products/:id', authMiddleware, async (req, res) => {
  const pid = req.params.id;
  const allowed = ['name', 'category', 'price', 'stock', 'unit', 'unit_amount', 'gst_percent', 'image_location', 'active'];
  const updates = [];
  const params = [];
  for (const k of allowed) {
    if (typeof req.body[k] !== 'undefined') {
      updates.push(`${k} = ?`);
      params.push(req.body[k]);
    }
  }

  try {
    if (updates.length) {
      params.push(pid);
      const q = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
      await query(q, params);
    }

    // If caller provided merchant_quantity, update product stock
    if (typeof req.body.merchant_quantity !== 'undefined') {
      const mq = Number(req.body.merchant_quantity || 0);
      await query('UPDATE products SET stock = ? WHERE id = ?', [mq, pid]);
    }

    // Verify alert state (check product stock, which might have been updated above)
    await checkLowStock(pid);

    const out = await query('SELECT p.*, p.stock AS merchant_quantity FROM products p WHERE p.id = ?', [pid]);
    res.json(out[0] || {});
  } catch (err) {
    console.error('update product error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Manager stats: number of products and estimated sold per product
router.get('/merchants/:id/manager-stats', async (req, res) => {
  const mid = req.params.id;
  const dateParam = req.query.date; // Format: YYYY-MM-DD

  try {
    // Get the date range for the requested date
    let startOfDay, endOfDay;

    if (dateParam) {
      // Parse the provided date
      const [year, month, day] = dateParam.split('-');
      startOfDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      endOfDay = new Date(parseInt(year), parseInt(month) - 1, parseInt(day) + 1);
    } else {
      // Default to today
      const today = new Date();
      startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    }

    // Get all products for this merchant
    const rows = await query(
      `SELECT p.id, p.name, p.price, p.unit, p.unit_amount, p.category, p.stock AS merchant_quantity
       FROM products p
       WHERE p.merchant_id = ?`,
      [mid]
    );

    // Get sales from order_items
    const salesData = await query(
      `SELECT oi.product_id, SUM(oi.quantity) AS total_sold
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.created_at >= ? AND o.created_at < ?
       AND p.merchant_id = ?
       GROUP BY oi.product_id`,
      [startOfDay, endOfDay, mid]
    );

    // Map sales data
    const salesMap = {};
    salesData.forEach(s => {
      salesMap[s.product_id] = s.total_sold || 0;
    });

    // Combine product data with sales data
    const data = rows.map(r => {
      const mq = Number(r.merchant_quantity || 0);
      const daily_sold = salesMap[r.id] || 0;
      return { ...r, merchant_quantity: mq, daily_sold };
    });

    const count_products = data.length;
    res.json({ date: startOfDay.toISOString(), count_products, products: data });
  } catch (err) {
    console.error('manager-stats error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ============ DECREASE / RESERVE INVENTORY ============ */
router.post('/inventory/decrease', async (req, res) => {
  const { product_id, quantity } = req.body || {};
  const q = typeof quantity === 'undefined' ? 1 : Number(quantity);
  if (!product_id || q <= 0) return res.status(400).json({ error: 'product_id and positive quantity required' });

  try {
    // Decrease product-level stock (customers buy from product stock)
    const rows = await query('SELECT stock FROM products WHERE id = ?', [product_id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'product not found' });
    const current = Number(typeof rows[0].stock === 'undefined' || rows[0].stock === null ? 10 : rows[0].stock);

    // Ensure we don't go negative
    if (current < q) return res.status(400).json({ error: 'insufficient stock' });

    await query('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [q, product_id, q]);

    const after = await query('SELECT stock FROM products WHERE id = ?', [product_id]);
    const newQty = after[0] ? Number(after[0].stock || 0) : 0;

    // Verify alert state
    await checkLowStock(product_id);
    return res.json({ product_id, quantity: newQty });
  } catch (err) {
    console.error('decrease inventory error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ============ SET INVENTORY FOR A MERCHANT (BULK) ============ */
router.post('/inventory/set-bulk', async (req, res) => {
  const { merchantId, quantity, products } = req.body || {};
  if (typeof merchantId === 'undefined') return res.status(400).json({ error: 'merchantId required' });

  try {
    // If caller provided a products array, process each: create product if needed and update stock
    if (Array.isArray(products) && products.length > 0) {
      for (const it of products) {
        // each item may provide: product_id OR name (+ optional category, price, stock), and optional merchant_quantity
        const pid = it.product_id || null;
        const name = it.name || null;
        const category = typeof it.category !== 'undefined' ? it.category : null;
        const price = typeof it.price !== 'undefined' ? Number(it.price) : null;
        const stock = typeof it.stock !== 'undefined' ? Number(it.stock) : null;
        const merchantQty = typeof it.merchant_quantity !== 'undefined' ? Number(it.merchant_quantity) : (typeof quantity !== 'undefined' ? Number(quantity) : 50);

        let productId = pid;
        if (!productId) {
          if (!name) {
            // skip invalid entry
            continue;
          }
          // check if product exists by name+merchant
          const existing = await query('SELECT id FROM products WHERE name = ? AND merchant_id = ?', [name, merchantId]);
          if (existing && existing.length > 0) {
            productId = existing[0].id;
            // update optional fields
            const upd = [];
            const params = [];
            if (category !== null) { upd.push('category = ?'); params.push(category); }
            if (price !== null && !Number.isNaN(price)) { upd.push('price = ?'); params.push(price); }
            if (stock !== null && !Number.isNaN(stock)) { upd.push('stock = ?'); params.push(stock); }
            if (upd.length) {
              params.push(productId);
              await query(`UPDATE products SET ${upd.join(', ')} WHERE id = ?`, params);
            }
          } else {
            // insert new product
            const r = await query('INSERT INTO products (name, category, price, stock, merchant_id) VALUES (?, ?, ?, ?, ?)', [name, category, price !== null ? price : 0, stock !== null ? stock : 10, merchantId]);
            productId = r.insertId;
          }
        }

        // update product stock for this product
        if (productId) {
          await query('UPDATE products SET stock = ? WHERE id = ?', [merchantQty, productId]);
          await checkLowStock(productId);
        }
      }
    } else {
      // Legacy behavior: set same stock for all products of the merchant
      if (typeof quantity === 'undefined') return res.status(400).json({ error: 'quantity required when products array not provided' });
      await query(
        `UPDATE products SET stock = ? WHERE merchant_id = ?`,
        [quantity, merchantId]
      );
    }

    // Return products with product-level stock (for customers) and merchant inventory
    const rows = await query(
      `SELECT p.*, COALESCE(p.stock,10) AS quantity, LEAST(COALESCE(p.stock,10), 10) AS customer_quantity, p.stock AS merchant_quantity
       FROM products p
       WHERE p.merchant_id = ?`,
      [merchantId]
    );

    res.json({ message: 'Inventory set', products: rows });
  } catch (err) {
    console.error('set-bulk inventory error', err);
    res.status(500).json({ error: 'server error' });
  }
});


router.post('/merchants/:id/products', async (req, res) => {
  const merchantId = req.params.id;
  console.log('create product payload', req.body);
  const name = req.body.name ? String(req.body.name).trim() : null;
  const category = req.body.category ? String(req.body.category).trim() : null;
  const image_location = req.body.image_location ? String(req.body.image_location).trim() : null;
  const price = typeof req.body.price !== 'undefined' ? Number(req.body.price) : 0;
  const quantity = typeof req.body.quantity !== 'undefined' ? Number(req.body.quantity) : 10;
  const unit = req.body.unit ? String(req.body.unit).trim() : null;
  const unit_amount = typeof req.body.unit_amount !== 'undefined' ? Number(req.body.unit_amount) : 1;
  const gst = typeof req.body.gst_percent !== 'undefined' ? Number(req.body.gst_percent) : 0;

  if (!name || isNaN(price)) {
    return res.status(400).json({ error: 'Valid name and price required' });
  }

  try {
    // FIX: Added unit, unit_amount and gst_percent handling; set 'active' to 1
    const result = await query(
      'INSERT INTO products (name, category, price, merchant_id, image_location, stock, unit, unit_amount, gst_percent, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [name, category, price, merchantId, image_location, quantity, unit || 'pcs', unit_amount || 1, gst]
    );

    // Product stock is already set in the INSERT statement above via 'quantity' variable
    const insertedId = result.insertId;

    // Verify alert state regarding initial stock
    await checkLowStock(insertedId);

    // Return the product with merchant_quantity so it shows up in the UI immediately
    const rows = await query(
      'SELECT p.*, p.stock AS merchant_quantity FROM products p WHERE p.id = ?',
      [insertedId]
    );
    res.json({ product: rows[0] });

    // Optionally return created packages (if any) — clients may fetch them separately
  } catch (err) {
    console.error('create product error', err && err.message ? err.message : err);
    console.error('create product error full', err);
    res.status(500).json({ error: err.message || err.sqlMessage || 'server error' });
  }
});




router.get('/debug/products', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error('debug products error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ============ BULK INSERT / UPSERT PRODUCTS ============ */
router.post('/products/bulk', authMiddleware, async (req, res) => {
  const items = req.body && Array.isArray(req.body.products) ? req.body.products : null;
  if (!items) return res.status(400).json({ error: 'products array required' });

  try {
    const results = [];
    for (const it of items) {
      // Cast every text field to String explicitly
      const name = it.name ? String(it.name).trim() : null;
      const category = it.category ? String(it.category).trim() : null;
      const price = Number(it.price || 0);
      const merchantId = it.merchant_id;
      const stock = typeof it.stock !== 'undefined' ? Number(it.stock) : 10;
      const merchantQty = typeof it.merchant_quantity !== 'undefined' ? Number(it.merchant_quantity) : 50;

      if (!name || typeof merchantId === 'undefined') {
        results.push({ error: 'name and merchant_id required' });
        continue;
      }

      const existing = await query('SELECT id FROM products WHERE name = ? AND merchant_id = ?', [name, merchantId]);
      let pid;
      if (existing && existing.length > 0) {
        pid = existing[0].id;
        await query(
          `UPDATE products SET category = ?, price = ?, stock = ? WHERE id = ?`,
          [category, price, stock, pid]
        );
      } else {
        const r = await query(
          'INSERT INTO products (name, category, price, stock, merchant_id) VALUES (?, ?, ?, ?, ?)',
          [name, category, price, stock, merchantId]
        );
        pid = r.insertId;
      }

      // stock is already updated in INSERT/UPDATE above
      results.push({ id: pid, name });
    }
    res.json({ message: 'Bulk products processed', results });
  } catch (err) {
    console.error('bulk error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ============ DELETE PRODUCT ============ */
router.delete('/products/:id', async (req, res) => {
  const pid = req.params.id;
  try {
    // Remove dependent rows first to satisfy FK constraints (ignore errors if tables don't exist)
    const safeDelete = async (table) => {
      try {
        await query(`DELETE FROM ${table} WHERE product_id = ?`, [pid]);
      } catch (e) {
        // Ignore "table doesn't exist" errors silently
        if (e && e.code !== 'ER_NO_SUCH_TABLE') {
          console.warn(`warning deleting from ${table}:`, e && e.message ? e.message : e);
        }
      }
    };

    await safeDelete('cart');
    await safeDelete('alerts');
    await safeDelete('inventory');
    await safeDelete('order_items');

    const result = await query('DELETE FROM products WHERE id = ?', [pid]);
    if (result && result.affectedRows === 0) return res.status(404).json({ error: 'product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('delete product error', err && err.message ? err.message : err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// Toggle product active state (soft active/inactive)
router.put('/products/:id/active', async (req, res) => {
  const pid = req.params.id;
  const { active } = req.body || {};
  if (typeof active === 'undefined') return res.status(400).json({ error: 'active value required' });

  try {
    // update active flag only — keep this operation minimal to avoid SQL compatibility issues
    const result = await query('UPDATE products SET active = ? WHERE id = ?', [active ? 1 : 0, pid]);
    if (result && result.affectedRows === 0) return res.status(404).json({ error: 'product not found' });
    return res.json({ message: 'updated' });
  } catch (err) {
    console.error('update product active error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/merchants/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM merchants WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'merchant not found' })
    res.json(rows[0])
  } catch (err) {
    console.error('merchant fetch error', err)
    res.status(500).json({ error: 'server error' })
  }
})

/* ================= DELETE MERCHANT ================= */
router.delete('/merchants/:id', authMiddleware, async (req, res) => {
  const merchantId = req.params.id;

  try {
    // Check if merchant exists
    const merchantRows = await query('SELECT * FROM merchants WHERE id = ?', [merchantId]);
    if (!merchantRows.length) return res.status(404).json({ error: 'merchant not found' });

    // Delete products associated with merchant
    await query('DELETE FROM products WHERE merchant_id = ?', [merchantId]);

    // Delete alerts for products that belonged to this merchant
    await query('DELETE FROM alerts WHERE product_id NOT IN (SELECT id FROM products)');

    // Delete merchant
    await query('DELETE FROM merchants WHERE id = ?', [merchantId]);

    // Update user role back to customer if they had merchant role
    await query('UPDATE users SET role = ? WHERE id = ? AND role = ?', ['customer', req.user.id, 'merchant']);

    res.json({ message: 'Merchant deleted successfully' });
  } catch (err) {
    console.error('delete merchant error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Return all products (customer view) — includes product-level stock and no merchant-specific quantities
router.get('/products', async (req, res) => {
  try {
    const includeInactive = req.query && (req.query.includeInactive === '1' || req.query.includeInactive === 'true');
    const where = includeInactive ? '' : 'WHERE (p.active IS NULL OR p.active = 1)';
    const rows = await query(
      `SELECT p.*, COALESCE(p.stock,10) AS quantity, COALESCE(p.stock,10) AS customer_quantity
       FROM products p ${where}`
    );
    res.json(rows);
  } catch (err) {
    console.error('products (all) error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/products/:merchantId', async (req, res) => {
  const mid = req.params.merchantId
  try {
    const includeInactive = req.query && (req.query.includeInactive === '1' || req.query.includeInactive === 'true');
    const params = [mid];
    let sql = `SELECT p.*, COALESCE(p.stock,10) AS quantity, p.stock AS merchant_quantity
       FROM products p
       WHERE p.merchant_id = ?`;
    if (!includeInactive) {
      sql += ' AND (p.active IS NULL OR p.active = 1)';
    }
    const rows = await query(sql, params);
    res.json(rows)
  } catch (err) {
    console.error('products error', err)
    res.status(500).json({ error: 'server error' })
  }
});

// (customer products endpoint removed) customers should use /products/:merchantId to see current stock

/* ================= ADD TO CART ================= */
/* ================= ADD TO CART ================= */
router.post('/cart', async (req, res) => {
  const { user_id, product_id, quantity } = req.body || {};
  console.log('POST /cart request:', req.body);
  if (!user_id || !product_id || typeof quantity === 'undefined') {
    console.error('POST /cart missing fields:', req.body);
    return res.status(400).json({ error: 'user_id, product_id and quantity required' });
  }

  try {
    // Try to find existing cart row matching same product
    const rows = await query('SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
    console.log('Existing cart row:', rows);
    if (rows && rows.length > 0) {
      await query('UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?', [Number(quantity), user_id, product_id]);
      console.log('Updated cart');
    } else {
      await query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [user_id, product_id, Number(quantity)]);
      console.log('Inserted into cart');
    }
    res.json({ message: 'Added to cart' });
  } catch (err) {
    console.error('add to cart error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/cart/:userId', (req, res) => {
  console.log('GET /cart/:userId', req.params.userId);
  db.query(
    `SELECT p.id AS product_id, p.name, p.unit, p.unit_amount,
            p.gst_percent AS gst_percent,
            m.name AS merchant_name, m.id AS merchant_id,

            (p.price / NULLIF(p.unit_amount,1)) AS price_per_unit,
            ((p.price / NULLIF(p.unit_amount,1)) * (1 + COALESCE(p.gst_percent,0)/100)) AS price_per_unit_incl_gst,

            p.price AS package_price,
            (p.price * (1 + COALESCE(p.gst_percent,0)/100)) AS package_price_incl_gst,

            (p.price * (1 + COALESCE(p.gst_percent,0)/100)) AS price,

            SUM(c.quantity) AS quantity
     FROM cart c
     JOIN products p ON c.product_id = p.id
     LEFT JOIN merchants m ON p.merchant_id = m.id
     WHERE c.user_id = ?
     GROUP BY p.id, p.name, p.unit, p.unit_amount, p.gst_percent, m.name, m.id, p.price`,
    [req.params.userId],
    (err, result) => {
      if (err) {
        console.error('GET /cart error', err);
        return res.status(500).json(err);
      }
      console.log('GET /cart result count:', result.length);
      res.json(result);
    }
  );
});

/* ================= UPDATE CART QUANTITY (or add) ================= */
router.put('/cart', async (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  console.log(`PUT /cart: user=${user_id}, prod=${product_id}, qty=${quantity}`);

  if (!user_id || !product_id || typeof quantity === 'undefined') {
    console.error('PUT /cart missing fields');
    return res.status(400).json({ error: 'user_id, product_id and quantity required' });
  }
  try {
    if (Number(quantity) <= 0) {
      await query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
      return res.json({ message: 'Removed from cart' });
    }

    await query(
      'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)',
      [user_id, product_id, quantity]
    );
    res.json({ message: 'Cart updated' });
  } catch (err) {
    console.error('update cart error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ================= REMOVE FROM CART ================= */
router.delete('/cart', async (req, res) => {
  const { user_id, product_id } = req.body || {};
  if (!user_id || !product_id) return res.status(400).json({ error: 'user_id and product_id required' });
  try {
    await query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
    res.json({ message: 'Removed from cart' });
  } catch (err) {
    console.error('delete cart error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ================= CHECKOUT ================= */
/* ================= CHECKOUT ================= */
router.post('/checkout', async (req, res) => {
  const { user_id, address, phone } = req.body;

  try {
    const items = await query("SELECT product_id, quantity FROM cart WHERE user_id = ?", [user_id]);

    if (!items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Create the order first
    const orderResult = await query(
      "INSERT INTO orders (user_id, total_amount, address, phone) VALUES (?,?,?,?)",
      [user_id, 0, address || null, phone || null]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      // Record in order_items
      await query(
        "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?,?,?,0)",
        [orderId, item.product_id, item.quantity]
      );

      // Stock is already reduced when added to cart (Reserved Stock model)
      // verify alert state just in case
      await checkLowStock(item.product_id);
    }

    // Clear cart after checkout
    await query("DELETE FROM cart WHERE user_id = ?", [user_id]);

    res.json({ message: "Order placed successfully" });
  } catch (err) {
    console.error('checkout error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ================= CREATE ORDER (shipping) ================= */
/* ================= CREATE ORDER (shipping) ================= */
router.post('/orders', async (req, res) => {
  const { user_id, phone, items } = req.body || {};
  let address = req.body.address || req.body.location || "";
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  // Validate address (required, at least 10 chars)
  address = String(address || "").trim();
  if (!address || address.length < 10) {
    return res.status(400).json({ error: 'Invalid address. Must be at least 10 characters.' });
  }

  // Validate phone number (required)
  if (!phone || !/^\d{10}$/.test(String(phone).trim())) {
    return res.status(400).json({ error: 'Invalid or missing phone number. Must be 10 digits.' });
  }

  try {
    // Insert order initially with 0 total
    const orderResult = await query('INSERT INTO orders (user_id, total_amount, address, phone) VALUES (?,?,?,?)', [user_id, 0, address || null, phone || null]);
    const orderId = orderResult.insertId;

    let calculatedTotal = 0;

    // Process each item
    for (const item of items || []) {
      const pid = item.product_id || item.productId || item.id;
      const qty = Number(item.quantity || 1);
      if (!pid) continue;

      // Fetch price from DB to be accurate
      const pRows = await query('SELECT price, stock FROM products WHERE id = ?', [pid]);
      const price = pRows.length ? Number(pRows[0].price || 0) : 0;

      calculatedTotal += price * qty;

      // Record in order_items with ACTUAL price
      await query('INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?,?,?,?)', [orderId, pid, qty, price]);

      // Stock is already reduced when added to cart (Reserved Stock model)
      // Just verify alerts
      await checkLowStock(pid);
    }

    // Update the order with the final calculated total
    await query('UPDATE orders SET total_amount = ? WHERE id = ?', [calculatedTotal, orderId]);

    // Clear cart for user
    await query('DELETE FROM cart WHERE user_id = ?', [user_id]);

    res.json({ message: 'Order placed successfully', orderId, total: calculatedTotal });
  } catch (err) {
    console.error('create order error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ================= INVENTORY ALERTS ================= */
router.get('/inventory/alerts', (req, res) => {
  const merchantId = req.query.merchantId;
  let sql = `
    SELECT a.id, a.product_id, p.name AS product_name, p.merchant_id, a.message, a.status
    FROM alerts a
    JOIN products p ON a.product_id = p.id
    WHERE a.status = 'pending'`;
  const params = [];
  if (merchantId) {
    sql += ' AND p.merchant_id = ?';
    params.push(merchantId);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

/* ================= RESTOCK ================= */
router.post('/inventory/restock', async (req, res) => {
  const { product_id, quantity } = req.body;
  const q = typeof quantity === 'undefined' ? 1 : Number(quantity);
  if (!product_id || q <= 0) return res.status(400).json({ error: 'product_id and positive quantity required' });

  try {
    // Ensure product exists and get merchant id
    const rows = await query('SELECT merchant_id FROM products WHERE id = ?', [product_id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'product not found' });
    const merchantId = rows[0].merchant_id;

    // Increase product-level stock
    await query('UPDATE products SET stock = stock + ? WHERE id = ?', [q, product_id]);

    // Verify alert state (created if still low, or resolved if sufficient)
    await checkLowStock(product_id);

    const after = await query('SELECT stock FROM products WHERE id = ?', [product_id]);
    const newStock = after[0] ? Number(after[0].stock || 0) : 0;

    res.json({ message: "Stock restocked successfully", product_id, quantity: newStock });
  } catch (err) {
    console.error('restock inventory error', err);
    res.status(500).json({ error: 'server error' });
  }
});




/* ============ UPDATE OWN ROLE ============ */
router.post('/me/role', authMiddleware, async (req, res) => {
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ error: 'role required' });
  const allowed = ['customer', 'merchant', 'inventory', 'wholesaler', 'admin'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'invalid role' });
  try {
    await query('UPDATE users SET role = ? WHERE id = ?', [role, req.user.id]);
    const rows = await query('SELECT id, name, username, phone, role FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    res.json({ user });
  } catch (err) {
    console.error('update role error', err);
    res.status(500).json({ error: 'server error' });
  }
});


/* ================= GET USER ORDERS HISTORY ================= */
router.get('/user/:userId/orders', async (req, res) => {
  const userId = req.params.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const rows = await query(`
      SELECT o.id, o.user_id, o.total_amount, o.address, o.phone, o.created_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json(rows || []);
  } catch (err) {
    console.error('get user orders error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ================= GET ORDER ITEMS (PRODUCTS) ================= */
router.get('/order/:orderId/items', async (req, res) => {
  const orderId = req.params.orderId;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  try {
    // Get cart items from the order creation time (we need order_items table or reconstruct from cart history)
    const rows = await query(`
      SELECT oi.*, p.name, p.gst_percent, m.name AS merchant_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Map price_at_purchase to price for consistency with frontend Receipt expectations
    const items = (rows || []).map(it => ({
      ...it,
      price: it.price_at_purchase
    }));

    res.json(items);
  } catch (err) {
    console.error('get order items error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;


// Helper: Check for low stock and create alert if needed
async function checkLowStock(productId) {
  try {
    const rows = await query('SELECT stock, merchant_id, name FROM products WHERE id = ?', [productId]);
    if (!rows || rows.length === 0) return;

    const stock = Number(rows[0].stock || 0);

    // Determine alert status
    if (stock < 5) {
      // 1. Check if pending alert already exists
      const existing = await query("SELECT id FROM alerts WHERE product_id = ? AND status = 'pending'", [productId]);

      let message = '';
      if (stock <= 0) {
        message = 'Out of Stock! Immediate refill required (Target: 10 units)';
      } else {
        message = `Low Stock (${stock}). Recommended: Refill to 10 units`;
      }

      if (existing.length === 0) {
        // 2. Insert new alert
        await query("INSERT INTO alerts (product_id, message) VALUES (?, ?)", [productId, message]);
        console.log(`Created alert for product ${productId}: ${message}`);
      } else {
        // Optional: Update message if severity changed (e.g. low -> OOS)
        await query("UPDATE alerts SET message = ? WHERE id = ?", [message, existing[0].id]);
      }
    } else {
      // Auto-resolve if stock is sufficient
      await query("UPDATE alerts SET status = 'resolved' WHERE product_id = ? AND status = 'pending'", [productId]);
    }
  } catch (err) {
    console.error('checkLowStock error', err);
  }
}

/* ============ REPLENISH PRODUCT-LEVEL STOCK (CUSTOMER) ============ */
router.post('/inventory/replenish', async (req, res) => {
  const { product_id, quantity } = req.body || {};
  const q = typeof quantity === 'undefined' ? 50 : Number(quantity);
  if (!product_id || q <= 0) return res.status(400).json({ error: 'product_id and positive quantity required' });

  try {
    await query('UPDATE products SET stock = COALESCE(stock,50) + ? WHERE id = ?', [q, product_id]);

    // Resolve any pending alerts for this product
    await query("UPDATE alerts SET status = 'resolved' WHERE product_id = ?", [product_id]);

    // Verify alert state
    await checkLowStock(product_id);

    const rows = await query('SELECT COALESCE(stock,50) AS quantity FROM products WHERE id = ?', [product_id]);
    const newQty = rows && rows.length ? Number(rows[0].quantity) : 0;
    res.json({ product_id, quantity: newQty });
  } catch (err) {
    console.error('replenish product error', err);
    res.status(500).json({ error: 'server error' });
  }
});

/* ================= PAYMENT PROCESSING ENDPOINT ================= */
router.post('/payments', async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, user_id } = req.body;

    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    // Log payment attempt
    console.log(`Payment received: Order ${orderId}, Amount ₹${amount}, Method ${paymentMethod}, User ${user_id}`);

    // Ensure orders table has the necessary columns
    const columns = await query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'");
    const colNames = new Set((columns || []).map(c => c.COLUMN_NAME));

    if (!colNames.has('payment_status')) {
      await query('ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT "pending"');
      console.log('Added payment_status column to orders table');
    }
    if (!colNames.has('payment_method')) {
      await query('ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50)');
      console.log('Added payment_method column to orders table');
    }
    if (!colNames.has('payment_id')) {
      await query('ALTER TABLE orders ADD COLUMN payment_id VARCHAR(100)');
      console.log('Added payment_id column to orders table');
    }

    // For now, simulate successful payment
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update order status to 'completed' or 'paid'
    const result = await query('UPDATE orders SET payment_status = ?, payment_method = ?, payment_id = ? WHERE id = ?',
      ['completed', paymentMethod, paymentId, orderId]);

    console.log('Payment update result:', result);

    res.status(200).json({
      success: true,
      message: 'Payment successful',
      paymentId,
      orderId,
      amount,
      paymentMethod,
      timestamp: new Date()
    });

  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ error: 'Payment processing failed', details: err.message });
  }
});