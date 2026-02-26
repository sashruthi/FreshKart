const db = require('../Backend/db');
const util = require('util');
const q = util.promisify(db.query).bind(db);

(async () => {
  try {
    const schema = process.env.MYSQL_DATABASE || 'grocery_system';

    // Create product_packages table if not exists
    const pkgExists = await q("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'product_packages'", [schema]);
    if (!pkgExists.length) {
      console.log('Creating table product_packages...');
      await q(`CREATE TABLE product_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        label VARCHAR(64),
        unit_amount DECIMAL(10,3) DEFAULT 1.000,
        price DECIMAL(10,2) DEFAULT 0.00,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`);
    } else {
      console.log('Table product_packages already exists.');
    }

    // Alter cart.quantity to DECIMAL(10,3)
    const cartCols = await q("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cart' AND COLUMN_NAME IN ('quantity','package_id')", [schema]);
    const cartColsMap = {};
    cartCols.forEach(r => cartColsMap[r.COLUMN_NAME] = r.DATA_TYPE);

    if (cartColsMap['quantity'] !== 'decimal') {
      console.log('Altering cart.quantity to DECIMAL(10,3)...');
      await q('ALTER TABLE cart MODIFY COLUMN quantity DECIMAL(10,3)');
    } else {
      console.log('cart.quantity already DECIMAL.');
    }

    if (!('package_id' in cartColsMap)) {
      console.log('Adding cart.package_id column...');
      await q('ALTER TABLE cart ADD COLUMN package_id INT NULL');
    } else {
      console.log('cart.package_id already exists.');
    }

    // Alter products.stock and merchant_inventory.quantity to DECIMAL
    const prodStock = await q("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'stock'", [schema]);
    if (!prodStock.length || prodStock[0].DATA_TYPE !== 'decimal') {
      console.log('Altering products.stock to DECIMAL(10,3)...');
      await q('ALTER TABLE products MODIFY COLUMN stock DECIMAL(10,3) DEFAULT 50');
    } else {
      console.log('products.stock already DECIMAL.');
    }

    const miCols = await q("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'merchant_inventory' AND COLUMN_NAME = 'quantity'", [schema]);
    if (!miCols.length || miCols[0].DATA_TYPE !== 'decimal') {
      console.log('Altering merchant_inventory.quantity to DECIMAL(10,3)...');
      await q('ALTER TABLE merchant_inventory MODIFY COLUMN quantity DECIMAL(10,3) DEFAULT 100');
    } else {
      console.log('merchant_inventory.quantity already DECIMAL.');
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
  } finally {
    db.end();
  }
})();