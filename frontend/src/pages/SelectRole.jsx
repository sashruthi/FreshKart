import React from "react";
import OwnerLogin from "../components/OwnerLogin";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import "../styles/SelectRole.css";

export default function SelectRole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  

  return (
    <div className="role-page">
      <OwnerLogin />
      <h1 className="role-title">Select Your Role</h1>

      <div className="role-card-container">
        {/* CUSTOMER FLOW */}
        <div
          className="role-card customer"
          onClick={() => navigate(`/login?role=customer`)}
        >
          
          <h3>Customer</h3>
          <p>Browse merchants & buy products</p>
        </div>

        {/* MERCHANT OWNER FLOW */}
        <div
          className="role-card merchant"
          onClick={() => navigate('/merchant/available')}
        >
          <h3>Merchant Owner</h3>
          <p>Manage store & inventory</p>
        </div>
      </div>

      
    </div>
  );
}
