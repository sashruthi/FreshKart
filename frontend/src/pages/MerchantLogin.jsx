import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthProvider";
import "../styles/MerchantLogin.css";

export default function MerchantLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await login(username, password);
      navigate("/merchant-mode");
    } catch (err) {
      alert("Invalid merchant credentials");
    }
  }

  return (
    <div className="ml-page">
      <form className="ml-card" onSubmit={handleLogin}>
        <h1>Merchant Login</h1>
        <p className="ml-sub">Sign in to manage your store</p>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
