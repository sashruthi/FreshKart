import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import '../styles/Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <button
            className="header-logo"
            onClick={() => {
              if (user.role === 'customer') {
                navigate('/customer/merchants');
              } else if (user.role === 'merchant') {
                navigate('/merchant-mode');
              } else {
                navigate('/');
              }
            }}
          >
            🛒 Fresh Mart
          </button>
        </div>

        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user.name || user.username}</span>
            <span className="user-role">{user.role}</span>
          </div>

          <div className="user-menu">
            <button
              className={`menu-trigger ${location && (location.pathname.startsWith('/cart') || location.pathname === '/profile') ? 'active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="user-menu"
            >
              👤
            </button>

            {menuOpen && (
              <div className="menu-dropdown">
                {user.role === 'customer' && (
                  <>
                    <button
                      className="menu-item"
                      onClick={() => handleNavigation('/profile')}
                    >
                      📋 My Profile
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => handleNavigation('/cart')}
                    >
                      🛒 My Cart
                    </button>
                  </>
                )}

                {(user.role === 'merchant' || user.role === 'owner') && (
                  <>
                    <button
                      className="menu-item"
                      onClick={() => handleNavigation('/merchant-mode')}
                    >
                      🏪 My Store
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => handleNavigation('/inventory-shops')}
                    >
                      📦 Inventory
                    </button>
                  </>
                )}

                <div className="menu-divider" />

                <button
                  className="menu-item logout"
                  onClick={handleLogout}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
