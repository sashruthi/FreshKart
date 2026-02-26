const db = require('./db');
const util = require('util');
const q = util.promisify(db.query).bind(db);

(async () => {
    try {
        console.log('--- MIGRATING SCHEMA ---');

        const addCol = async (col, def) => {
            try {
                await q(`ALTER TABLE products ADD COLUMN ${col} ${def}`);
                console.log(`Added column ${col}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column ${col} already exists`);
                } else {
                    console.error(`Failed to add ${col}: ${e.message}`);
                }
            }
        };

        await addCol('unit', "VARCHAR(16) DEFAULT 'pcs'");
        await addCol('unit_amount', "DECIMAL(10,3) DEFAULT 1.000");
        await addCol('gst_percent', "DECIMAL(5,2) DEFAULT 0.00");

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
