import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthProvider";
import "../styles/Login.css";

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get('role');

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      setMessage("Please enter email and password");
      return;
    }

    try {
      await login(email, password);
      setMessage(null);
      if (role === 'customer') navigate('/customer/merchants')
      else navigate('/select-role');
    } catch (err) {
      setMessage(err.response?.data?.error || err.response?.data?.message || err.message || "Login failed");
    }
  }

  async function handleSignup(e) {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      setMessage("Fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const username = email.includes("@") ? email.split("@")[0] : email;

      await api.post("/signup", { username, password });
      await login(username, password);
      if (role === 'customer') navigate('/customer/merchants')
      else navigate('/select-role');
    } catch (err) {
      setMessage(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Signup failed"
      );
    }
  }

  return (
    <div className="login-page">
      <h1 className="welcome-text"></h1>

      <div className="login-box">
        <h2>{isSignup ? "Signup" : "Login"}</h2>

        <form onSubmit={isSignup ? handleSignup : handleLogin}>
          <input
            type="text"
            placeholder="Email or Username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {isSignup && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          <button type="submit">
            {isSignup ? "Signup" : "Login"}
          </button>
        </form>

        <p
          className="toggle-text"
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage(null);
          }}
        >
          {isSignup
            ? "Already have an account? Login"
            : "Don't have an account? Signup"}
        </p>

        {message && <p className="error-text">{message}</p>}
      </div>
    </div>
  );
}
