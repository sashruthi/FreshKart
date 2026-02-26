const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "sasroot16",
  database: "grocery_system"
});

db.connect((err) => {
  if (err) {
    console.error(" MySQL connection failed:", err.message);
    return;
  }
  console.log(" MySQL Connected Successfully");
});

module.exports = db;
