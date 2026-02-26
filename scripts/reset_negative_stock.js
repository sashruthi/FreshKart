const db = require('../Backend/db');

(async () => {
    try {
        console.log('Resetting negative stocks...');
        const res = await new Promise((resolve, reject) => {
            db.query("UPDATE products SET stock = 0 WHERE stock < 0", (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
        console.log('Result:', res);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
