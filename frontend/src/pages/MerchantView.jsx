import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthProvider";
import "../styles/MerchantView.css";
import "../styles/MerchantView.css";
import { formatUnitAmount, formatUnitDisplay, capitalize } from "../utils/format";
import Toast from "../components/Toast";

/* =========================================================
   ✅ FULL EXPLICIT PRODUCT → IMAGE MAP
   (NO SMART LOGIC, NO AUTO GUESSING)
   ========================================================= */
const productImages = {
  /* ---------- TEA ---------- */
  "assam tea": "assam-tea.jpg",
  "black tea": "black-tea.jpg",
  "green tea": "green-tea.jpg",
  "darjeeling tea": "darjeeling-tea.jpg",
  "tea leaves": "tea-leafs.jpg",
  "instant tea": "instant-tea.jpg",

  /* ---------- COFFEE ---------- */
  "bru coffee": "bru-coffee.jpg",
  "instant coffee small": "instance-coffee.jpg",
  "instant coffee large": "instace-coffee-l.jpg",
  "ground coffee": "ground-coffee.jpg",
  "filter coffee power": "fillter-coffee.jpg",
  "coffee beans": "coffee-beans.jpg",

  /* ---------- GHEE & DAIRY ---------- */
  "pure ghee": "pure-ghee.jpg",
  "cow ghee": "cow-ghee.jpg",
  "buffalo ghee": "buffalo-ghee.jpg",
  "butter 200g": "butter.jpg",
  "milk 500ml": "milk.jpg",
  "milk 1l": "milk1.jpg",
  "curd 1kg": "curd.jpg",
  "paneer 500g": "paneer.jpg",

  /* ---------- OILS ---------- */
  "cooking oil": "cooking-oil.jpg",
  "sunflower oil": "sunflower-oil.jpg",
  "mustard oil": "mustard-oil.jpg",
  "groundnut oil": "groundnut-oil.jpg",
  "groundnut oil 5L": "groundnut-oil5.jpg",
  "olive oil": "olive-oil.jpg",
  "soyabean oil": "soyabean-oil.jpg",
  "gingelly oil": "gingelly-oil.jpg",
  "coconut oil": "coconut-oil.jpg",
  "palm oil": "palm-oil.jpg",
  "rice bran oil": "rice-brand-oil.jpg",

  /* ---------- DAL & PULSES ---------- */
  "moong dal": "moong-dhal.jpg",
  "masoor dal": "masoor-dal.jpg",
  "toor dhal": "toor-dhal.jpg",
  "urad dal": "urad-dhal.jpg",
  "chana dal": "chana-dal.jpg",
  "green gram": "green-gram.jpg",
  "black gram": "black-gram.jpg",
  "rajma chitra": "rajma-chitra.jpg",
  "white peas": "white-peas.jpg",
  "yellow peas": "yellow-peas.jpg",

  /* ---------- RICE & FLOUR ---------- */
  "basmati rice 5kg": "basmati-rice-5.jpg",
  "basmati rice 10kg": "basmati-rice-10.jpg",
  "idli rice 5kg": "idly-rice.jpg",
  "ponni rice 5kg": "ponni-rice.jpg",
  "brown rice 2kg": "brown-rice.jpg",
  "maida 5kg": "maida.jpg",
  "wheat flour 10kg": "wheat-flour.jpg",
  "rice flour": "rice-flour.jpg",
  "corn flour 1kg": "corn-flour.jpg",
  "rava 5kg": "rava.jpg",
  "vermicelli": "vermicelli.jpg",

  /* ---------- MASALAS & SPICES ---------- */
  "turmeric powder": "turmeric-powder.jpg",
  "chili powder": "chilli-powder.jpg",
  "pepper powder": "pepper-power.jpg",
  "coriander powder": "coriander-powder.jpg",
  "garam masala": "garam-masala.jpg",
  "masala mix": "masala-mix.jpg",
  "samosa mix": "samosa-mix.jpg",
  "cardamom": "cardamom.jpg",
  "cloves": "clove.jpg",
  "cumin seeds": "cumin-seeds.jpg",
  "fennel seeds": "fennel-seeds.jpg",

  /* ---------- BISCUITS ---------- */
  "bourbon biscuits": "bourbon.jpg",
  "little hearts": "little-heart.jpg",
  "marie biscuits": "mari-biscuits.jpg",
  "cream biscuits": "cream-biscuit.jpg",
  "crunchy biscuits": "crunchy-biscuit.jpg",
  "glucose biscuits": "glucosw-biscuit.jpg",
  "good day biscuits": "good-day.jpg",
  "hide & seek": "hideandseek.jpg",
  "oreo biscuits": "oreo-biscuit.jpg",

  /* ---------- SNACKS ---------- */
  "banana chips": "banana-chips.jpg",
  "corn chips": "corn-chips.jpg",
  "potato chips": "potato-chips.jpg",
  "namkeen": "namkeen.jpg",
  "mixture": "mixture.jpg",
  "peanut mixture": "peanut-mixture.jpg",
  "murukku": "murukku.jpg",
  "roasted peanuts": "roasted-peanut.jpg",

  /* ---------- SUGAR & SALT ---------- */
  "sugar": "sugar.jpg",
  "brown sugar": "brown-sugar.jpg",
  "jaggery": "jaggery.jpg",
  "salt": "salt.jpg",
  "rock salt": "rock-salt.jpg",
  "low sodium salt": "low-sodium-salt.jpg"

};

