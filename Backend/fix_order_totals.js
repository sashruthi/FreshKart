const db = require('./db');
const util = require('util');
const query = util.promisify(db.query.bind(db));

async function fixOrderTotals() {
    try {
        console.log('Starting order total fix...');

        // Get all orders with 0 total
        const orders = await query('SELECT id FROM orders WHERE total_amount = 0');
        console.log(`Found ${orders.length} orders with ₹0.00 total`);

        let fixed = 0;
        let skipped = 0;

        for (const order of orders) {
            const orderId = order.id;

            // Get order items with current product prices
            const items = await query(`
        SELECT oi.quantity, oi.price_at_purchase, p.price as current_price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId]);

            if (items.length === 0) {
                console.log(`Order ${orderId}: No items found, skipping`);
                skipped++;
                continue;
            }

            let total = 0;
            let itemsUpdated = 0;

            // Update each item's price_at_purchase if it's 0
            for (const item of items) {
                const price = Number(item.price_at_purchase || 0);
                const currentPrice = Number(item.current_price || 0);
                const qty = Number(item.quantity || 0);

                if (price === 0 && currentPrice > 0) {
                    // Use current price as fallback
                    total += currentPrice * qty;
                    itemsUpdated++;
                } else {
                    total += price * qty;
                }
            }

            // Update order total
            await query('UPDATE orders SET total_amount = ? WHERE id = ?', [total, orderId]);

            // Update order_items prices if they were 0
            if (itemsUpdated > 0) {
                await query(`
          UPDATE order_items oi
          JOIN products p ON oi.product_id = p.id
          SET oi.price_at_purchase = p.price
          WHERE oi.order_id = ? AND oi.price_at_purchase = 0
        `, [orderId]);
            }

            console.log(`Order ${orderId}: Fixed total = ₹${total.toFixed(2)} (${itemsUpdated} items updated)`);
            fixed++;
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   Fixed: ${fixed} orders`);
        console.log(`   Skipped: ${skipped} orders`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing order totals:', err);
        process.exit(1);
    }
}

fixOrderTotals();
