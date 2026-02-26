const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login for user: ravi');
        const res = await axios.post('http://localhost:3000/login', {
            username: 'ravi',
            password: 'password123'
        });
        console.log('Login successful!');
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Login failed!');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error:', err.message);
        }
    }
}

testLogin();
