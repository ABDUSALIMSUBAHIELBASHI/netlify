"use client";

import { useState } from "react";

const paymentMethods = ["Credit / Debit Card", "PayPal", "Cash on Delivery"];

export default function CartPanel({ cart, onChangeQuantity, onRemove, onSubmit }) {
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [submitting, setSubmitting] = useState(false);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function submitOrder() {
    if (!cart.length || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(paymentMethod);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="panel cart-panel" id="cart">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">YOUR ORDER</span>
          <h2>Shopping cart</h2>
        </div>
        <span className="count-pill">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <span aria-hidden="true">🛍️</span>
          <p>Your cart is empty</p>
          <small>Add a product to get started.</small>
        </div>
      ) : (
        <div className="cart-items">
          {cart.map((item) => (
            <div className="cart-item" key={item.id}>
              <span className="cart-item-icon" aria-hidden="true">{item.icon}</span>
              <div className="cart-item-info">
                <strong>{item.name}</strong>
                <span>${item.price.toFixed(2)} each</span>
                <div className="quantity-controls" aria-label={`${item.name} quantity`}>
                  <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => onChangeQuantity(item.id, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button type="button" aria-label={`Increase ${item.name}`} onClick={() => onChangeQuantity(item.id, 1)}>+</button>
                  <button className="remove-item" type="button" onClick={() => onRemove(item.id)}>Remove</button>
                </div>
              </div>
              <strong className="cart-line-total">${(item.price * item.quantity).toFixed(2)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="cart-total">
        <span>Order total</span>
        <strong>${total.toFixed(2)}</strong>
      </div>

      <fieldset className="payment-methods" disabled={!cart.length || submitting}>
        <legend>Payment Method</legend>
        {paymentMethods.map((method) => (
          <label className={`payment-method${paymentMethod === method ? " selected" : ""}`} key={method}>
            <input
              type="radio"
              name="payment-method"
              value={method}
              checked={paymentMethod === method}
              onChange={() => setPaymentMethod(method)}
            />
            <span>{method}</span>
          </label>
        ))}
      </fieldset>

      <button className="button button-primary submit-order" type="button" disabled={!cart.length || submitting} onClick={submitOrder}>
        {submitting ? "Submitting…" : "Submit order"}
      </button>
      <div className="provider-links">
        <a href="https://www.riamoneytransfer.com/" target="_blank" rel="noopener noreferrer">Ria Money Transfer ↗</a>
        <a href="https://bankofkhartoum.com/" target="_blank" rel="noopener noreferrer">Bank of Khartoum ↗</a>
      </div>
      <a className="whatsapp-order" href="https://wa.me/250739390715" target="_blank" rel="noopener noreferrer">
        <span aria-hidden="true">◉</span> Order with WhatsApp
      </a>
    </aside>
  );
}