/* ---------- IMAGE RESOLVER (SIMPLE & SAFE) ---------- */
function getProductImage(name = "") {
  const key = name.toLowerCase().trim();
  return `/products/${productImages[key] || "default.jpg"}`;
}

/* ========================================================= */

export default function MerchantView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});
  const [cartItems, setCartItems] = useState({}); // { productId: qty }
  const [toast, setToast] = useState({ show: false, message: "" });

  /* Load cart items for this user to sync UI */
  useEffect(() => {
    if (!user?.id) return;
    async function loadCart() {
      try {
        const res = await api.get(`/cart/${user.id}`);
        const map = {};
        (res.data || []).forEach(item => {
          map[item.product_id] = Number(item.quantity);
        });
        setCartItems(map);
      } catch (err) {
        console.error("load cart", err);
      }
    }
    loadCart();
  }, [user]);

  /* Helper to reload cart */
  async function reloadCart() {
    if (!user?.id) return;
    try {
      const res = await api.get(`/cart/${user.id}`);
      const map = {};
      (res.data || []).forEach(item => {
        map[item.product_id] = Number(item.quantity);
      });
      setCartItems(map);
    } catch (err) {
      console.error("reload cart error", err);
    }
  }

  /* Helper to reload product stock (optional but good) */
  async function reloadProducts() {
    try {
      const res = await api.get(`/products/${id}`);
      setProducts(res.data || []);
    } catch (err) { }
  }

  const [addingId, setAddingId] = useState(null); // Track which product is being added

  async function handleIncrement(p) {
    if (!user?.id) return alert("Please login to add to cart");
    if (p.quantity <= 0) return; // Out of stock

    const currentQty = cartItems[p.id] || 0;
    const newQty = currentQty + 1;

    setAddingId(p.id); // Show loading state

    // OPTIMISTIC UPDATE: Update local counter immediately so user sees "1..2..3" 
    // and subsequent clicks calc from the new value.
    setCartItems(prev => ({ ...prev, [p.id]: newQty }));

    try {
      // 1. Immediately update UI for responsiveness - decrease displayed stock
      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, quantity: Math.max(0, (item.quantity || 0) - 1) } : item));

      // 2. Decrease inventory (Reserve)
      await api.post('/inventory/decrease', { product_id: p.id, quantity: 1 });

      // 3. Update cart with EXACT new quantity
      await api.put('/cart', {
        user_id: user.id,
        product_id: p.id,
        quantity: newQty
      });

      // Show toast
      setToast({
        show: true,
        message: `${p.name} added to cart!`
      });

      // REMOVED: reloadCart() and reloadProducts() here to prevent race conditions.
      // We rely on the optimistic updates above.


    } catch (err) {
      console.error("Failed to increment", err);
      // 5. Reload on error to revert local changes
      await reloadProducts();
      await reloadCart();
      if (err.response) {
        alert(`Error: ${err.response.data.error || 'Server Error'}`);
      } else {
        alert(err.message || "Failed to add item");
      }
    } finally {
      setAddingId(null);
    }
  }

  async function handleDecrement(p) {
    if (!user?.id) return;
    const currentQty = cartItems[p.id] || 0;
    if (currentQty <= 0) return;

    setAddingId(p.id);
    try {
      // 1. Restock inventory (Release)
      await api.post('/inventory/restock', { product_id: p.id, quantity: 1 });

      // 2. Remove 1 from cart or delete if 0
      // The backend `/cart` PUT replaces quantity OR `/cart` with negative logic?
      // Let's us use the previous logic from Cart.jsx: Update with specific quantity.
      // We know the current quantity is `currentQty`. New is `currentQty - 1`.

      const newQty = currentQty - 1;
      if (newQty <= 0) {
        await api.delete('/cart', { data: { user_id: user.id, product_id: p.id } });
      } else {
        // We can use the PUT /cart to set exact quantity
        await api.put('/cart', { user_id: user.id, product_id: p.id, quantity: newQty });
      }

      // 3. Update local state — remove entry if quantity reaches 0
      setCartItems(prev => {
        const copy = { ...prev };
        if (newQty <= 0) {
          delete copy[p.id];
        } else {
          copy[p.id] = newQty;
        }
        return copy;
      });

      // OPTIMISTIC UPDATE: Restock locally
      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, quantity: (item.quantity || 0) + 1 } : item));

      // REMOVED: await reloadProducts();

    } catch (err) {
      console.error("Failed to decrement", err);
      // On error revert optimistic change
      await reloadProducts();
      await reloadCart();
    } finally {
      setAddingId(null);
    }
  }


  useEffect(() => {
    let cancel = false;
    async function loadMerchant() {
      try {
        const res = await api.get(`/merchants/${id}`);
        if (!cancel) setMerchant(res.data);
      } catch (err) {
        console.error("load merchant", err);
      }
    }
    loadMerchant();
    return () => (cancel = true);
  }, [id]);

  /* Load products and packages */
  useEffect(() => {
    let cancel = false;
    async function loadProducts() {
      setLoading(true);
      try {
        const res = await api.get(`/products/${id}`);
        const productsData = res.data || [];
        if (!cancel) setProducts(productsData);


      } catch (err) {
        console.error("load products", err);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    if (id) loadProducts();
    return () => (cancel = true);
  }, [id]);

  /* Refresh products when user returns to this page (from Cart, etc) */
  useEffect(() => {
    // 1. Listen for standard visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (id) reloadProducts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 2. Refresh on mount/focus (navigation back)
    if (id) reloadProducts();

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id]); // Depend on ID to re-run if merchant changes

  if (!merchant) return <p className="mv-status">Loading merchant…</p>;

  const categories = Array.from(
    new Set(products.map(p => p.category || "Uncategorized"))
  );

  const filtered = products.filter(p => {
    if (category && (p.category || "Uncategorized") !== category) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    const catA = (a.category || "Uncategorized").toLowerCase();
    const catB = (b.category || "Uncategorized").toLowerCase();
    if (catA < catB) return -1;
    if (catA > catB) return 1;
    return 0;
  });

  return (
    <div className="mv-page">
      {/* Sidebar */}
      <aside className="mv-sidebar">
        <h3>Categories</h3>

        <div
          className={`mv-category ${!category ? "active" : ""}`}
          onClick={() => setCategory(null)}
        >
          All
        </div>

        {categories.map(c => (
          <div
            key={c}
            className={`mv-category ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {capitalize(c)}
          </div>
        ))}
      </aside>

      {/* Content */}
      <main className="mv-content">
        <header className="mv-header">
          <div className="mv-header-left">
            <button className="mv-back" onClick={() => navigate('/customer/merchants')}>
              Back to Home
            </button>
            <h1>{merchant.name}</h1>
            <p className="mv-type">{merchant.type}</p>
          </div>

          <div className="mv-actions">
            <button onClick={() => navigate("/cart", { state: { merchantId: id } })}>Cart</button>
            <button onClick={() => navigate("/profile")}>Profile</button>
          </div>
        </header>

        <p className="mv-count">Products found: {filtered.length}</p>

        <input
          className="mv-search"
          placeholder="Search products..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        {loading ? (
          <p className="mv-status">Loading products…</p>
        ) : (
          <div className="mv-grid">
            {sortedFiltered.map(p => {
              const imgSrc = p && p.image_location
                ? (p.image_location.startsWith('http') ? p.image_location : `/products/${p.image_location}`)
                : getProductImage(p.name);

              if (p.id === 5) console.log(`Product ${p.id} stock debug:`, p.quantity, typeof p.quantity);

              const displayedStock = typeof p.quantity !== 'undefined' ? Number(p.quantity) : 0; // ensure number logic

              const isOOS = displayedStock <= 0;
              const limited = displayedStock > 0 && displayedStock < 5;
              const cartQty = cartItems[p.id] || 0;
              const inCart = cartQty > 0;

              return (
                <div key={p.id} className={`mv-card ${isOOS ? 'out-of-stock' : limited ? 'limitedstock' : ''}`}>
                  <img
                    src={imgSrc}
                    alt={p.name}
                    onError={e => (e.target.src = "/products/default.jpg")}
                  />

                  <div className="mv-card-content">
                    <h3 title={p.name}>{p.name}</h3>
                    <p className="mv-category-text">{p.unit ? `${formatUnitAmount(p.unit_amount || 1)} ${formatUnitDisplay(p.unit, p.category)}` : capitalize(p.category)}</p>

                    <div style={{ marginTop: 'auto' }}>
                      <p className="mv-price">₹{Math.floor(Number(p.price))}</p>

                      {/* Status Text */}
                      {!isOOS && displayedStock < 5 && (
                        <p className="mv-stock-status" style={{ color: 'lightcoral' }}>Only {displayedStock} left</p>
                      )}
                      {!isOOS && displayedStock >= 5 && (
                        <p className="mv-stock-status" style={{ color: '#27ae60' }}>Active</p>
                      )}
                      {isOOS && (
                        <p className="mv-stock-status" style={{ color: '#e74c3c' }}>Out of Stock</p>
                      )}

                      <div className="mv-action-area">
                        {!inCart ? (
                          <button
                            onClick={() => handleIncrement(p)}
                            disabled={displayedStock <= 0 || addingId === p.id}
                            style={{
                              width: '100%',
                              height: 32,
                              background: '#f7fff9',
                              color: '#0c831f',
                              border: '1px solid #0c831f',
                              borderRadius: 6,
                              cursor: displayedStock <= 0 || addingId === p.id ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              fontSize: 13,
                              textTransform: 'uppercase',
                              opacity: displayedStock <= 0 ? 0.5 : 1
                            }}
                            onMouseOver={(e) => { if (displayedStock > 0) { e.currentTarget.style.background = '#0c831f'; e.currentTarget.style.color = 'white'; } }}
                            onMouseOut={(e) => { if (displayedStock > 0) { e.currentTarget.style.background = '#f7fff9'; e.currentTarget.style.color = '#0c831f'; } }}
                          >
                            {addingId === p.id ? 'Adding...' : (displayedStock <= 0 ? 'Out of Stock' : 'Add to Cart')}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0c831f', borderRadius: 6, padding: 0, height: 32, width: '100%' }}>
                            <button
                              type="button"
                              onClick={() => handleDecrement(p)}
                              disabled={addingId === p.id || cartQty <= 0}
                              style={{ width: 32, height: '100%', border: 'none', background: 'transparent', cursor: addingId === p.id || cartQty <= 0 ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 18, paddingBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >−</button>

                            <div style={{ textAlign: 'center', fontWeight: '600', fontSize: 13, color: '#fff', minWidth: 20 }}>{cartQty}</div>

                            <button
                              type="button"
                              onClick={() => handleIncrement(p)}
                              disabled={displayedStock <= 0 || addingId === p.id}
                              style={{ width: 32, height: '100%', border: 'none', background: 'transparent', cursor: displayedStock <= 0 || addingId === p.id ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 18, paddingBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: displayedStock <= 0 ? 0.5 : 1 }}
                            >+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Toast
        show={toast.show}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
        navigateState={{ merchantId: id }}
      />
    </div>
  );
}
