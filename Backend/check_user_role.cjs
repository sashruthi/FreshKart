const db = require('./db');

async function checkUser() {
    const username = 'fm_owner';
    console.log(`Checking user: ${username}`);

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, rows) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }
        if (rows.length === 0) {
            console.log('User not found!');
        } else {
            console.log('User found:', rows[0]);
        }
        process.exit(0);
    });
}

checkUser();
