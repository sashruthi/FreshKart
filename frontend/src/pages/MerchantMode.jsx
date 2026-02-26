import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import "../styles/MerchantMode.css";

export default function MerchantMode() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="mm-page">
      <h1 className="mm-title">Merchant Mode</h1>

      {/* user display removed */}

      <div className="mm-cards">
        <div
          className="mm-card"
          onClick={() => navigate("/inventory-shops")}
        >
          <h3>Inventory</h3>
          <p>Manage products, stock and pricing</p>
        </div>

        <button 
          onClick={() => navigate("/select-role")}
          style={{
            padding: '12px 20px',
            marginTop: '20px',
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '300px'
          }}
        >
          ← Back to Role Selection
        </button>
      </div>
    </div>
  );
}
