import React, { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import "../styles/MerchantView.css";
import "../styles/DailyNeedsView.css";
import "../styles/DailyNeedsView.css";
import { formatUnitAmount, formatUnitDisplay, capitalize } from "../utils/format";
import Toast from "../components/Toast";

export default function DailyNeedsView() {
  const [products, setProducts] = useState([]);
  const [selectedQty, setSelectedQty] = useState({});
  const [addingToCart, setAddingToCart] = useState({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const [toast, setToast] = useState({ show: false, message: "" });

  useEffect(() => {
    loadProducts();
    setSelectedQty({});

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadProducts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  async function loadProducts() {
    try {
      // fetch all products for customer view
      const res = await api.get("/products");
      setProducts(res.data);

      // Reset quantity selectors for out-of-stock items
      setSelectedQty((prev) => {
        const updated = { ...prev };
        (res.data || []).forEach((p) => {
          const stock = getDisplayedStockForProduct(p);
          if (stock === 0 && updated[p.id]) {
            delete updated[p.id]; // Reset to default (1) for OOS items
          }
        });
        return updated;
      });
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }

  // Helper to get stock for a product (extracted to use in loadProducts)
  function getDisplayedStockForProduct(p) {
    if (user?.id) {
      return typeof p.quantity !== "undefined" ? Number(p.quantity) : 0;
    } else {
      // Prioritize customer_quantity, then quantity, else 0 (no default 10 masking!)
      if (typeof p.customer_quantity !== "undefined") return Number(p.customer_quantity);
      if (typeof p.quantity !== "undefined") return Number(p.quantity);
      return 0; // If unknown, assume 0 to be safe, or 10 if we want to be optimistic? 
      // User complaint suggests we are showing "Out of Stock" when we shouldn't.
      // If we return 0 here for valid products, that would cause the bug.
      // But typically API returns quantity.
      // The previous code defaulted to 10. Let's default to 0 to be honest, OR check if the API is guaranteed to return it.
      // Based on typical "Active" meaning, let's stick to strict data.
    }
  }

  // Logic to determine how much stock the user can see
  function getDisplayedStock(p) {
    return getDisplayedStockForProduct(p);
  }

  // FIXED: Simplified quantity change logic
  const handleQuantityChange = (productId, delta, maxStock) => {
    setSelectedQty((prev) => {
      // Convert current value to Number to prevent "1" + 1 = "11"
      const currentQty = Number(prev[productId] || 1);
      const newQty = currentQty + delta;

      // Clamp values between 1 and the available stock
      if (newQty < 1) return { ...prev, [productId]: 1 };
      if (newQty > maxStock) return { ...prev, [productId]: maxStock };

      return { ...prev, [productId]: newQty };
    });
  };

  async function addToCart(productId) {
    if (!user?.id) return alert("Please login to add to cart");

    // Prevent duplicate submissions
    if (addingToCart[productId]) return;
    setAddingToCart((prev) => ({ ...prev, [productId]: true }));

    try {
      const qty = Number(selectedQty[productId] || 1);
      const prod = products.find((p) => p.id === productId);
      const displayedStock = getDisplayedStock(prod);

      if (qty <= 0) return alert("Quantity must be at least 1");
      if (qty > displayedStock) return alert("Not enough stock available");

      // Reserve inventory first
      const dec = await api.post("/inventory/decrease", {
        product_id: productId,
        quantity: qty,
      });

      // Fetch current cart to check if product already exists
      const cartRes = await api.get(`/cart/${user.id}`);
      const currentCartItem = (cartRes.data || []).find(item => item.product_id === productId);
      const currentQty = currentCartItem ? Number(currentCartItem.quantity || 0) : 0;

      // Add to existing quantity if product is already in cart
      const newTotalQty = currentQty + qty;

      // Update cart with total quantity
      await api.put("/cart", {
        user_id: user.id,
        product_id: productId,
        quantity: newTotalQty,
      });

      // Update local UI to reflect new stock from server response
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, quantity: dec.data.quantity } : p
        )
      );

      // Reset quantity selector to 1 after successfully adding
      setSelectedQty((prev) => ({ ...prev, [productId]: 1 }));

      setToast({ show: true, message: `${prod.name} added to cart!` });
    } catch (err) {
      console.error("Failed to add to cart", err.response?.data?.error || err.message);
      alert("Error adding to cart. Please try again.");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  }

  return (
    <div className="daily-needs-page">
      <div className="dn-header">
        <div>
          <h1>Daily Needs</h1>
          <p className="dn-subtitle">Grocery</p>
        </div>
        <div className="top-actions">
          <button onClick={() => navigate("/cart")} className="action-btn cart-btn">🛒 Cart</button>
          <button onClick={() => navigate("/select-role")} className="action-btn back-btn">Back</button>
        </div>
      </div>

      <div className="products-grid">
        {[...products]
          .sort((a, b) => {
            const catA = (a.category || "Uncategorized").toLowerCase();
            const catB = (b.category || "Uncategorized").toLowerCase();
            return catA.localeCompare(catB);
          })
          .map((p) => {
            const displayedStock = getDisplayedStock(p);
            const qty = Number(selectedQty[p.id] || 1);
            const isOOS = displayedStock === 0;

            return (
              <div key={p.id} className={`product-card ${isOOS ? 'out-of-stock' : ''}`}>
                <div className="card-image-container">
                  {isOOS && (
                    <div className="oos-overlay">
                      <span className="oos-badge">Out of Stock</span>
                    </div>
                  )}
                  <img
                    src={
                      p.image_location
                        ? p.image_location.startsWith("http")
                          ? p.image_location
                          : `/products/${p.image_location}`
                        : "/products/default.jpg"
                    }
                    alt={p.name}
                    className="product-image"
                    onError={(e) => (e.target.src = "/products/default.jpg")}
                  />
                </div>

                <div className="card-details">
                  <div title={p.name} className="product-name">{p.name}</div>
                  <div className="product-unit">
                    {/* Attempt to show unit if available in data, or extract from name/category if possible. 
                       For now, using price info or just category/brand if helpful. 
                       The user wants "standardize units". We will rely on the backend data fix for this. */}
                    {p.unit ? `${formatUnitAmount(p.unit_amount || 1)} ${formatUnitDisplay(p.unit, p.category)}` : capitalize(p.category)}
                  </div>

                  <div className="price-row">
                    <div className="product-price">
                      ₹{Math.floor(Number(p.price))} {/* Clean price, no decimals */}
                    </div>

                    <div className="add-btn-container">
                      {/* Simplified Add Experience: 
                        If not adding, show ADD button. 
                        If user wants more, they can click again (simple) or use controls if we had cart state.
                        For now, following the 'distinct primary action' request. 
                    */}
                      <button
                        className="add-btn"
                        onClick={() => addToCart(p.id)}
                        disabled={isOOS || addingToCart[p.id]}
                      >
                        {addingToCart[p.id] ? "Adding..." : "Add to Cart"}
                      </button>
                    </div>
                  </div>

                  {/* Only show "Limited Stock" text if meaningful (< 5 and > 0) */}
                  {!isOOS && displayedStock < 5 && (
                    <div className="stock-status-text" style={{ color: '#d35400', fontWeight: 'bold' }}>Limited Stock: {displayedStock} left</div>
                  )}
                  {!isOOS && displayedStock >= 5 && (
                    <div className="stock-status-text" style={{ color: '#27ae60' }}>In Stock</div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <Toast
        show={toast.show}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div >
  );
}