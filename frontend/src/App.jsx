import React from "react"; // ✅ THIS LINE FIXES THE ERROR

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import UserSignIn from "./pages/UserSignIn";
import UserSignUp from "./pages/UserSignUp";
import SelectRole from "./pages/SelectRole";
import MerchantLogin from "./pages/MerchantLogin";
import MerchantMode from "./pages/MerchantMode";
import Merchants from "./pages/Merchants";
import MerchantView from "./pages/MerchantView";
import InventoryShops from "./pages/InventoryShops";
import MerchantInventory from "./pages/MerchantInventory";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Receipt from "./pages/Receipt";
import Profile from "./pages/Profile";
import DailyNeedsView from "./pages/DailyNeedsView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing & Auth */}
        <Route path="/" element={<SelectRole />} />
        <Route path="/home" element={<Home />} />

        {/* CUSTOMER FLOW */}
        <Route path="/login" element={<Login />} />
        <Route path="/user-signin" element={<UserSignIn />} />
        <Route path="/user-signup" element={<UserSignUp />} />
        <Route path="/customer/merchants" element={<Merchants role="customer" />} />
        <Route path="/merchant/:id" element={<MerchantView />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/receipt" element={<Receipt />} />
        <Route path="/daily-needs" element={<DailyNeedsView />} />

        {/* MERCHANT OWNER FLOW */}
        <Route path="/merchant-login" element={<MerchantLogin />} />
        <Route path="/merchant/available" element={<Merchants role="merchant" />} />
        <Route path="/merchant-mode" element={<MerchantMode />} />
        <Route path="/inventory-shops" element={<InventoryShops />} />
        <Route path="/merchant-inventory/:id" element={<MerchantInventory />} />
      </Routes>
    </BrowserRouter>
  );
}
