#  Grocery App - Full Stack E-Commerce Platform

A comprehensive full-stack grocery management and shopping platform built with **React**, **Node.js**, and **MySQL**. This application features a dual-role system (Merchant and Customer) with real-time stock management, secure authentication, and a sleek user interface.

---

##  Key Features

###  Merchant Dashboard
*   **Inventory Management**: Full CRUD operations for products (Add, Edit, Delete, Toggle Active).
*   **Stock Tracking**: Real-time stock updates and low-stock indicators.
*   **Sales Insights**: Manager statistics including daily sales data and product performance.
*   **Product Media**: Integrated image upload functionality for product listings.
*   **Secure Authentication**: Merchant-specific login and registration flow.

###  Customer Experience
*   **Merchant Directory**: Browse and select from various local merchants.
*   **Product Catalog**: View products by category with real-time availability.
*   **Dynamic Cart**: Add, update, and remove items with instant total calculations.
*   **Seamless Checkout**: Integrated checkout flow with address and contact management.
*   **Order History**: View past receipts and profile details.

###  Core Infrastructure
*   **Dual Authentication**: Role-based access control (RBAC) using JWT (JSON Web Tokens).
*   **Inventory Integrity**: Atomic stock reservations to prevent overselling.
*   **Secure Logic**: Password hashing with Bcrypt.js.
*   **Static Assets**: Local image storage and serving for product visuals.

---

##  Tech Stack

### Frontend
- **React (18.2.0)** - UI Component Library
- **Vite** - Build Tool & Dev Server
- **React Router** - Single Page Application Navigation
- **Axios** - API Communication
- **CSS3** - Custom Responsive Styling

### Backend
- **Node.js & Express** - Server Environment & Web Framework
- **MySQL** - Relational Database
- **JWT** - Secure Authentication
- **Bcrypt.js** - Data Security
- **Multer** - File Upload Handling

---

##  Getting Started

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v14 or higher)
*   [MySQL Server](https://www.mysql.com/)

### 2. Database Setup
1. Open your MySQL terminal or workbench.
2. Create the database:
   ```sql
   CREATE DATABASE grocery_system;
   ```
3. Import the schema from `Backend/init_db.sql`:
   ```bash
   mysql -u root -p grocery_system < Backend/init_db.sql
   ```

### 3. Backend Configuration
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update `db.js` with your MySQL credentials:
   ```javascript
   const db = mysql.createConnection({
     host: "localhost",
     user: "your_user",
     password: "your_password",
     database: "grocery_system"
   });
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 4. Frontend Configuration
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

##  Project Structure

```text
grocery_app/
├── Backend/              # Node.js/Express Server
│   ├── routes.js         # API Endpoints
│   ├── server.js         # Entry Point
│   ├── db.js             # Database Connection
│   └── init_db.sql       # Database Schema
├── frontend/             # Vite/React Frontend
│   ├── src/
│   │   ├── pages/        # Route Components (Login, Cart, MerchantView, etc.)
│   │   ├── components/   # Reusable UI Elements
│   │   └── App.jsx       # Main Routing Logic
│   └── public/           # Static Assets
└── scripts/              # Utility Scripts
```

## Screen shots 
![image alt](https://github.com/sashruthi/fileorgnizer/blob/df7a65acb066dd24689f502d4efcee35d295e6c8/Screenshot%202025-11-28%20143456.png)
![image alt](https://github.com/sashruthi/fileorgnizer/blob/df7a65acb066dd24689f502d4efcee35d295e6c8/Screenshot%202025-11-28%20143509.png)
![image alt](https://github.com/sashruthi/fileorgnizer/blob/df7a65acb066dd24689f502d4efcee35d295e6c8/Screenshot%202025-11-28%20143602.png)
![image alt](https://github.com/sashruthi/fileorgnizer/blob/df7a65acb066dd24689f502d4efcee35d295e6c8/Screenshot%202025-11-28%20143608.png)
