const db = require('./db');

const sql = `
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT,
  price_at_purchase DECIMAL(10,2),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`;

db.query(sql, (err, result) => {
    if (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
    console.log('Migration successful: order_items table created/verified.');
    process.exit(0);
});
