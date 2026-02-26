

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthProvider";
import "../styles/Merchants.css";
import "../styles/Merchants.css";
import { formatUnitAmount, formatUnitDisplay, capitalize } from "../utils/format";

export default function MerchantInventory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", price: "", quantity: 10, unit: 'g', unit_amount: 1, gst_percent: 0, image_location: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [manageAuthorized, setManageAuthorized] = useState(false);
  const { login } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [editProduct, setEditProduct] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const alertedLowIds = useRef(new Set());


  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);


  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const [res, ares] = await Promise.all([
          api.get(`/products/${id}?includeInactive=1`),
          api.get(`/inventory/alerts?merchantId=${id}`)
        ]);

        if (!cancelled) {
          const productsData = res.data || [];
          setProducts(productsData);
          setAlerts(ares.data || []);

        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => (cancelled = true);
  }, [id]);

  // Alert once for products that drop below threshold (avoid repeated alerts)
  useEffect(() => {
    try {
      if (!products || products.length === 0) {
        // reset tracked alerts when no products
        alertedLowIds.current = new Set();
        return;
      }

      const low = products.filter(p => {
        const qty = Number(p.merchant_quantity ?? p.quantity ?? 0);
        return !isNaN(qty) && qty < 5;
      });

      if (low.length === 0) {
        // nothing low, clear previous tracked ids so future lows will alert
        if (alertedLowIds.current.size) alertedLowIds.current = new Set();
        return;
      }

      const lowIds = new Set(low.map(p => p.id));
      const newIds = [...lowIds].filter(id => !alertedLowIds.current.has(id));
      if (newIds.length > 0) {
        // Update tracked ids to current low set without popup
        alertedLowIds.current = lowIds;
      } else {
        // keep tracked set in sync (remove ids that no longer are low)
        if (alertedLowIds.current.size !== lowIds.size) alertedLowIds.current = lowIds;
      }
    } catch (e) {
      console.warn('low-stock alert effect error', e);
    }
  }, [products]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      let image_location_value = form.image_location && form.image_location.trim() ? form.image_location.trim() : null;


      if (!image_location_value && file) {
        const fd = new FormData();
        fd.append('image', file);
        const up = await api.post('/upload/product-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        image_location_value = up.data.filename;
      }

      const payload = {
        name: form.name,
        category: form.category || null,
        price: Number(form.price || 0),
        quantity: form.quantity ? Number(form.quantity) : 0,
        unit: form.unit || 'g',
        unit_amount: Number(form.unit_amount || 1),
        gst_percent: Number(form.gst_percent || 0),
        image_location: image_location_value || null
      };


      await api.post(`/merchants/${id}/products`, payload);


      const res = await api.get(`/products/${id}?includeInactive=1`);
      setProducts(res.data || []);
      // refresh alerts so low-stock alerts show up immediately in Manage mode
      try {
        const ares = await api.get(`/inventory/alerts?merchantId=${id}`);
        setAlerts(ares.data || []);
      } catch (e) {
        console.warn('failed to refresh alerts after create', e && e.message ? e.message : e);
      }


      setForm({ name: "", category: "", price: "", quantity: 10, unit: 'g', unit_amount: 1, gst_percent: 0, image_location: "" });
      setFile(null);
      if (preview) { URL.revokeObjectURL(preview); setPreview(null); }

      alert("Product created successfully!");
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(pid) {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${pid}`);
      setProducts(products.filter(p => p.id !== pid));
      const ares = await api.get(`/inventory/alerts?merchantId=${id}`);
      setAlerts(ares.data || []);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  async function handleSetActive(pid, active) {
    try {
      await api.put(`/products/${pid}/active`, { active });
      setProducts(prev => prev.map(p => p.id === pid ? { ...p, active: active ? 1 : 0 } : p));
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  async function handleRestock(productId, qty = 10) {
    try {
      await api.post('/inventory/restock', { product_id: productId, quantity: qty });
      const res = await api.get(`/products/${id}?includeInactive=1`);
      setProducts(res.data || []);
      const ares = await api.get(`/inventory/alerts?merchantId=${id}`);
      setAlerts(ares.data || []);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  async function handleReplenish(productId, qty = 50) {
    try {
      await api.post('/inventory/replenish', { product_id: productId, quantity: qty });
      const res = await api.get(`/products/${id}?includeInactive=1`);
      setProducts(res.data || []);
      const ares = await api.get(`/inventory/alerts?merchantId=${id}`);
      setAlerts(ares.data || []);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  function resolveImage(p) {
    if (p && p.image_location) {
      const v = p.image_location;
      return v.startsWith('http') ? v : `/products/${v}`;
    }
    return '/products/default.jpg';
  }

  if (loading) return <p className="merchant-status">Loading inventory…</p>;
  if (error) return <p className="merchant-status error">Failed: {JSON.stringify(error)}</p>;

  return (
    <div className="merchant-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <h1 className="merchant-title">Manage Inventory</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#ddd' }}>{(manageMode && manageAuthorized) ? 'Manage mode' : 'View mode'}</span>
          <button
            onClick={() => navigate('/merchant/available')}
            style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}
          >
            Exit Inventory
          </button>
          <button onClick={() => {
            if (manageMode) {
              setManageMode(false); setManageAuthorized(false);
            } else {
              setShowAuthModal(true);
            }
          }} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: (manageMode && manageAuthorized) ? '#e67e22' : '#2ecc71', color: '#fff', cursor: 'pointer' }}>
            {(manageMode && manageAuthorized) ? 'Exit Manage' : 'Manage'}
          </button>

          {manageMode && manageAuthorized && (
            <>
              <button onClick={async () => {
                setShowStatsModal(true);
                setStatsLoading(true);
                try {
                  const res = await api.get(`/merchants/${id}/manager-stats?date=${statsDate}`);
                  setStats(res.data);
                } catch (err) {
                  setStats({ error: err.response?.data?.error || err.message });
                } finally { setStatsLoading(false); }
              }} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#0b74de', color: '#fff', cursor: 'pointer' }}>
                Stats
              </button>
              <button onClick={async () => {
                if (!window.confirm('Are you sure you want to delete this merchant? All products and inventory will be permanently deleted.')) {
                  return;
                }
                try {
                  await api.delete(`/merchants/${id}`);
                  alert('Merchant deleted successfully');
                  window.location.href = '/select-role';
                } catch (err) {
                  alert(err.response?.data?.error || 'Failed to delete merchant');
                }
              }} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}>
                Delete Merchant
              </button>
            </>
          )}
        </div>
      </div>

      {manageMode && manageAuthorized && (
        <form className="inventory-form" onSubmit={handleCreate} style={{ marginBottom: 32 }}>
          <h3>Add New Product</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Product name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <input placeholder="Price (₹)" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
            <input placeholder="Initial stock" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ minWidth: 50, margin: 0, fontSize: 13 }}>Unit</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={{ width: 140, padding: 8 }}>
                <option value="g">g</option>
                <option value="litre">litre</option>
                <option value="kg">kg</option>
                <option value="gram">gram</option>
                <option value="packet">packet</option>
                <option value="tin">Tin</option>
                <option value="sippam">Sippam</option>
                <option value="mottai">Mottai</option>
              </select>

              <input placeholder="Qty" type="number" step="0.001" value={form.unit_amount} onChange={e => setForm({ ...form, unit_amount: e.target.value })} style={{ width: 90, padding: 8 }} />

              <label style={{ minWidth: 50, margin: 0, fontSize: 13 }}>GST %</label>
              <input type="number" step="0.01" value={form.gst_percent} onChange={e => setForm({ ...form, gst_percent: e.target.value })} style={{ width: 100, padding: 8 }} />
            </div>

            <label style={{ fontSize: 12, color: '#666' }}>Optional: Provide Image URL or Upload File</label>
            <input placeholder="Image filename or URL" value={form.image_location} onChange={e => setForm({ ...form, image_location: e.target.value })} />
            <input type="file" accept="image/*" onChange={e => {
              const f = e.target.files[0];
              setFile(f || null);
              if (f) setPreview(URL.createObjectURL(f)); else setPreview(null);
            }} />

            {preview && (
              <div style={{ marginTop: 8 }}>
                <img src={preview} alt="preview" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
              </div>
            )}





            <button type="submit" disabled={creating} style={{ padding: 12, background: '#3498db', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
              {creating ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </form>
      )}


      {manageMode && manageAuthorized && alerts && alerts.length > 0 && (
        <div style={{ marginBottom: 32, background: '#fff9e6', padding: 15, borderRadius: 10, border: '1px solid #f1c40f' }}>
          <h3 style={{ color: '#d35400' }}>Low Stock Alerts</h3>
          {alerts.map(a => (
            <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#333' }}>
              <div>
                <strong>{a.product_name}</strong>: {a.message}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleRestock(a.product_id, 10)} style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4 }}>Restock 10</button>
                <button onClick={() => handleReplenish(a.product_id, 50)} style={{ background: '#3498db', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4 }}>Replenish 50</button>
              </div>
            </div>
          ))}
        </div>
      )}


      <h3>Current Inventory</h3>
      {products.length === 0 ? <p>No products found for this merchant.</p> : (
        <div className="merchant-grid">
          {products.map(p => (
            <div
              key={p.id}
              className="merchant-card"
              style={{
                opacity: p.active === 0 ? 0.6 : 1,
                borderColor: p.active === 0 ? 'rgba(255, 100, 100, 0.5)' : 'rgba(255, 255, 255, 0.3)',
                background: p.active === 0 ? 'rgba(255, 100, 100, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                position: 'relative'
              }}
            >
              {p.active === 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '18px',
                  zIndex: 1,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#ff6464',
                  pointerEvents: 'none'
                }}>
                  INACTIVE
                </div>
              )}
              {!(manageMode && manageAuthorized) && p.active !== 0 && Number(p.merchant_quantity ?? p.stock ?? 0) <= 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '18px',
                  zIndex: 1,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#ff4d4d',
                  pointerEvents: 'none',
                  textTransform: 'uppercase'
                }}>
                  Out of Stock
                </div>
              )}
              <img
                src={resolveImage(p)}
                alt={p.name}
                style={{ width: '100%', height: 120, objectFit: 'cover', borderTopLeftRadius: 12, borderTopRightRadius: 12, opacity: p.active === 0 ? 0.7 : 1 }}
                onError={e => (e.target.src = '/products/default.jpg')}
              />
              <div style={{ padding: 12 }}>
                <h3 style={{ margin: '0 0 5px 0' }}>{p.name}</h3>
                <p style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>{capitalize(p.category) || 'No Category'}</p>
                <div style={{ display: 'flex', gap: 20, marginBottom: 10, fontSize: 13 }}>
                  <p style={{ margin: 0 }}>Price: <strong>₹{Number(p.price).toFixed(2)}</strong></p>
                  <p style={{ margin: 0 }}>Unit: <strong>{formatUnitAmount(p.unit_amount || 1)} {formatUnitDisplay(p.unit || 'g', p.category)}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 13 }}>
                  <p style={{ margin: 0 }}>GST: <strong>{Number(p.gst_percent || 0).toFixed(2)}%</strong></p>
                  <p style={{ margin: 0 }}>Total: <strong>₹{(Number(p.price || 0) + (Number(p.price || 0) * Number(p.gst_percent || 0) / 100)).toFixed(2)}</strong></p>
                </div>

                {(manageMode && manageAuthorized) && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => handleSetActive(p.id, 1)} className={`btn-active`} style={{ flex: '1 1 calc(50% - 3px)', fontSize: '12px', padding: '6px 8px' }}>Active</button>
                    <button onClick={() => handleSetActive(p.id, 0)} className={`btn-inactive`} style={{ flex: '1 1 calc(50% - 3px)', fontSize: '12px', padding: '6px 8px' }}>Inactive</button>
                    <button onClick={() => setEditProduct(p)} style={{ flex: '1 1 calc(50% - 3px)', background: '#34495e', color: '#fff', border: 'none', padding: '6px 8px', borderRadius: 6, fontSize: '12px' }}>Edit</button>
                    <button onClick={() => handleDelete(p.id)} className={`btn-remove`} style={{ flex: '1 1 calc(50% - 3px)', fontSize: '12px', padding: '6px 8px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6 }}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editProduct && (
        <div className="merchant-modal-overlay" onClick={() => setEditProduct(null)}>
          <div className="merchant-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 420 }}>
            <h3>Edit Product</h3>
            <p>Adjust price, GST, unit, and merchant stock.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setEditLoading(true);
              try {
                const payload = {
                  price: Number(editProduct.price || 0),
                  gst_percent: Number(editProduct.gst_percent || 0),
                  unit: editProduct.unit || 'g',
                  unit_amount: Number(editProduct.unit_amount || 1),
                  merchant_quantity: Number(editProduct.merchant_quantity || 0),
                  name: editProduct.name || null,
                  category: editProduct.category || null
                };
                await api.put(`/products/${editProduct.id}`, payload);
                const res = await api.get(`/products/${id}?includeInactive=1`);
                setProducts(res.data || []);
                // refresh alerts so any low-stock alert created by this update appears
                try {
                  const ares = await api.get(`/inventory/alerts?merchantId=${id}`);
                  setAlerts(ares.data || []);
                } catch (e) {
                  console.warn('failed to refresh alerts after edit', e && e.message ? e.message : e);
                }
                setEditProduct(null);
              } catch (err) {
                alert(err.response?.data?.error || err.message || 'Update failed');
              } finally { setEditLoading(false); }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Product Name</label>
                <input value={editProduct.name || ''} onChange={e => setEditProduct(prev => ({ ...prev, name: e.target.value }))} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Category</label>
                <input placeholder="Category" value={editProduct.category || ''} onChange={e => setEditProduct(prev => ({ ...prev, category: e.target.value }))} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Price (₹)</label>
                  <input placeholder="Price" type="number" step="0.01" value={editProduct.price ?? ''} onChange={e => setEditProduct(prev => ({ ...prev, price: e.target.value }))} style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>GST %</label>
                  <input placeholder="GST %" type="number" step="0.01" value={editProduct.gst_percent ?? ''} onChange={e => setEditProduct(prev => ({ ...prev, gst_percent: e.target.value }))} style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Unit</label>
                  <select
                    value={editProduct.unit || 'g'}
                    onChange={e => setEditProduct(prev => ({ ...prev, unit: e.target.value }))}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="g">g</option>
                    <option value="litre">litre</option>
                    <option value="kg">kg</option>
                    <option value="gram">gram</option>
                    <option value="packet">packet</option>
                    <option value="tin">Tin</option>
                    <option value="sippam">Sippam</option>
                    <option value="mottai">Mottai</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Qty/Measure</label>
                  <input
                    placeholder="Unit amount"
                    type="number"
                    step="0.001"
                    value={editProduct.unit_amount ?? ''}
                    onChange={e => setEditProduct(prev => ({ ...prev, unit_amount: e.target.value }))}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 4 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Merchant Stock</label>
                <input placeholder="Merchant stock" type="number" value={editProduct.merchant_quantity ?? ''} onChange={e => setEditProduct(prev => ({ ...prev, merchant_quantity: e.target.value }))} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={editLoading}>{editLoading ? 'Updating…' : 'Save'}</button>
                <button type="button" onClick={async () => { // remove stock
                  if (!confirm('Remove merchant stock (set to 0)?')) return;
                  setEditLoading(true);
                  try {
                    await api.put(`/products/${editProduct.id}`, { merchant_quantity: 0 });
                    const res = await api.get(`/products/${id}?includeInactive=1`);
                    setProducts(res.data || []);
                    // refresh alerts after removing merchant stock
                    try {
                      const ares = await api.get(`/inventory/alerts?merchantId=${id}`);
                      setAlerts(ares.data || []);
                    } catch (e) {
                      console.warn('failed to refresh alerts after remove stock', e && e.message ? e.message : e);
                    }
                    setEditProduct(null);
                  } catch (err) { alert(err.response?.data?.error || err.message); } finally { setEditLoading(false); }
                }}>Remove Stock</button>
                <button type="button" onClick={() => setEditProduct(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showStatsModal && (
        <div className="merchant-modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="merchant-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 600 }}>
            <h3>Inventory Stats</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 'bold' }}>Select Date:</label>
              <input
                type="date"
                value={statsDate}
                onChange={(e) => setStatsDate(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13 }}
              />
              <button
                onClick={async () => {
                  setStatsLoading(true);
                  try {
                    const res = await api.get(`/merchants/${id}/manager-stats?date=${statsDate}`);
                    setStats(res.data);
                  } catch (err) {
                    setStats({ error: err.response?.data?.error || err.message });
                  } finally { setStatsLoading(false); }
                }}
                style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#3498db', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
              >
                Load Stats
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#333' }}>{statsLoading ? 'Loading…' : (stats?.date ? new Date(stats.date).toLocaleDateString() : '')}</p>
            {statsLoading && <p>Loading stats…</p>}
            {stats && stats.error && <p style={{ color: 'red' }}>{stats.error}</p>}
            {stats && !stats.error && (
              <div style={{ marginTop: 12 }}>
                <p><strong>Total products:</strong> {stats.count_products}</p>
                <p><strong>Products sold today:</strong> {stats.products.filter(p => p.daily_sold > 0).length}</p>
                <div style={{ maxHeight: 480, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd', background: '#f9f9f9' }}>
                        <th style={{ padding: 12, fontWeight: 'bold', fontSize: '14px' }}>Product</th>
                        <th style={{ padding: 12, fontWeight: 'bold', fontSize: '14px' }}>Price</th>
                        <th style={{ padding: 12, fontWeight: 'bold', fontSize: '14px' }}>Unit</th>
                        <th style={{ padding: 12, fontWeight: 'bold', fontSize: '14px' }}>Quantity Sold</th>
                        <th style={{ padding: 12, fontWeight: 'bold', fontSize: '14px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.products
                        .filter(p => p.daily_sold > 0)
                        .sort((a, b) => b.daily_sold - a.daily_sold)
                        .map(p => {
                          const amount = Number(p.price || 0) * Number(p.daily_sold || 0);
                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f1f1', height: '45px' }}>
                              <td style={{ padding: 12 }}>{p.name}</td>
                              <td style={{ padding: 12 }}>₹{Number(p.price || 0).toFixed(2)}</td>
                              <td style={{ padding: 12 }}>{p.unit || 'pcs'} ({formatUnitAmount(p.unit_amount || 1)})</td>
                              <td style={{ padding: 12, fontWeight: 'bold', color: '#27ae60', fontSize: '16px' }}>{Math.floor(p.daily_sold)}</td>
                              <td style={{ padding: 12, fontWeight: 'bold', color: '#3498db', fontSize: '16px' }}>₹{amount.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {stats.products.filter(p => p.daily_sold > 0).length === 0 && (
                    <p style={{ textAlign: 'center', padding: 20, color: '#999' }}>No products sold on this date</p>
                  )}
                </div>
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowStatsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showAuthModal && (
        <div className="merchant-modal-overlay" onClick={() => { setShowAuthModal(false); setAuthError(null); }}>
          <div className="merchant-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 360 }}>
            <h3>Manager Sign-in</h3>
            <p>Enter merchant username (or email) and password to enable management features.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setAuthLoading(true); setAuthError(null);
              try {
                const u = await login(authIdentifier, authPassword);
                if (!u || u.role !== 'merchant') {
                  setAuthError('Not authorized as merchant');
                } else {
                  setManageAuthorized(true);
                  setManageMode(true);
                  setShowAuthModal(false);
                  setAuthIdentifier(''); setAuthPassword('');
                }
              } catch (err) {
                setAuthError(err.response?.data?.error || err.message || 'Authentication failed');
              } finally { setAuthLoading(false); }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="Username or email" value={authIdentifier} onChange={e => setAuthIdentifier(e.target.value)} required />
              <input placeholder="Password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required />
              {authError && <p style={{ color: 'red' }}>{authError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={authLoading}>{authLoading ? 'Signing in…' : 'Sign in'}</button>
                <button type="button" onClick={() => { setShowAuthModal(false); setAuthError(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

