const fs = require('fs')
const path = require('path')
const mysql = require('mysql2')

const SQL_FILE = path.join(__dirname, 'init_db.sql')
if (!fs.existsSync(SQL_FILE)) {
  console.error('init_db.sql not found in Backend/')
  process.exit(1)
}

const sql = fs.readFileSync(SQL_FILE, 'utf8')

// Use same credentials as db.js but do not specify database so we can create it
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sasroot16',
  multipleStatements: true,
})

conn.connect(err => {
  if (err) {
    console.error('Failed to connect to MySQL:', err.message)
    process.exit(1)
  }
  console.log('Connected to MySQL — running init_db.sql')
  conn.query(sql, (err, results) => {
    if (err) {
      console.error('Error executing SQL:', err.message)
      process.exit(1)
    }
    console.log('Database initialized successfully.')
    // After DB init, optionally import extra products from extra_products.json
    const extraFile = path.join(__dirname, 'extra_products.json')
    if (!fs.existsSync(extraFile)) {
      conn.end()
      return
    }

    let extras
    try { extras = JSON.parse(fs.readFileSync(extraFile, 'utf8')) } catch (e) {
      console.error('Failed to parse extra_products.json:', e.message)
      conn.end()
      return
    }

    const items = Array.isArray(extras.products) ? extras.products : []
    if (!items.length) {
      console.log('No extra products to import.')
      conn.end()
      return
    }

    console.log(`Importing ${items.length} extra products...`)

    // helper to run queries with promises
    const exec = (sql, params) => new Promise((res, rej) => conn.query(sql, params, (e, r) => e ? rej(e) : res(r)))

      ; (async () => {
        try {
          for (const it of items) {
            const name = it.name
            const category = it.category || null
            const price = Number(it.price || 0)
            const merchantId = it.merchant_id
            const stock = typeof it.stock !== 'undefined' ? Number(it.stock) : null
            const merchantQty = typeof it.merchant_quantity !== 'undefined' ? Number(it.merchant_quantity) : 50

            if (!name || typeof merchantId === 'undefined') {
              console.warn('Skipping product (missing name or merchant_id):', it)
              continue
            }

            // find existing by name+merchant
            const exists = await exec('SELECT id FROM products WHERE name = ? AND merchant_id = ?', [name, merchantId])
            let pid
            if (exists && exists.length) {
              pid = exists[0].id
              const updates = []
              const params = []
              if (category !== null) { updates.push('category = ?'); params.push(category) }
              if (!Number.isNaN(price) && price > 0) { updates.push('price = ?'); params.push(price) }
              if (stock !== null) { updates.push('stock = ?'); params.push(stock) }
              if (updates.length) {
                params.push(pid)
                await exec(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params)
              }
            } else {
              const r = await exec('INSERT INTO products (name, category, price, stock, merchant_id) VALUES (?, ?, ?, ?, ?)', [name, category, price, stock !== null ? stock : 10, merchantId])
              pid = r.insertId
            }

            // update product stock if merchantQty was specified
            if (merchantQty !== 50) {
              await exec('UPDATE products SET stock = ? WHERE id = ?', [merchantQty, pid])
            }
          }

          console.log('Extra products import complete.')
        } catch (e) {
          console.error('Error importing extra products:', e.message)
        } finally {
          conn.end()
        }
      })()
  })
})
