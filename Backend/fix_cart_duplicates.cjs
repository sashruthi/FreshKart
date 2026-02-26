const db = require('./db');

(async () => {
    try {
        console.log('--- Cleaning Up Cart Duplicates ---');

        // 1. Find duplicates and calculate total quantity PER (user_id, product_id)
        const rows = await new Promise((resolve, reject) => {
            db.query("SELECT user_id, product_id, SUM(quantity) as total_qty FROM cart GROUP BY user_id, product_id HAVING COUNT(*) > 1", (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });

        console.log(`Found ${rows.length} duplicate groups. Merging...`);

        for (const row of rows) {
            const { user_id, product_id, total_qty } = row;
            console.log(`Merging User ${user_id} Product ${product_id} -> Total ${total_qty}`);

            // 2. Delete ALL rows for this combo
            await new Promise((resolve, reject) => {
                db.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [user_id, product_id], (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });

            // 3. Insert ONE row with corrected quantity
            await new Promise((resolve, reject) => {
                db.query("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [user_id, product_id, total_qty], (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });
        }

        console.log('--- Adding UNIQUE Index ---');

        // 4. Add Constraints
        await new Promise((resolve, reject) => {
            db.query("ALTER TABLE cart ADD UNIQUE KEY unique_cart_item (user_id, product_id)", (err, res) => {
                // Ignore "Duplicate key name" error if it exists
                if (err && err.code !== 'ER_DUP_KEYNAME') reject(err);
                else resolve(res);
            });
        });

        console.log('Cart fixed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
})();
