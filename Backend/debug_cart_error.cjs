const db = require('./db');

(async () => {
    try {
        console.log('--- Checking Merchants Columns ---');
        const cols = await new Promise((resolve, reject) => {
            db.query("SHOW COLUMNS FROM merchants", (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
        console.log('Columns:', cols.map(c => c.Field));
        process.exit(0);

        console.log('\n--- Executing GET /cart Query ---');
        const userId = 1;
        const sql = `
            SELECT p.id AS product_id, p.name, p.unit, p.unit_amount,
            p.gst_percent AS gst_percent,
            m.name AS merchant_name, m.address AS merchant_address, m.id AS merchant_id,
            (p.price / NULLIF(p.unit_amount,0)) AS price_per_unit,
            ((p.price / NULLIF(p.unit_amount,0)) + ((p.price / NULLIF(p.unit_amount,0)) * COALESCE(p.gst_percent,0) / 100)) AS price,
            c.quantity
            FROM cart c
            JOIN products p ON c.product_id = p.id
            LEFT JOIN merchants m ON p.merchant_id = m.id
            WHERE c.user_id = ?
        `;

        const res = await new Promise((resolve, reject) => {
            db.query(sql, [userId], (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
        console.log('Query Success. Rows:', res.length);
        console.log(res);
        process.exit(0);
    } catch (err) {
        const fs = require('fs');
        const msg = `Code: ${err.code}\nMessage: ${err.message}\nSQLMessage: ${err.sqlMessage}\nStack: ${err.stack}`;
        fs.writeFileSync('debug_error.log', msg);
        console.error('Error written to debug_error.log');
        process.exit(1);
    }
})();
