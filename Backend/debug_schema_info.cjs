const db = require('./db');
db.query('DESCRIBE users', (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    const role = rows.find(r => r.Field === 'role');
    console.log('Role Type:', role.Type);
    const username = rows.find(r => r.Field === 'username');
    console.log('Username Type:', username.Type);
    process.exit(0);
});
