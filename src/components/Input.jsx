// FileName: src/components/Input.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Reusable input with label, error display, and keyboard navigation (Enter/Arrow keys)

import React, { useCallback, useId } from 'react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  name,
  required,
  error,
  disabled,
  autoFocus,
  maxLength,
  minLength,
  min,
  max,
  step,
  ...props
}) {
  // Generate unique ID for label-input association
  const inputId = useId();

  // ─── Keyboard navigation: Enter/ArrowDown = next, ArrowUp = prev ───
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const form = e.target.form;
      if (!form) return;

      const index = Array.prototype.indexOf.call(form.elements, e.target);
      for (let i = index + 1; i < form.elements.length; i++) {
        const nextEl = form.elements[i];
        // Skip hidden, disabled, or non-visible fields
        if (nextEl.type !== 'hidden' &&
          !nextEl.disabled &&
          nextEl.offsetParent !== null) {
          nextEl.focus();
          break;
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const form = e.target.form;
      if (!form) return;

      const index = Array.prototype.indexOf.call(form.elements, e.target);
      for (let i = index - 1; i >= 0; i--) {
        const prevEl = form.elements[i];
        if (prevEl.type !== 'hidden' &&
          !prevEl.disabled &&
          prevEl.offsetParent !== null) {
          prevEl.focus();
          break;
        }
      }
    }
  }, []);

  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
          {required && (
            <span style={{ color: '#d32f2f', marginLeft: '2px' }}>*</span>
          )}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        name={name}
        className="form-input"
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        minLength={minLength}
        min={min}
        max={max}
        step={step}
        style={error ? { borderColor: '#d32f2f' } : undefined}
        {...props}
      />
      {error && (
        <p style={{
          color: '#d32f2f',
          fontSize: '12px',
          marginTop: '4px',
          margin: '4px 0 0 0',
          padding: '0 4px'
        }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}