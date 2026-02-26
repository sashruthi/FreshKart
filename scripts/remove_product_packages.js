const db = require('../Backend/db');
const util = require('util');
const q = util.promisify(db.query).bind(db);

(async () => {
  try {
    const schema = process.env.MYSQL_DATABASE || 'grocery_system';

    console.log('Dropping product_packages table (if exists)...');
    await q("DROP TABLE IF EXISTS product_packages");

    // Drop cart.package_id if present
    const cartCols = await q("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cart' AND COLUMN_NAME = 'package_id'", [schema]);
    if (cartCols.length) {
      console.log('Dropping cart.package_id column...');
      await q('ALTER TABLE cart DROP COLUMN package_id');
    } else {
      console.log('cart.package_id not found, skipping');
    }

    console.log('Removal complete.');
  } catch (err) {
    console.error('Removal failed:', err.message || err);
  } finally {
    db.end();
  }
})();