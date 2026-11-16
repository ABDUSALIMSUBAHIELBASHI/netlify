"use client";

import { useState } from "react";

function calculate(left, right, operator) {
  if (operator === "+") return left + right;
  if (operator === "−") return left - right;
  if (operator === "×") return left * right;
  if (operator === "÷") return right === 0 ? null : left / right;
  return null;
}

function formatNumber(value) {
  return Number(value.toPrecision(12)).toString();
}

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState(null);
  const [operator, setOperator] = useState(null);
  const [replaceDisplay, setReplaceDisplay] = useState(false);
  const [expression, setExpression] = useState("");

  function press(key) {
    if (key === "AC") {
      setDisplay("0");
      setStored(null);
      setOperator(null);
      setReplaceDisplay(false);
      setExpression("");
      return;
    }
    if (key === "⌫") {
      setDisplay((current) => current === "Error" ? "0" : current.length > 1 ? current.slice(0, -1) : "0");
      return;
    }
    if (["+", "−", "×", "÷"].includes(key)) {
      if (display === "Error") return;
      let value = Number(display);
      if (operator && !replaceDisplay) {
        const result = calculate(stored, value, operator);
        if (result === null || !Number.isFinite(result)) {
          setDisplay("Error");
          setStored(null);
          setOperator(null);
          setReplaceDisplay(true);
          return;
        }
        value = result;
        setDisplay(formatNumber(value));
      }
      setStored(value);
      setOperator(key);
      setExpression(`${formatNumber(value)} ${key}`);
      setReplaceDisplay(true);
      return;
    }
    if (key === "=") {
      if (!operator || stored === null || display === "Error") return;
      setExpression(`${formatNumber(stored)} ${operator} ${display} =`);
      const result = calculate(stored, Number(display), operator);
      setDisplay(result === null || !Number.isFinite(result) ? "Error" : formatNumber(result));
      setStored(null);
      setOperator(null);
      setReplaceDisplay(true);
      return;
    }
    if (display === "Error") {
      setDisplay(key === "." ? "0." : key);
      setStored(null);
      setOperator(null);
      setExpression("");
      setReplaceDisplay(false);
      return;
    }
    if (replaceDisplay) {
      setDisplay(key === "." ? "0." : key);
      setReplaceDisplay(false);
      if (!operator) setExpression("");
      return;
    }
    if (key === ".") {
      if (!display.includes(".")) setDisplay(`${display}.`);
    } else if (display.length < 16) {
      setDisplay(display === "0" ? key : `${display}${key}`);
    }
  }

  function handleKeyDown(event) {
    const keyMap = { "*": "×", "/": "÷", "-": "−", Enter: "=", Escape: "AC", Backspace: "⌫" };
    const key = keyMap[event.key] || event.key;
    if (/^\d$/.test(key) || [".", "+", "−", "×", "÷", "=", "AC", "⌫"].includes(key)) {
      event.preventDefault();
      press(key);
    }
  }

  const keys = [
    { label: "AC", style: "key-clear" }, { label: "⌫", style: "key-muted" },
    { label: "÷", style: "key-operator" }, { label: "×", style: "key-operator" },
    { label: "7" }, { label: "8" }, { label: "9" }, { label: "−", style: "key-operator" },
    { label: "4" }, { label: "5" }, { label: "6" }, { label: "+", style: "key-operator" },
    { label: "1" }, { label: "2" }, { label: "3" }, { label: "=", style: "key-equals" },
    { label: "0", style: "key-zero" }, { label: "." },
  ];

  return (
    <section className="panel calculator-panel" id="calculator" aria-labelledby="calculator-title">
      <div className="calculator-heading">
        <span className="calculator-icon" aria-hidden="true">⌗</span>
        <div>
          <span className="eyebrow">QUICK TOOL</span>
          <h2 id="calculator-title">Basic Calculator</h2>
        </div>
        <span className="ready-pill">Ready</span>
      </div>
      <div className="calculator-screen" onKeyDown={handleKeyDown}>
        <output className="calculator-expression" aria-live="polite" aria-label="Calculation">{expression}</output>
        <output className="calculator-display" tabIndex={0} aria-live="polite" aria-label="Calculator display">{display}</output>
      </div>
      <div className="calculator-keys" onKeyDown={handleKeyDown} role="group" aria-label="Calculator keys">
        {keys.map(({ label, style = "" }) => (
          <button
            className={`calculator-key ${style} ${operator === label ? "is-selected" : ""}`}
            type="button"
            key={label}
            onClick={() => press(label)}
            aria-label={label === "⌫" ? "Backspace" : label}
          >
            {label}
          </button>
        ))}
      </div>
      <footer className="calculator-footer">
        <span>Keyboard enabled</span>
        <span>Enter = &nbsp;·&nbsp; Esc AC</span>
      </footer>
    </section>
  );
}
