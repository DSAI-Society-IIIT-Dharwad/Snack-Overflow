import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function AsinTracker({ asins, onAdd, onDelete }) {
  const [asinInput, setAsinInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [chips, setChips] = useState([]);
  const toast = useToast();

  function addAsin() {
    const code = asinInput.trim();
    if (!code) { toast("Enter an ASIN code", "error"); return; }
    onAdd({ asin: code, name: nameInput.trim() || "Unknown", sellers: 0, lowest: "Scraping...", scraped: "Just added" });
    setChips((prev) => [...prev, code]);
    setAsinInput(""); setNameInput(""); setPinInput("");
    toast("Now tracking " + code, "success");
  }

  function removeChip(code) {
    setChips((prev) => prev.filter((c) => c !== code));
  }

  return (
    <div className="page-content">
      <div className="panel">
        <div className="ph"><h3>Track a New ASIN</h3></div>
        <div className="pb">
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="fg" style={{ flex: 1, minWidth: "150px", marginBottom: 0 }}>
              <label className="fl">ASIN Code</label>
              <input className="fi" id="ainput" placeholder="B08XYZ2ABC"
                style={{ fontFamily: "var(--font-m)" }}
                value={asinInput} onChange={(e) => setAsinInput(e.target.value)} />
            </div>
            <div className="fg" style={{ flex: 2, minWidth: "200px", marginBottom: 0 }}>
              <label className="fl">Product Name</label>
              <input className="fi" id="ninput" placeholder="SKF 6205 Deep Groove Ball Bearing"
                value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            </div>
            <div className="fg" style={{ flex: 1, minWidth: "120px", marginBottom: 0 }}>
              <label className="fl">PIN Code</label>
              <input className="fi" id="pinput" placeholder="400001"
                style={{ fontFamily: "var(--font-m)" }}
                value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
            </div>
            <button className="btn btn-green" style={{ height: "38px" }} onClick={addAsin}>+ Track</button>
          </div>
          <div id="achips" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.8rem" }}>
            {chips.map((code) => (
              <div key={code} style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: "rgba(16,232,154,0.08)", border: "1px solid rgba(16,232,154,0.2)",
                color: "var(--green)", fontFamily: "var(--font-m)", fontSize: "0.72rem",
                padding: "0.3rem 0.7rem", borderRadius: "99px"
              }}>
                {code} <span style={{ cursor: "pointer" }} onClick={() => removeChip(code)}>✕</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <div>
            <h3>Tracked ASINs</h3>
            <div className="sub">Click row for details · Scrapes every 30 min</div>
          </div>
          <span className="sp on">● Scraper Running</span>
        </div>
        <div style={{ padding: 0 }}>
          <table className="dt">
            <thead>
              <tr>
                <th>ASIN</th><th>Product</th><th>Sellers</th>
                <th>Lowest Price</th><th>Last Scraped</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="atbody">
              {asins.map((a) => (
                <tr key={a.asin}>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.78rem", color: "var(--green)" }}>{a.asin}</td>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td style={{ fontFamily: "var(--font-n)", fontSize: "1rem", fontWeight: 700, color: "var(--blue)" }}>{a.sellers}</td>
                  <td><div className="pv" style={{ color: "var(--green)" }}>{a.lowest}</div></td>
                  <td style={{ fontFamily: "var(--font-m)", fontSize: "0.65rem", color: "var(--muted)" }}>{a.scraped}</td>
                  <td><span className="sp on">● ACTIVE</span></td>
                  <td style={{ display: "flex", gap: "0.4rem", padding: "0.7rem 0.8rem" }}>
                    <button className="btn btn-outline btn-sm"
                      onClick={() => toast(`Scraping ${a.asin}...`, "info")}>
                      Scrape Now
                    </button>
                    <button className="btn btn-red btn-sm"
                      onClick={() => { onDelete(a.asin); toast("Removed " + a.asin, "info"); }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
