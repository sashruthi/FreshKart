const axios = require('axios');
const db = require('./db');
const util = require('util');

const BASE_URL = 'http://localhost:3000'; // Assuming backend runs on 5000
const USER_ID = 1; // Test user

(async () => {
    try {
        console.log('--- Starting Cart API Test ---');

        // 1. Get a product
        const products = await new Promise((resolve) => db.query("SELECT * FROM products WHERE stock > 5 LIMIT 1", (err, res) => resolve(res)));
        if (!products.length) throw new Error('No products with stock found');
        const p = products[0];
        console.log(`Using product: ${p.id} (${p.name}), Stock: ${p.stock}`);

        // 2. Clear cart for user
        await new Promise((resolve) => db.query("DELETE FROM cart WHERE user_id = ?", [USER_ID], (err, res) => resolve(res)));

        // 3. Test PUT to ADD (quantity 1)
        console.log('Testing PUT /cart (Add new item)...');
        // We simulate frontend: first decrease stock, then add to cart.
        // But here we test Cart API primarily.

        // Let's mimic the frontend call for handleIncrement
        // Frontend calls: POST /inventory/decrease -> PUT /cart

        // decrease
        // await axios.post(`${BASE_URL}/inventory/decrease`, { product_id: p.id, quantity: 1 });
        // console.log('Decreased stock.');

        // put cart
        await axios.put(`${BASE_URL}/cart`, { user_id: USER_ID, product_id: p.id, quantity: 1 });
        console.log('PUT /cart success.');

        // Verify DB
        let cartItem = await new Promise((resolve) => db.query("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [USER_ID, p.id], (err, res) => resolve(res[0])));
        console.log('Cart Item after Add:', cartItem);
        if (!cartItem || cartItem.quantity !== 1) throw new Error('Cart Add failed');

        // 4. Test PUT to UPDATE (quantity 2)
        console.log('Testing PUT /cart (Update item)...');
        await axios.put(`${BASE_URL}/cart`, { user_id: USER_ID, product_id: p.id, quantity: 2 });

        cartItem = await new Promise((resolve) => db.query("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [USER_ID, p.id], (err, res) => resolve(res[0])));
        console.log('Cart Item after Update:', cartItem);
        if (!cartItem || cartItem.quantity !== 2) throw new Error('Cart Update failed');

        console.log('--- Test Passed ---');
        process.exit(0);

    } catch (err) {
        console.error('Test Failed Status:', err.response?.status);
        console.error('Test Failed Data:', err.response?.data);
        console.error('Test Failed Message:', err.message);
        process.exit(1);
    }
})();
