import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import '../styles/UserAuth.css';

export default function UserSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    // For customer sign-in require an email-style identifier containing '@'
    if (!email.includes('@')) {
      setError('Please enter a valid email address (must include @)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // pass raw identifier (email or username) to central login logic — AuthProvider will normalize/fallback
      await login(email, password);
      navigate('/customer/merchants');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Sign in failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="user-auth-page">
      <div className="user-auth-container">
        <div className="user-auth-box">
          <h1>Customer Sign In</h1>
          <p className="user-auth-subtitle">Welcome back! Sign in to your account</p>

          {error && <div className="user-auth-error">{error}</div>}

          <form onSubmit={handleSignIn}>
            <div className="user-auth-input-group">
              <label htmlFor="email">Email or Username</label>
              <input
                id="email"
                type="text"
                placeholder="you@example.com or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="user-auth-input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="user-auth-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="user-auth-footer">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="user-auth-link"
                onClick={() => navigate('/user-signup')}
              >
                Sign Up
              </button>
            </p>
            <button
              type="button"
              className="user-auth-link"
              onClick={() => navigate('/daily-needs')}
            >
              ← Back to Home
            </button>
          </div>
        </div>

        <div className="user-auth-image">
          <div className="user-auth-image-content">
            <div className="greeting">🛒</div>
            <h2>Shop Fresh Groceries</h2>
            <p>Browse local merchants and get quality products at great prices</p>
          </div>
        </div>
      </div>
    </div>
  );
}
