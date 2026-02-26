import React from "react";
import { useNavigate } from "react-router-dom";
import { capitalize } from "../utils/format";
import "../styles/Merchants.css";

export default function InventoryShops() {
  const navigate = useNavigate();

  const shops = [
    { id: 1, name: "Fresh Mart", type: "grocery" },
    { id: 2, name: "Daily Needs", type: "grocery" },
    { id: 3, name: "Nut House", type: "nuts" },
    { id: 4, name: "Dry Fruit World", type: "nuts" }
  ];

  return (
    <div className="merchant-page">
      <h1 className="merchant-title">Inventory Shops</h1>

      <div className="merchant-grid">
        {shops.map((s) => (
          <div key={s.id} className={`merchant-card ${s.type}`}>
            <h3>{s.name}</h3>
            <p>{capitalize(s.type)}</p>

            <button onClick={() => navigate(`/merchant-inventory/${s.id}`)}>
              Manage
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
