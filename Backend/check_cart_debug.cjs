const db = require('./db');
const util = require('util');

(async () => {
    try {
        console.log('Checking Products Schema...');
        const productsSchema = await new Promise((resolve) => db.query("DESCRIBE products", (err, res) => resolve(res)));
        console.log(productsSchema.map(c => c.Field));

        console.log('Checking Merchants Schema...');
        const merchantsSchema = await new Promise((resolve) => db.query("DESCRIBE merchants", (err, res) => resolve(res)));
        console.log(merchantsSchema.map(c => c.Field));

        console.log('Checking Cart Content...');
        const cart = await new Promise((resolve) => db.query("SELECT * FROM cart", (err, res) => resolve(res)));
        console.log('Cart Items:', cart.length, cart);

        if (cart.length > 0) {
            const uid = cart[0].user_id;
            console.log('Test Query for User:', uid);
            const q = `SELECT p.id AS product_id, p.name, m.name AS merchant_name
                     FROM cart c
                     JOIN products p ON c.product_id = p.id
                     LEFT JOIN merchants m ON p.merchant_id = m.id
                     WHERE c.user_id = ?`;
            const res = await new Promise((resolve, reject) => {
                db.query(q, [uid], (err, r) => err ? reject(err) : resolve(r));
            });
            console.log('Query Result:', res);
        } else {
            console.log('Cart is empty, cannot test join query.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
