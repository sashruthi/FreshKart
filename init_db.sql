-- CREATE DATABASE grocery_system;
-- USE grocery_system;

-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100),
--   email VARCHAR(100),
--   phone VARCHAR(15),
--   role ENUM('customer','merchant','inventory','wholesaler') NOT NULL
-- );
-- USE grocery_system;

-- ALTER TABLE users
-- ADD COLUMN username VARCHAR(50) UNIQUE,
-- ADD COLUMN password VARCHAR(100);

-- INSERT INTO users (name, email, phone, role) VALUES
-- ('Ravi', 'ravi@gmail.com', '9876543210', 'customer'),
-- ('Anu', 'anu@gmail.com', '9876543211', 'customer'),
-- ('FreshMart Owner', 'fm@shop.com', '9999999999', 'merchant'),
-- ('Inventory Manager', 'inv@store.com', '8888888888', 'inventory'),
-- ('Wholesaler', 'whole@supply.com', '7777777777', 'wholesaler');

-- CREATE TABLE merchants (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100),
--   type ENUM('grocery','nuts')
-- );
-- SELECT * FROM merchants;
-- INSERT INTO merchants (name,type) VALUES
-- ('Fresh Mart','grocery'),
-- ('Daily Needs','grocery'),
-- ('Nut House','nuts'),
-- ('Dry Fruit World','nuts');
-- CREATE TABLE products (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(100),
--   category VARCHAR(50),
--   price DECIMAL(10,2),
--   merchant_id INT,
--   FOREIGN KEY (merchant_id) REFERENCES merchants(id)
-- );
-- CREATE TABLE inventory (
--   product_id INT PRIMARY KEY,
--   quantity INT,
--   FOREIGN KEY (product_id) REFERENCES products(id)
-- );
-- CREATE TABLE cart (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id INT,
--   product_id INT,
--   quantity INT,
--   FOREIGN KEY (user_id) REFERENCES users(id),
--   FOREIGN KEY (product_id) REFERENCES products(id)
-- );
-- CREATE TABLE orders (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id INT,
--   total_amount DECIMAL(10,2),
--   address VARCHAR(255),
--   phone VARCHAR(15),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- SELECT * FROM orders;

-- CREATE TABLE alerts (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   product_id INT,
--   message VARCHAR(255),
--   status ENUM('pending','resolved') DEFAULT 'pending'
-- );

DROP DATABASE IF EXISTS grocery_system;
CREATE DATABASE grocery_system;
USE grocery_system;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  role ENUM('customer','merchant','inventory','wholesaler') NOT NULL
);

CREATE TABLE merchants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  type ENUM('grocery','nuts')
);
INSERT INTO merchants (name,type) VALUES
('Fresh Mart','grocery'),
('Daily Needs','grocery'),
('Nut House','nuts'),
('Dry Fruit World','nuts');

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  category VARCHAR(50),
  price DECIMAL(10,2),
  merchant_id INT,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);
CREATE TABLE inventory (
  product_id INT PRIMARY KEY,
  quantity INT,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  product_id INT,
  quantity INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  total_amount DECIMAL(10,2),
  address VARCHAR(255),
  phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  message VARCHAR(255),
  status ENUM('pending','resolved') DEFAULT 'pending',
  FOREIGN KEY (product_id) REFERENCES products(id)
);














