import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect logged-in users based on their role
  React.useEffect(() => {
    if (user) {
      if (user.role === 'merchant' || user.role === 'owner') {
        navigate('/merchant-mode');
      } else if (user.role === 'customer') {
        navigate('/customer/merchants');
      }
    }
  }, [user, navigate]);

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-hero">
          <h1>Fresh Mart</h1>
          <p className="home-tagline">Your neighborhood grocery store, online</p>
        </div>
      </div>

      <div className="home-container">
        <div className="home-portals">
          {/* Customer Portal */}
          <div className="portal-card customer-portal">
            <div className="portal-icon">🛒</div>
            <h2>Customer</h2>
            <p className="portal-desc">Browse merchants and shop for fresh groceries</p>
            <div className="portal-buttons">
              <button
                className="portal-btn sign-in"
                onClick={() => navigate('/user-signin')}
              >
                Sign In
              </button>
              <button
                className="portal-btn sign-up"
                onClick={() => navigate('/user-signup')}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Owner Portal */}
          <div className="portal-card owner-portal">
            <div className="portal-icon">👨‍💼</div>
            <h2>Merchant Owner</h2>
            <p className="portal-desc">Manage your store and inventory</p>
            <div className="portal-buttons">
              <button
                className="portal-btn merchant-login"
                onClick={() => navigate('/merchant-login')}
              >
                Merchant Login
              </button>
            </div>
          </div>

          {/* Admin Portal */}
          <div className="portal-card admin-portal">
            <div className="portal-icon">🔐</div>
            <h2>Website Owner</h2>
            <p className="portal-desc">Admin panel and system management</p>
            <p className="admin-note">Contact support for access</p>
          </div>
        </div>
      </div>

      <div className="home-footer">
        <p>&copy; 2024 Fresh Mart. All rights reserved.</p>
      </div>
    </div>
  );
}
