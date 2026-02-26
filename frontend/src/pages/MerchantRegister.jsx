import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Merchants.css";

export default function MerchantRegister() {
  const [name, setName] = useState("");
  const [type, setType] = useState("grocery");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/merchants', { name, type });
      alert('Merchant created successfully');
      navigate('/merchants');
    } catch (err) {
      console.error('merchant create error', err);
      alert(err?.response?.data?.error || 'Failed to create merchant');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="merchant-page">
      <div className="merchant-section" style={{ maxWidth: 520, margin: '40px auto', background: '#fff', padding: 20, borderRadius: 8 }}>
        <h2>Register New Merchant</h2>
        <p>Provide basic details to add a new merchant to the platform.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Merchant display name" value={name} onChange={(e) => setName(e.target.value)} required />

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            Type:
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="grocery">Grocery</option>
              <option value="nuts">Nuts / Dryfruits</option>
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Merchant'}</button>
            <button type="button" onClick={() => navigate('/merchants')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
