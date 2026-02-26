const db = require('./db');

async function fixUser() {
    const username = 'fm_owner';
    console.log(`Updating user: ${username} to role 'merchant'`);

    db.query('UPDATE users SET role = ? WHERE username = ?', ['merchant', username], (err, result) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }
        console.log('Update result:', result);
        process.exit(0);
    });
}

fixUser();
