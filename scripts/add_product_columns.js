const db = require('../Backend/db');
const util = require('util');
const q = util.promisify(db.query).bind(db);

(async () => {
  try {
    const schema = process.env.MYSQL_DATABASE || 'grocery_system';
    const rows = await q("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME IN ('unit','gst_percent')", [schema]);
    const have = rows.map(r => r.COLUMN_NAME);

    if (!have.includes('unit')) {
      console.log('Adding column `unit`...');
      await q("ALTER TABLE products ADD COLUMN unit VARCHAR(16) DEFAULT 'pcs'");
    } else {
      console.log('Column `unit` already exists.');
    }

    if (!have.includes('gst_percent')) {
      console.log('Adding column `gst_percent`...');
      await q("ALTER TABLE products ADD COLUMN gst_percent DECIMAL(5,2) DEFAULT 0.00");
    } else {
      console.log('Column `gst_percent` already exists.');
    }

    console.log('DB migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
  } finally {
    db.end();
  }
})();