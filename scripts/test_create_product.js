const http = require('http');

const payload = JSON.stringify({ name: 'test milk', category: 'dairy', price: 300, quantity: 50, unit: 'litre', unit_amount: 5, gst_percent: 3 });

const opts = {
  hostname: 'localhost',
  port: 3000,
  path: '/merchants/1/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(opts, res => {
  let body = '';
  res.on('data', d => body += d.toString());
  res.on('end', () => {
    try {
      console.log('status', res.statusCode, JSON.parse(body));
    } catch (e) { console.log('status', res.statusCode, body); }
  });
});
req.on('error', e => { console.error('ERR', e); console.error(e.stack); process.exit(1); });
req.write(payload);
req.end();