const db = require('./db');

async function debug() {
    try {
        console.log('--- CHECKING PRODUCTS COLUMNS ---');
        const cols = await new Promise((resolve, reject) => {
            db.query("SHOW COLUMNS FROM products", (err, res) => err ? reject(err) : resolve(res));
        });
        console.log(cols.map(c => c.Field));

        console.log('\n--- CHECKING CART DATA ---');
        const cart = await new Promise((resolve, reject) => {
            db.query("SELECT * FROM cart", (err, res) => err ? reject(err) : resolve(res));
        });
        console.log(cart);

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

debug();
