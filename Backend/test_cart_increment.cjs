/**
 * Test script to verify cart increment/decrement updates both cart quantity and product stock
 */

const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'grocery_system'
});

const util = require('util');
const query = util.promisify(db.query).bind(db);

async function test() {
  console.log('\n=== Testing Cart Increment/Decrement ===\n');

  try {
    // Test data
    const userId = 1;
    const productId = 1;
    const initialQuantity = 2;

    // Get initial product stock
    let result = await query('SELECT stock FROM products WHERE id = ?', [productId]);
    const initialStock = result[0].stock;
    console.log(`✓ Product ${productId} initial stock: ${initialStock}`);

    // Clear cart first
    await query('DELETE FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);
    console.log(`✓ Cart cleared for user ${userId}`);

    // Add item to cart
    await query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', 
      [userId, productId, initialQuantity]);
    console.log(`✓ Added ${initialQuantity} items to cart`);

    // Simulate increment (decrease stock by 1)
    console.log('\n--- Simulating INCREMENT (+) ---');
    result = await query('SELECT stock FROM products WHERE id = ?', [productId]);
    let currentStock = result[0].stock;
    console.log(`Stock before increment: ${currentStock}`);

    // Decrease stock (as if user clicked +)
    await query('UPDATE products SET stock = stock - ? WHERE id = ?', [1, productId]);
    
    // Update cart quantity
    await query('UPDATE cart SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?', 
      [userId, productId]);

    result = await query('SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?', 
      [userId, productId]);
    const newCartQty = result[0].quantity;
    
    result = await query('SELECT stock FROM products WHERE id = ?', [productId]);
    const newStock = result[0].stock;
    
    console.log(`Stock after increment: ${newStock} (decreased by 1? ${currentStock - newStock === 1 ? '✓' : '✗'})`);
    console.log(`Cart quantity after increment: ${newCartQty} (increased by 1? ${newCartQty === initialQuantity + 1 ? '✓' : '✗'})`);

    // Simulate decrement (increase stock by 1)
    console.log('\n--- Simulating DECREMENT (-) ---');
    currentStock = newStock;
    console.log(`Stock before decrement: ${currentStock}`);

    // Increase stock back (as if user clicked -)
    await query('UPDATE products SET stock = stock + ? WHERE id = ?', [1, productId]);
    
    // Update cart quantity
    await query('UPDATE cart SET quantity = quantity - 1 WHERE user_id = ? AND product_id = ?', 
      [userId, productId]);

    result = await query('SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?', 
      [userId, productId]);
    const finalCartQty = result[0].quantity;
    
    result = await query('SELECT stock FROM products WHERE id = ?', [productId]);
    const finalStock = result[0].stock;
    
    console.log(`Stock after decrement: ${finalStock} (increased by 1? ${finalStock - currentStock === 1 ? '✓' : '✗'})`);
    console.log(`Cart quantity after decrement: ${finalCartQty} (decreased by 1? ${finalCartQty === newCartQty - 1 ? '✓' : '✗'})`);

    console.log('\n=== Test Summary ===');
    console.log(`Initial Stock: ${initialStock}`);
    console.log(`Initial Cart Qty: ${initialQuantity}`);
    console.log(`After +1: Stock=${newStock}, Cart=${newCartQty}`);
    console.log(`After -1: Stock=${finalStock}, Cart=${finalCartQty}`);
    console.log(`\n${(initialStock - 1 === newStock && initialStock === finalStock) ? '✓ SUCCESS' : '✗ FAILED'}`);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    db.end();
  }
}

test();
