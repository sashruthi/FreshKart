import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthProvider';
import '../styles/UserAuth.css';

export default function UserSignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSignUp(e) {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const username = email.includes('@') ? email.split('@')[0] : email;

      // Sign up user
      await api.post('/signup', {
        username,
        password,
      });

      setSuccess('Account created successfully! Signing you in...');

      // Auto-login after signup
      setTimeout(async () => {
        try {
          await login(username, password);
          navigate('/customer/merchants');
        } catch (loginErr) {
          setError('Account created, but sign in failed. Please try signing in manually.');
          setTimeout(() => navigate('/user-signin'), 2000);
        }
      }, 1000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Sign up failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="user-auth-page">
      <div className="user-auth-container">
        <div className="user-auth-box">
          <h1>Create Your Account</h1>
          <p className="user-auth-subtitle">Join Fresh Mart and start shopping</p>

          {error && <div className="user-auth-error">{error}</div>}
          {success && <div className="user-auth-success">{success}</div>}

          <form onSubmit={handleSignUp}>
            <div className="user-auth-input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <small>Username will be created from your email</small>
            </div>

            <div className="user-auth-input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <small>At least 6 characters</small>
            </div>

            <div className="user-auth-input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="user-auth-btn"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="user-auth-footer">
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="user-auth-link"
                onClick={() => navigate('/user-signin')}
              >
                Sign In
              </button>
            </p>
            <button
              type="button"
              className="user-auth-link"
              onClick={() => navigate('/select-role')}
            >
              ← Back to Home
            </button>
          </div>
        </div>

        <div className="user-auth-image">
          <div className="user-auth-image-content">
            <div className="greeting">✨</div>
            <h2>Get Started Today</h2>
            <p>Access fresh groceries from local merchants with just a few clicks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
