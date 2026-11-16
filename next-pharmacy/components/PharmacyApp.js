"use client";

import { useEffect, useMemo, useState } from "react";
import Calculator from "./Calculator";
import CartPanel from "./CartPanel";
import ProductCard from "./ProductCard";
import SheetsManager from "./SheetsManager";
import { AdminDashboard, HistoryPanel, InventoryAdmin, ProfileManager, QrPanel, TeamManager } from "./WorkspaceTools";
import { products } from "../data/products";

function readStorage(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export default function PharmacyApp() {
  const [inventory, setInventory] = useState(products);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("All products");
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedCart = readStorage("elaf-next-cart", []);
      const savedOrders = readStorage("elaf-next-orders", []);
      const savedInventory = readStorage("elaf-next-inventory", products);
      const savedUrl = window.localStorage.getItem("elaf-next-sheets-url") || "";
      const savedTheme = window.localStorage.getItem("elaf-next-theme");
      setCart(Array.isArray(savedCart) ? savedCart : []);
      setOrders(Array.isArray(savedOrders) ? savedOrders : []);
      setInventory(Array.isArray(savedInventory) ? savedInventory : products);
      setSheetsUrl(savedUrl);
      setTheme(savedTheme === "dark" ? "dark" : "light");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("elaf-next-cart", JSON.stringify(cart));
    window.localStorage.setItem("elaf-next-orders", JSON.stringify(orders));
    window.localStorage.setItem("elaf-next-inventory", JSON.stringify(inventory));
    window.localStorage.setItem("elaf-next-sheets-url", sheetsUrl);
    window.localStorage.setItem("elaf-next-theme", theme);
  }, [cart, inventory, orders, sheetsUrl, theme, ready]);

  const categories = useMemo(() => ["All products", ...new Set(inventory.map((product) => product.category))], [inventory]);
  const visibleProducts = useMemo(() => inventory.filter((product) => {
    const matchesCategory = category === "All products" || product.category === category;
    const query = search.trim().toLowerCase();
    return matchesCategory && (!query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query));
  }), [category, inventory, search]);

  function addProduct(product) {
    setInventory((current) => [...current, { ...product, id: Math.max(0, ...current.map((item) => item.id)) + 1 }]);
    setStatus(`${product.name} added to inventory.`);
  }

  function updateProduct(id, update) {
    setInventory((current) => current.map((product) => product.id === id ? { ...product, ...update } : product));
    setStatus(`${update.name} updated.`);
  }

  function deleteProduct(id) {
    const product = inventory.find((item) => item.id === id);
    setInventory((current) => current.filter((item) => item.id !== id));
    setCart((current) => current.filter((item) => item.id !== id));
    if (product) setStatus(`${product.name} removed from inventory.`);
  }

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }];
    });
    setStatus(`${product.name} added to cart.`);
  }

  function changeQuantity(id, amount) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  }

  function removeFromCart(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  async function submitOrder(paymentMethod) {
    const order = {
      id: `ELAF-${Date.now()}`,
      createdAt: new Date().toISOString(),
      paymentMethod,
      items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
      total: Number(cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
    };
    const updatedOrders = [order, ...orders];
    setOrders(updatedOrders);
    setCart([]);
    setStatus(`Order submitted. Order number: ${order.id}`);

    if (sheetsUrl) {
      try {
        await sendToSheets(sheetsUrl, { type: "order", order });
        setStatus(`Order submitted and sent to Google Sheets. Order number: ${order.id}`);
      } catch (error) {
        setStatus(`Order submitted and saved on this device. Google Sheets sync failed: ${error.message}`);
      }
    }
  }

  async function sendToSheets(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`server returned ${response.status}`);
  }

  async function syncSheets() {
    if (!sheetsUrl) {
      setStatus("Enter your Google Apps Script web app URL before syncing.");
      return;
    }
    setStatus("Syncing inventory and order records…");
    try {
      await sendToSheets(sheetsUrl, { type: "sync", products: inventory, orders });
      setStatus("Inventory and order records synced to Google Sheets.");
    } catch (error) {
      setStatus(`Google Sheets sync failed: ${error.message}`);
    }
  }

  return (
    <main data-theme={theme}>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Pharmacy ELAF home">
          <span className="brand-mark" aria-hidden="true">✚</span>
          <span><strong>PHARMACY <span>ELAF</span></strong><small>CARE THAT CONNECTS</small></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#dashboard">Dashboard</a>
          <a href="#products">Shop</a>
          <a href="#calculator">Calculator</a>
          <a href="#admin">Admin</a>
          <a href="#team">Team</a>
          <a href="#sheets">Sheets Manager</a>
          <a href="#history">History</a>
        </nav>
        <div className="header-actions">
          <button className="theme-button" type="button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
            {theme === "light" ? "☾" : "☀"}
          </button>
          <a className="header-cart" href="#cart"><span aria-hidden="true">🛒</span> Cart <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b></a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-kicker"><span className="status-dot" /> YOUR COMMUNITY PHARMACY</span>
            <h1>Your health.<br />Our <span>priority.</span></h1>
            <p>Everyday essentials and trusted care, selected for you by Pharmacy ELAF.</p>
            <a className="button button-light" href="#products">Explore products <span aria-hidden="true">↓</span></a>
            <div className="hero-trust"><span>✓</span> Thoughtful care &nbsp;·&nbsp; Convenient shopping</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-cross">✚</div>
            <div className="hero-float float-pill">✦ &nbsp; Care you can count on</div>
            <div className="hero-float float-leaf">🌿</div>
            <div className="hero-float float-heart">♡</div>
          </div>
        </div>
      </section>

      <div className="service-strip">
        <div><span>✦</span><strong>Carefully selected</strong><small>Everyday pharmacy essentials</small></div>
        <div><span>⌂</span><strong>Easy ordering</strong><small>Shop your way, at your pace</small></div>
        <div><span>♡</span><strong>Here for your wellness</strong><small>Care that puts you first</small></div>
      </div>

      <AdminDashboard products={inventory} orders={orders} sheetsUrl={sheetsUrl} onSync={syncSheets} />
      <InventoryAdmin products={inventory} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} />

      <div className="content-layout">
        <section className="catalog-section" id="products">
          <div className="section-heading">
            <div><span className="eyebrow">THE ELAF SELECTION</span><h2>Shop essentials</h2><p>Browse our selection of pharmacy and wellness products.</p></div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products…" aria-label="Search products" />
            </label>
          </div>
          <div className="category-list" aria-label="Filter by category">
            {categories.map((item) => (
              <button className={`category-chip${category === item ? " active" : ""}`} type="button" key={item} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          <div className="product-grid">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}
            {visibleProducts.length === 0 && <p className="no-results">No products match your search.</p>}
          </div>
          <div className="helper-links">
            <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"><span>✦</span> Ask AI Pharmacy ELAF</a>
            <a href="https://wa.me/250739390715" target="_blank" rel="noopener noreferrer"><span>◉</span> Contact us on WhatsApp</a>
          </div>
        </section>

        <div className="sidebar">
          <CartPanel cart={cart} onChangeQuantity={changeQuantity} onRemove={removeFromCart} onSubmit={submitOrder} />
          <Calculator />
        </div>
      </div>

      <div className="workspace-grid">
        <TeamManager />
        <ProfileManager />
        <QrPanel />
      </div>
      <HistoryPanel orders={orders} />

      <section className="sheets-section">
        <SheetsManager products={inventory} orders={orders} url={sheetsUrl} onUrlChange={setSheetsUrl} onSync={syncSheets} status={status} />
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark" aria-hidden="true">✚</span><span><strong>PHARMACY <span>ELAF</span></strong><small>CARE THAT CONNECTS</small></span></a>
        <p>© 2026 Pharmacy ELAF. Your health, our priority.</p>
        <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">AI Pharmacy ELAF ↗</a>
      </footer>
    </main>
  );
}
