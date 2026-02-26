import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthProvider";
import "../styles/Checkout.css";

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [addressError, setAddressError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Load cart */
  useEffect(() => {
    if (state?.items?.length) {
      setItems(state.items);
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadCart() {
      setLoading(true);
      try {
        const res = await api.get(`/cart/${user.id}`);
        if (!cancelled) setItems(res.data || []);
      } catch (err) {
        console.error("load cart for checkout", err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCart();
    return () => (cancelled = true);
  }, [user, state]);

  /* Autofill name */
  useEffect(() => {
    if (user?.username) setName(user.username);
  }, [user]);

  async function handleConfirm(e) {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !phone.trim()) {
      return alert("Please fill all delivery details");
    }

    if (address.trim().length < 10) {
      return alert("Please enter a valid address (at least 10 characters)");
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return alert("Please enter a valid 10-digit phone number");
    }

    setSubmitting(true);

    const order = {
      user_id: user.id,
      name,
      address: address.trim(),
      phone: phone.trim(),
      items
    };

    try {
      await api.post("/orders", order);

      const totalCents = items.reduce((sum, it) => {
        const priceCents = Math.round(Number(it.price) * 100);
        return sum + priceCents * Number(it.quantity || 0);
      }, 0);

      // Generate sequential bill number
      let billCounter = localStorage.getItem('billCounter');
      billCounter = billCounter ? parseInt(billCounter) + 1 : 1;
      localStorage.setItem('billCounter', billCounter);

      const receiptData = {
        items: items,
        total: totalCents / 100,
        date: new Date().toISOString(),
        orderId: billCounter,
        user: user,
        name: name,
        address: address,
        phone: phone,
        merchantId: state?.merchantId || items[0]?.merchant_id
      };

      console.log('Navigating to receipt with data:', receiptData);

      navigate("/receipt", { state: receiptData });
    } catch (err) {
      console.warn("order api failed", err);
      alert("Order confirmed locally. Server not reachable.");
      navigate("/daily-needs");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user)
    return <p className="checkout-status">Please login to continue.</p>;

  if (loading)
    return <p className="checkout-status">Loading checkout…</p>;

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        <h1 className="checkout-title">Checkout</h1>

        {items.length === 0 ? (
          <p className="checkout-empty">Your cart is empty.</p>
        ) : (
          <form className="checkout-form" onSubmit={handleConfirm}>
            <h3>Delivery Details</h3>

            <input
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <textarea
              placeholder="Location / Address"
              value={address}
              maxLength={500}
              onChange={e => {
                const val = e.target.value;
                setAddress(val);
                if (val.trim().length > 0 && val.trim().length < 10) setAddressError('Address should be at least 10 characters');
                else setAddressError('');
              }}
            />
            {addressError && <div className="field-error">{addressError}</div>}

            <input
              placeholder="Phone Number"
              value={phone}
              maxLength={10}
              onChange={e => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setPhone(val);
                  if (val.length > 0 && val.length !== 10) setPhoneError('Phone must be 10 digits');
                  else setPhoneError('');
                }
              }}
            />
            {phoneError && <div className="field-error">{phoneError}</div>}

            <button
              type="submit"
              disabled={submitting || !!phoneError || !!addressError || !name.trim()}
              className="confirm-btn"
            >
              {submitting ? "Confirming…" : "Confirm Order"}
            </button>
          </form>
        )}

        {/* BACK BUTTON */}
        <button
          className="checkout-back"
          onClick={() => navigate("/cart", { state: { items, merchantId: state?.merchantId } })}
        >
          ← Back to Cart
        </button>
      </div>
    </div>
  );
}
