const db = require('./db');

(async () => {
    try {
        console.log('--- Verifying Cart Constraint ---');

        // Fetch valid IDs
        const [user] = await new Promise((resolve, reject) => {
            db.query("SELECT id FROM users LIMIT 1", (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });
        const [product] = await new Promise((resolve, reject) => {
            db.query("SELECT id FROM products LIMIT 1", (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });

        if (!user || !product) {
            console.error('❌ Error: No users or products found in DB to test with.');
            process.exit(1);
        }

        const userId = user.id;
        const productId = product.id;
        console.log(`Using User ID: ${userId}, Product ID: ${productId}`);

        // Clean up
        await new Promise((resolve, reject) => {
            db.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });

        console.log('1. Insert first item...');
        await new Promise((resolve, reject) => {
            db.query("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [userId, productId, 1], (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });

        console.log('2. Attempting duplicate insert (should fail or trigger update if using ON DUPLICATE)...');
        // We test the raw INSERT failure to confirm constraint existence
        try {
            await new Promise((resolve, reject) => {
                db.query("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [userId, productId, 1], (err, res) => {
                    if (err) reject(err); else resolve(res);
                });
            });
            console.error('❌ FAILED: Duplicate entry was allowed (Constraint missing!)');
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                console.log('✅ SUCCESS: Duplicate entry prevented by constraint.');
            } else {
                console.error('❌ UNEXPECTED ERROR:', err);
            }
        }

        // Verify row count
        const rows = await new Promise((resolve, reject) => {
            db.query("SELECT * FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });

        console.log(`Rows found: ${rows.length} (Expected: 1)`);

        if (rows.length === 1) {
            console.log('✅ VERIFICATION PASSED');
        } else {
            console.error('❌ VERIFICATION FAILED');
        }

        // Clean up
        await new Promise((resolve, reject) => {
            db.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [userId, productId], (err, res) => {
                if (err) reject(err); else resolve(res);
            });
        });

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
