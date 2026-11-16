export default function ProductCard({ product, onAdd }) {
  return (
    <article className="product-card">
      <div className="product-icon" aria-hidden="true">{product.icon}</div>
      <span className="product-category">{product.category}</span>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="product-card-footer">
        <strong>${product.price.toFixed(2)}</strong>
        <button className="button button-primary button-small" type="button" onClick={() => onAdd(product)}>
          Add to cart
        </button>
      </div>
    </article>
  );
}
