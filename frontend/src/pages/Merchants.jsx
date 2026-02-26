import React, { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthProvider";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { capitalize } from "../utils/format";
import "../styles/Merchants.css";

export default function Merchants({ role = "customer" }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [authMerchantId, setAuthMerchantId] = useState(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get("/merchants");
        if (!cancelled) {
          setMerchants(res.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data || err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = merchants.reduce((acc, m) => {
    const type = m.type || "other";
    acc[type] = acc[type] || [];
    acc[type].push(m);
    return acc;
  }, {});

  if (loading)
    return <p className="merchant-status">Loading merchants…</p>;

  if (error)
    return (
      <p className="merchant-status error">
        Failed to load merchants
      </p>
    );

  const title = role === "merchant"
    ? "Select Merchant to Manage Inventory"
    : "Browse Merchants";

  const isCustomer = role === "customer";
  const isMerchant = role === "merchant";
  const showHeader = false;

  return (
    <>
      {showHeader && <Header />}
      <div className="merchant-page">
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>

        <h1 className="merchant-title">{title}</h1>

        {Object.keys(grouped).map((type) => (
          <div key={type} className="merchant-section">
            <h2 className="category-title">
              {type === "nuts" ? "Dry Fruits" : capitalize(type)}
            </h2>

            <div className="merchant-grid">
              {grouped[type].map((m) => (
                <div
                  key={m.id}
                  className={`merchant-card ${type}`}
                >
                  <h3>{m.name}</h3>
                  <p>{capitalize(m.type)}</p>

                  <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                    {isCustomer && (
                      <button
                        onClick={() => navigate(`/merchant/${m.id}`)}
                        style={{ backgroundColor: '#4CAF50', color: 'white' }}
                      >
                        View Products
                      </button>
                    )}

                    {isMerchant && (
                      <button
                        onClick={() => setAuthMerchantId(m.id)}
                        style={{ backgroundColor: '#2196F3', color: 'white' }}
                      >
                        Manage Inventory
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* MERCHANT AUTHENTICATION MODAL */}
        {authMerchantId && (
          <div className="merchant-modal-overlay" onClick={() => { setAuthMerchantId(null); setAuthError(null); }}>
            <div className="merchant-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 360 }}>
              <h3>Authenticate as Merchant</h3>
              <p>Enter your merchant credentials to manage inventory.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setAuthLoading(true);
                setAuthError(null);
                try {
                  const user = await login(identifier, password);
                  if (!user || user.role !== 'merchant') {
                    setAuthError('Not authorized as merchant. Please use merchant credentials.');
                  } else {
                    // Successfully authenticated
                    navigate(`/merchant-inventory/${authMerchantId}`);
                    setAuthMerchantId(null);
                    setIdentifier('');
                    setPassword('');
                  }
                } catch (err) {
                  setAuthError(err.response?.data?.error || err.message || 'Authentication failed');
                } finally {
                  setAuthLoading(false);
                }
              }}>
                <input
                  placeholder="Username or email"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                {authError && <p style={{ color: 'red', fontSize: '14px' }}>{authError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="submit"
                    disabled={authLoading}
                    style={{ flex: 1, backgroundColor: '#2196F3', color: 'white' }}
                  >
                    {authLoading ? 'Verifying…' : 'Access Inventory'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMerchantId(null); setAuthError(null); }}
                    style={{ flex: 1, backgroundColor: '#666', color: 'white' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
