import React, { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthProvider";
import "../styles/Cart.css";
import { useLocation, useNavigate } from "react-router-dom";
import { formatUnitAmount, formatUnitDisplay } from "../utils/format";

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // ids of products currently being updated to prevent concurrent changes
  const [updatingIds, setUpdatingIds] = useState([]);
  // Track last click time per product to prevent double-clicks
  const [lastClickTime, setLastClickTime] = useState({});

  /* =========================
     LOAD CART
  ========================= */
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

    async function loadCart() {
      setLoading(true);
      try {
        const res = await api.get(`/cart/${user.id}`);
        const data = res.data || [];
        if (data.length || !state?.items?.length) {
          setItems(data);
        }
      } catch (err) {
        console.error("load cart", err);
        if (!state?.items?.length) setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, [user, state]);

  /* =========================
     UPDATE QUANTITY
  ========================= */
  async function updateQuantity(productId, operation) {

    if (updatingIds.includes(productId)) return;


    const now = Date.now();
    if (lastClickTime[productId] && now - lastClickTime[productId] < 200) {
      return;
    }
    setLastClickTime(prev => ({ ...prev, [productId]: now }));

    setUpdatingIds(prev => [...prev, productId]);

    const it = items.find(i => i.product_id === productId);
    const oldQty = Number(it?.quantity || 0);

    // Calculate new quantity based on operation
    let newQty;
    if (operation === 'increment') {
      newQty = oldQty + 1;
    } else if (operation === 'decrement') {
      newQty = Math.max(0, oldQty - 1);
    } else {
      newQty = operation; // direct number
    }

    // OPTIMISTIC UPDATE: Update local UI immediately
    setItems(prev => prev.map(item =>
      item.product_id === productId ? { ...item, quantity: newQty } : item
    ));

    console.log('updateQuantity optimistic', { productId, oldQty, newQty, operation });

    try {
      const unitAmount = 1;

      // 1. Update Inventory (Reserve/Release)
      if (newQty > oldQty) {
        const diff = newQty - oldQty;
        await api.post("/inventory/decrease", {
          product_id: productId,
          quantity: diff * unitAmount,
        });
      } else if (newQty < oldQty) {
        const diff = oldQty - newQty;
        await api.post("/inventory/restock", {
          product_id: productId,
          quantity: diff * unitAmount,
        });
      }

      // 2. Update Cart on Server
      await api.put("/cart", {
        user_id: user.id,
        product_id: productId,
        quantity: newQty,
      });

      // If quantity reduced to zero, remove item from cart (no additional restock)
      if (newQty === 0) {
        try {
          await api.delete('/cart', { data: { user_id: user.id, product_id: productId } });
          setItems(prev => prev.filter(it => it.product_id !== productId));
        } catch (delErr) {
          console.error('Failed to delete cart item after qty 0', delErr);
        }
      }

    } catch (err) {
      console.error('updateQuantity error', err);
      // Revert optimistic update on error
      setItems(prev => prev.map(item =>
        item.product_id === productId ? { ...item, quantity: oldQty } : item
      ));

      alert(
        err.response?.data?.error ||
        err.message ||
        "Failed to update quantity"
      );
    } finally {
      setUpdatingIds(prev => prev.filter(id => id !== productId));
    }
  }

  /* =========================
     REMOVE ITEM
  ========================= */
  // remove from cart; if `noRestock` is true caller already handled inventory
  async function removeItem(productId, noRestock = false) {
    if (!noRestock && !window.confirm("Remove this item from cart?")) return;

    try {
      const it = items.find(i => i.product_id === productId);

      if (!noRestock && it?.quantity > 0) {
        const restoreAmount = Number(it.quantity);
        await api.post("/inventory/restock", {
          product_id: productId,
          quantity: restoreAmount,
        });
      }

      await api.delete("/cart", {
        data: { user_id: user.id, product_id: productId },
      });

      const res = await api.get(`/cart/${user.id}`);
      setItems(res.data || []);
    } catch (err) {
      alert(
        err.response?.data?.error ||
        err.message ||
        "Failed to remove item"
      );
    }
  }

  /* =========================
     STATES
  ========================= */
  if (!user) {
    return <p className="cart-status">Please login to view your cart.</p>;
  }

  if (loading) {
    return <p className="cart-status">Loading cart…</p>;
  }


  const hasGst = items.some(it => Number(it.gst_percent || 0) > 0);

  const subtotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity || 0);
    const packagePrice = Number(it.package_price || 0);
    const packagePriceIncl = Number(it.package_price_incl_gst || Number(it.price) || 0);
    const gstPercent = Number(it.gst_percent || 0);

    let netUnit = packagePrice || 0;
    if (!netUnit) {
      if (packagePriceIncl && gstPercent) {
        netUnit = packagePriceIncl / (1 + gstPercent / 100);
      } else {
        netUnit = packagePriceIncl || Number(it.price) || 0;
      }
    }

    return sum + netUnit * qty;
  }, 0);

  const taxTotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity || 0);
    const packagePrice = Number(it.package_price || 0);
    const packagePriceIncl = Number(it.package_price_incl_gst || Number(it.price) || 0);
    const gstPercent = Number(it.gst_percent || 0);

    let netUnit = packagePrice || 0;
    if (!netUnit) {
      if (packagePriceIncl && gstPercent) {
        netUnit = packagePriceIncl / (1 + gstPercent / 100);
      } else {
        netUnit = packagePriceIncl || Number(it.price) || 0;
      }
    }

    const gstAmtUnit = packagePriceIncl ? (packagePriceIncl - netUnit) : (netUnit * gstPercent / 100);
    return sum + gstAmtUnit * qty;
  }, 0);

  const deliveryFee = 0; // placeholder - replace with calculated/shipped fee if available

  const total = subtotal + taxTotal + deliveryFee;


  /* =========================
     RENDER
  ========================= */
  // helper: try several fields used by backend for available stock
  function getAvailableStock(it) {
    if (!it) return null;
    const possible = [it.stock, it.available_stock, it.stock_qty, it.stock_quantity, it.available, it.quantity_available, it.max_stock];
    for (const v of possible) {
      if (typeof v !== 'undefined' && v !== null && v !== '') {
        const n = Number(v);
        if (!isNaN(n)) return n;
      }
    }
    return null; // unknown
  }
  return (
    <div
      className={`cart-page ${items.length >= 10
        ? "compact-2"
        : items.length >= 8
          ? "compact"
          : ""
        }`}
    >
      <h1 className="cart-title">Your Cart</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <button
            className="cta"
            onClick={() => navigate(state?.merchantId ? `/merchant/${state.merchantId}` : '/daily-needs')}
          >
            Continue shopping
          </button>
        </div>
      ) : (
        <div className="cart-container">

          {/* ✅ TABLE FORMAT */}
          <div className={`cart-table ${hasGst ? 'has-gst' : 'no-gst'}`}>
            <div className="table-header">
              <div className="col-product">Product Name</div>
              <div className="col-seller">Sold By</div>
              <div className="col-price">Net Price</div>
              {hasGst && <div className="col-gst">GST</div>}
              {hasGst && <div className="col-gst-amt">GST Amount</div>}
              <div className="col-quantity">Quantity</div>
              <div className="col-total">Total</div>
              <div className="col-actions">Actions</div>
            </div>

            {items.map(it => {
              const qty = Number(it.quantity || 0);
              const unitAmount = Number(it.unit_amount || 1);
              const unit = it.unit || 'unit';

              const availableStock = getAvailableStock(it);

              const packagePrice = Number(it.package_price || 0);
              const packagePriceIncl = Number(it.package_price_incl_gst || Number(it.price) || 0);
              const gstPercent = Number(it.gst_percent || 0);

              let netUnit = packagePrice || 0;
              if (!netUnit) {
                if (packagePriceIncl && gstPercent) {
                  netUnit = packagePriceIncl / (1 + gstPercent / 100);
                } else {
                  netUnit = packagePriceIncl || Number(it.price) || 0;
                }
              }

              const gstAmtUnit = packagePriceIncl ? (packagePriceIncl - netUnit) : (netUnit * gstPercent / 100);
              const unitTotal = netUnit + gstAmtUnit;
              const perItemTotal = Math.round(unitTotal * 100) * qty / 100;

              return (
                <div key={it.product_id} className="table-row">
                  <div className="col-product">
                    <span className="product-name">{it.name}</span>
                  </div>

                  <div className="col-seller">
                    <span className="merchant-tag">{it.merchant_name || 'N/A'}</span>
                  </div>

                  <div className="col-price">
                    <span className="price-value">
                      ₹{netUnit.toFixed(2)}
                      <span className="price-unit"> ({formatUnitAmount(unitAmount)} {formatUnitDisplay(unit, it.category)})</span>
                    </span>
                  </div>

                  {hasGst && (
                    <div className="col-gst">
                      <span className="gst-value">{gstPercent.toFixed(2)}%</span>
                    </div>
                  )}

                  {hasGst && (
                    <div className="col-gst-amt">
                      <span className="gst-value">₹{gstAmtUnit.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="col-quantity">
                    <div className="qty-controls">
                      <button
                        className="qty-btn"
                        disabled={updatingIds.includes(it.product_id)}
                        onClick={() => updateQuantity(it.product_id, 'decrement')}
                        title="Decrease quantity"
                        aria-label={`Decrease quantity for ${it.name}`}
                      >
                        −
                      </button>
                      <span className="qty-display">{qty}</span>
                      <button
                        className="qty-btn"
                        disabled={updatingIds.includes(it.product_id) || (availableStock !== null && qty >= availableStock)}
                        onClick={() => updateQuantity(it.product_id, 'increment')}
                        title={availableStock !== null && qty >= availableStock ? 'Max stock reached' : 'Increase quantity'}
                        aria-label={`Increase quantity for ${it.name}`}
                      >
                        +
                      </button>
                    </div>
                    {availableStock !== null && qty >= availableStock && availableStock > 0 && (
                      <p style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px' }}>Only {availableStock} available</p>
                    )}
                  </div>

                  <div className="col-total">
                    <span className="total-value">₹{perItemTotal.toFixed(2)}</span>
                  </div>

                  <div className="col-actions">
                    <button
                      className="remove-btn soft"
                      onClick={() => removeItem(it.product_id)}
                      title="Remove from cart"
                      aria-label={`Remove ${it.name} from cart`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price breakdown */}
          <div className="price-breakdown">
            <div className="break-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="break-row"><span>Tax</span><span>₹{taxTotal.toFixed(2)}</span></div>
            <div className="break-row"><span>Delivery</span><span>₹{deliveryFee.toFixed(2)}</span></div>
            <div className="break-row total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          </div>
          {/* ✅ FOOTER */}
          <div className="cart-footer">
            <button
              className="back-btn"
              onClick={() => navigate(state?.merchantId ? `/merchant/${state.merchantId}` : "/daily-needs", { replace: true })}
            >
              ← Back to Products
            </button>

            <div className="cart-total">
              Total: ₹{total.toFixed(2)}
            </div>

            <button
              className="proceed-btn"
              onClick={() => navigate("/checkout", { replace: true, state: { items, merchantId: state?.merchantId } })}
            >
              Proceed to Pay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
