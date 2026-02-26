import React, { useState } from "react";
import api from "../api";

export default function OwnerLogin() {
  const [open, setOpen] = useState(false);
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [merchants, setMerchants] = useState([]);
  const [showMerchantsList, setShowMerchantsList] = useState(false);
  const [loading, setLoading] = useState(false);

  // Signup form fields
  const [merchantUsername, setMerchantUsername] = useState("");
  const [merchantPassword, setMerchantPassword] = useState("");
  const [merchantMobile, setMerchantMobile] = useState("");
  const [merchantShopName, setMerchantShopName] = useState("");

  function handleOwnerLogin(e) {
    e.preventDefault();
    if (ownerUsername === "malligai" && ownerPassword === "kadai") {
      localStorage.setItem("ownerLoggedIn", "true");
      setLoggedIn(true);
      setOwnerUsername("");
      setOwnerPassword("");
    } else {
      alert("Invalid credentials");
    }
  }

  async function handleMerchantSignup(e) {
    e.preventDefault();
    if (!merchantUsername || !merchantPassword || !merchantMobile || !merchantShopName) {
      alert("All fields are required");
      return;
    }
    const normalizedMobile = String(merchantMobile || "").replace(/\s+/g, "");
    if (!/^\d{10}$/.test(normalizedMobile)) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/merchants", {
        name: merchantShopName,
        type: "grocery",
        username: merchantUsername,
        password: merchantPassword,
        mobile: normalizedMobile
      });
      alert(`Merchant "${merchantShopName}" created successfully!`);
      setShowSignupForm(false);
      setMerchantUsername("");
      setMerchantPassword("");
      setMerchantMobile("");
      setMerchantShopName("");
      setLoggedIn(false);
      setOpen(false);
    } catch (err) {
      console.error("Merchant creation error:", err);
      alert(err?.response?.data?.error || "Failed to create merchant");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setLoggedIn(false);
    setShowSignupForm(false);
    localStorage.removeItem("ownerLoggedIn");
  }

  function handleClose() {
    setOpen(false);
    handleLogout();
  }

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
      {/* Collapsed icon button */}
      {!open && (
        <button
          aria-label="open-owner-login"
          onClick={() => {
            setOpen(true);
            setLoggedIn(localStorage.getItem("ownerLoggedIn") === "true");
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            border: 'none',
            background: '#ffffffee',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="7" width="18" height="13" rx="2" stroke="#333" strokeWidth="1.2"/>
            <path d="M7 7V6a5 5 0 0110 0v1" stroke="#333" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            width: 260,
            background: '#ffffffcc',
            backdropFilter: 'blur(4px)',
            padding: 10,
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>Website Owner</h4>
            <button
              aria-label="close-owner-login"
              onClick={() => handleClose()}
              style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {!loggedIn && !showSignupForm && (
          <form onSubmit={handleOwnerLogin}>
            <input
              aria-label="owner-username"
              placeholder="Username"
              value={ownerUsername}
              onChange={(e) => setOwnerUsername(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
            />

            <input
              aria-label="owner-password"
              placeholder="Password"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
            />

            <button
              type="submit"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: 'none', background: '#0b74de', color: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              Login
            </button>
          </form>
          )}

          {loggedIn && !showSignupForm && (
            <div>
              <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#333' }}>Owner logged in successfully!</p>
              <button
                onClick={() => setShowSignupForm(true)}
                style={{ width: '100%', padding: 8, marginBottom: 6, borderRadius: 4, border: 'none', background: '#0bde9b', color: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                Create New Merchant
              </button>
              <button
                onClick={async () => {
                  try {
                    const mres = await api.get('/merchants');
                    const list = Array.isArray(mres.data) ? mres.data : [];
                    setMerchants(list);
                    setShowMerchantsList(true);
                  } catch (err) {
                    console.error('failed to fetch merchants', err);
                    alert('Could not retrieve merchants list');
                  }
                }}
                style={{ width: '100%', padding: 8, marginBottom: 6, borderRadius: 4, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                Delete Merchant
              </button>
              <button
                onClick={handleLogout}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', background: 'transparent', color: '#333', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                Logout
              </button>
            </div>
          )}

          {showSignupForm && (
            <form onSubmit={handleMerchantSignup}>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#333' }}>Create New Merchant Shop</p>
              <input
                aria-label="merchant-username"
                placeholder="Merchant Username"
                value={merchantUsername}
                onChange={(e) => setMerchantUsername(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <input
                aria-label="merchant-password"
                placeholder="Password"
                type="password"
                value={merchantPassword}
                onChange={(e) => setMerchantPassword(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <input
                aria-label="merchant-mobile"
                placeholder="Mobile Number"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={merchantMobile}
                onChange={(e) => setMerchantMobile(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <input
                aria-label="merchant-shopname"
                placeholder="Shop Name"
                value={merchantShopName}
                onChange={(e) => setMerchantShopName(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: 8, marginBottom: 6, borderRadius: 4, border: 'none', background: '#0b74de', color: '#fff', cursor: 'pointer', boxSizing: 'border-box', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "Creating..." : "Sign Up"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignupForm(false);
                  setMerchantUsername("");
                  setMerchantPassword("");
                  setMerchantMobile("");
                  setMerchantShopName("");
                }}
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', background: 'transparent', color: '#333', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                Back
              </button>
            </form>
          )}
          {showMerchantsList && (
            <div style={{ marginTop: 10, maxHeight: 220, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#333' }}><strong>Merchants</strong></p>
              {merchants.length === 0 ? (
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>No merchants found</p>
              ) : (
                merchants.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f1f1' }}>
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: '600' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>id: {m.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete merchant "${m.name}" (id: ${m.id})? This will remove merchant and its products.`)) return;
                          try {
                            await api.delete(`/merchants/${m.id}`);
                            setMerchants(prev => prev.filter(x => x.id !== m.id));
                            alert('Merchant deleted');
                          } catch (err) {
                            console.error('delete merchant error', err);
                            alert(err?.response?.data?.error || err.message || 'Failed to delete merchant');
                          }
                        }}
                        style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowMerchantsList(false)} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', background: 'transparent', color: '#333', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
