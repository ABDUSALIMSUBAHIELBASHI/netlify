export default function SheetsManager({ products, orders, url, onUrlChange, onSync, status }) {
  return (
    <section className="panel sheets-panel" id="sheets">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">DATA & REPORTING</span>
          <h2>Google Sheets Manager</h2>
        </div>
        <span className={`connection-pill${url ? " configured" : ""}`}>{url ? "URL configured" : "Setup required"}</span>
      </div>
      <p className="panel-description">Add your Apps Script web app URL to send the inventory and order records to your spreadsheet.</p>
      <form className="sheets-form" onSubmit={(event) => { event.preventDefault(); onSync(); }}>
        <label htmlFor="apps-script-url">Apps Script web app URL</label>
        <input
          id="apps-script-url"
          type="url"
          placeholder="https://script.google.com/macros/s/…/exec"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
        />
        <button className="button button-primary" type="submit">Sync inventory and orders</button>
      </form>
      <p className="sync-status" aria-live="polite">{status || "Your order history is stored in this browser until you sync."}</p>
      <div className="sheet-summary">
        <div><strong>{products.length}</strong><span>Inventory products</span></div>
        <div><strong>{orders.length}</strong><span>Saved orders</span></div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Availability</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td><td>{product.category}</td><td>${product.price.toFixed(2)}</td><td>In stock</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
