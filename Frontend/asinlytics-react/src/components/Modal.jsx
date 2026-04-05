import React from "react";

export default function Modal({ id, open, onClose, title, children, footer }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }
  return (
    <div className={`mo${open ? " open" : ""}`} onClick={handleBackdrop}>
      <div className="md">
        <div className="md-head">
          <h2>{title}</h2>
          <button className="md-close" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="md-foot">{footer}</div>}
      </div>
    </div>
  );
}
