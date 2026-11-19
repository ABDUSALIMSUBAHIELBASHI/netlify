"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

function readLocal(key, fallback) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function AdminDashboard({ products, orders, sheetsUrl, onSync }) {
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return (
    <section className="workspace-section" id="dashboard">
      <div className="workspace-heading">
        <div><span className="eyebrow">PHARMACY ELAF</span><h2>Dashboard</h2><p>Your local shop and order overview.</p></div>
      </div>
      <div className="dashboard-stat-grid">
        <article className="dashboard-stat"><span>Inventory products</span><strong>{products.length}</strong></article>
        <article className="dashboard-stat"><span>Submitted orders</span><strong>{orders.length}</strong></article>
        <article className="dashboard-stat"><span>Order value</span><strong>${total.toFixed(2)}</strong></article>
        <article className="dashboard-stat"><span>Sheets connection</span><strong className="stat-small">{sheetsUrl ? "Configured" : "Not configured"}</strong></article>
      </div>
      <div className="dashboard-links">
        <div className="panel dashboard-service-panel">
          <div className="panel-heading"><div><span className="eyebrow">CONNECTED SERVICES</span><h2>Quick links</h2></div></div>
          <div className="dashboard-service-links">
            <a href="https://www.riamoneytransfer.com/" target="_blank" rel="noopener noreferrer">Ria Money Transfer ↗</a>
            <a href="https://bankofkhartoum.com/" target="_blank" rel="noopener noreferrer">Bank of Khartoum ↗</a>
            <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">AI Pharmacy ELAF ↗</a>
            <a href="https://wa.me/250739390715" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
          </div>
        </div>
        <div className="panel dashboard-service-panel">
          <div className="panel-heading"><div><span className="eyebrow">SHEETS</span><h2>Inventory & orders</h2></div></div>
          <p className="panel-description">{sheetsUrl ? "Your Apps Script URL is configured." : "Add an Apps Script web app URL in Google Sheets Manager to connect this dashboard."}</p>
          <a className="button button-primary" href="#sheets">Open Sheets Manager</a>
          <button className="button button-secondary" type="button" onClick={onSync} disabled={!sheetsUrl}>Sync now</button>
        </div>
      </div>
      <div className="panel dashboard-orders">
        <div className="panel-heading"><div><span className="eyebrow">LOCAL ORDER HISTORY</span><h2>Recent orders</h2></div></div>
        {orders.length ? (
          <div className="table-scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Payment method</th><th>Total</th></tr></thead>
            <tbody>{orders.slice(0, 8).map((order) => (
              <tr key={order.id}><td>{order.id}</td><td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td>{order.paymentMethod}</td>
                <td>${Number(order.total).toFixed(2)}</td></tr>
            ))}</tbody></table></div>
        ) : <p className="empty-note">Orders submitted on this device will appear here.</p>}
      </div>
    </section>
  );
}

