import React from "react";
import Modal from "../components/Modal";

export default function SellerModal({ seller, onClose, onWatch }) {
  if (!seller) return null;

  const initials = seller.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const trendColor = seller.trend.includes("↑") ? "var(--green)" : seller.trend.includes("↓") ? "var(--red)" : "var(--muted2)";

  return (
    <Modal
      open={!!seller}
      onClose={onClose}
      title={seller.name}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-blue" onClick={onWatch}>Watch Seller</button>
        </>
      }
    >
      <div style={{ minWidth: "480px" }}>
        <div style={{ display: "flex", gap: "1.2rem", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "10px",
            background: "linear-gradient(135deg,var(--blue),var(--green))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-h)", fontWeight: 800, fontSize: "1.1rem", color: "#000", flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-h)", fontWeight: 700, fontSize: "1rem" }}>{seller.name}</div>
            <div style={{ fontFamily: "var(--font-m)", fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              📍 {seller.loc} · {seller.type} · {seller.region} India
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem", marginBottom: "1rem" }}>
          <div className="ri"><div className="ri-label">CURRENT PRICE</div><div className="ri-val">₹{seller.price.toLocaleString("en-IN")}</div></div>
          <div className="ri"><div className="ri-label">PRODUCTS</div><div className="ri-val">{seller.products}</div></div>
          <div className="ri"><div className="ri-label">EST. SALES</div><div className="ri-val">{seller.sales}</div></div>
        </div>
        <div style={{ padding: "0.8rem", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", color: "var(--muted2)" }}>
          Trend: <span style={{ color: trendColor }}>{seller.trend}</span>
        </div>
      </div>
    </Modal>
  );
}
