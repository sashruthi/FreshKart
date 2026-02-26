const db = require('../Backend/db');
const util = require('util');
const q = util.promisify(db.query).bind(db);

(async () => {
  try {
    const schema = process.env.MYSQL_DATABASE || 'grocery_system';

    // Add unit_amount to products if missing
    const cols = await q("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'unit_amount'", [schema]);
    if (!cols.length) {
      console.log('Adding products.unit_amount column...');
      await q('ALTER TABLE products ADD COLUMN unit_amount DECIMAL(10,3) DEFAULT 1.000');
    } else {
      console.log('products.unit_amount already exists.');
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
  } finally {
    db.end();
  }
})();