export function InventoryAdmin({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) {
  const [draft, setDraft] = useState({ name: "", category: "Medicines", icon: "💊", price: "", description: "" });
  const [editingId, setEditingId] = useState(null);

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveProduct(event) {
    event.preventDefault();
    const product = { ...draft, name: draft.name.trim(), price: Number(draft.price) };
    if (!product.name || !Number.isFinite(product.price) || product.price <= 0) return;
    if (product.price > 1000 && !window.confirm(`The price is $${product.price.toFixed(2)}, above $1,000. Save it anyway?`)) return;
    if (editingId === null) onAddProduct(product);
    else onUpdateProduct(editingId, product);
    setDraft({ name: "", category: "Medicines", icon: "💊", price: "", description: "" });
    setEditingId(null);
  }

  function editProduct(product) {
    setDraft({ name: product.name, category: product.category, icon: product.icon, price: String(product.price), description: product.description });
    setEditingId(product.id);
  }

  return (
    <section className="workspace-section" id="admin">
      <div className="workspace-heading"><div><span className="eyebrow">CATALOG MANAGEMENT</span><h2>Inventory Admin</h2><p>Add, update, or remove products from the storefront.</p></div></div>
      <div className="panel workspace-panel inventory-manager">
        <form className="inventory-form" onSubmit={saveProduct}>
          <label><span>Product name</span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required /></label>
          <label><span>Category</span><select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>
            {["Medicines", "Supplements", "Wellness", "Personal Care"].map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label><span>Icon</span><input value={draft.icon} onChange={(event) => updateDraft("icon", event.target.value)} maxLength={8} /></label>
          <label><span>Price ($)</span><input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required /></label>
          <label className="inventory-description"><span>Description</span><input value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label>
          <div className="inventory-form-actions">
            <button className="button button-primary" type="submit">{editingId === null ? "Add product" : "Save product"}</button>
            {editingId !== null && <button className="button button-secondary" type="button" onClick={() => { setEditingId(null); setDraft({ name: "", category: "Medicines", icon: "💊", price: "", description: "" }); }}>Cancel edit</button>}
          </div>
        </form>
        <div className="table-scroll"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>{products.map((product) => (
            <tr key={product.id}><td>{product.icon} {product.name}</td><td>{product.category}</td><td>${product.price.toFixed(2)}</td>
              <td className="admin-row-actions"><button type="button" onClick={() => editProduct(product)}>Edit</button><button type="button" onClick={() => onDeleteProduct(product.id)}>Delete</button></td></tr>
          ))}</tbody></table></div>
      </div>
    </section>
  );
}

export function TeamManager() {
  const [team, setTeam] = useState([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readLocal("elaf-next-team", []);
      setTeam(Array.isArray(saved) ? saved : []);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("elaf-next-team", JSON.stringify(team));
  }, [ready, team]);

  function addMember(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedRole = role.trim();
    if (!trimmedName || !trimmedRole) return;
    setTeam((current) => [...current, { id: `${Date.now()}-${trimmedName}`, name: trimmedName, role: trimmedRole }]);
    setName("");
    setRole("");
  }

  return (
    <section className="workspace-section" id="team">
      <div className="workspace-heading"><div><span className="eyebrow">PEOPLE</span><h2>Team</h2><p>Manage your local team directory.</p></div></div>
      <div className="panel workspace-panel">
        <form className="team-form" onSubmit={addMember}>
          <label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Team member name" required /></label>
          <label><span>Role</span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Pharmacist, technician…" required /></label>
          <button className="button button-primary" type="submit">Add team member</button>
        </form>
        {team.length ? <div className="team-list">{team.map((member) => (
          <article className="team-member" key={member.id}>
            <span className="team-avatar" aria-hidden="true">{member.name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{member.name}</strong><span>{member.role}</span></div>
            <button type="button" className="text-button" onClick={() => setTeam((current) => current.filter((entry) => entry.id !== member.id))}>Remove</button>
          </article>
        ))}</div> : <p className="empty-note">No team members have been added yet.</p>}
      </div>
    </section>
  );
}

export function ProfileManager() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = readLocal("elaf-next-profile", { name: "", email: "" });
      if (value && typeof value === "object") setProfile({ name: value.name || "", email: value.email || "" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateField(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function saveProfile(event) {
    event.preventDefault();
    window.localStorage.setItem("elaf-next-profile", JSON.stringify(profile));
    setSaved(true);
  }

  return (
    <section className="workspace-section" id="profile">
      <div className="workspace-heading"><div><span className="eyebrow">YOUR DETAILS</span><h2>Profile</h2><p>Save a contact name and email on this device.</p></div></div>
      <div className="panel workspace-panel profile-panel">
        <form className="profile-form" onSubmit={saveProfile}>
          <label><span>Name</span><input value={profile.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" /></label>
          <label><span>Email</span><input type="email" value={profile.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" /></label>
          <button className="button button-primary" type="submit">Save profile</button>
          {saved && <p className="form-success" role="status">Profile saved on this device.</p>}
        </form>
      </div>
    </section>
  );
}

export function QrPanel() {
  const [value, setValue] = useState("https://pharmacyelaf.com");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function generate(event) {
    event.preventDefault();
    const content = value.trim();
    if (!content) {
      setError("Enter text or a link to create a QR code.");
      setImage("");
      return;
    }
    setWorking(true);
    setError("");
    try {
      setImage(await QRCode.toDataURL(content, { width: 240, margin: 2 }));
    } catch (reason) {
      setImage("");
      setError(`Could not create the QR code: ${reason.message}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="workspace-section" id="qr">
      <div className="workspace-heading"><div><span className="eyebrow">SHARE</span><h2>QR Code</h2><p>Create a QR code locally in your browser.</p></div></div>
      <div className="panel workspace-panel qr-panel">
        <form className="qr-form" onSubmit={generate}>
          <label htmlFor="qr-content">Text or URL</label>
          <div><input id="qr-content" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Enter text or a website URL" />
            <button className="button button-primary" type="submit" disabled={working}>{working ? "Creating…" : "Generate QR"}</button></div>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        {image ? <div className="qr-output"><Image unoptimized src={image} alt={`QR code for ${value}`} width={150} height={150} /><a className="button button-secondary" href={image} download="pharmacy-elaf-qr.png">Download PNG</a></div>
          : <p className="empty-note">Your QR code will appear here.</p>}
      </div>
    </section>
  );
}

export function HistoryPanel({ orders }) {
  return (
    <section className="workspace-section" id="history">
      <div className="workspace-heading"><div><span className="eyebrow">ACTIVITY</span><h2>Order history</h2><p>Orders saved in this browser.</p></div></div>
      <div className="panel dashboard-orders">
        {orders.length ? <div className="table-scroll"><table><thead><tr><th>Order number</th><th>Submitted</th><th>Items</th><th>Method</th><th>Total</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id}><td>{order.id}</td><td>{new Date(order.createdAt).toLocaleString()}</td>
            <td>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</td><td>{order.paymentMethod}</td><td>${Number(order.total).toFixed(2)}</td></tr>)}</tbody></table></div>
          : <p className="empty-note">No orders have been submitted from this browser.</p>}
      </div>
    </section>
  );
}
