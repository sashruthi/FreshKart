import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthProvider';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    async function loadOrders() {
      try {
        setLoading(true);
        const res = await api.get(`/user/${user.id}/orders`);
        setOrders(res.data || []);
      } catch (err) {
        console.error('Failed to load orders:', err);
        setError('Failed to load order history');
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [user, navigate]);

  const sortedOrders = useMemo(() => {
    const arr = Array.isArray(orders) ? [...orders] : [];
    arr.sort((a, b) => {
      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
    return arr;
  }, [orders, sortOrder]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const downloadReceipt = async (order) => {
    try {
      const res = await api.get(`/order/${order.id}/items`);
      const items = res.data || [];
      if (items.length === 0) {
        alert("No items found for this order.");
        return;
      }

      const shopName = items[0]?.merchant_name || 'Fresh Mart';
      const orderDate = new Date(order.created_at).toLocaleDateString();

      // Calculate totals
      let subtotal = 0;
      let totalGst = 0;
      const rowsHtml = items.map((it, idx) => {
        const gstRate = Number(it.gst_percent) || 0;
        const price = Number(it.price) || 0; // Inclusive price
        const qty = Number(it.quantity || 0);

        const lineTotal = price * qty;
        const lineNetTotal = Math.round((lineTotal / (1 + gstRate / 100)) * 100) / 100;
        const lineGstTotal = Math.round((lineTotal - lineNetTotal) * 100) / 100;
        const basePrice = qty > 0 ? lineNetTotal / qty : 0;

        subtotal += lineNetTotal;
        totalGst += lineGstTotal;

        return `
          <tr style="border-bottom: 1px solid #f3f3f3">
            <td style="padding: 8px">${idx + 1}</td>
            <td style="padding: 8px">${it.name}</td>
            <td style="padding: 8px; text-align: right">₹${basePrice.toFixed(2)}</td>
            <td style="padding: 8px; text-align: center">${qty}</td>
            <td style="padding: 8px; text-align: center">${gstRate.toFixed(2)}%</td>
            <td style="padding: 8px; text-align: right">₹${lineGstTotal.toFixed(2)}</td>
            <td style="padding: 8px; text-align: right">₹${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const finalTotal = subtotal + totalGst;

      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt IN-${order.id}</title>
  <style>
    body { padding: 40px; font-family: 'Courier New', monospace; background: #f9f9f9; }
    .receipt-card { background: #fff; padding: 30px; max-width: 800px; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; border-bottom: 1px solid #eee; }
    .header { text-align: center; margin-bottom: 30px; }
    .total-row { margin-top: 20px; text-align: right; font-size: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <h1 style="margin:0">${shopName}</h1>
      <p style="color:#666">Order Receipt</p>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:20px">
      <div>
        <strong>Order ID:</strong> IN-${order.id}<br>
        <strong>Date:</strong> ${orderDate}
      </div>
      <div style="text-align:right">
        <strong>Customer:</strong> ${user.name || user.username}<br>
        <strong>Address:</strong> ${order.address || 'N/A'}
      </div>
    </div>
    <table>
      <thead>
        <tr style="text-align:left">
          <th>#</th>
          <th>Item</th>
          <th style="text-align:right">Price</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:center">GST%</th>
          <th style="text-align:right">GST</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <div class="total-row">
      Total Paid: ₹${finalTotal.toFixed(2)}
    </div>
  </div>
</body>
</html>`;

      const element = document.createElement('div');
      element.innerHTML = html;

      const opt = {
        margin: 10,
        filename: `Receipt-${order.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Use html2pdf (global script loaded in index.html)
      window.html2pdf().from(element).set(opt).save();

    } catch (err) {
      console.error("Failed to download receipt", err);
      alert("Error generating receipt.");
    }
  };

  if (!user) {
    return <div className="profile-container"><p>Please login</p></div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
      </div>

      <div className="profile-card">
        <div className="profile-info">
          <h2> {user.name || user.username}</h2>
          <p className="profile-username">@{user.username}</p>
          {user.phone && <p className="profile-phone">📞 {formatPhone(user.phone)}</p>}
          <p className="profile-role">Role: <strong>{user.role}</strong></p>
        </div>

        <div className="profile-actions">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="orders-section">
        <div className="orders-header">
          <h3> Order History</h3>
          <div className="sort-controls">
            <label htmlFor="sortOrder">Sort:</label>
            <select id="sortOrder" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="status">Loading orders...</p>
        ) : error ? (
          <p className="status error">{error}</p>
        ) : orders.length === 0 ? (
          <div className="empty-orders">
            <p className="empty-title">No orders yet</p>
            <p className="empty-sub">Your order history will appear here once you place an order.</p>
            <button className="cta" onClick={() => navigate('/daily-needs')}>Start shopping</button>
          </div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date & Time</th>
                  <th>Amount</th>
                  <th>Delivery Status</th>
                  <th>Address</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map(order => {
                  const orderDate = order.created_at ? new Date(order.created_at) : null;
                  const date = formatDateTime(orderDate);
                  const status = normalizeStatus(order);
                  const address = tidyAddress(order.address);
                  const phone = formatPhone(order.phone);

                  return (
                    <tr key={order.id}>
                      <td className="order-id">#{order.id}</td>
                      <td>{date}</td>
                      <td>₹{order.total_amount ? Number(order.total_amount).toFixed(2) : '0.00'}</td>
                      <td><span className={`status-chip status-${status.toLowerCase()}`}>{status}</span></td>
                      <td className="address">{address}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="download-receipt-btn"
                          onClick={() => downloadReceipt(order)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            background: '#0c831f',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Downalod Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Helpers
function formatDateTime(d) {
  if (!d || !(d instanceof Date) || isNaN(d)) return 'Unknown';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

function formatPhone(p) {
  if (!p) return 'Not provided';
  const digits = String(p).replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    // Indian local format: +91 XXXXX XXXXX
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    return `+91 ${digits.slice(1, 6)} ${digits.slice(6)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  // fallback: show cleaned
  return digits ? `+${digits}` : 'Not provided';
}

function tidyAddress(addr) {
  if (!addr) return 'Address not provided';
  const s = String(addr).trim();
  const lower = s.toLowerCase();
  // common garbage/placeholder checks
  if (!s || lower === 'n/a' || lower === 'na' || lower === 'none' || lower.includes('null') || lower.includes('undefined') || /^0+$/.test(s)) {
    return 'Address not provided';
  }
  // if address is too short or looks like coordinates, treat as missing
  if (s.length < 10 || /^[0-9.,\-\s]+$/.test(s)) return 'Address not provided';
  return s;
}

function normalizeStatus(order) {
  const raw = (order.status || '').toString().toLowerCase();
  if (raw.includes('deliv') || raw === 'delivered' || order.delivered) return 'Delivered';
  if (raw.includes('cancel') || raw === 'cancelled' || raw === 'canceled' || order.cancelled) return 'Cancelled';
  return 'Pending';
}
