-- Initialization SQL for grocery_system
DROP DATABASE IF EXISTS grocery_system;
CREATE DATABASE grocery_system;


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
  stock INT DEFAULT 50,
  active TINYINT(1) DEFAULT 1,
  image_location VARCHAR(255) DEFAULT NULL,
  merchant_id INT,
  unit VARCHAR(16) DEFAULT 'pcs',
  gst_percent DECIMAL(5,2) DEFAULT 0.00,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);


-- Sample products for merchants (categories: oil, ghee, masalas, dhal, biscuits, tea, coffee)
INSERT INTO products (name, category, price, merchant_id) VALUES
('Cooking Oil', 'oil', 120.00, 1),
('Pure Ghee', 'ghee', 250.00, 1),
('Masala Mix', 'masalas', 80.00, 1),
('Toor Dhal', 'dhal', 100.00, 1),
('Crunchy Biscuits', 'biscuits', 40.00, 1),
('Tea Leaves', 'tea', 200.00, 1),
('Ground Coffee', 'coffee', 300.00, 1),

-- daily needs products
('Everyday Oil', 'oil', 110.00, 2),
('Instant Tea', 'tea', 150.00, 2);

-- additional grocery items for Fresh Mart
INSERT INTO products (name, category, price, merchant_id) VALUES
('Sugar', 'sugar', 45.00, 1),
('Salt', 'salt', 20.00, 1),
('Potato Chips', 'snacks', 30.00, 1);

-- More varieties for Fresh Mart (oils, dals, masalas, biscuits, tea/coffee, snacks)
INSERT INTO products (name, category, price, merchant_id) VALUES
('Sunflower Oil', 'oil', 130.00, 1),
('Mustard Oil', 'oil', 140.00, 1),
('Olive Oil', 'oil', 450.00, 1),
('Soyabean Oil', 'oil', 115.00, 1),
('Groundnut Oil', 'oil', 160.00, 1),

('Cow Ghee', 'ghee', 320.00, 1),
('Buffalo Ghee', 'ghee', 340.00, 1),

('Turmeric Powder', 'masalas', 90.00, 1),
('Chili Powder', 'masalas', 70.00, 1),
('Garam Masala', 'masalas', 120.00, 1),
('Coriander Powder', 'masalas', 60.00, 1),

('Moong Dal', 'dhal', 95.00, 1),
('Masoor Dal', 'dhal', 85.00, 1),
('Urad Dal', 'dhal', 110.00, 1),
('Chana Dal', 'dhal', 75.00, 1),

('Marie Biscuits', 'biscuits', 30.00, 1),
('Cream Biscuits', 'biscuits', 45.00, 1),
('Glucose Biscuits', 'biscuits', 35.00, 1),

('Green Tea', 'tea', 220.00, 1),
('Black Tea', 'tea', 180.00, 1),
('Instant Coffee', 'coffee', 260.00, 1),
('Coffee Beans', 'coffee', 400.00, 1),

('Namkeen', 'snacks', 50.00, 1),
('Roasted Peanuts', 'snacks', 55.00, 1);

-- nuts / dry fruits
INSERT INTO products (name, category, price, merchant_id) VALUES
('Almonds', 'dryfruits', 800.00, 3),
('Cashews', 'dryfruits', 900.00, 4);



CREATE TABLE cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  product_id INT,
  quantity INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY unique_cart_item (user_id, product_id)
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

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT,
  price_at_purchase DECIMAL(10,2),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  message VARCHAR(255),
  status ENUM('pending','resolved') DEFAULT 'pending',
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Example seed users (passwords are plaintext here — replace with hashed values in production)
INSERT INTO users (name, username, password, phone, role) VALUES
('Ravi', 'ravi', 'password123', '9876543210', 'customer'),
('Anu', 'anu', 'password123', '9876543211', 'customer'),
('FreshMart Owner', 'fm_owner', 'password123', '9999999999', 'merchant'),
('Inventory Manager', 'inv_manager', 'password123', '8888888888', 'inventory'),
('Wholesaler', 'wholesaler', 'password123', '7777777777', 'wholesaler');
