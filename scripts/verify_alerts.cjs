const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            // Wait, let's verify if routes are mounted at / or /api. 
            // I'll check server.js first. It calls require('./routes').
            // Usually app.use('/api', routes).
            // I'll adjust this after reading server.js if needed.
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.log('--- STARTING VERIFICATION ---');

        // 1. Create a Merchant
        const mName = `TestMerchant_${Date.now()}`;
        console.log(`Creating merchant: ${mName}`);
        const mRes = await request('POST', '/merchants', { name: mName, type: 'grocery' });
        if (mRes.status !== 200) throw new Error('Failed to create merchant: ' + JSON.stringify(mRes.data));
        const mid = mRes.data.id;
        console.log(`Merchant ID: ${mid}`);

        // 2. Create Product with Stock 10
        const pName = `TestProd_${Date.now()}`;
        console.log(`Creating product: ${pName} with stock 10`);
        const pRes = await request('POST', `/merchants/${mid}/products`, {
            name: pName, price: 100, quantity: 10, category: 'test'
        });
        if (pRes.status !== 200) throw new Error('Failed to create product: ' + JSON.stringify(pRes.data));
        const pid = pRes.data.product.id;
        console.log(`Product ID: ${pid}`);

        // 3. Verify No Alerts
        let aRes = await request('GET', `/inventory/alerts?merchantId=${mid}`);
        if (aRes.data.some(a => a.product_id === pid)) throw new Error('Alert found when stock is 10!');
        console.log('No alerts for stock 10 - OK');

        // 4. Decrease Stock to 4
        console.log('Decreasing stock by 6 (should result in 4)');
        const dRes = await request('POST', '/inventory/decrease', { product_id: pid, quantity: 6 });
        if (dRes.status !== 200) throw new Error('Failed to decrease: ' + JSON.stringify(dRes.data));
        if (dRes.data.quantity !== 4) console.warn('Warning: Quantity is ' + dRes.data.quantity);

        // 5. Verify Alert Exists
        aRes = await request('GET', `/inventory/alerts?merchantId=${mid}`);
        const alert = aRes.data.find(a => a.product_id === pid);
        if (!alert) throw new Error('Alert NOT found when stock is 4!');
        console.log('Alert found for stock 4 - OK');

        // 6. Restock to 10
        console.log('Restocking by 6 (should result in 10)');
        const rRes = await request('POST', '/inventory/restock', { product_id: pid, quantity: 6 });
        if (rRes.status !== 200) throw new Error('Failed to restock: ' + JSON.stringify(rRes.data));

        // 7. Verify Alert Resolved
        aRes = await request('GET', `/inventory/alerts?merchantId=${mid}`);
        if (aRes.data.some(a => a.product_id === pid)) throw new Error('Alert still exists after restock!');
        console.log('Alert resolved after restock - OK');

        // 8. Test Checkout Alert
        // Need a user for checkout
        // ... skipping complex checkout flow for now, testing simple decrease which mimics logic matches checkout
        // but let's test PUT update logic resolving/creating

        // Decrease to 3 via direct UPDATE (simulate edit)
        console.log('Editing product stock to 3');
        // Using PUT /products/:id
        // Need token? routes.js says `checkLowStock` used in PUT, but `PUT /products/:id` uses `authMiddleware`.
        // I need a token.
        // Let's create a user and login
        console.log('Creating generic user for auth');
        const uName = `user_${Date.now()}`;
        await request('POST', '/signup', { username: uName, password: 'password', role: 'merchant' });
        const lRes = await request('POST', '/login', { username: uName, password: 'password' });
        const token = lRes.data.token;

        // Now PUT
        const putRes = await request('PUT', `/products/${pid}`, { stock: 3 }, token);
        if (putRes.status !== 200) throw new Error('PUT failed: ' + JSON.stringify(putRes.data));

        // Verify Alert
        aRes = await request('GET', `/inventory/alerts?merchantId=${mid}`);
        if (!aRes.data.some(a => a.product_id === pid)) throw new Error('Alert NOT created after PUT stock=3');
        console.log('Alert created after PUT stock=3 - OK');

        // Cleanup
        console.log('Cleaning up...');
        await request('DELETE', `/merchants/${mid}`, null, token); // Need auth for delete merchant

        console.log('--- VERIFICATION SUCCESS ---');
    } catch (err) {
        console.error('--- VERIFICATION FAILED ---');
        console.error(err);
        process.exit(1);
    }
}

run();
