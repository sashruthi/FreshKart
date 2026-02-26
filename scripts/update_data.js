const db = require('../Backend/db'); // Adjust path as needed based on where script runs
const util = require('util');
const query = util.promisify(db.query).bind(db);

async function runUpdates() {
    console.log('Starting product data updates...');

    try {
        // 1. Update Ghee Prices (Premium)
        await query(`UPDATE products SET price = 650, unit = 'ltr', unit_amount = 1 WHERE name LIKE '%Ghee%' OR category = 'Ghee'`);
        await query(`UPDATE products SET name = 'Pure Cow Ghee (Arokya)' WHERE name LIKE '%Ghee%'`);

        // 2. Update Oil Prices
        await query(`UPDATE products SET price = 145, unit = 'ltr', unit_amount = 1 WHERE name LIKE '%Sunflower%' OR name LIKE '%Oil%'`);
        await query(`UPDATE products SET name = 'Gold Winner Sunflower Oil' WHERE name LIKE '%Sunflower%'`);
        await query(`UPDATE products SET name = 'Fortune Sunlite Refined Oil' WHERE name = 'Cooking Oil'`);

        // 3. Update Rice Prices
        await query(`UPDATE products SET price = 58, unit = 'kg', unit_amount = 1 WHERE name LIKE '%Rice%'`);
        await query(`UPDATE products SET name = 'India Gate Basmati Rice', price = 120 WHERE name LIKE '%Basmati%'`);
        await query(`UPDATE products SET name = 'Ponni Boiled Rice' WHERE name LIKE '%Ponni%'`);

        // 4. Update Sugar/Salt
        await query(`UPDATE products SET price = 42, unit = 'kg', unit_amount = 1 WHERE name LIKE '%Sugar%'`);
        await query(`UPDATE products SET price = 20, unit = 'kg', unit_amount = 1 WHERE name LIKE '%Salt%'`);

        // 5. Update Dal/Pulses
        await query(`UPDATE products SET price = 110, unit = 'kg', unit_amount = 1 WHERE name LIKE '%Dal%' OR name LIKE '%Toor%'`);

        // 6. General Cleanup: Set defaults for null units
        await query(`UPDATE products SET unit = 'pcs', unit_amount = 1 WHERE unit IS NULL`);

        // 7. Ensure stock is hidden/realistic (remove custom caps if any, logic handles the rest)
        // We don't need to change stock numbers much, just the display.

        console.log('Updates completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error updating data:', err);
        process.exit(1);
    }
}

// Give a moment for DB connection
setTimeout(runUpdates, 1000);
