const db = require('./db');

(async () => {
    try {
        console.log('--- Checking Cart Table Schema ---');
        const schema = await new Promise((resolve, reject) => {
            db.query("SHOW CREATE TABLE cart", (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
        console.log(schema[0]['Create Table']);

        console.log('\n--- Checking for Duplicates ---');
        const dups = await new Promise((resolve, reject) => {
            db.query(`
                SELECT user_id, product_id, COUNT(*) as count 
                FROM cart 
                GROUP BY user_id, product_id 
                HAVING count > 1
            `, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
        console.log('Duplicate Groups Found:', dups.length);
        console.log(dups);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
