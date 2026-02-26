const db = require('./db');
const util = require('util');

const query = util.promisify(db.query).bind(db);
const API_URL = 'http://localhost:3000';

async function post(url, body) {
    const res = await fetch(API_URL + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`POST ${url} failed: ${res.status} ${txt}`);
    }
    return res.json();
}

async function get(url) {
    const res = await fetch(API_URL + url);
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`GET ${url} failed: ${res.status} ${txt}`);
    }
    return res.json();
}

async function testStats() {
    try {
        // 1. Setup
        const users = await query('SELECT id FROM users LIMIT 1');
        const products = await query('SELECT id, merchant_id, price FROM products WHERE stock > 10 LIMIT 1');

        if (!users.length || !products.length) {
            console.error('No users or products found within DB to test with.');
            process.exit(1);
        }

        const userId = users[0].id;
        const product = products[0];
        const merchantId = product.merchant_id;
        const qty = 2;

        console.log(`Testing with User ID: ${userId}, Product ID: ${product.id}, Merchant ID: ${merchantId}`);

        // 2. Add to Cart
        console.log('Adding to cart...');
        await post('/cart', {
            user_id: userId,
            product_id: product.id,
            quantity: qty
        });

        // 3. Checkout (Place Order)
        console.log('Placing order...');
        await post('/checkout', {
            user_id: userId,
            address: 'Test Address',
            phone: '1234567890'
        });

        // 4. Verify order_items table
        console.log('Verifying order_items...');
        const orderItems = await query('SELECT * FROM order_items WHERE product_id = ? ORDER BY id DESC LIMIT 1', [product.id]);

        if (orderItems.length > 0 && orderItems[0].quantity === qty) {
            console.log('PASS: Order item found in database.');
        } else {
            console.error('FAIL: Order item not found or quantity mismatch.', orderItems);
        }

        // 5. Check Merchant Stats
        console.log('Checking merchant stats...');
        const today = new Date().toISOString().split('T')[0];
        const statsRes = await get(`/merchants/${merchantId}/manager-stats?date=${today}`);

        const statsProduct = statsRes.products.find(p => p.id === product.id);

        if (statsProduct && statsProduct.daily_sold >= qty) {
            console.log(`PASS: Stats show ${statsProduct.daily_sold} sold (expected at least ${qty}).`);
        } else {
            console.error('FAIL: Stats do not reflect sales.', statsProduct);
            console.log('Stats response:', JSON.stringify(statsRes, null, 2));
        }

    } catch (err) {
        console.error('Test failed:', err && err.message ? err.message : err);
    } finally {
        process.exit(0);
    }
}

testStats();
